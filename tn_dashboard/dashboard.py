"""
Streamlit dashboard for Trang Nguyen AI chatbot.
"""
from __future__ import annotations

import io
import json
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st
from supabase import create_client

from analytics import (
    build_daily,
    build_daily_from_faq,
    build_daily_from_qa,
    build_faq_pairs,
    build_hour_dist,
    build_keywords,
    build_qa_pairs,
    build_sessions,
    build_user_stats,
    fetch_raw,
    get_kpis,
)


VN_TZ = timezone(timedelta(hours=7))
VERSIONS = ["v2", "v5", "v6"]

CHART_BG = "#ffffff"
CHART_PAPER = "#f8fafc"
CHART_GRID = "#e2e8f0"
CHART_TEXT = "#1e293b"
CHART_FONT = {"color": CHART_TEXT, "family": "Be Vietnam Pro, Arial"}


def dark_layout(**kwargs: Any) -> dict[str, Any]:
    base = {
        "plot_bgcolor": CHART_BG,
        "paper_bgcolor": CHART_PAPER,
        "font": CHART_FONT,
        "xaxis": {
            "gridcolor": CHART_GRID,
            "tickfont": {"color": CHART_TEXT},
            "linecolor": CHART_GRID,
            "zerolinecolor": CHART_GRID,
        },
        "yaxis": {
            "gridcolor": CHART_GRID,
            "tickfont": {"color": CHART_TEXT},
            "linecolor": CHART_GRID,
            "zerolinecolor": CHART_GRID,
        },
        "legend": {"font": {"color": CHART_TEXT}, "bgcolor": "rgba(0,0,0,0)"},
        "hoverlabel": {
            "bgcolor": "#0f172a",
            "font_color": "#f8fafc",
            "bordercolor": CHART_GRID,
        },
    }
    base.update(kwargs)
    return base


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def parse_qa_text(content: str) -> list[dict[str, str]]:
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    blocks = [block.strip() for block in re.split(r"\n\s*\n", content) if block.strip()]
    items: list[dict[str, str]] = []

    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        question_parts: list[str] = []
        answer_parts: list[str] = []
        current: str | None = None

        for line in lines:
            upper_line = line.upper()
            if upper_line.startswith("Q:"):
                if question_parts and answer_parts:
                    items.append(
                        {
                            "question": "\n".join(question_parts).strip(),
                            "answer": "\n".join(answer_parts).strip(),
                        }
                    )
                    question_parts = []
                    answer_parts = []
                current = "question"
                question_parts.append(line[2:].strip())
                continue
            if upper_line.startswith("A:"):
                current = "answer"
                answer_parts.append(line[2:].strip())
                continue
            if current == "question":
                question_parts.append(line)
            elif current == "answer":
                answer_parts.append(line)

        question = "\n".join(part for part in question_parts if part).strip()
        answer = "\n".join(part for part in answer_parts if part).strip()
        if question and answer:
            items.append({"question": question, "answer": answer})

    return items


def parse_qa_dataframe(dataframe: pd.DataFrame) -> list[dict[str, str]]:
    dataframe = dataframe.copy()
    dataframe.columns = [normalize_text(column).lower() for column in dataframe.columns]
    if "question" not in dataframe.columns or "answer" not in dataframe.columns:
        raise ValueError("File bảng phải có 2 cột bắt buộc: `question` và `answer`.")

    items: list[dict[str, str]] = []
    for _, row in dataframe.iterrows():
        question = normalize_text(row.get("question"))
        answer = normalize_text(row.get("answer"))
        if question and answer:
            items.append({"question": question, "answer": answer})
    return items


