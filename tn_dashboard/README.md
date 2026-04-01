# Trạng Nguyên AI — Chatbot Dashboard

Hệ thống theo dõi và phân tích hiệu quả chatbot nội bộ Trạng Nguyên Education.  
Bao gồm **Streamlit Dashboard** để giám sát trực quan và **REST API** để Frontend tích hợp.

---

## Cấu trúc dự án

```
tn_dashboard/
├── dashboard.py          # Giao diện Streamlit (chạy độc lập)
├── analytics.py          # Toàn bộ logic xử lý & thống kê dữ liệu
├── api.py                # REST API (FastAPI) dành cho Frontend
├── requirements.txt      # Python dependencies
└── .streamlit/
    ├── secrets.toml      # Credentials Supabase (không commit lên Git)
    └── config.toml       # Cấu hình theme Streamlit
```

---

## Yêu cầu hệ thống

- Python 3.10+
- Supabase project với bảng `chat_history_rows` và `users`

---

## Cài đặt

```bash
# 1. Tạo môi trường ảo (khuyến nghị)
conda create -n rag-chatbot python=3.10
conda activate rag-chatbot

# 2. Cài dependencies
pip install -r requirements.txt
```

---

## Cấu hình

### Streamlit Dashboard

Mở file `.streamlit/secrets.toml` và điền credentials:

```toml
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-anon-key"
```

### REST API

Set biến môi trường trước khi chạy:

```cmd
# Windows CMD
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_KEY=your-anon-key
```

```bash
# Linux / macOS
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your-anon-key
```

Hoặc tạo file `.env` trong thư mục dự án:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

> Lấy credentials tại: Supabase Dashboard → Settings → API

---

## Chạy dự án

### Streamlit Dashboard

```bash
streamlit run dashboard.py
```

Truy cập: `http://localhost:8501`

### REST API (FastAPI)

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

Truy cập:
- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### Chạy cả hai cùng lúc (Windows)

Tạo file `start.bat`:

```bat
@echo off
start "Dashboard" cmd /k "conda activate rag-chatbot && streamlit run dashboard.py"
start "API" cmd /k "conda activate rag-chatbot && set SUPABASE_URL=... && set SUPABASE_KEY=... && uvicorn api:app --host 0.0.0.0 --port 8000 --reload"
```

### Expose ra internet (Cloudflare Tunnel)

```bash
# Terminal 1 — Dashboard
streamlit run dashboard.py --server.port 8501

# Terminal 2 — Tunnel
cloudflared.exe tunnel --url http://localhost:8501
```

---

## REST API Endpoints

Tất cả endpoints hỗ trợ query param `?days=7` hoặc `?days=30` để lọc theo khoảng thời gian.

| Endpoint | Mô tả |
|---|---|
| `GET /api/summary` | Toàn bộ dữ liệu trong 1 request — dùng để FE load lần đầu |
| `GET /api/kpis` | 5 chỉ số tổng quan (phiên, lượt hỏi, tỉ lệ, thời gian...) |
| `GET /api/daily` | Thống kê theo ngày |
| `GET /api/hours` | Phân bố giờ cao điểm (UTC+7) |
| `GET /api/faq` | Phân tích KB FAQ + danh sách câu hỏi thiếu dữ liệu |
| `GET /api/sessions` | Chi tiết từng phiên chat |
| `GET /api/keywords` | Từ khóa và cụm từ hỏi nhiều nhất |
| `GET /api/users` | Thống kê người dùng đã xác thực |
| `GET /api/health` | Kiểm tra kết nối Supabase |

**Ví dụ:**

```bash
# Tổng quan 30 ngày gần nhất
GET http://localhost:8000/api/summary?days=30

# Danh sách câu hỏi KB đang thiếu
GET http://localhost:8000/api/faq

# Top từ khóa 7 ngày gần nhất
GET http://localhost:8000/api/keywords?days=7&top=10
```

---

## Cơ sở dữ liệu

### Bảng chính

| Bảng | Mô tả |
|---|---|
| `chat_history_rows` | Lịch sử hội thoại từ n8n (type: human / ai / tool) |
| `users` | Danh sách nhân viên với mã bí mật |

### Cấu trúc bảng `chat_history_rows`

```sql
id          BIGINT PRIMARY KEY
session_id  TEXT
message     JSONB        -- {type, content, name, tool_call_id, ...}
created_at  TIMESTAMPTZ
user_id     BIGINT REFERENCES users(id)
```

### Cấu trúc bảng `users`

```sql
id          BIGSERIAL PRIMARY KEY
secret_code TEXT UNIQUE
full_name   TEXT
department  TEXT
email       TEXT
role        TEXT         -- 'admin' | 'guest'
created_at  TIMESTAMPTZ
```

> Chạy file `setup_users.sql` trong Supabase SQL Editor để tạo bảng users và tự động map user_id vào chat_history_rows.

---

## Tính năng Dashboard

**Chỉ số tổng quan**
- Tổng phiên chat, lượt hỏi-đáp, lượt trả lời / từ chối, tỉ lệ thành công, TB thời gian/phiên
- So sánh trend tuần trước

**Xu hướng theo ngày**
- Stacked bar chart: answered vs refused theo ngày
- Donut chart: tỉ lệ tổng
- Line chart: tỉ lệ trả lời theo ngày + mục tiêu 80%
- Bar chart: phân bố giờ cao điểm (giờ VN)

**Phân tích KB FAQ**
- Đo độ hoàn thiện kho tri thức qua tool calls
- Phân biệt: có dữ liệu / thiếu dữ liệu / lỗi service
- Bảng chi tiết câu hỏi cần bổ sung KB

**Từ khóa hỏi nhiều**
- Top từ đơn và cụm 2 từ từ câu hỏi thực tế của người dùng

**Thống kê người dùng**
- Mức độ sử dụng theo từng nhân viên đã xác thực
- Số phiên, tổng câu hỏi, ngày active, lần đầu / cuối sử dụng

**Chi tiết phiên chat**
- Bảng toàn bộ phiên với màu phân biệt kết quả trả lời / từ chối

---


---

## Lưu ý

- File `.streamlit/secrets.toml` và `.env` chứa credentials — **không commit lên Git**
- Thêm vào `.gitignore`:
  ```
  .streamlit/secrets.toml
  .env
  __pycache__/
  *.pyc
  ```
- Dashboard tự refresh mỗi **30 giây**
- Múi giờ hiển thị: **UTC+7 (Việt Nam)**
