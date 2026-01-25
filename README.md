# 🚀 LinkUp - Community Chat & AI Assistant Platform

LinkUp là một nền tảng chat thời gian thực hiện đại, được thiết kế đặc biệt cho các cộng đồng trực tuyến. Nơi mọi người có thể kết nối, thảo luận và nhận hỗ trợ từ trí tuệ nhân tạo (AI) một cách liền mạch.

## ✨ Tính năng nổi bật
- **Chat thời gian thực**: Hội thoại nhóm (Public) và Chat riêng tư (Direct Message).
- **AI Assistant**: Trợ lý thông minh hỗ trợ giải đáp, tóm tắt, dịch thuật và viết lại tin nhắn.
- **AI Memory (Ký ức nhẹ)**: Ghi nhớ sở thích cá nhân của người dùng để tùy chỉnh phản hồi AI.
- **LinkUp Support**: Kênh hỗ trợ kỹ thuật được vận hành bởi AI chuyên biệt.
- **Meta-AI Style Experience**: Giao diện hiện đại, nút chức năng nhanh (Explain, Rewrite, Summarize, Translate).
- **An toàn & Riêng tư**: Hỗ trợ thu hồi tin nhắn, xóa tin nhắn phía người dùng.

---

## 🛠️ Công nghệ sử dụng
- **Backend**: FastAPI (Python), Motor (MongoDB Async Driver).
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **AI**: Google Gemini API (Model: 3 Flash, 2.5 Flash).
- **Database**: MongoDB Atlas.

---

## 🚀 Hướng dẫn cài đặt sau khi Clone

### 1. Chuẩn bị
Đảm bảo máy tính của bạn đã cài đặt:
- **Python** 3.10+
- **Node.js** 18+
- **Git**

### 2. Clone dự án
```bash
git clone https://github.com/your-username/linkup-chat.git
cd linkup-chat
```

### 3. Cấu hình Backend
Di chuyển vào thư mục backend và thiết lập môi trường ảo:
```bash
cd backend
python -m venv .venv

# Kích hoạt môi trường ảo (Windows)
.venv\Scripts\activate

# Kích hoạt môi trường ảo (Linux/Mac)
source .venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Khởi tạo Database (Tạo các phòng mặc định và Index)
python -m app.db.init_db
```

### 4. Cấu hình Frontend
Di chuyển vào thư mục frontend và cài đặt dependencies:
```bash
cd ../frontend
npm install
```

### 5. Thiết lập biến môi trường (.env)
Tạo file `.env` tại thư mục gốc của toàn dự án (root):
```dotenv
# Google Gemini API Key
GOOGLE_API_KEY=AIzaSy... (Lấy tại aistudio.google.com)

# MongoDB Config (Atlas)
MONGODB_URL=mongodb+srv://... (Link kết nối database)
MONGODB_DB=linkupchat

# Security
SECRET_KEY=yoursecretkeyhere
ALGORITHM=HS256
```

### 6. Chạy ứng dụng

#### Khởi động Backend (Mở terminal 1):
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

#### Khởi động Frontend (Mở terminal 2):
```bash
cd frontend
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:5173`

---

## 📝 Lưu ý quan trọng
- **Khởi tạo Database**: Khi chạy lần đầu, hãy đảm bảo database được khởi tạo thông qua script (nếu có) hoặc hệ thống sẽ tự động tạo các phòng mặc định (`general`, `help`, `ai`).
- **Lệnh gọi AI**: Trong các phòng chat nhóm, hãy sử dụng `@ai` kèm nội dung để gọi trợ lý. Trong phòng "AI Assistant" hoặc "LinkUp Support", AI sẽ tự động lắng nghe và phản hồi trực tiếp.

---

## 🤝 Liên hệ hỗ trợ
Nếu bạn gặp vấn đề trong quá trình cài đặt, vui lòng liên hệ: `support@linkup.chat` hoặc mở một Issue trên GitHub.

---
*LinkUp - Giúp cộng đồng kết nối và thảo luận hiệu quả.*
