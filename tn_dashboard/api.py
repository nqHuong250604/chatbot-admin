"""
api.py — REST API cho Trạng Nguyên AI Dashboard
Dành cho Frontend tích hợp

Chạy:
    # Set credentials trước
    set SUPABASE_URL=https://your-project.supabase.co
    set SUPABASE_KEY=your-anon-key

    # Chạy API
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload

Docs: http://localhost:8000/docs
"""
from __future__ import annotations

import os
import random
import re
import smtplib
import uuid
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client

from analytics import (
    TABLE_NAME,
    fetch_raw,
    build_sessions,
    build_daily,
    build_qa_pairs,
    build_daily_from_qa,
    build_faq_pairs,
    build_daily_from_faq,
    build_hour_dist,
    build_keywords,
    build_user_stats,
    get_kpis,
)

# ── App ───────────────────────────────────────────────────────
load_dotenv()

VN_TZ = timezone(timedelta(hours=7))
INTERNAL_EMAIL_DOMAIN = os.getenv("INTERNAL_EMAIL_DOMAIN", "@trangnguyen.edu.vn").strip().lower()
SUPABASE_USERS_TABLE = os.getenv("SUPABASE_USERS_TABLE", "users").strip() or "users"
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "10").strip('"') or "10")
OTP_RESEND_SECONDS = int(os.getenv("OTP_RESEND_SECONDS", "60").strip('"') or "60")
AUTH_SESSION_TTL_HOURS = int(os.getenv("AUTH_SESSION_TTL_HOURS", "12").strip('"') or "12")
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "dashboard_access_token").strip().strip('"') or "dashboard_access_token"
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").strip().strip('"').lower() == "true"
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "lax").strip().strip('"').lower() or "lax"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]

OTP_STORE: dict[str, dict[str, Any]] = {}
AUTH_SESSIONS: dict[str, dict[str, Any]] = {}

app = FastAPI(
    title="Trạng Nguyên AI — Dashboard API",
    description="API cung cấp dữ liệu thống kê chatbot nội bộ cho Frontend",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ── Supabase client ───────────────────────────────────────────
def get_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_KEY"
        )
    return create_client(url, key)


class AuthOtpRequest(BaseModel):
    email: str = Field(..., description="Email admin noi bo")


class AuthOtpVerifyRequest(BaseModel):
    email: str = Field(..., description="Email da request OTP")
    otp_code: str = Field(..., min_length=6, max_length=6, description="Ma OTP 6 chu so")


def normalize_email(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def ensure_valid_email(email: str) -> str:
    normalized = normalize_email(email)
    if not normalized or "@" not in normalized or "." not in normalized.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="Email khong hop le")
    return normalized


def is_internal_email(email: str) -> bool:
    return normalize_email(email).endswith(INTERNAL_EMAIL_DOMAIN)


def now_vn() -> datetime:
    return datetime.now(VN_TZ)


def public_user_profile(profile: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": profile.get("id"),
        "email": normalize_email(profile.get("email")),
        "full_name": normalize_text(profile.get("full_name")) or None,
        "department": normalize_text(profile.get("department")) or None,
        "role": normalize_text(profile.get("role")).lower() or None,
    }


def fetch_admin_user(email: str) -> dict[str, Any]:
    try:
        response = (
            get_client()
            .table(SUPABASE_USERS_TABLE)
            .select("id,email,full_name,department,role")
            .ilike("email", email)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Khong kiem tra duoc Supabase users: {exc}") from exc

    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=403, detail="Email nay khong ton tai trong bang users")

    profile = rows[0]
    if normalize_text(profile.get("role")).lower() != "admin":
        raise HTTPException(status_code=403, detail="Chi tai khoan co role admin moi duoc dang nhap dashboard")

    return public_user_profile(profile)


def generate_otp_code() -> str:
    return f"{random.SystemRandom().randint(0, 999999):06d}"


def read_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip().strip('"')


def read_bool_env(name: str, default: bool = False) -> bool:
    value = read_env(name, "true" if default else "false").lower()
    return value in {"1", "true", "yes", "on"}


