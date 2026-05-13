# Trang Nguyen Public Dashboard

Dashboard/API thong ke du lieu chatbot cho khach hang public.

## Khac voi `tn_dashboard`

- Chat history doc tu bang `chat_history_rows`.
- Bang `chat_history_rows` khong can cot `user_id`.
- KB chi dung mot bang duy nhat: `documents_public`.
- Khong thong ke theo nhan vien/user noi bo.
- Khong con logic dang nhap trong dashboard public. FE co the goi truc tiep cac API du lieu/KB.

## Schema toi thieu

Bang `chat_history_rows`:

```text
id
session_id
message
created_at
```

Cot `message` nen co dang JSON/dict:

```json
{"type": "human", "content": "Cau hoi cua khach"}
```

hoac:

```json
{"type": "ai", "content": "Cau tra loi cua bot"}
```

Bang `documents_public`:

```text
id
content
metadata
```

## Cau hinh

Cap nhat `.env` hoac `.streamlit/secrets.toml`:

```env
SUPABASE_URL="https://..."
SUPABASE_KEY="..."
N8N_WEBHOOK_URL="https://..."
KB_TABLE_NAME="documents_public"
```

## Chay Streamlit dashboard

```powershell
cd E:\TrangNguyenChatbot\tn_dashboard_public
streamlit run dashboard.py --server.port 8502
```

## Chay API cho FE

```powershell
cd E:\TrangNguyenChatbot\tn_dashboard_public
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
```

Docs:

```text
http://localhost:8001/docs
```

Tai lieu API docs noi bo:

```text
API_DOCS.md
```

## API chinh

```text
GET /api/health
GET /api/kpis
GET /api/summary
GET /api/sessions
GET /api/qa
GET /api/faq
GET /api/keywords
GET /api/kb/list
DELETE /api/kb/{doc_id}
POST /api/kb/single
POST /api/kb/batch
POST /api/kb/upload
```

`/api/users` van ton tai de tuong thich FE cu, nhung public dashboard se tra ve danh sach rong vi khong co `user_id`.

## Luu y cho FE

- `tn_dashboard_public` hien chi giu logic xu ly va API.
- Khong su dung cac endpoint auth OTP/session cho public dashboard nua.
- Neu FE muon dat `tn_dashboard` va `tn_dashboard_public` chung mot web, FE chi can tu quan ly auth o lop giao dien va goi cac API phu hop theo tung dashboard.
