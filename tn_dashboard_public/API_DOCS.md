# API Docs - tn_dashboard_public

Tai lieu nay dung de kiem tra nhanh API dashboard public co dang hoat dong dung khong va de FE tich hop.

## 1. Chay API

```powershell
cd E:\TrangNguyenChatbot\tn_dashboard_public
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
```

Swagger UI:

```text
http://localhost:8001/docs
```

## 2. Bien moi truong can co

Dat trong `.env` hoac bien moi truong server:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-service-or-anon-key"
N8N_WEBHOOK_URL="https://your-n8n/webhook/..."
KB_TABLE_NAME="documents_public"
```

Bang chat history dang dung trong code:

```text
history_public_chat
```

Bang KB public mac dinh:

```text
documents_public
```

## 3. Health Check

### `GET /`

Kiem tra API server co song khong.

```powershell
curl http://localhost:8001/
```

Ket qua tot:

```json
{
  "status": "ok",
  "service": "Trạng Nguyên AI Dashboard API",
  "version": "1.1.0",
  "docs": "/docs"
}
```

### `GET /api/health`

Kiem tra API ket noi duoc Supabase va bang chat history.

```powershell
curl http://localhost:8001/api/health
```

Ket qua tot:

```json
{
  "status": "ok",
  "database": "connected",
  "table": "history_public_chat"
}
```

Neu endpoint nay loi `503`, can kiem tra `SUPABASE_URL`, `SUPABASE_KEY`, ten bang va quyen truy cap bang.

## 4. Filter chung

Nhieu endpoint thong ke ho tro cac query filter sau:

```text
days=7
selected_date=2026-05-07
start_date=2026-05-01&end_date=2026-05-07
year=2026&month=5
```

Chi nen dung mot kieu filter trong mot request.

Vi du:

```powershell
curl "http://localhost:8001/api/kpis?selected_date=2026-05-07"
```

## 5. Tong quan

### `GET /api/kpis`

Tra KPI tong quan.

```powershell
curl "http://localhost:8001/api/kpis"
```

Field quan trong:

```json
{
  "total_sessions": 64,
  "total_qa": 148,
  "bot_answered": 127,
  "bot_refused": 21,
  "answer_rate": 85.8,
  "avg_duration": 2.0
}
```

Check nhanh:

- `total_qa = bot_answered + bot_refused` neu khong co nhom ket qua khac.
- `answer_rate = bot_answered / total_qa * 100`.
- Neu `total_qa = 0` trong khi DB co data, can kiem tra format `message`.

### `GET /api/summary`

Endpoint khuyen dung cho FE khi load dashboard lan dau.

```powershell
curl "http://localhost:8001/api/summary"
```

Tra ve:

```json
{
  "kpis": {},
  "daily": [],
  "hours": [],
  "faq": {},
  "keywords": [],
  "user_count": 0
}
```

## 6. Cau hoi - tra loi

### `GET /api/qa`

Danh sach cac luot hoi dap.

```powershell
curl "http://localhost:8001/api/qa?page=1&limit=100"
```

Lay rieng cau chua tra loi duoc:

```powershell
curl "http://localhost:8001/api/qa?only_unanswered=true&page=1&limit=100"
```

Response:

```json
{
  "data": [
    {
      "session_id": "session-...",
      "date_vn": "2026-05-07",
      "hour_vn": 8,
      "question": "cau hoi cua user",
      "answer": "phan hoi cua bot",
      "result": "refused",
      "answered": false,
      "asked_at": "2026-05-07T..."
    }
  ],
  "total": 21,
  "page": 1,
  "limit": 100
}
```

Phan trang chi dung cho hien thi danh sach, khong anh huong KPI/chart.

## 7. Xu huong

### `GET /api/daily`

Thong ke hoi dap theo ngay.

```powershell
curl "http://localhost:8001/api/daily"
```

Field:

```json
{
  "date_vn": "2026-05-07",
  "total_qa": 10,
  "answered": 8,
  "refused": 2,
  "unique_sessions": 4,
  "answer_rate": 80.0
}
```

Check nhanh:

- Cot do tren chart ngay lay tu `refused`.
- Neu KPI co `bot_refused` nhung `/api/daily` khong co `refused`, can restart API de load code moi.

### `GET /api/hours`

Phan bo phien theo gio VN.

```powershell
curl "http://localhost:8001/api/hours"
```

## 8. FAQ / KB

### `GET /api/faq`

Kiem tra do day du KB dua tren cac luot goi tool `Supabase_Vector_Store`.

```powershell
curl "http://localhost:8001/api/faq"
```

Response:

```json
{
  "summary": {
    "total": 80,
    "answered": 62,
    "refused": 10,
    "error": 8,
    "answer_rate": 77.5
  },
  "daily": [],
  "missing": []
}
```

Y nghia:

- `summary.total`: tong luot goi FAQ tool.
- `summary.answered`: tool co du lieu va bot tra loi duoc.
- `summary.refused`: bot goi tool nhung ket luan chua co/khong co thong tin.
- `summary.error`: co tool call nhung khong co final AI hop le hoac final response qua ngan/tool_call.
- `missing`: danh sach cau hoi can bo sung KB hoac can kiem tra service.

Quan he can dung:

```text
summary.total = summary.answered + summary.refused + summary.error
```

Luu y: `bot_refused` trong `/api/kpis` khong bat buoc bang `summary.refused + summary.error`, vi KPI dem theo luot hoi dap, con FAQ dem theo luot goi tool.

## 9. Sessions

### `GET /api/sessions`

Danh sach phien chat, co phan trang.

```powershell
curl "http://localhost:8001/api/sessions?page=1&limit=100"
```

Response gom:

```json
{
  "data": [
    {
      "session_id": "session-...",
      "date_vn": "2026-05-07",
      "n_human": 3,
      "n_tool": 2,
      "n_answered": 2,
      "n_refused": 1,
      "bot_answered": true,
      "duration_min": 2.0
    }
  ],
  "total": 64,
  "page": 1,
  "limit": 100
}
```

## 10. Keywords

### `GET /api/keywords`

Top tu khoa trong cau hoi user.

```powershell
curl "http://localhost:8001/api/keywords?top=15"
```

Response:

```json
{
  "words": [{"keyword": "trang", "count": 10}],
  "bigrams": [{"keyword": "trang nguyen", "count": 8}]
}
```

## 11. Users

### `GET /api/users`

Public dashboard khong co `user_id`, endpoint nay giu de tuong thich FE cu va thuong tra danh sach rong.

```powershell
curl "http://localhost:8001/api/users"
```

## 12. Quan ly KB

### `GET /api/kb/list`

Xem cac row KB trong `documents_public`.

```powershell
curl "http://localhost:8001/api/kb/list?page=1&limit=100"
```

### `POST /api/kb/single`

Gui 1 cap Q&A sang n8n de xu ly embedding.

```powershell
curl -X POST "http://localhost:8001/api/kb/single" ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"FAQ public\",\"question\":\"Cau hoi?\",\"answer\":\"Cau tra loi.\"}"
```

### `POST /api/kb/batch`

Gui nhieu cap Q&A.

```json
{
  "title": "FAQ public",
  "items": [
    {"question": "Cau hoi 1?", "answer": "Tra loi 1."},
    {"question": "Cau hoi 2?", "answer": "Tra loi 2."}
  ]
}
```

### `POST /api/kb/upload`

Upload file `.txt`, `.docx`, `.csv`, `.xlsx`.

```powershell
curl -X POST "http://localhost:8001/api/kb/upload?title=FAQ%20public" ^
  -F "file=@faq.xlsx"