def send_otp_email(email: str, code: str) -> None:
    smtp_host = read_env("SMTP_HOST")
    smtp_port = int(read_env("SMTP_PORT", "587") or "587")
    smtp_username = read_env("SMTP_USERNAME")
    smtp_password = read_env("SMTP_PASSWORD")
    smtp_from_email = read_env("SMTP_FROM_EMAIL", smtp_username)
    smtp_from_name = read_env("SMTP_FROM_NAME", "Trang Nguyen Dashboard")
    smtp_use_tls = read_bool_env("SMTP_USE_TLS", True)
    smtp_use_ssl = read_bool_env("SMTP_USE_SSL", False)

    missing = [
        name
        for name, value in {
            "SMTP_HOST": smtp_host,
            "SMTP_USERNAME": smtp_username,
            "SMTP_PASSWORD": smtp_password,
            "SMTP_FROM_EMAIL": smtp_from_email,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(status_code=500, detail=f"Thieu cau hinh SMTP: {', '.join(missing)}")

    message = EmailMessage()
    message["Subject"] = "Ma xac thuc dang nhap Dashboard Trang Nguyen"
    message["From"] = f"{smtp_from_name} <{smtp_from_email}>"
    message["To"] = email
    message.set_content(
        "\n".join(
            [
                "Ma xac thuc dang nhap dashboard cua ban la:",
                "",
                code,
                "",
                f"Ma co hieu luc trong {OTP_TTL_MINUTES} phut.",
                "Neu ban khong thuc hien dang nhap, hay bo qua email nay.",
            ]
        )
    )

    smtp_class = smtplib.SMTP_SSL if smtp_use_ssl else smtplib.SMTP
    try:
        with smtp_class(smtp_host, smtp_port, timeout=20) as server:
            if smtp_use_tls and not smtp_use_ssl:
                server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Khong the gui email OTP: {exc}") from exc


def read_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Thieu header Authorization")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Authorization phai co dang Bearer <token>")
    return token.strip()


def resolve_auth_token(authorization: str | None, cookie_token: str | None) -> str:
    if authorization:
        return read_bearer_token(authorization)
    if cookie_token:
        return cookie_token.strip()
    raise HTTPException(status_code=401, detail="Chua dang nhap hoac thieu token")


def require_admin_session(
    authorization: str | None = Header(default=None),
    cookie_token: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
) -> dict[str, Any]:
    token = resolve_auth_token(authorization, cookie_token)
    session = AUTH_SESSIONS.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Session khong ton tai hoac da dang xuat")
    expires_at = session.get("expires_at")
    if not isinstance(expires_at, datetime) or now_vn() > expires_at:
        AUTH_SESSIONS.pop(token, None)
        raise HTTPException(status_code=401, detail="Session da het han")
    return session


# ── Helpers ───────────────────────────────────────────────────
def safe_records(df) -> list:
    """Chuyển DataFrame → list[dict], xử lý date/datetime/NaN."""
    if df is None or (hasattr(df, 'empty') and df.empty):
        return []
    d = df.copy()
    for col in d.columns:
        if pd.api.types.is_datetime64_any_dtype(d[col]):
            d[col] = d[col].astype(str)
        elif d[col].dtype == object:
            d[col] = d[col].apply(
                lambda x: str(x) if isinstance(x, (date, datetime)) else x
            )
    # Thay NaN/NaT bằng None để JSON hợp lệ
    d = d.where(pd.notnull(d), None)
    return d.to_dict(orient="records")


def filter_params(
    days_description: str = "Lọc N ngày gần nhất",
    include_pagination: bool = False,
):
    params = {
        "days": Query(None, description=days_description),
        "selected_date": Query(None, description="Lọc đúng 1 ngày theo định dạng YYYY-MM-DD"),
        "start_date": Query(None, description="Lọc từ ngày nào, định dạng YYYY-MM-DD"),
        "end_date": Query(None, description="Lọc đến ngày nào, định dạng YYYY-MM-DD"),
        "year": Query(None, ge=2000, le=2100, description="Năm cần lọc, ví dụ 2026"),
        "month": Query(None, ge=1, le=12, description="Tháng cần lọc, từ 1 đến 12"),
    }
    if include_pagination:
        params["limit"] = Query(100, description="Giới hạn số phiên trả về (mặc định 100)")
        params["page"] = Query(1, description="Trang (bắt đầu từ 1)")
    return params


def load_and_filter(
    days: Optional[int] = None,
    selected_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
):
    """Fetch data từ Supabase, build DataFrames, filter theo ngày nếu có."""
    if month is not None and year is None:
        raise HTTPException(
            status_code=400,
            detail="Khi dùng month, cần truyền thêm year",
        )
    if (start_date is None) != (end_date is None):
        raise HTTPException(
            status_code=400,
            detail="Cần truyền đồng thời cả start_date và end_date",
        )
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date không được lớn hơn end_date",
        )

    df = fetch_raw(get_client())
    if df.empty:
        empty = pd.DataFrame()
        return df, empty, empty, empty, empty, empty, empty

    sess      = build_sessions(df)
    daily     = build_daily(sess)
    qa        = build_qa_pairs(df)
    daily_qa  = build_daily_from_qa(qa)
    faq       = build_faq_pairs(df)
    daily_faq = build_daily_from_faq(faq)

    def filter_by_date(dataframe: pd.DataFrame, target_date: date, col: str = "date_vn"):
        if dataframe.empty:
            return dataframe
        return dataframe[pd.to_datetime(dataframe[col]).dt.date == target_date]

    def filter_from_date(dataframe: pd.DataFrame, cutoff: date, col: str = "date_vn"):
        if dataframe.empty:
            return dataframe
        return dataframe[pd.to_datetime(dataframe[col]).dt.date >= cutoff]

    def filter_between_dates(
        dataframe: pd.DataFrame,
        start_date: date,
        end_date: date,
        col: str = "date_vn",
    ):
        if dataframe.empty:
            return dataframe
        dates = pd.to_datetime(dataframe[col]).dt.date
        return dataframe[(dates >= start_date) & (dates <= end_date)]

    if selected_date:
        sess      = filter_by_date(sess, selected_date)
        daily     = filter_by_date(daily, selected_date)
        qa        = filter_by_date(qa, selected_date)
        daily_qa  = filter_by_date(daily_qa, selected_date)
        faq       = filter_by_date(faq, selected_date)
        daily_faq = filter_by_date(daily_faq, selected_date)
        df_f      = filter_by_date(df, selected_date)
    elif start_date and end_date:
        sess      = filter_between_dates(sess, start_date, end_date)
        daily     = filter_between_dates(daily, start_date, end_date)
        qa        = filter_between_dates(qa, start_date, end_date)
        daily_qa  = filter_between_dates(daily_qa, start_date, end_date)
        faq       = filter_between_dates(faq, start_date, end_date)
        daily_faq = filter_between_dates(daily_faq, start_date, end_date)
        df_f      = filter_between_dates(df, start_date, end_date)
    elif year and month:
        month_start = date(year, month, 1)
        month_end = date(year, month, monthrange(year, month)[1])
        sess      = filter_between_dates(sess, month_start, month_end)
        daily     = filter_between_dates(daily, month_start, month_end)
        qa        = filter_between_dates(qa, month_start, month_end)
        daily_qa  = filter_between_dates(daily_qa, month_start, month_end)
        faq       = filter_between_dates(faq, month_start, month_end)
        daily_faq = filter_between_dates(daily_faq, month_start, month_end)
        df_f      = filter_between_dates(df, month_start, month_end)
    elif days:
        cutoff = (
            pd.Timestamp.now(tz="Asia/Ho_Chi_Minh").normalize()
            - pd.Timedelta(days=days - 1)
        ).date()

        sess      = filter_from_date(sess, cutoff)
        daily     = filter_from_date(daily, cutoff)
        qa        = filter_from_date(qa, cutoff)
        daily_qa  = filter_from_date(daily_qa, cutoff)
        faq       = filter_from_date(faq, cutoff)
        daily_faq = filter_from_date(daily_faq, cutoff)
        df_f      = filter_from_date(df, cutoff)
    else:
        df_f = df

    return df_f, sess, daily, qa, daily_qa, faq, daily_faq


