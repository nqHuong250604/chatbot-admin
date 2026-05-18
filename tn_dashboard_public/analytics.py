"""
analytics.py — Core thống kê từ Supabase chat_history
Tất cả logic parse & aggregate ở đây, tách biệt với UI
"""
from __future__ import annotations
import json
import os
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

VN_TZ = timezone(timedelta(hours=7))

# ── Keyword patterns để classify AI response ────────────────────
_REFUSED_PATTERNS = [
    'không tìm', 'không có thông tin', 'không thể trả lời',
    'xin lỗi, tôi chỉ', 'ngoài phạm vi', 'chưa được cập nhật',
    'sự cố kỹ thuật', 'chưa có trong hệ thống', 'chưa có thông tin',
    'chưa cập nhật', 'chưa cập nhật thông tin',
]
def _has_refusal_intent(content: str, patterns: list[str]) -> bool:
    text = str(content or '').lower().strip()
    if not text:
        return False
    # A useful answer can mention missing information later as a note.
    # Treat it as refusal only when refusal language appears up front.
    opening = text[:320]
    if any(pattern in opening for pattern in patterns):
        return True
    return bool(re.search(r'(hiện tại|hiện nay|em|mình|tôi|hệ thống).{0,80}chưa.{0,80}thông tin', opening))


def _parse_msg(msg) -> dict:
    """Parse message — hỗ trợ cả string JSON lẫn dict (Supabase jsonb tự parse)."""
    if isinstance(msg, dict):
        return msg
    if isinstance(msg, str):
        try:    return json.loads(msg)
        except: return {}
    return {}

def _get_type(msg) -> str:
    return _parse_msg(msg).get('type', '')

def _get_content(msg) -> str:
    return _parse_msg(msg).get('content', '')

def _get_name(msg) -> str:
    return _parse_msg(msg).get('name', '')

def _is_faq_tool_name(name: str) -> bool:
    normalized = re.sub(r'[\s\-]+', '_', (name or '').strip().lower())
    return normalized in {'supabase_vector_store', 'supabase_vector_store_public'} or normalized.startswith('supabase_vector_store_')

def _classify_ai(content: str) -> str:
    c = content.lower()
    if _has_refusal_intent(c, _REFUSED_PATTERNS):
        return 'refused'
    if content.startswith('Calling '):
        return 'tool_call'
    if len(content.strip()) < 10:
        return 'short'
    return 'answered'

def _is_meaningful_question(text: str) -> bool:
    t = text.strip().lower()
    if re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', t): return False  # email
    if re.match(r'^\d+$', t):                      return False  # chỉ số
    if len(t) < 5:                                  return False
    if t in {'xin chào','hi','hello','chào','ok','okay',
              'có','không','thanks','cảm ơn','xin chao'}:
        return False
    return True


# ════════════════════════════════════════════════════════════════
# DATA FETCHER
# ════════════════════════════════════════════════════════════════

# ── CẤU HÌNH TÊN BẢNG & CỘT ─────────────────────────────────
# Supabase gợi ý tên bảng thật: n8n_chat_histories
# Nếu tên cột khác, chỉ cần sửa COL_MAP bên dưới

TABLE_NAME = "history_public_chat"   # <-- tên bảng thật trên Supabase

# key   = tên cột trên Supabase
# value = tên chuẩn dùng trong code (KHÔNG đổi value)
COL_MAP = {
    "id"         : "id",
    "session_id" : "session_id",
    "message"    : "message",
    "created_at" : "created_at",
}

# Public dashboard khong co cot user_id trong bang chat_history_rows.
USER_ID_COLUMN_EXISTS = False