def parse_uploaded_file(uploaded_file) -> tuple[list[dict[str, str]], str | None]:
    filename = uploaded_file.name.lower()

    try:
        if filename.endswith(".txt"):
            content = uploaded_file.getvalue().decode("utf-8", errors="ignore")
            return parse_qa_text(content), None

        if filename.endswith(".docx"):
            try:
                import docx
            except ImportError:
                return [], "Thiếu thư viện `python-docx`. Hãy cài bằng `pip install python-docx`."

            document = docx.Document(io.BytesIO(uploaded_file.getvalue()))
            content = "\n".join(paragraph.text for paragraph in document.paragraphs)
            return parse_qa_text(content), None

        if filename.endswith(".csv"):
            dataframe = pd.read_csv(io.BytesIO(uploaded_file.getvalue()))
            return parse_qa_dataframe(dataframe), None

        if filename.endswith(".xlsx"):
            dataframe = pd.read_excel(io.BytesIO(uploaded_file.getvalue()))
            return parse_qa_dataframe(dataframe), None
    except Exception as exc:
        return [], f"Lỗi đọc file: {exc}"

    return [], "Định dạng file chưa được hỗ trợ."


def build_webhook_payload(
    *,
    payload_type: str,
    version: str,
    category: str,
    items: list[dict[str, str]],
    source_name: str | None = None,
) -> dict[str, Any]:
    payload = {
        "type": payload_type,
        "version": version,
        "category": category.strip(),
        "items": items,
        "total_items": len(items),
        "sent_at": datetime.now(VN_TZ).isoformat(),
    }
    if source_name:
        payload["source_name"] = source_name
    return payload


def send_to_n8n(payload: dict[str, Any], webhook_url: str, timeout_seconds: int = 60) -> tuple[bool, str]:
    if not webhook_url:
        return False, "Chưa cấu hình `N8N_WEBHOOK_URL` trong `.streamlit/secrets.toml`."

    try:
        response = requests.post(webhook_url, json=payload, timeout=timeout_seconds)
        if response.status_code in (200, 201, 202):
            return True, f"n8n đã nhận dữ liệu. HTTP {response.status_code}."
        return False, f"n8n trả về HTTP {response.status_code}: {response.text[:300]}"
    except requests.exceptions.Timeout:
        return True, "Request bị timeout nhưng n8n có thể vẫn đã nhận được dữ liệu để xử lý nền."
    except Exception as exc:
        return False, f"Lỗi kết nối n8n: {exc}"


def get_metadata_value(metadata: Any, key: str) -> str:
    if isinstance(metadata, dict):
        return normalize_text(metadata.get(key))
    if isinstance(metadata, str):
        try:
            parsed = json.loads(metadata)
            if isinstance(parsed, dict):
                return normalize_text(parsed.get(key))
        except Exception:
            return ""
    return ""


def get_metadata_version(metadata: Any) -> str:
    version = get_metadata_value(metadata, "version")
    if not version:
        version = get_metadata_value(metadata, "phan_loai")
    return version.strip().lower()