# ════════════════════════════════════════════════════════════════
# HEALTH
# ════════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
def root():
    return {
        "status" : "ok",
        "service": "Trạng Nguyên AI Dashboard API",
        "version": "1.1.0",
        "docs"   : "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health():
    """Kiểm tra kết nối Supabase."""
    try:
        client = get_client()
        client.table(TABLE_NAME).select("id").limit(1).execute()
        return {"status": "ok", "database": "connected", "table": TABLE_NAME}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ════════════════════════════════════════════════════════════════
# TỔNG QUAN
# ════════════════════════════════════════════════════════════════

@app.get("/api/kpis", tags=["Tổng quan"])
def api_kpis(
    days: Optional[int] = filter_params("Lọc N ngày gần nhất. Bỏ trống = tất cả")["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date: Optional[date] = filter_params()["start_date"],
    end_date: Optional[date] = filter_params()["end_date"],
    year: Optional[int] = filter_params()["year"],
    month: Optional[int] = filter_params()["month"],
):
    """
    Các chỉ số tổng quan (KPI).

    **Trả về:**
    - `total_sessions` — Tổng phiên chat
    - `total_qa` — Tổng lượt hỏi-đáp
    - `bot_answered` — Lượt trả lời được
    - `bot_refused` — Lượt từ chối
    - `answer_rate` — Tỉ lệ trả lời (%)
    - `avg_turns` — Trung bình số turns/phiên
    - `avg_duration` — Trung bình thời gian/phiên (phút)
    - `trend_sessions` — Thay đổi số phiên so với tuần trước
    - `trend_rate` — Thay đổi tỉ lệ trả lời so với tuần trước (%)
    """
    df_f, sess, _, qa, _, _, _ = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )
    return get_kpis(sess, qa)


@app.get("/api/summary", tags=["Tổng quan"])
def api_summary(
    days: Optional[int] = filter_params("Lọc N ngày gần nhất. Bỏ trống = tất cả")["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date: Optional[date] = filter_params()["start_date"],
    end_date: Optional[date] = filter_params()["end_date"],
    year: Optional[int] = filter_params()["year"],
    month: Optional[int] = filter_params()["month"],
):
    """
    Toàn bộ dữ liệu dashboard trong 1 request duy nhất.
    **Dùng endpoint này để FE load lần đầu.**

    **Trả về:**
    - `kpis` — Chỉ số tổng quan
    - `daily` — Thống kê theo ngày
    - `hours` — Phân bố giờ cao điểm
    - `faq` — Tóm tắt KB FAQ
    - `keywords` — Top 10 từ khóa
    - `user_count` — Số user đã xác thực
    """
    df_f, sess, _, qa, daily_qa, faq, _ = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )

    kpis              = get_kpis(sess, qa)
    hour_df           = build_hour_dist(sess)
    word_df, _        = build_keywords(df_f, top_n=10)
    user_df           = build_user_stats(df_f, client=get_client())

    faq_summary = {
        "total"      : len(faq) if not faq.empty else 0,
        "answered"   : int(faq["answered"].sum()) if not faq.empty else 0,
        "answer_rate": round(faq["answered"].mean() * 100, 1) if not faq.empty else 0,
    }

    return {
        "kpis"       : kpis,
        "daily"      : safe_records(daily_qa),
        "hours"      : safe_records(hour_df),
        "faq"        : faq_summary,
        "keywords"   : safe_records(word_df),
        "user_count" : len(user_df) if not user_df.empty else 0,
    }


# ════════════════════════════════════════════════════════════════
# XU HƯỚNG
# ════════════════════════════════════════════════════════════════

@app.get("/api/daily", tags=["Xu hướng"])
def api_daily(
    days: Optional[int] = filter_params()["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date: Optional[date] = filter_params()["start_date"],
    end_date: Optional[date] = filter_params()["end_date"],
    year: Optional[int] = filter_params()["year"],
    month: Optional[int] = filter_params()["month"],
):
    """
    Thống kê theo ngày (đơn vị: lượt hỏi-đáp).

    **Mỗi phần tử gồm:**
    - `date_vn` — Ngày (YYYY-MM-DD)
    - `total_qa` — Tổng lượt hỏi
    - `answered` — Trả lời được
    - `refused` — Từ chối
    - `answer_rate` — Tỉ lệ trả lời (%)
    - `unique_sessions` — Số phiên trong ngày
    """
    _, _, _, _, daily_qa, _, _ = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )
    return {"data": safe_records(daily_qa), "total": len(daily_qa)}


@app.get("/api/hours", tags=["Xu hướng"])
def api_hours(
    days: Optional[int] = filter_params()["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date: Optional[date] = filter_params()["start_date"],
    end_date: Optional[date] = filter_params()["end_date"],
    year: Optional[int] = filter_params()["year"],
    month: Optional[int] = filter_params()["month"],
):
    """
    Phân bố phiên chat theo giờ trong ngày (giờ VN — UTC+7).

    **Mỗi phần tử gồm:**
    - `hour_vn` — Giờ (0–23)
    - `n_sessions` — Số phiên trong giờ đó
    - `is_peak` — true nếu là giờ cao điểm
    """
    _, sess, _, _, _, _, _ = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )
    return {"data": safe_records(build_hour_dist(sess))}


# ════════════════════════════════════════════════════════════════
# KB FAQ
# ════════════════════════════════════════════════════════════════

@app.get("/api/faq", tags=["KB FAQ"])
def api_faq(
    days: Optional[int] = filter_params()["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date: Optional[date] = filter_params()["start_date"],
    end_date: Optional[date] = filter_params()["end_date"],
    year: Optional[int] = filter_params()["year"],
    month: Optional[int] = filter_params()["month"],
):
    """
    Phân tích độ hoàn thiện kho tri thức FAQ.

    **Trả về:**
    - `summary.total` — Tổng lượt gọi FAQ
    - `summary.answered` — KB có dữ liệu
    - `summary.refused` — KB thiếu dữ liệu
    - `summary.error` — Lỗi kết nối (không phải thiếu KB)
    - `summary.answer_rate` — Tỉ lệ KB đầy đủ (%)
    - `daily` — Thống kê theo ngày
    - `missing` — Danh sách câu hỏi KB chưa có dữ liệu (cần bổ sung)
    """
    _, _, _, _, _, faq, daily_faq = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )

    if faq.empty:
        return {
            "summary": {"total": 0, "answered": 0, "refused": 0, "error": 0, "answer_rate": 0},
            "daily"  : [],
            "missing": [],
        }

    missing = faq[~faq["answered"]][["date_vn", "question", "tool_name", "result"]].copy()
    missing["date_vn"] = missing["date_vn"].astype(str)

    return {
        "summary": {
            "total"      : len(faq),
            "answered"   : int(faq["answered"].sum()),
            "refused"    : int((faq["result"] == "refused").sum()),
            "error"      : int((faq["result"] == "error").sum()),
            "answer_rate": round(faq["answered"].mean() * 100, 1),
        },
        "daily"  : safe_records(daily_faq),
        "missing": safe_records(missing),
    }


# ════════════════════════════════════════════════════════════════
# PHIÊN CHAT
# ════════════════════════════════════════════════════════════════

@app.get("/api/sessions", tags=["Phiên chat"])
def api_sessions(
    days         : Optional[int]  = filter_params(include_pagination=True)["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date   : Optional[date] = filter_params()["start_date"],
    end_date     : Optional[date] = filter_params()["end_date"],
    year         : Optional[int]  = filter_params()["year"],
    month        : Optional[int]  = filter_params()["month"],
    limit        : int            = filter_params(include_pagination=True)["limit"],
    page         : int            = filter_params(include_pagination=True)["page"],
):
    """
    Danh sách chi tiết các phiên chat, hỗ trợ phân trang.

    **Mỗi phần tử gồm:**
    - `session_id` — ID phiên
    - `date_vn` — Ngày
    - `n_human` — Số câu hỏi của user
    - `n_answered` — Số câu trả lời được
    - `n_refused` — Số câu từ chối
    - `duration_min` — Thời gian phiên (phút)
    - `bot_answered` — true/false
    """
    _, sess, _, _, _, _, _ = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )
    if sess.empty:
        return {"data": [], "total": 0, "page": page, "limit": limit}

    total  = len(sess)
    offset = (page - 1) * limit
    result = sess.iloc[offset: offset + limit]
    return {
        "data" : safe_records(result),
        "total": total,
        "page" : page,
        "limit": limit,
    }


# ════════════════════════════════════════════════════════════════
# TỪ KHÓA
# ════════════════════════════════════════════════════════════════

@app.get("/api/keywords", tags=["Từ khóa"])
def api_keywords(
    days         : Optional[int]  = filter_params()["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date   : Optional[date] = filter_params()["start_date"],
    end_date     : Optional[date] = filter_params()["end_date"],
    year         : Optional[int]  = filter_params()["year"],
    month        : Optional[int]  = filter_params()["month"],
    top          : int            = Query(15,   description="Số từ khóa trả về (mặc định 15)"),
):
    """
    Từ khóa và cụm từ được hỏi nhiều nhất từ câu hỏi của người dùng.

    **Trả về:**
    - `words` — Top từ đơn: `[{keyword, count}]`
    - `bigrams` — Top cụm 2 từ: `[{keyword, count}]`
    """
    df_f, _, _, _, _, _, _ = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )
    word_df, bigram_df = build_keywords(df_f, top_n=top)
    return {
        "words"  : safe_records(word_df),
        "bigrams": safe_records(bigram_df),
    }


# ════════════════════════════════════════════════════════════════
# NGƯỜI DÙNG
# ════════════════════════════════════════════════════════════════

@app.get("/api/users", tags=["Người dùng"])
def api_users(
    days: Optional[int] = filter_params()["days"],
    selected_date: Optional[date] = filter_params()["selected_date"],
    start_date: Optional[date] = filter_params()["start_date"],
    end_date: Optional[date] = filter_params()["end_date"],
    year: Optional[int] = filter_params()["year"],
    month: Optional[int] = filter_params()["month"],
):
    """
    Thống kê mức độ sử dụng theo từng người dùng đã xác thực.
    Đọc từ cột `id_user` trong bảng chat_history, JOIN với bảng users.

    **Mỗi phần tử gồm:**
    - `user_id` — ID trong bảng users
    - `secret_code` — Mã bí mật
    - `full_name` — Họ tên
    - `department` — Phòng ban
    - `email` — Email
    - `role` — admin / guest
    - `sessions` — Số phiên chat
    - `total_questions` — Tổng câu hỏi
    - `days_active` — Số ngày sử dụng
    - `faq_calls` — Lượt gọi FAQ
    - `avg_q_per_session` — TB câu hỏi/phiên
    - `first_seen` — Ngày đầu tiên sử dụng
    - `last_seen` — Ngày gần nhất sử dụng
    """
    df_f, _, _, _, _, _, _ = load_and_filter(
        days=days,
        selected_date=selected_date,
        start_date=start_date,
        end_date=end_date,
        year=year,
        month=month,
    )
    user_df = build_user_stats(df_f, client=get_client())
    if user_df.empty:
        return {"data": [], "total": 0}
    return {
        "data" : safe_records(user_df),
        "total": len(user_df),
    }

# ════════════════════════════════════════════════════════════════
# QUẢN LÝ TRI THỨC — KB MANAGEMENT
# ════════════════════════════════════════════════════════════════
import io
import requests
from fastapi import UploadFile, File
from pydantic import BaseModel
from typing import List

VERSIONS = ["v2", "v5", "v6"]
KB_TABLES = {
    "v2": "documents_v2",
    "v5": "documents_v5",
    "v6": "documents_v6",
}


def get_n8n_url():
    url = os.environ.get("N8N_WEBHOOK_URL")
    if not url:
        raise HTTPException(
            status_code=500,
            detail="Thieu bien moi truong N8N_WEBHOOK_URL"
        )
    return url


def resolve_kb_table(version: str) -> str:
    normalized_version = version.strip().lower()
    table_name = KB_TABLES.get(normalized_version)
    if not table_name:
        raise HTTPException(
            status_code=400,
            detail=f"version phai la mot trong {VERSIONS}"
        )
    return table_name


def send_to_n8n(payload: dict) -> dict:
    """Gui payload den n8n webhook va tra ve ket qua."""
    try:
        resp = requests.post(get_n8n_url(), json=payload, timeout=60)
        if resp.status_code in (200, 201):
            return {
                "status" : "ok",
                "message": f"n8n dang xu ly {len(payload.get('items', []))} cap Q&A cho {payload.get('version')}",
                "total"  : len(payload.get("items", [])),
            }
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"n8n loi: {resp.text[:300]}"
        )
    except requests.exceptions.Timeout:
        return {
            "status" : "processing",
            "message": "n8n da nhan nhung xu ly lau hon 60s — du lieu van dang duoc xu ly",
            "total"  : len(payload.get("items", [])),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Khong ket noi duoc n8n: {str(e)}")


# ── Pydantic Models ───────────────────────────────────────────
class QAItem(BaseModel):
    question: str
    answer  : str


class KBSingleRequest(BaseModel):
    version   : str
    department: str = ""
    question  : str
    answer    : str


class KBBatchRequest(BaseModel):
    version   : str
    department: str = ""
    items     : List[QAItem]


# ── Endpoints ─────────────────────────────────────────────────

@app.post("/api/kb/single", tags=["Quan ly KB"])
def kb_add_single(body: KBSingleRequest):
    """
    Them 1 cap Q&A vao KB.
    n8n se tu dong chunking + embedding sau khi nhan.

    **Body:**
    ```json
    {
      "version"   : "v5",
      "department": "Hoc vu",
      "question"  : "Lich thi cap tinh thang 3?",
      "answer"    : "Dien ra tu 15-20/03/2026..."
    }
    ```

    **version:** v2 = Product | v5 = Toan | v6 = Tieng Viet

    **Response:**
    ```json
    {
      "status": "ok",
      "message": "n8n dang xu ly 1 cap Q&A cho v5",
      "total": 1
    }
    ```
    """
    if body.version not in VERSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"version phai la mot trong {VERSIONS}"
        )
    if not body.question.strip() or not body.answer.strip():
        raise HTTPException(
            status_code=400,
            detail="question va answer khong duoc de trong"
        )

    payload = {
        "type"      : "single",
        "version"   : body.version,
        "department": body.department.strip(),
        "items"     : [{"question": body.question.strip(), "answer": body.answer.strip()}],
    }
    return send_to_n8n(payload)


