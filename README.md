# 🚀 Trang Nguyen AI - Chatbot Admin & Analytics Dashboard

Hệ thống quản trị tập trung dành cho việc điều hành AI, quản lý kho tri thức (**Knowledge Base**) và phân tích hiệu suất phản hồi của Chatbot tại **Trạng Nguyên Education**.

---

## 📌 Giới thiệu

Dự án cung cấp một nền tảng quản trị toàn diện bao gồm:

- 📊 Theo dõi hiệu suất chatbot theo thời gian thực  
- 🧠 Quản lý và cập nhật dữ liệu tri thức  
- 👥 Giám sát hoạt động người dùng nội bộ  
- 📈 Phân tích hành vi và xu hướng sử dụng  

Hệ thống được chia thành **Frontend Dashboard** và **Analytics Engine Backend**.

---

## 📂 Cấu trúc dự án (Project Structure)
```
├── chatbot-admin/ # Frontend (ReactJS)
└── tn_dashboard/ # Backend Analytics (Python)#
```

---

### 1️⃣ Frontend (`chatbot-admin/`)

Sử dụng: **ReactJS + Vite + Tailwind CSS**

#### 📁 Cấu trúc chi tiết:
```
src/admin/
├── components/ # UI Components dùng chung
├── hooks/ # Custom Hooks (logic tách biệt)
├── pages/ # Các trang chính
├── services/ # API Calls (Axios/Fetch)
├── layouts/ # Layout (Sidebar, Header, AdminLayout)
└── utils/ # Hàm tiện ích
```


#### 📄 Các trang chính:

- **Dashboard.jsx** → Hiển thị số liệu, biểu đồ, analytics  
- **KnowledgeManagement.jsx** → Quản lý dữ liệu tri thức  
- **Settings.jsx** → Cấu hình hệ thống  

#### ⚙️ Hooks tiêu biểu:

- `useDashboard.js`
- `useKnowledge.js`

---

### 2️⃣ Analytics Backend (`tn_dashboard/`)

Backend chịu trách nhiệm xử lý dữ liệu và cung cấp API cho Frontend.

**Công nghệ:** Python, Streamlit, Pandas

**Thành phần chính:**

- `api.py` – Cung cấp các API endpoints cho frontend  
- `analytics.py` – Xử lý và tính toán dữ liệu thống kê  
- `dashboard.py` – Hiển thị dashboard bằng Streamlit  
- `requirements.txt` – Danh sách thư viện  

**Chức năng chính:**

- Xử lý dữ liệu chat và tính toán metrics  
- Cung cấp dữ liệu realtime cho Dashboard  
- Hỗ trợ hiển thị báo cáo qua Streamlit  

---

## ✨ Tính năng nổi bật

### 📊 Dashboard Analytics

- **Real-time Analytics**
  - Theo dõi số phiên chat  
  - Tỷ lệ phản hồi thành công  
  - Phiên bị từ chối  

- **Performance Tracking**
  - Biểu đồ Line so sánh hiệu suất với mục tiêu (80%)  

- **User Behavior**
  - Phân tích giờ cao điểm  
  - Thống kê từ khóa phổ biến  

---

### 🧠 Knowledge Base Management

- Thêm dữ liệu Q&A thủ công  
- Import dữ liệu từ file  
- Tích hợp webhook với n8n  
- Đồng bộ với Vector Database  

#### 🔍 Audit Log

- Ghi nhận các câu hỏi chatbot chưa trả lời được  
- Hỗ trợ cải thiện dữ liệu liên tục  

---

### 👥 User Management

- Theo dõi hoạt động Admin / Staff  
- Phân quyền theo phòng ban  
- Quản lý bằng mã bí mật nội bộ  

---

## 🛠 Hướng dẫn cài đặt

### 🔧 Yêu cầu hệ thống

- Node.js >= 18  
- Python >= 3.9  

---

### 1️⃣ Cài đặt Frontend

```bash
cd chatbot-admin
npm install

# Tạo file .env
VITE_API_URL=your_api_url

npm run dev
```
### 2️⃣ Cài đặt Backend Analytics
```bash
cd tn_dashboard

pip install -r requirements.txt

# Hoặc chạy API
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

## 🚀 Deployment

### 🌐 Frontend
- Deploy tự động qua Vercel
- Trigger khi push code lên GitHub / GitLab
### 🔐 Environment Variables
Cấu hình trong .env:
- API URL
- Database URL
- Webhook n8n
- API Keys

### 🛠 Tech Stack

| Thành phần     | Công nghệ                    |
|----------------|-----------------------------|
| Frontend       | ReactJS, Vite, Tailwind CSS |
| UI Icons       | Lucide Icons                |
| Visualization  | Chart.js / Recharts         |
| Backend        | Python                      |
| Analytics      | Pandas, Streamlit           |
| Automation     | n8n Workflow                |
| Deployment     | Vercel, Nginx               |

### 📈 Định hướng phát triển
 
- Tối ưu performance loading dashboard
- Cải thiện UX/UI Knowledge Base
- Thêm AI auto-suggest dữ liệu
- Phân tích nâng cao (AI Insights)