def filter_by_days(
    df_raw: pd.DataFrame,
    sess_df: pd.DataFrame,
    daily_df: pd.DataFrame,
    qa_df: pd.DataFrame,
    daily_qa_df: pd.DataFrame,
    faq_df: pd.DataFrame,
    daily_faq_df: pd.DataFrame,
    days: int | None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if not days or df_raw.empty:
        return df_raw, sess_df, daily_df, qa_df, daily_qa_df, faq_df, daily_faq_df

    cutoff = datetime.now(VN_TZ).date() - timedelta(days=days - 1)

    def filter_df(dataframe: pd.DataFrame, date_col: str = "date_vn") -> pd.DataFrame:
        if dataframe.empty or date_col not in dataframe.columns:
            return dataframe
        dates = pd.to_datetime(dataframe[date_col]).dt.date
        return dataframe.loc[dates >= cutoff].copy()

    return (
        df_raw.loc[df_raw["date_vn"] >= cutoff].copy(),
        filter_df(sess_df),
        filter_df(daily_df),
        filter_df(qa_df),
        filter_df(daily_qa_df),
        filter_df(faq_df),
        filter_df(daily_faq_df),
    )


@st.cache_resource
def get_supabase():
    return create_client(st.secrets["SUPABASE_URL"], st.secrets["SUPABASE_KEY"])


@st.cache_data(ttl=30)
def load_data():
    df_raw = fetch_raw(get_supabase())
    if df_raw.empty:
        empty = pd.DataFrame()
        return df_raw, empty, empty, empty, empty, empty, empty

    sess_df = build_sessions(df_raw)
    daily_df = build_daily(sess_df)
    qa_df = build_qa_pairs(df_raw)
    daily_qa_df = build_daily_from_qa(qa_df)
    faq_df = build_faq_pairs(df_raw)
    daily_faq_df = build_daily_from_faq(faq_df)
    return df_raw, sess_df, daily_df, qa_df, daily_qa_df, faq_df, daily_faq_df


def render_kb_page(supabase_client) -> None:
    webhook_url = st.secrets.get("N8N_WEBHOOK_URL", "")
    kb_table_name = st.secrets.get("KB_TABLE_NAME", "documents")

    st.title("Quản lý tri thức")
    st.caption("Nhập từng cặp Q&A hoặc import nhiều câu hỏi để gửi sang n8n xử lý chunking và embedding.")

    status_col1, status_col2 = st.columns([3, 2])
    with status_col1:
        st.info(f"Bảng KB hiện dùng: `{kb_table_name}`")
    with status_col2:
        if webhook_url:
            st.success("Webhook n8n đã cấu hình")
        else:
            st.warning("Webhook n8n chưa cấu hình")

    tab_single, tab_import, tab_manage, tab_guide = st.tabs(
        ["Nhập từng câu hỏi", "Import file", "Xem và quản lý KB", "Hướng dẫn n8n"]
    )

    with tab_single:
        st.markdown("### Thêm từng cặp câu hỏi và câu trả lời")
        with st.form("single_qa_form", clear_on_submit=True):
            version = st.selectbox("Phân loại dữ liệu", VERSIONS, help="Chọn đúng KB: v2, v5 hoặc v6.")
            category = st.text_input("Chủ đề", placeholder="Ví dụ: lịch thi, tài khoản, thanh toán...")
            question = st.text_area("Câu hỏi", height=120, placeholder="Nhập câu hỏi của người dùng")
            answer = st.text_area("Câu trả lời", height=180, placeholder="Nhập câu trả lời tương ứng")
            submit_single = st.form_submit_button("Gửi sang n8n", type="primary", use_container_width=True)

        if submit_single:
            question = question.strip()
            answer = answer.strip()
            if not question or not answer:
                st.error("Cần nhập đầy đủ câu hỏi và câu trả lời.")
            else:
                payload = build_webhook_payload(
                    payload_type="single",
                    version=version,
                    category=category,
                    items=[{"question": question, "answer": answer}],
                    source_name="streamlit_single_form",
                )
                with st.spinner("Đang gửi dữ liệu sang n8n..."):
                    ok, message = send_to_n8n(payload, webhook_url, timeout_seconds=30)
                if ok:
                    st.success(message)
                    st.json(payload, expanded=False)
                else:
                    st.error(message)

    with tab_import:
        st.markdown("### Import nhiều câu hỏi cùng lúc")
        st.caption("Ưu tiên `csv/xlsx` nếu admin nhập nhiều vì dễ kiểm tra cấu trúc. `txt/docx` phù hợp khi copy từ tài liệu FAQ.")

        col1, col2 = st.columns(2)
        with col1:
            file_version = st.selectbox("Phân loại dữ liệu", VERSIONS, key="file_version")
        with col2:
            file_category = st.text_input("Chủ đề", key="file_category", placeholder="Ví dụ: FAQ chung")

        uploaded_file = st.file_uploader(
            "Chọn file để import",
            type=["txt", "docx", "csv", "xlsx"],
            help="Hỗ trợ .txt, .docx, .csv, .xlsx",
        )

        with st.expander("Định dạng file được hỗ trợ"):
            st.markdown(
                """
TXT hoặc DOCX:
```text
Q: Câu hỏi 1?
A: Câu trả lời 1.

Q: Câu hỏi 2?
A: Câu trả lời 2.
```

CSV hoặc XLSX:
```text
question,answer
"Câu hỏi 1?","Câu trả lời 1."
"Câu hỏi 2?","Câu trả lời 2."
```
                """.strip()
            )

        if uploaded_file is not None:
            items, error_message = parse_uploaded_file(uploaded_file)

            if error_message:
                st.error(error_message)
            elif not items:
                st.warning("Không tìm thấy cặp Q&A hợp lệ trong file.")
            else:
                st.success(f"Đã đọc được {len(items)} cặp Q&A từ `{uploaded_file.name}`.")
                st.dataframe(pd.DataFrame(items).head(10), use_container_width=True, hide_index=True)

                payload = build_webhook_payload(
                    payload_type="batch",
                    version=file_version,
                    category=file_category,
                    items=items,
                    source_name=uploaded_file.name,
                )

                if st.button("Gửi toàn bộ file sang n8n", type="primary", use_container_width=True):
                    with st.spinner(f"Đang gửi {len(items)} cặp Q&A sang n8n..."):
                        ok, message = send_to_n8n(payload, webhook_url, timeout_seconds=60)
                    if ok:
                        st.success(message)
                        st.json(
                            {
                                "type": payload["type"],
                                "version": payload["version"],
                                "category": payload["category"],
                                "total_items": payload["total_items"],
                                "source_name": payload["source_name"],
                            },
                            expanded=False,
                        )
                    else:
                        st.error(message)

    with tab_manage:
        st.markdown("### Xem dữ liệu KB hiện có")
        filter_col1, filter_col2 = st.columns([2, 1])
        with filter_col1:
            selected_version = st.selectbox("Lọc theo phiên bản", ["Tất cả"] + VERSIONS, key="kb_version")
        with filter_col2:
            if st.button("Tải lại danh sách", use_container_width=True):
                st.cache_data.clear()

        try:
            response = (
                supabase_client.table(kb_table_name)
                .select("id, content, metadata")
                .order("id", desc=True)
                .limit(200)
                .execute()
            )
            records = response.data or []
            kb_df = pd.DataFrame(records)

            if kb_df.empty:
                st.info("Chưa có dữ liệu trong bảng KB.")
            else:
                kb_df["version"] = kb_df["metadata"].apply(get_metadata_version)
                kb_df["category"] = kb_df["metadata"].apply(lambda value: get_metadata_value(value, "category"))
                kb_df["preview"] = kb_df["content"].fillna("").astype(str).str.slice(0, 150)

                if selected_version != "Tất cả":
                    kb_df = kb_df.loc[kb_df["version"] == selected_version].copy()

                st.caption(f"Hiển thị {len(kb_df)} bản ghi gần nhất.")
                st.dataframe(
                    kb_df.rename(
                        columns={
                            "id": "ID",
                            "version": "Phiên bản",
                            "category": "Chủ đề",
                            "preview": "Nội dung",
                        }
                    )[["ID", "Phiên bản", "Chủ đề", "Nội dung"]],
                    use_container_width=True,
                    hide_index=True,
                )

                st.markdown("### Xóa bản ghi KB")
                delete_id = st.number_input("Nhập ID cần xóa", min_value=1, step=1)
                if st.button("Xóa bản ghi", type="secondary"):
                    try:
                        supabase_client.table(kb_table_name).delete().eq("id", int(delete_id)).execute()
                        st.success(f"Đã xóa bản ghi ID {int(delete_id)}.")
                        st.rerun()
                    except Exception as exc:
                        st.error(f"Lỗi xóa bản ghi: {exc}")
        except Exception as exc:
            st.error(f"Không thể đọc dữ liệu KB: {exc}")
            st.caption("Nếu bảng không phải `documents`, hãy thêm `KB_TABLE_NAME` vào `.streamlit/secrets.toml`.")

    with tab_guide:
        st.markdown("### Kết nối với n8n bằng HTTP Request")
        st.markdown(
            """
1. Trong n8n, tạo workflow mới và thêm node `Webhook`.
2. Chọn `POST`, copy `Production URL` của webhook.
3. Dán URL đó vào `.streamlit/secrets.toml`:

```toml
N8N_WEBHOOK_URL = "https://your-n8n-domain/webhook/kb-ingest"
KB_TABLE_NAME = "documents"
```

4. Sau node `Webhook`, thêm các node xử lý:
   - `Code` hoặc `Set`: đọc `version`, `category`, `items`, `source_name`
   - `Split Out` hoặc loop: tách từng item nếu cần
   - Node chunking
   - Node embedding
   - Node ghi dữ liệu vào vector DB hoặc Supabase
5. Trả về một node `Respond to Webhook` với JSON đơn giản:

```json
{
  "ok": true,
  "message": "received"
}
```
            """.strip()
        )

        st.markdown("### Payload mà dashboard gửi sang n8n")
        st.code(
            json.dumps(
                {
                    "type": "batch",
                    "version": "v5",
                    "category": "lich thi",
                    "source_name": "faq_v5.xlsx",
                    "total_items": 2,
                    "sent_at": "2026-03-26T14:30:00+07:00",
                    "items": [
                        {"question": "Lịch thi ở đâu?", "answer": "Bạn xem trong mục Lịch thi."},
                        {"question": "Cách đổi mật khẩu?", "answer": "Vào phần Tài khoản để đổi mật khẩu."},
                    ],
                },
                ensure_ascii=False,
                indent=2,
            ),
            language="json",
        )

        st.markdown("### Cấu hình node HTTP Request trong n8n nếu gọi ngược sang service khác")
        st.markdown(
            """
- Method: `POST`
- Send Body: `JSON`
- Body example:

```json
{
  "version": "{{ $json.version }}",
  "category": "{{ $json.category }}",
  "items": "{{ $json.items }}"
}
```

- Header thường dùng:
  - `Content-Type: application/json`
  - `Authorization: Bearer ...` nếu service phía sau yêu cầu
            """.strip()
        )


def render_dashboard_page() -> None:
    with st.spinner("Đang tải dữ liệu dashboard..."):
        df_raw, sess_df, daily_df, qa_df, daily_qa_df, faq_df, daily_faq_df = load_data()

    days_map = {"Tất cả": None, "7 ngày gần nhất": 7, "30 ngày gần nhất": 30}
    selected_days = days_map[st.session_state.get("date_filter", "Tất cả")]

    df_raw_f, sess_df_f, daily_df_f, qa_df_f, daily_qa_df_f, faq_df_f, daily_faq_df_f = filter_by_days(
        df_raw, sess_df, daily_df, qa_df, daily_qa_df, faq_df, daily_faq_df, selected_days
    )

    st.title("Trang tổng quan chatbot")
    st.caption("Theo dõi realtime hiệu quả trả lời, độ đầy đủ KB FAQ và mức độ sử dụng của người dùng.")

    if df_raw_f.empty:
        st.warning("Không có dữ liệu trong khoảng thời gian đã chọn.")
        return

    kpis = get_kpis(sess_df_f, qa_df_f)

    metric_cols = st.columns(6)
    metric_cols[0].metric("Phiên chat", f"{kpis.get('total_sessions', 0)}", delta=kpis.get("trend_sessions", 0))
    metric_cols[1].metric("Lượt hỏi đáp", f"{kpis.get('total_qa', 0)}")
    metric_cols[2].metric("Trả lời được", f"{kpis.get('bot_answered', 0)}")
    metric_cols[3].metric("Từ chối", f"{kpis.get('bot_refused', 0)}")
    metric_cols[4].metric("Tỷ lệ trả lời", f"{kpis.get('answer_rate', 0)}%", delta=f"{kpis.get('trend_rate', 0)}%")
    metric_cols[5].metric("TB thời gian/phiên", f"{kpis.get('avg_duration', 0)} phút")

    st.markdown("### Xu hướng hiệu quả theo ngày")
    chart_col1, chart_col2 = st.columns([3, 2])

    with chart_col1:
        if not daily_qa_df_f.empty:
            fig_daily = go.Figure()
            fig_daily.add_trace(
                go.Bar(
                    x=daily_qa_df_f["date_vn"].astype(str),
                    y=daily_qa_df_f["answered"],
                    name="Trả lời được",
                    marker_color="#10b981",
                )
            )
            fig_daily.add_trace(
                go.Bar(
                    x=daily_qa_df_f["date_vn"].astype(str),
                    y=daily_qa_df_f["refused"],
                    name="Từ chối",
                    marker_color="#f87171",
                )
            )
            fig_daily.update_layout(
                **dark_layout(
                    title={"text": "Lượt hỏi đáp theo ngày", "x": 0, "font": {"size": 13, "color": CHART_TEXT}},
                    barmode="stack",
                    height=320,
                    margin={"l": 10, "r": 10, "t": 40, "b": 10},
                )
            )
            st.plotly_chart(fig_daily, use_container_width=True)

    with chart_col2:
        fig_rate = go.Figure(
            go.Pie(
                labels=["Trả lời được", "Từ chối"],
                values=[kpis.get("bot_answered", 0), kpis.get("bot_refused", 0)],
                hole=0.62,
                marker_colors=["#10b981", "#f87171"],
                textinfo="label+percent",
            )
        )
        fig_rate.update_layout(
            title={"text": "Tỷ lệ trả lời", "x": 0, "font": {"size": 13, "color": CHART_TEXT}},
            height=320,
            paper_bgcolor=CHART_PAPER,
            font=CHART_FONT,
            margin={"l": 10, "r": 10, "t": 40, "b": 10},
            showlegend=False,
        )
        st.plotly_chart(fig_rate, use_container_width=True)

    st.markdown("### Hoạt động theo giờ")
    hour_df = build_hour_dist(sess_df_f)
    hour_col = "count" if "count" in hour_df.columns else "n_sessions"
    fig_hours = go.Figure(
        go.Bar(
            x=hour_df["hour_vn"],
            y=hour_df[hour_col],
            marker_color="#3b82f6",
            hovertemplate="Giờ %{x}:00<br><b>%{y}</b> phiên<extra></extra>",
        )
    )
    fig_hours.update_layout(
        **dark_layout(
            title={"text": "Phân bố phiên theo giờ", "x": 0, "font": {"size": 13, "color": CHART_TEXT}},
            height=300,
            margin={"l": 10, "r": 10, "t": 40, "b": 10},
            xaxis={"dtick": 1, "gridcolor": CHART_GRID},
        )
    )
    st.plotly_chart(fig_hours, use_container_width=True)

    st.markdown("### Phân tích KB FAQ")
    if faq_df_f.empty:
        st.info("Chưa có FAQ tool calls trong khoảng thời gian này.")
    else:
        faq_summary = {
            "total": len(faq_df_f),
            "answered": int(faq_df_f["answered"].sum()),
            "not_answered": int((~faq_df_f["answered"]).sum()),
            "rate": round(faq_df_f["answered"].mean() * 100, 1),
            "error": int((faq_df_f["result"] == "error").sum()),
        }

        faq_metrics = st.columns(4)
        faq_metrics[0].metric("Lượt gọi FAQ", faq_summary["total"])
        faq_metrics[1].metric("KB có dữ liệu", faq_summary["answered"], delta=f"{faq_summary['rate']}%")
        faq_metrics[2].metric("KB thiếu dữ liệu", faq_summary["not_answered"])
        faq_metrics[3].metric("Lỗi service", faq_summary["error"])

        faq_chart1, faq_chart2 = st.columns([2, 3])
        with faq_chart1:
            fig_faq = go.Figure(
                go.Pie(
                    labels=["KB có dữ liệu", "KB thiếu hoặc lỗi"],
                    values=[faq_summary["answered"], faq_summary["total"] - faq_summary["answered"]],
                    hole=0.62,
                    marker_colors=["#10b981", "#f87171"],
                    textinfo="label+percent",
                )
            )
            fig_faq.update_layout(
                title={"text": "Mức độ đầy đủ KB", "x": 0, "font": {"size": 13, "color": CHART_TEXT}},
                height=280,
                paper_bgcolor=CHART_PAPER,
                font=CHART_FONT,
                margin={"l": 10, "r": 10, "t": 40, "b": 10},
                showlegend=False,
            )
            st.plotly_chart(fig_faq, use_container_width=True)

        with faq_chart2:
            if not daily_faq_df_f.empty:
                fig_faq_daily = go.Figure()
                fig_faq_daily.add_trace(
                    go.Bar(
                        x=daily_faq_df_f["date_vn"].astype(str),
                        y=daily_faq_df_f["answered"],
                        name="KB có dữ liệu",
                        marker_color="#10b981",
                    )
                )
                fig_faq_daily.add_trace(
                    go.Bar(
                        x=daily_faq_df_f["date_vn"].astype(str),
                        y=daily_faq_df_f["not_answered"],
                        name="KB thiếu",
                        marker_color="#f87171",
                    )
                )
                fig_faq_daily.update_layout(
                    **dark_layout(
                        title={"text": "FAQ theo ngày", "x": 0, "font": {"size": 13, "color": CHART_TEXT}},
                        barmode="stack",
                        height=280,
                        margin={"l": 10, "r": 10, "t": 40, "b": 10},
                    )
                )
                st.plotly_chart(fig_faq_daily, use_container_width=True)

        missing_kb = faq_df_f.loc[~faq_df_f["answered"], ["date_vn", "question", "tool_name", "result"]].copy()
        if missing_kb.empty:
            st.success("KB FAQ hiện đủ dữ liệu cho toàn bộ câu hỏi đã gọi FAQ.")
        else:
            missing_kb = missing_kb.rename(
                columns={"date_vn": "Ngày", "question": "Câu hỏi", "tool_name": "Tool", "result": "Kết quả"}
            )
            st.dataframe(missing_kb, use_container_width=True, hide_index=True)

    st.markdown("### Từ khóa nổi bật")
    word_df, bigram_df = build_keywords(df_raw_f, top_n=12)
    kw_col1, kw_col2 = st.columns(2)

    with kw_col1:
        st.markdown("**Từ đơn**")
        if word_df.empty:
            st.info("Chưa có dữ liệu từ khóa.")
        else:
            fig_words = go.Figure(
                go.Bar(
                    x=word_df["count"],
                    y=word_df["keyword"],
                    orientation="h",
                    marker_color="#1d4ed8",
                    text=word_df["count"],
                    textposition="outside",
                )
            )
            fig_words.update_layout(
                **dark_layout(
                    height=360,
                    margin={"l": 10, "r": 40, "t": 10, "b": 10},
                    yaxis={"autorange": "reversed", "gridcolor": CHART_GRID},
                )
            )
            st.plotly_chart(fig_words, use_container_width=True)

    with kw_col2:
        st.markdown("**Cụm 2 từ**")
        if bigram_df.empty:
            st.info("Chưa có dữ liệu cụm từ.")
        else:
            fig_bigrams = go.Figure(
                go.Bar(
                    x=bigram_df["count"],
                    y=bigram_df["keyword"],
                    orientation="h",
                    marker_color="#15803d",
                    text=bigram_df["count"],
                    textposition="outside",
                )
            )
            fig_bigrams.update_layout(
                **dark_layout(
                    height=360,
                    margin={"l": 10, "r": 40, "t": 10, "b": 10},
                    yaxis={"autorange": "reversed", "gridcolor": CHART_GRID},
                )
            )
            st.plotly_chart(fig_bigrams, use_container_width=True)

    st.markdown("### Thống kê người dùng")
    user_df = build_user_stats(df_raw_f, client=get_supabase())
    if user_df.empty:
        st.info("Chưa có phiên nào gắn `user_id` trong khoảng thời gian này.")
    else:
        total_sessions = sess_df_f["session_id"].nunique() if "session_id" in sess_df_f.columns else len(sess_df_f)
        identified_sessions = int(user_df["sessions"].sum())
        unknown_sessions = max(total_sessions - identified_sessions, 0)
        user_metrics = st.columns(4)
        user_metrics[0].metric("User đã xác thực", len(user_df))
        user_metrics[1].metric("Phiên xác định user", identified_sessions)
        user_metrics[2].metric("Phiên chưa xác định", unknown_sessions)
        user_metrics[3].metric("User hoạt động nhiều nhất", user_df.iloc[0]["full_name"])

        st.dataframe(
            user_df.rename(
                columns={
                    "full_name": "Họ tên",
                    "department": "Phòng ban",
                    "email": "Email",
                    "role": "Role",
                    "sessions": "Phiên chat",
                    "total_questions": "Tổng câu hỏi",
                    "days_active": "Ngày active",
                    "faq_calls": "Gọi FAQ",
                    "avg_q_per_session": "TB câu hỏi/phiên",
                }
            ),
            use_container_width=True,
            hide_index=True,
        )

    st.markdown("### Chi tiết phiên chat")
    with st.expander(f"Xem {len(sess_df_f)} phiên", expanded=False):
        if sess_df_f.empty:
            st.info("Không có phiên chat.")
        else:
            display_df = sess_df_f.copy()
            display_df["session_id"] = display_df["session_id"].astype(str).str.slice(0, 16) + "..."
            display_df["Kết quả"] = display_df["bot_answered"].map({True: "Trả lời", False: "Từ chối"})
            st.dataframe(
                display_df.rename(
                    columns={
                        "session_id": "Session ID",
                        "date_vn": "Ngày",
                        "hour_vn": "Giờ (VN)",
                        "n_human": "Tin nhắn user",
                        "n_answered": "Trả lời được",
                        "n_refused": "Từ chối",
                        "n_tool": "Tool calls",
                        "duration_min": "Thời gian (phút)",
                    }
                ),
                use_container_width=True,
                hide_index=True,
                height=340,
            )

    refresh_rate = 30
    st.divider()
    footer_cols = st.columns(3)
    footer_cols[0].caption(f"{len(sess_df_f)} phiên | {len(qa_df_f)} lượt hỏi đáp")
    footer_cols[1].caption(f"Cập nhật: {datetime.now(VN_TZ).strftime('%d/%m/%Y %H:%M:%S')} (VN)")
    footer_cols[2].caption(f"Tự refresh sau {refresh_rate}s")

    time.sleep(refresh_rate)
    st.rerun()


st.set_page_config(
    page_title="Trang Nguyen AI Dashboard",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
[data-testid="stMetricValue"] { font-size: 2rem !important; font-weight: 700; color: #0f172a !important; }
[data-testid="stMetricLabel"] { font-size: 0.78rem !important; font-weight: 600; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.6px; }
[data-testid="metric-container"] { background: #f8fafc; border-radius: 12px; padding: 16px 20px; border: 1px solid #e2e8f0; }
section[data-testid="stSidebar"] { background: #f1f5f9 !important; }
section[data-testid="stSidebar"] * { color: #1e293b !important; }
.block-container { padding-top: 1.5rem !important; }
h1 { font-size: 1.7rem !important; color: #0f172a !important; }
</style>
    """,
    unsafe_allow_html=True,
)


with st.sidebar:
    st.markdown("## Trang Nguyen AI")
    st.markdown("##### CRM Dashboard")
    st.divider()
    page = st.radio("Trang", ["Dashboard", "Quản lý tri thức"], label_visibility="collapsed")
    st.divider()
    st.radio("Khoảng thời gian", ["Tất cả", "7 ngày gần nhất", "30 ngày gần nhất"], key="date_filter")
    st.divider()
    st.success(f"LIVE | {datetime.now(VN_TZ).strftime('%H:%M:%S')}")
    st.caption("Auto-refresh 30 giây | UTC+7")


if page == "Dashboard":
    render_dashboard_page()
else:
    render_kb_page(get_supabase())