```

### `DELETE /api/kb/{doc_id}`

Xoa 1 row trong bang KB.

```powershell
curl -X DELETE "http://localhost:8001/api/kb/123"
```

## 13. Checklist kiem tra dashboard public

Chay lan luot:

```powershell
curl http://localhost:8001/api/health
curl http://localhost:8001/api/kpis
curl http://localhost:8001/api/daily
curl "http://localhost:8001/api/qa?only_unanswered=true"
curl http://localhost:8001/api/faq
curl http://localhost:8001/api/kb/list
```

Ket qua mong doi:

- `/api/health` tra `status=ok`.
- `/api/kpis.total_qa` khop tong cau hoi dashboard.
- `/api/daily` co cac ngay dang hien tren chart.
- `/api/qa?only_unanswered=true.total` khop KPI `bot_refused`.
- `/api/faq.summary.total = answered + refused + error`.
- `/api/kb/list` doc dung bang `documents_public`.

## 14. Loi thuong gap

### `503 Service Unavailable`

Thuong do:

- Sai `SUPABASE_URL` / `SUPABASE_KEY`.
- Sai ten bang chat history.
- Bang bi RLS chan select.

### KPI bang 0 nhung DB co data

Kiem tra format cot `message`. Can co:

```json
{"type": "human", "content": "cau hoi"}
{"type": "ai", "content": "cau tra loi"}
{"type": "tool", "name": "Supabase_Vector_Store", "content": "..."}
```

### FAQ khong hien KB thieu

Kiem tra:

- Tool row co `type = "tool"`.
- Tool row co `name` gan voi `Supabase_Vector_Store`.
- Sau tool call co AI final response.
- Bot co noi ro cac cum nhu `chua co thong tin`, `khong co thong tin`, `chua cap nhat thong tin`.