def fetch_raw(client: Client) -> pd.DataFrame:
    """Lấy toàn bộ chat_history từ Supabase, trả về DataFrame gốc."""
    base_cols = ["id", "session_id", "message", "created_at"]
    if USER_ID_COLUMN_EXISTS:
        base_cols.append("user_id")
    select_cols = ", ".join(base_cols)
    page_size = 1000

    # Retry tối đa 3 lần nếu Supabase trả lỗi 502/503
    last_error = None
    for attempt in range(3):
        try:
            all_rows = []
            offset = 0

            while True:
                response = (
                    client.table(TABLE_NAME)
                    .select(select_cols)
                    .order("created_at", desc=False)
                    .range(offset, offset + page_size - 1)
                    .execute()
                )
                batch = response.data or []
                all_rows.extend(batch)

                if len(batch) < page_size:
                    break
                offset += page_size
            break
        except Exception as e:
            last_error = e
            import time
            time.sleep(2 * (attempt + 1))  # 2s, 4s, 6s
    else:
        raise last_error

    if not all_rows:
        return pd.DataFrame(columns=list(COL_MAP.values()))

    df = pd.DataFrame(all_rows)
    df = df.rename(columns=COL_MAP)   # map về tên chuẩn

    df['msg_type']   = df['message'].apply(_get_type)
    df['tool_name']  = df['message'].apply(_get_name)
    df['content']    = df['message'].apply(_get_content)
    df['created_at'] = pd.to_datetime(df['created_at'], utc=True)
    df['created_vn'] = df['created_at'].dt.tz_convert(VN_TZ)
    df['date_vn']    = df['created_vn'].dt.date
    df['hour_vn']    = df['created_vn'].dt.hour
    # Đảm bảo cột user_id luôn tồn tại dù không fetch từ DB
    if 'user_id' not in df.columns:
        df['user_id'] = None
    return df


# ════════════════════════════════════════════════════════════════
# AGGREGATE FUNCTIONS
# ════════════════════════════════════════════════════════════════
def build_sessions(df: pd.DataFrame) -> pd.DataFrame:
    """1 dòng = 1 session với đầy đủ stats."""
    sessions = []
    for sid, grp in df.groupby('session_id'):
        grp    = grp.sort_values('created_at')
        ai_grp = grp[grp['msg_type'] == 'ai'].copy()
        ai_grp['rtype'] = ai_grp['content'].apply(_classify_ai)

        n_human    = len(grp[grp['msg_type'] == 'human'])
        n_tool     = len(grp[grp['msg_type'] == 'tool'])
        n_answered = len(ai_grp[ai_grp['rtype'] == 'answered'])
        n_refused  = len(ai_grp[ai_grp['rtype'] == 'refused'])

        first_msg    = grp['created_at'].min()
        last_msg     = grp['created_at'].max()
        duration_min = round((last_msg - first_msg).total_seconds() / 60, 1)

        sessions.append({
            'session_id'  : sid,
            'date_vn'     : grp['date_vn'].iloc[0],
            'hour_vn'     : grp['hour_vn'].iloc[0],
            'n_human'     : n_human,
            'n_tool'      : n_tool,
            'n_answered'  : n_answered,
            'n_refused'   : n_refused,
            'bot_answered': n_answered > 0,
            'duration_min': duration_min,
        })

    return pd.DataFrame(sessions).sort_values('date_vn').reset_index(drop=True)


