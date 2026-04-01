"""
analytics.py — Core thống kê từ Supabase chat_history
Tất cả logic parse & aggregate ở đây, tách biệt với UI
"""
from __future__ import annotations
import json
import re
from datetime import datetime, timezone, timedelta
from typing import Any

import pandas as pd
from supabase import create_client, Client

VN_TZ = timezone(timedelta(hours=7))

# ── Keyword patterns để classify AI response ────────────────────
_REFUSED_PATTERNS = [
    'không tìm', 'không có thông tin', 'không thể trả lời',
    'xin lỗi, tôi chỉ', 'ngoài phạm vi', 'chưa được cập nhật',
    'sự cố kỹ thuật', 'chưa có trong hệ thống',
]
_EMAIL_PATTERNS = ['vui lòng', 'nhập', 'cung cấp']


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

def _classify_ai(content: str) -> str:
    c = content.lower()
    if 'email' in c and any(p in c for p in _EMAIL_PATTERNS):
        return 'ask_email'
    if any(p in c for p in _REFUSED_PATTERNS):
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

TABLE_NAME = "chat_history_rows"   # <-- tên bảng thật trên Supabase

# key   = tên cột trên Supabase
# value = tên chuẩn dùng trong code (KHÔNG đổi value)
COL_MAP = {
    "id"         : "id",
    "session_id" : "session_id",
    "message"    : "message",
    "created_at" : "created_at",
}

# Cột user_id là optional — chỉ fetch nếu đã chạy setup_users.sql
# Đổi thành True sau khi đã thêm cột user_id vào bảng
USER_ID_COLUMN_EXISTS = True


def fetch_raw(client: Client) -> pd.DataFrame:
    """Lấy toàn bộ chat_history từ Supabase, trả về DataFrame gốc."""
    base_cols = ["id", "session_id", "message", "created_at"]
    if USER_ID_COLUMN_EXISTS:
        base_cols.append("user_id")
    select_cols = ", ".join(base_cols)

    # Retry tối đa 3 lần nếu Supabase trả lỗi 502/503
    last_error = None
    for attempt in range(3):
        try:
            response = (
                client.table(TABLE_NAME)
                .select(select_cols)
                .order("created_at", desc=False)
                .execute()
            )
            break
        except Exception as e:
            last_error = e
            import time
            time.sleep(2 * (attempt + 1))  # 2s, 4s, 6s
    else:
        raise last_error

    if not response.data:
        return pd.DataFrame(columns=list(COL_MAP.values()))

    df = pd.DataFrame(response.data)
    df = df.rename(columns=COL_MAP)   # map về tên chuẩn

    df['msg_type']   = df['message'].apply(_get_type)
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

            # Classify tất cả AI responses trong vùng → lấy kết quả quan trọng nhất
            # Ưu tiên: answered > refused > ask_email > tool_call > short
            priority = {'answered': 0, 'refused': 1, 'ask_email': 2, 'tool_call': 3, 'short': 4}
            best_ai  = None
            best_pri = 99

            for _, ai_row in ai_in_range.iterrows():
                rtype = _classify_ai(ai_row['content'])
                if priority.get(rtype, 99) < best_pri:
                    best_pri = priority[rtype]
                    best_ai  = ai_row
                    best_rtype = rtype

            if best_ai is None or best_rtype in ('tool_call', 'short'):
                # Chỉ có tool_call/short, không có kết quả thật → bỏ qua
                continue

            # ask_email = bot chưa phục vụ được (chờ xác thực) → tính là not answered
            final_answered = best_rtype == 'answered'
            final_result   = best_rtype if best_rtype != 'ask_email' else 'not_served'

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
]

def _classify_final_ai(content: str) -> str:
    """Classify AI response cuối cùng sau khi tool đã chạy xong."""
    c = content.lower()
    if any(p in c for p in _FINAL_REFUSED):
        return 'refused'
    if content.startswith('Calling '):
        return 'tool_call'
    if len(content.strip()) < 10:
        return 'short'
    return 'answered'


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

        faq_ai_rows = grp[grp['content'].str.startswith('Calling faq', na=False)]
        if faq_ai_rows.empty:
            continue

        for _, faq_row in faq_ai_rows.iterrows():
            faq_idx = faq_row.name

            # Câu hỏi human thật gần nhất trước faq call
            prev_real = [i for i in human_indices if i < faq_idx]
            question  = grp.loc[prev_real[-1], 'content'] if prev_real else '(không rõ)'

            # Ranh giới tìm AI response: đến human tiếp theo hoặc faq call tiếp theo
            next_human   = next((i for i in human_indices if i > faq_idx), len(grp))
            next_faq_rows = grp[(grp.index > faq_idx) &
                                grp['content'].str.startswith('Calling faq', na=False)]
            next_faq_idx = next_faq_rows.index[0] if not next_faq_rows.empty else len(grp)
            boundary = min(next_human, next_faq_idx)

            # AI responses thật sau faq call (bỏ tool_call intermediates)
            ai_after = grp[
                (grp.index > faq_idx) &
                (grp.index < boundary) &
                (grp['msg_type'] == 'ai') &
                (~grp['content'].str.startswith('Calling ', na=False))
            ]

            if ai_after.empty:
                result = 'no_final_ai'
            else:
                # Lấy AI response cuối cùng trong vùng đó
                result = _classify_final_ai(ai_after.iloc[-1]['content'])

            # Bỏ qua nếu không có kết quả thật
            if result in ('tool_call', 'short', 'no_final_ai'):
                continue

            tool_name = 'faq_public' if 'faq_public' in faq_row['content'] else 'faq'

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


def build_daily_from_qa(qa_df: pd.DataFrame) -> pd.DataFrame:
    """
    Tổng hợp theo ngày dựa trên QA pairs — chính xác hơn theo phiên.
    Mỗi lượt hỏi được đếm độc lập, không bị ảnh hưởng bởi các câu khác trong phiên.
    """
    if qa_df.empty:
        return pd.DataFrame()

    daily = qa_df.groupby('date_vn').agg(
        total_qa     = ('session_id', 'count'),
        answered     = ('answered', 'sum'),
        unique_sessions = ('session_id', 'nunique'),
    ).reset_index()

    daily['refused']     = daily['total_qa'] - daily['answered']
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
        faq      = grp[grp['content'].str.startswith('Calling faq', na=False)].shape[0]
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
        refused  = total_qa - answered
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