@app.post("/api/kb/batch", tags=["Quan ly KB"])
def kb_add_batch(body: KBBatchRequest):
    """
    Them nhieu cap Q&A cung luc.

    **Body:**
    ```json
    {
      "version"   : "v6",
      "department": "Kinh doanh",
      "items": [
        {"question": "Cau hoi 1", "answer": "Tra loi 1"},
        {"question": "Cau hoi 2", "answer": "Tra loi 2"}
      ]
    }
    ```

    **Response:**
    ```json
    {
      "status": "ok",
      "message": "n8n dang xu ly 2 cap Q&A cho v6",
      "total": 2
    }
    ```
    """
    if body.version not in VERSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"version phai la mot trong {VERSIONS}"
        )
    if not body.items:
        raise HTTPException(status_code=400, detail="items khong duoc de trong")

    for i, item in enumerate(body.items):
        if not item.question.strip() or not item.answer.strip():
            raise HTTPException(
                status_code=400,
                detail=f"item[{i}]: question va answer khong duoc de trong"
            )

    payload = {
        "type"      : "batch",
        "version"   : body.version,
        "department": body.department.strip(),
        "items"     : [
            {"question": item.question.strip(), "answer": item.answer.strip()}
            for item in body.items
        ],
    }
    return send_to_n8n(payload)