def build_qa_pairs(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tách thành từng cặp hỏi-đáp (Q&A pair).
    1 dòng = 1 lần user hỏi có nghĩa + kết quả cuối cùng của bot.

    Flow thật: User hỏi → Bot hỏi email → User nhập email → Bot gọi tool → Bot trả lời
    Nên không lấy AI response ngay tiếp theo mà phải lấy AI response cuối cùng
    trước khi user hỏi câu tiếp theo (hoặc cuối session).
    """
    pairs = []
    for sid, grp in df.groupby('session_id'):
        grp = grp.sort_values('created_at').reset_index(drop=True)

        # Lấy index của tất cả human messages có nghĩa
        human_indices = [
            i for i, row in grp.iterrows()
            if row['msg_type'] == 'human' and _is_meaningful_question(row['content'])
        ]

        for k, i in enumerate(human_indices):
            row = grp.loc[i]

            # Xác định vùng tìm kiếm: từ sau câu hỏi này đến trước câu hỏi tiếp theo
            next_q_idx = human_indices[k + 1] if k + 1 < len(human_indices) else len(grp)

            # Lấy tất cả AI responses trong vùng đó (sau câu hỏi, trước câu hỏi kế)
            ai_in_range = grp[
                (grp.index > i) &
                (grp.index < next_q_idx) &
                (grp['msg_type'] == 'ai')
            ]

            if ai_in_range.empty:
                continue

            # Lấy AI response cuối cùng có nghĩa vì đây là kết quả thật user nhìn thấy.
            best_ai = None
            best_rtype = ''
            for _, ai_row in ai_in_range.iterrows():
                rtype = _classify_ai(ai_row['content'])
                if rtype in ('tool_call', 'short'):
                    continue
                best_ai = ai_row
                best_rtype = rtype

            if best_ai is None:
                # Chỉ có tool_call/short, không có kết quả thật → bỏ qua
                continue

            final_answered = best_rtype == 'answered'
            final_result   = best_rtype

            pairs.append({
                'session_id': sid,
                'date_vn'   : row['date_vn'],
                'hour_vn'   : row['hour_vn'],
                'question'  : row['content'].strip(),
                'answer'    : best_ai['content'].strip()[:200],
                'result'    : final_result,
                'answered'  : final_answered,
                'asked_at'  : row['created_at'],
            })

    return pd.DataFrame(pairs).sort_values('date_vn').reset_index(drop=True)


def build_daily(sess_df: pd.DataFrame) -> pd.DataFrame:
    """Tổng hợp theo ngày."""
    if sess_df.empty:
        return pd.DataFrame()
    daily = sess_df.groupby('date_vn').agg(
        total_sessions   = ('session_id', 'count'),
        total_human_msgs = ('n_human', 'sum'),
        bot_answered     = ('bot_answered', 'sum'),
        avg_turns        = ('n_human', 'mean'),
        avg_duration     = ('duration_min', 'mean'),
        tool_calls_total = ('n_tool', 'sum'),
    ).reset_index()
    daily['bot_refused']  = daily['total_sessions'] - daily['bot_answered']
    daily['answer_rate']  = (daily['bot_answered'] / daily['total_sessions'] * 100).round(1)
    daily['avg_turns']    = daily['avg_turns'].round(1)
    daily['avg_duration'] = daily['avg_duration'].round(1)
    return daily.sort_values('date_vn').reset_index(drop=True)


def _parse_tool_result(content: str) -> str:
    """
    Parse kết quả tool message:
    - 'answered' : FAQ trả về output có nội dung
    - 'error'    : Service unavailable / lỗi
    - 'empty'    : Output rỗng
    """
    try:
        data = json.loads(content)
        if isinstance(data, list) and data:
            item = data[0]
            if 'output' in item:
                return 'answered' if len(item['output'].strip()) > 20 else 'empty'
            if 'response' in item:
                return 'error'
    except:
        pass
    return 'empty'


def _extract_call_id(content: str) -> str:
    """Lấy call_id từ AI message 'Calling faq with input: {..., "id": "call_xxx"}'"""
    import re
    m = re.search(r'"id"\s*:\s*"(call_[^"]+)"', content)
    return m.group(1) if m else ''


_FINAL_REFUSED = [
    'không tìm', 'không có thông tin', 'không thể trả lời',
    'xin lỗi, tôi chỉ', 'ngoài phạm vi', 'chưa được cập nhật', 'sự cố kỹ thuật',
    'chưa có trong hệ thống', 'chưa có thông tin',
    'chưa cập nhật', 'chưa cập nhật thông tin',
]

def _classify_final_ai(content: str) -> str:
    """Classify AI response cuối cùng sau khi tool đã chạy xong."""
    c = content.lower()
    if _has_refusal_intent(c, _FINAL_REFUSED):
        return 'refused'
    if content.startswith('Calling '):
        return 'tool_call'
    if len(content.strip()) < 10:
        return 'short'
    return 'answered'


def _is_faq_tool_row(row: pd.Series) -> bool:
    return row.get('msg_type') == 'tool' and _is_faq_tool_name(str(row.get('tool_name', '')))


def build_faq_pairs(df: pd.DataFrame) -> pd.DataFrame:
    """
    Thống kê độ hoàn thiện KB FAQ.
    Chỉ tính các lượt bot gọi tool faq/faq_public.

    Kết quả dựa trên AI response CUỐI CÙNG sau tool call
    (không phải tool output) vì AI có thể nhận tool output
    nhưng vẫn kết luận "không có thông tin".

    answered = AI trả lời được sau khi gọi FAQ
    refused  = AI nói không có dữ liệu dù đã gọi FAQ → cần bổ sung KB
    """
    df = df.copy()

    human_indices_per_session = {}
    for sid, grp in df.groupby('session_id'):
        grp = grp.sort_values('created_at').reset_index(drop=True)
        human_indices_per_session[sid] = [
            i for i, r in grp.iterrows()
            if r['msg_type'] == 'human' and _is_meaningful_question(r['content'])
        ]

    pairs = []
    for sid, grp in df.groupby('session_id'):
        grp = grp.sort_values('created_at').reset_index(drop=True)
        human_indices = human_indices_per_session[sid]

        faq_ai_rows = grp[grp.apply(_is_faq_tool_row, axis=1)]
        if faq_ai_rows.empty:
            continue

        faq_indexes = faq_ai_rows.index.tolist()

        for _, faq_row in faq_ai_rows.iterrows():
            faq_idx = faq_row.name

            # Câu hỏi human thật gần nhất trước faq call
            prev_real = [i for i in human_indices if i < faq_idx]
            question  = grp.loc[prev_real[-1], 'content'] if prev_real else '(không rõ)'

            # Ranh giới tìm AI response: lấy đến câu hỏi tiếp theo.
            # Một câu hỏi có thể gọi FAQ nhiều lần; phản hồi cuối thường nằm sau tool cuối.
            next_human = next((i for i in human_indices if i > faq_idx), len(grp))

            # AI responses thật sau faq call (bỏ tool_call intermediates)
            ai_after = grp[
                (grp.index > faq_idx) &
                (grp.index < next_human) &
                (grp['msg_type'] == 'ai') &
                (~grp['content'].str.startswith('Calling ', na=False))
            ]

            if ai_after.empty:
                result = 'error'
            else:
                # Lấy AI response cuối cùng trong vùng đó
                result = _classify_final_ai(ai_after.iloc[-1]['content'])

            if result in ('tool_call', 'short'):
                result = 'error'

            tool_name = faq_row.get('tool_name') or 'Supabase_Vector_Store'

            pairs.append({
                'session_id': sid,
                'date_vn'   : faq_row['date_vn'],
                'hour_vn'   : faq_row['hour_vn'],
                'question'  : question.strip(),
                'tool_name' : tool_name,
                'answered'  : result == 'answered',
                'result'    : result,
                'asked_at'  : faq_row['created_at'],
            })

    return pd.DataFrame(pairs).sort_values('date_vn').reset_index(drop=True) if pairs else pd.DataFrame()


def build_daily_from_faq(faq_df: pd.DataFrame) -> pd.DataFrame:
    """Tổng hợp theo ngày từ faq_pairs."""
    if faq_df.empty:
        return pd.DataFrame()
    daily = faq_df.groupby('date_vn').agg(
        total_faq   = ('session_id', 'count'),
        answered    = ('answered', 'sum'),
    ).reset_index()
    daily['not_answered'] = daily['total_faq'] - daily['answered']
    daily['answer_rate']  = (daily['answered'] / daily['total_faq'] * 100).round(1)
    return daily.sort_values('date_vn').reset_index(drop=True)


def _normalize_question_for_grouping(question: str) -> str:
    text = str(question or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _question_tokens(question: str) -> set[str]:
    stopwords = {
        "toi", "ban", "cho", "hoi", "giup", "duoc", "khong", "co", "la", "ve",
        "cua", "nhu", "the", "nao", "o", "tai", "trong", "va", "hay", "can",
        "muon", "minh", "em", "anh", "chi", "a", "nhe",
    }
    return {
        token
        for token in _normalize_question_for_grouping(question).split()
        if len(token) >= 2 and token not in stopwords
    }


def _question_similarity(left: str, right: str) -> float:
    left_norm = _normalize_question_for_grouping(left)
    right_norm = _normalize_question_for_grouping(right)
    if not left_norm or not right_norm:
        return 0.0
    if left_norm == right_norm:
        return 1.0

    left_tokens = _question_tokens(left_norm)
    right_tokens = _question_tokens(right_norm)
    token_score = 0.0
    if left_tokens and right_tokens:
        token_score = len(left_tokens & right_tokens) / len(left_tokens | right_tokens)

    sequence_score = SequenceMatcher(None, left_norm, right_norm).ratio()
    return max(token_score, sequence_score)


def build_missing_question_groups(
    missing_df: pd.DataFrame,
    similarity_threshold: float = 0.72,
    max_examples: int = 5,
) -> pd.DataFrame:
    """Group unanswered questions into similar clusters for easier review."""
    if missing_df.empty or "question" not in missing_df.columns:
        return pd.DataFrame()

    rows = missing_df.copy()
    rows["question"] = rows["question"].fillna("").astype(str).str.strip()
    rows = rows[rows["question"].astype(bool)]
    if rows.empty:
        return pd.DataFrame()

    clusters: list[dict[str, Any]] = []
    for _, row in rows.sort_values("date_vn").iterrows():
        question = str(row["question"]).strip()
        best_cluster = None
        best_score = 0.0

        for cluster in clusters:
            score = _question_similarity(question, cluster["representative_question"])
            if score > best_score:
                best_score = score
                best_cluster = cluster

        if best_cluster is not None and best_score >= similarity_threshold:
            best_cluster["rows"].append(row.to_dict())
            best_cluster["questions"].append(question)
            if len(question) < len(best_cluster["representative_question"]):
                best_cluster["representative_question"] = question
            continue

        clusters.append(
            {
                "representative_question": question,
                "questions": [question],
                "rows": [row.to_dict()],
            }
        )

    grouped_rows = []
    for index, cluster in enumerate(clusters, start=1):
        cluster_rows = cluster["rows"]
        questions = cluster["questions"]
        unique_questions = list(dict.fromkeys(questions))
        dates = [item.get("date_vn") for item in cluster_rows if item.get("date_vn") is not None]
        results = pd.Series([item.get("result") for item in cluster_rows]).value_counts().to_dict()
        tools = pd.Series([item.get("tool_name") for item in cluster_rows]).dropna().astype(str)

        grouped_rows.append(
            {
                "cluster_id": index,
                "representative_question": cluster["representative_question"],
                "count": len(questions),
                "unique_count": len(unique_questions),
                "examples": unique_questions[:max_examples],
                "first_seen": min(dates) if dates else None,
                "last_seen": max(dates) if dates else None,
                "result_counts": results,
                "tool_names": tools.drop_duplicates().tolist(),
            }
        )

    grouped = pd.DataFrame(grouped_rows)
    if grouped.empty:
        return grouped
    return grouped.sort_values(
        ["count", "unique_count", "representative_question"],
        ascending=[False, False, True],
    ).reset_index(drop=True)


def build_daily_from_qa(qa_df: pd.DataFrame) -> pd.DataFrame:
    """
    Tổng hợp theo ngày dựa trên QA pairs — chính xác hơn theo phiên.
    Mỗi lượt hỏi được đếm độc lập, không bị ảnh hưởng bởi các câu khác trong phiên.
    """
    if qa_df.empty:
        return pd.DataFrame()

    qa_df = qa_df.copy()
    qa_df['refused_flag'] = qa_df['result'].eq('refused') if 'result' in qa_df.columns else ~qa_df['answered']

    daily = qa_df.groupby('date_vn').agg(
        total_qa     = ('session_id', 'count'),
        answered     = ('answered', 'sum'),
        refused      = ('refused_flag', 'sum'),
        unique_sessions = ('session_id', 'nunique'),
    ).reset_index()

    daily['answer_rate'] = (daily['answered'] / daily['total_qa'] * 100).round(1)
    return daily.sort_values('date_vn').reset_index(drop=True)


def build_top_questions(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Top N câu hỏi được hỏi nhiều nhất."""
    human_df = df[df['msg_type'] == 'human'].copy()
    human_df = human_df[human_df['content'].apply(_is_meaningful_question)]
    top = (human_df['content'].str.strip()
           .value_counts()
           .head(n)
           .reset_index())
    top.columns = ['question', 'count']
    return top


def build_refused_questions(df: pd.DataFrame, sess_df: pd.DataFrame) -> pd.DataFrame:
    """Câu hỏi trong các phiên bot từ chối."""
    ai_df = df[df['msg_type'] == 'ai'].copy()
    ai_df['rtype'] = ai_df['content'].apply(_classify_ai)
    refused_sids = ai_df[ai_df['rtype'] == 'refused']['session_id'].unique()

    human_df = df[df['msg_type'] == 'human'].copy()
    human_df = human_df[human_df['session_id'].isin(refused_sids)]
    human_df = human_df[human_df['content'].apply(_is_meaningful_question)]

    top = (human_df['content'].str.strip()
           .value_counts()
           .head(10)
           .reset_index())
    top.columns = ['question', 'count']
    return top


def build_hour_dist(sess_df: pd.DataFrame) -> pd.DataFrame:
    """Phân bố phiên theo giờ (giờ VN)."""
    if sess_df.empty:
        return pd.DataFrame({'hour_vn': list(range(24)), 'count': [0]*24})
    dist = (sess_df.groupby('hour_vn')['session_id']
            .count()
            .reindex(range(24), fill_value=0)
            .reset_index())
    dist.columns = ['hour_vn', 'count']
    return dist



def build_response_time(df: pd.DataFrame) -> dict:
    """
    Tính thời gian phản hồi = khoảng cách giữa 2 lượt human liên tiếp.
    (n8n insert batch nên timestamp human→ai chênh nhau ~50ms, không dùng được)
    Dùng chu kỳ human→human để ước lượng tổng thời gian bot xử lý + user đọc.
    Lọc: 10s < delta < 600s để bỏ outlier.
    """
    turn_times = []
    for sid, grp in df.groupby('session_id'):
        grp = grp.sort_values('created_at').reset_index(drop=True)
        humans = grp[grp['msg_type'] == 'human']['created_at'].tolist()
        for i in range(1, len(humans)):
            delta = (humans[i] - humans[i-1]).total_seconds()
            if 10 < delta < 600:
                turn_times.append(delta)

    if not turn_times:
        return {'avg': 0, 'median': 0, 'fast': 0, 'normal': 0, 'slow': 0, 'total': 0}

    rt = pd.Series(turn_times)
    return {
        'avg'    : round(rt.mean(), 1),
        'median' : round(rt.median(), 1),
        'fast'   : int((rt < 30).sum()),           # < 30s
        'normal' : int(((rt >= 30) & (rt < 120)).sum()),  # 30–120s
        'slow'   : int((rt >= 120).sum()),          # > 120s
        'total'  : len(rt),
        'series' : rt.tolist(),
    }


def build_keywords(df: pd.DataFrame, top_n: int = 15) -> tuple:
    """
    Trả về (word_freq, bigram_freq) — top từ khóa và cụm từ từ câu hỏi của user.
    """
    import re
    from collections import Counter

    STOPWORDS = {
        'tôi','bạn','của','có','không','và','là','được','cho','trong',
        'các','một','này','với','về','để','thì','như','nào','gì','thế',
        'ở','khi','hay','cũng','đã','sẽ','đang','những','từ','rồi',
        'vậy','lại','mà','ra','vào','lên','xuống','nhé','ạ','nhỉ',
        'ơi','à','ừ','dạ','vâng','okay','ok','hi','hello','xin','chào',
        'helo','cảm','ơn','thanks','xem','giúp','muốn','cần','hỏi','thể',
        'chao','biết','đây','đó','làm','theo','sau','trên','dưới','giờ',
    }

    def is_real(text):
        t = text.strip().lower()
        if re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', t): return False
        if re.match(r'^[a-z0-9]{6}$', t): return False
        if re.match(r'^\d+$', t): return False
        if len(t) < 5: return False
        return True

    real_msgs = df[(df['msg_type'] == 'human') & df['content'].apply(is_real)]['content']

    all_words, bigrams = [], []
    for msg in real_msgs:
        words = re.findall(r'[a-zA-ZÀ-ỹ]{3,}', msg.lower())
        words = [w for w in words if w not in STOPWORDS]
        all_words.extend(words)
        bigrams.extend([f'{a} {b}' for a, b in zip(words, words[1:])])

    word_freq   = pd.DataFrame(Counter(all_words).most_common(top_n),  columns=['keyword', 'count'])
    bigram_freq = pd.DataFrame(Counter(bigrams).most_common(top_n),    columns=['keyword', 'count'])
    return word_freq, bigram_freq


def build_user_stats(df: pd.DataFrame, client: Client = None) -> pd.DataFrame:
    """
    Thống kê mức độ sử dụng theo từng user đã xác thực.

    Logic mới: đọc trực tiếp từ cột user_id trong chat_history_rows
    (đã được n8n ghi khi xác thực thành công), rồi JOIN với bảng users
    để lấy thông tin full_name, department, role.

    Fallback: nếu bảng users không truy cập được (client=None),
    chỉ thống kê theo user_id mà không có thông tin chi tiết.
    """
    # Chỉ lấy rows có user_id
    df_user = df[df['user_id'].notna()].copy()
    if df_user.empty:
        return pd.DataFrame()

    # Lấy danh sách user_id duy nhất
    user_ids = df_user['user_id'].dropna().unique().tolist()
    user_ids = [int(uid) for uid in user_ids if uid is not None]

    # Fetch thông tin users từ Supabase nếu có client
    user_map: dict = {}
    if client is not None:
        try:
            resp = client.table('users')                 .select('id, secret_code, full_name, department, email, role')                 .in_('id', user_ids)                 .execute()
            if resp.data:
                for u in resp.data:
                    user_map[u['id']] = {
                        'secret_code': u.get('secret_code', ''),
                        'full_name'  : u.get('full_name', f"User {u['id']}"),
                        'department' : u.get('department', ''),
                        'email'      : u.get('email', ''),
                        'role'       : u.get('role', 'guest'),
                    }
        except Exception:
            pass  # fallback xuống dưới nếu lỗi

    rows = []
    for uid, grp in df_user.groupby('user_id'):
        uid_int  = int(uid)
        info     = user_map.get(uid_int, {})
        sessions = grp['session_id'].nunique()
        msgs     = grp[grp['msg_type'] == 'human'].shape[0]
        days     = grp['date_vn'].nunique()
        faq      = grp[grp.apply(_is_faq_tool_row, axis=1)].shape[0]
        first    = grp['created_at'].min()
        last     = grp['created_at'].max()

        rows.append({
            'user_id'          : uid_int,
            'secret_code'      : info.get('secret_code', ''),
            'full_name'        : info.get('full_name', f"User {uid_int}"),
            'department'       : info.get('department', ''),
            'email'            : info.get('email', ''),
            'role'             : info.get('role', 'guest'),
            'sessions'         : sessions,
            'total_questions'  : msgs,
            'days_active'      : days,
            'faq_calls'        : faq,
            'first_seen'       : first,
            'last_seen'        : last,
            'avg_q_per_session': round(msgs / sessions, 1) if sessions else 0,
        })

    return pd.DataFrame(rows).sort_values('sessions', ascending=False).reset_index(drop=True)

def get_kpis(sess_df: pd.DataFrame, qa_df: pd.DataFrame = None) -> dict[str, Any]:
    """
    KPI tổng hợp.
    - Dùng qa_df để tính tỉ lệ trả lời chính xác theo từng lượt hỏi.
    - Dùng sess_df để tính số phiên, thời gian, turns.
    """
    if sess_df.empty:
        return {}

    # Thống kê phiên
    total_sess = len(sess_df)
    avg_turns  = round(sess_df['n_human'].mean(), 1)
    avg_dur    = round(sess_df['duration_min'].mean(), 1)
    total_msg  = int(sess_df['n_human'].sum())
    tools      = int(sess_df['n_tool'].sum())

    # Thống kê Q&A (chính xác hơn)
    if qa_df is not None and not qa_df.empty:
        total_qa = len(qa_df)
        answered = int(qa_df['answered'].sum())
        refused  = int(qa_df['result'].eq('refused').sum()) if 'result' in qa_df.columns else total_qa - answered
        rate     = round(answered / total_qa * 100, 1) if total_qa else 0

        # Trend 7 ngày
        qa2 = qa_df.copy()
        qa2['date_vn'] = pd.to_datetime(qa2['date_vn'])
        latest = qa2['date_vn'].max()
        last7  = qa2[qa2['date_vn'] > latest - pd.Timedelta(days=7)]
        prev7  = qa2[(qa2['date_vn'] > latest - pd.Timedelta(days=14)) &
                     (qa2['date_vn'] <= latest - pd.Timedelta(days=7))]
        last7_rate = (last7['answered'].sum() / len(last7) * 100) if len(last7) else 0
        prev7_rate = (prev7['answered'].sum() / len(prev7) * 100) if len(prev7) else 0
        trend_rate = round(last7_rate - prev7_rate, 1)
    else:
        # Fallback về thống kê phiên nếu không có qa_df
        total_qa = total_sess
        answered = int(sess_df['bot_answered'].sum())
        refused  = total_qa - answered
        rate     = round(answered / total_qa * 100, 1) if total_qa else 0
        trend_rate = 0.0

    # Trend sessions
    s2 = sess_df.copy()
    s2['date_vn'] = pd.to_datetime(s2['date_vn'])
    latest_s = s2['date_vn'].max()
    trend_sessions = (
        len(s2[s2['date_vn'] > latest_s - pd.Timedelta(days=7)]) -
        len(s2[(s2['date_vn'] > latest_s - pd.Timedelta(days=14)) &
               (s2['date_vn'] <= latest_s - pd.Timedelta(days=7))])
    )

    return {
        'total_sessions' : total_sess,
        'total_qa'       : total_qa,
        'total_messages' : total_msg,
        'bot_answered'   : answered,
        'bot_refused'    : refused,
        'answer_rate'    : rate,
        'avg_turns'      : avg_turns,
        'avg_duration'   : avg_dur,
        'total_tools'    : tools,
        'trend_sessions' : trend_sessions,
        'trend_rate'     : trend_rate,
    }
