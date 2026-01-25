# 🚀 LinkUp - Community Chat & AI Assistant Platform

LinkUp là một nền tảng chat thời gian thực hiện đại, được thiết kế đặc biệt cho các cộng đồng trực tuyến. Nơi mọi người có thể kết nối, thảo luận và nhận hỗ trợ từ trí tuệ nhân tạo (AI) một cách liền mạch.

## ✨ Tính năng nổi bật
- **Landing Page hiện đại**: Trang giới thiệu chuyên nghiệp, mô phỏng các nền tảng mạng xã hội và startup công nghệ.
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
git clone https://github.com/daolam1734/xdpmhdt-linkupchat.git
cd xdpmhdt-linkupchat
```

### 3. Khởi động nhanh (Khuyên dùng trên Windows)

Tôi đã tạo sẵn các script để tự động cài đặt và chạy ứng dụng một cách nhanh nhất:

*   **Để chạy Backend:** Click chuột phải vào `run_backend.ps1` -> `Run with PowerShell`.
*   **Để chạy Frontend:** Click chuột phải vào `run_frontend.ps1` -> `Run with PowerShell`.

Nếu đây là lần đầu chạy, script sẽ tự động tạo file `.env` và cài đặt các thư viện cần thiết. Bạn chỉ cần mở file `backend/.env` và điền `MONGODB_URL` và `GOOGLE_API_KEY`.

### 4. Cài đặt thủ công (Nếu script không chạy)

#### Cấu hình Backend:
```bash
cd backend
python -m venv .venv
# Kích hoạt .venv (Windows: .venv\Scripts\activate | Linux: source .venv/bin/activate)
pip install -r requirements.txt
```

#### Cấu hình Frontend:
```bash
cd frontend
npm install
```

### 5. Thiết lập biến môi trường (.env)
Tạo file `.env` tại thư mục `backend/`:
```dotenv
# Lấy tại aistudio.google.com
GOOGLE_API_KEY=your_key_here

# Link kết nối database MongoDB Atlas
MONGODB_URL=mongodb+srv://... 
MONGODB_DB=linkupchat
```

### 6. Chạy ứng dụng

| Thành phần | Câu lệnh | URL |
| :--- | :--- | :--- |
| **Backend** | `uvicorn backend.app.main:app --reload` | `http://localhost:8000` |
| **Frontend** | `npm run dev` (trong folder frontend) | `http://localhost:5173` |

---

## 📝 Lưu ý quan trọng
- **Khởi tạo Database**: Khi chạy lần đầu, hãy đảm bảo database được khởi tạo thông qua script (nếu có) hoặc hệ thống sẽ tự động tạo các phòng mặc định (`general`, `help`, `ai`).
- **Lệnh gọi AI**: Trong các phòng chat nhóm, hãy sử dụng `@ai` kèm nội dung để gọi trợ lý. Trong phòng "AI Assistant" hoặc "LinkUp Support", AI sẽ tự động lắng nghe và phản hồi trực tiếp.

---

## 🤝 Liên hệ hỗ trợ
Nếu bạn gặp vấn đề trong quá trình cài đặt, vui lòng liên hệ: `support@linkup.chat` hoặc mở một Issue trên GitHub.

---
*LinkUp - Giúp cộng đồng kết nối và thảo luận hiệu quả.*