@app.post("/api/kb/upload", tags=["Quan ly KB"])
async def kb_upload_file(
    version   : str        = Query(..., description="v2 | v5 | v6"),
    department: str        = Query("",  description="Phong ban (tuy chon)"),
    file      : UploadFile = File(...),
):
    """
    Upload file để import nhiều Q&A cùng lúc.

    **Format file hỗ trợ:**

    **TXT / DOCX** — mỗi cặp Q&A cách nhau bằng xuống dòng:
    ```
    Q: Câu hỏi 1?
    A: Câu trả lời 1.

    Q: Câu hỏi 2?
    A: Câu trả lời 2.
    ```

    **CSV / XLSX** — 2 cột bắt buộc: `question` và `answer`

    | question | answer |
    |---|---|
    | Câu hỏi 1 | Câu trả lời 1 |

    **Response:**
    ```json
    {
      "status" : "ok",
      "message": "n8n đang xử lý 10 cặp Q&A cho v5",
      "total"  : 10,
      "parsed" : 10
    }
    ```
    """
    if version not in VERSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"version phai la mot trong {VERSIONS}"
        )

    fname   = file.filename.lower()
    content = await file.read()
    items   = []

    try:
        if fname.endswith(".txt"):
            text   = content.decode("utf-8", errors="ignore")
            blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
            for block in blocks:
                lines = block.splitlines()
                q = next((l[2:].strip() for l in lines if l.upper().startswith("Q:")), "")
                a = next((l[2:].strip() for l in lines if l.upper().startswith("A:")), "")
                if q and a:
                    items.append({"question": q, "answer": a})

        elif fname.endswith(".docx"):
            try:
                from docx import Document
                doc  = Document(io.BytesIO(content))
                text = "\n".join([p.text for p in doc.paragraphs])
                blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
                for block in blocks:
                    lines = block.splitlines()
                    q = next((l[2:].strip() for l in lines if l.upper().startswith("Q:")), "")
                    a = next((l[2:].strip() for l in lines if l.upper().startswith("A:")), "")
                    if q and a:
                        items.append({"question": q, "answer": a})
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="Can cai them: pip install python-docx"
                )

        elif fname.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
            df.columns = [c.lower().strip() for c in df.columns]
            if "question" not in df.columns or "answer" not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail="CSV can co cot 'question' va 'answer'"
                )
            for _, row in df.iterrows():
                if pd.notna(row["question"]) and pd.notna(row["answer"]):
                    items.append({
                        "question": str(row["question"]).strip(),
                        "answer"  : str(row["answer"]).strip(),
                    })

        elif fname.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content))
            df.columns = [c.lower().strip() for c in df.columns]
            if "question" not in df.columns or "answer" not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail="Excel can co cot 'question' va 'answer'"
                )
            for _, row in df.iterrows():
                if pd.notna(row["question"]) and pd.notna(row["answer"]):
                    items.append({
                        "question": str(row["question"]).strip(),
                        "answer"  : str(row["answer"]).strip(),
                    })
        else:
            raise HTTPException(
                status_code=400,
                detail="Chi ho tro .txt, .docx, .csv, .xlsx"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Loi doc file: {str(e)}")

    if not items:
        raise HTTPException(
            status_code=422,
            detail="Khong tim thay cap Q&A nao. Kiem tra lai dinh dang file."
        )

    payload = {
        "type"      : "batch",
        "version"   : version,
        "department": department.strip(),
        "items"     : items,
    }
    result          = send_to_n8n(payload)
    result["parsed"] = len(items)
    return result


@app.get("/api/kb/list", tags=["Quan ly KB"])
def kb_list(
    version: str = Query(..., description="Version KB can doc: v2 | v5 | v6"),
    limit  : int           = Query(100,  description="So ban ghi tra ve"),
    page   : int           = Query(1,    description="Trang (bat dau tu 1)"),
):
    """
    Xem danh sach noi dung KB hien co trong Supabase.
    Moi version doc tu mot bang rieng:
    - v2 -> documents_v2
    - v5 -> documents_v5
    - v6 -> documents_v6

    **Response:**
    ```json
    {
      "data": [
        {
          "id"      : 1,
          "content" : "Noi dung chunk...",
          "metadata": {"department": "Hoc vu"},
          "version": "v5"
        }
      ],
      "total": 50,
      "page" : 1,
      "limit": 100
    }
    ```
    """
    normalized_version = version.strip().lower()
    table_name = resolve_kb_table(normalized_version)
    try:
        offset = (page - 1) * limit
        q = get_client().table(table_name).select("id, content, metadata")
        resp = q.order("id", desc=True).range(offset, offset + limit - 1).execute()
        data = resp.data or []
        for item in data:
            item["version"] = normalized_version
            item["table"] = table_name
        return {
            "data" : data,
            "total": len(data),
            "page" : page,
            "limit": limit,
            "version": normalized_version,
            "table": table_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.delete("/api/kb/{doc_id}", tags=["Quan ly KB"])
def kb_delete(
    doc_id: int,
    version: str = Query(..., description="Version KB can xoa: v2 | v5 | v6"),
):
    """
    Xoa 1 ban ghi khoi KB theo ID.
    Vi KB da tach thanh 3 bang rieng, can truyen `version` de xoa dung bang.

    **Response:**
    ```json
    {"status": "ok", "message": "Da xoa ban ghi ID 123 trong documents_v5"}
    ```
    """
    try:
        normalized_version = version.strip().lower()
        table_name = resolve_kb_table(normalized_version)
        get_client().table(table_name).delete().eq("id", doc_id).execute()
        return {
            "status": "ok",
            "message": f"Da xoa ban ghi ID {doc_id} trong {table_name}",
            "id": doc_id,
            "version": normalized_version,
            "table": table_name,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# Sua allow_methods de cho phep POST va DELETE
# (Update CORS o dau file neu can)


# ═══════════════════════════════════════════════════════════════
# AUTH ADMIN
# ═══════════════════════════════════════════════════════════════

@app.post("/api/auth/request-otp", tags=["Auth"])
def request_admin_otp(body: AuthOtpRequest):
    """
    Gui OTP dang nhap dashboard.

    Dieu kien: email noi bo, ton tai trong bang users, va role = admin.
    """
    email = ensure_valid_email(body.email)
    if not is_internal_email(email):
        raise HTTPException(status_code=403, detail=f"Chi email noi bo {INTERNAL_EMAIL_DOMAIN} moi duoc dang nhap")

    profile = fetch_admin_user(email)
    current_time = now_vn()
    existing = OTP_STORE.get(email)
    if existing and isinstance(existing.get("sent_at"), datetime):
        elapsed = (current_time - existing["sent_at"]).total_seconds()
        if elapsed < OTP_RESEND_SECONDS:
            raise HTTPException(
                status_code=429,
                detail=f"Vui long cho {OTP_RESEND_SECONDS - int(elapsed)}s truoc khi gui lai OTP",
            )

    code = generate_otp_code()
    send_otp_email(email, code)
    OTP_STORE[email] = {
        "code": code,
        "profile": profile,
        "sent_at": current_time,
        "expires_at": current_time + timedelta(minutes=OTP_TTL_MINUTES),
        "attempts": 0,
    }

    return {
        "ok": True,
        "email": email,
        "message": "Da gui ma OTP 6 chu so den email",
        "ttl_minutes": OTP_TTL_MINUTES,
        "resend_seconds": OTP_RESEND_SECONDS,
    }


@app.post("/api/auth/verify-otp", tags=["Auth"])
def verify_admin_otp(body: AuthOtpVerifyRequest, response: Response):
    """
    Xac thuc OTP va tra ve access token cho FE.

    FE gui token trong header: Authorization: Bearer <access_token>
    """
    email = ensure_valid_email(body.email)
    otp_code = normalize_text(body.otp_code)
    if not re.match(r"^\d{6}$", otp_code):
        raise HTTPException(status_code=400, detail="OTP phai gom 6 chu so")

    record = OTP_STORE.get(email)
    if not record:
        raise HTTPException(status_code=400, detail="Chua request OTP hoac OTP da bi xoa")

    if now_vn() > record["expires_at"]:
        OTP_STORE.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP da het han")

    record["attempts"] = int(record.get("attempts", 0)) + 1
    if record["attempts"] > 5:
        OTP_STORE.pop(email, None)
        raise HTTPException(status_code=429, detail="Nhap sai OTP qua nhieu lan. Vui long request lai")

    if otp_code != record["code"]:
        raise HTTPException(status_code=400, detail="OTP khong dung")

    token = uuid.uuid4().hex
    expires_at = now_vn() + timedelta(hours=AUTH_SESSION_TTL_HOURS)
    AUTH_SESSIONS[token] = {
        "token": token,
        "user": record["profile"],
        "created_at": now_vn(),
        "expires_at": expires_at,
    }
    OTP_STORE.pop(email, None)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=AUTH_SESSION_TTL_HOURS * 3600,
        expires=AUTH_SESSION_TTL_HOURS * 3600,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )

    return {
        "ok": True,
        "access_token": token,
        "token_type": "bearer",
        "expires_at": expires_at.isoformat(),
        "user": AUTH_SESSIONS[token]["user"],
    }


@app.get("/api/auth/session", tags=["Auth"])
def get_auth_session(session: dict[str, Any] = Depends(require_admin_session)):
    """Kiem tra token hien tai co con hop le khong."""
    return {
        "ok": True,
        "user": session["user"],
        "expires_at": session["expires_at"].isoformat(),
    }


@app.post("/api/auth/logout", tags=["Auth"])
def logout_admin(
    response: Response,
    authorization: str | None = Header(default=None),
    cookie_token: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
):
    """Dang xuat token hien tai."""
    token = resolve_auth_token(authorization, cookie_token)
    AUTH_SESSIONS.pop(token, None)
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    return {"ok": True, "message": "Da dang xuat"}
