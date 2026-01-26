#  LinkUp - Community Chat & AI Assistant Platform

LinkUp là một nền tảng chat thời gian thực hiện đại, được thiết kế đặc biệt cho các cộng đồng trực tuyến. Nơi mọi người có thể kết nối, thảo luận và nhận hỗ trợ từ trí tuệ nhân tạo (AI) một cách liền mạch.

##  Tính năng nổi bật
- **Landing Page hiện đại**: Giao diện giới thiệu chuyên nghiệp, tối ưu trải nghiệm người dùng đầu cuối.
- **Chat thời gian thực**: Hỗ trợ hội thoại nhóm (Public), Chat riêng tư (Direct Message) và các kênh chuyên biệt.
- **Hybrid Support (Help & Support)**: Hệ thống hỗ trợ thông minh. Khi **Admin online**, tin nhắn sẽ được gửi trực tiếp cho Admin. Khi **Admin offline**, AI LinkUp Support sẽ tự động tiếp quản để hỗ trợ người dùng 24/7.
- **AI Assistant & Meta-AI Experience**: Nút chức năng nhanh ngay trên tin nhắn (Giải thích, Viết lại, Tóm tát, Dịch thuật).
- **Trình quản trị (Admin Dashboard)**: Giao diện dành riêng cho quản trị viên để quản lý API Keys (Gemini/OpenAI), theo dõi người dùng và thống kê hệ thống.
- **AI Memory**: Ghi nhớ sở thích và phong cách phản hồi mong muốn của từng cá nhân.
- **An toàn & Riêng tư**: Chức năng chặn người dùng "Zalo-style" thời gian thực, thu hồi tin nhắn và bảo mật dữ liệu.

---

##  Công nghệ sử dụng
- **Backend**: FastAPI (Python), Motor (MongoDB Async Driver).
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand (State Management).
- **AI Engine**: Google Gemini API (Phối hợp Model mới nhất: 3 Flash, 2.5 Flash).
- **Database**: MongoDB Atlas.

---

##  Hướng dẫn cài đặt và Chạy dự án (Clone)

### 1. Yêu cầu hệ thống
- **Python**: Phiên bản 3.10 trở lên.
- **Node.js**: Phiên bản 18 trở lên (Khuyên dùng LTS).
- **Git**: Để tải mã nguồn.

### 2. Tải mã nguồn
```bash
git clone https://github.com/daolam1734/xdpmhdt-linkupchat.git
cd xdpmhdt-linkupchat
```

### 3. Cấu hình Biến môi trường (.env)
Đây là bước **quan trọng nhất**. Bạn cần tạo tệp `.env` bên trong thư mục `backend/` (KHÔNG phải thư mục gốc).

1. Truy cập thư mục: `cd backend`
2. Tạo tệp `.env` và điền các thông tin sau:
```dotenv
# Google AI Studio (Lấy tại: https://aistudio.google.com/app/apikey)
GOOGLE_API_KEY=AIzaSy... (Key của bạn)

# MongoDB Atlas (Chuỗi kết nối từ Cluster của bạn)
MONGODB_URL=mongodb+srv://<user>:<pass>@cluster.xyz.mongodb.net/linkupchat
MONGODB_DB=linkupchat

# Bảo mật (Có thể để mặc định hoặc đổi chuỗi ngẫu nhiên)
SECRET_KEY=yoursecretkeyhere
ALGORITHM=HS256
PORT=8000
HOST=0.0.0.0
```

### 4. Khởi động dự án (Windows - Khuyên dùng)

Tại thư mục tổng (`xdpmhdt-linkupchat`), tôi đã chuẩn bị sẵn 2 script PowerShell để tự động hóa mọi quy trình cài đặt:

*   **Chạy Backend:** Double-click hoặc chạy lệnh `.\run_backend.ps1`. 
    *(Script sẽ tự tạo môi trường ảo .venv, cài đặt thư viện và chạy server tại port 8000)*
*   **Chạy Frontend:** Double-click hoặc chạy lệnh `.\run_frontend.ps1`.
    *(Script sẽ cài đặt Node modules và khởi động Vite tại port 5173)*

### 5. Cài đặt thủ công (Nếu script không hoạt động)

**Backend:**
```bash
cd backend
python -m venv .venv
# Kích hoạt venv (Windows: .venv\Scripts\activate | Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

##  Cách sử dụng hệ thống

1. **Đăng ký tài khoản**: Truy cập `http://localhost:5173` để bắt đầu.
2. **Help & Support**: 
   - Nếu bạn đăng nhập bằng tài khoản **Admin** (is_superuser: true), bạn sẽ nhận được tin nhắn từ tất cả người dùng hỏi hỗ trợ. Hãy dùng chức năng "Reply" để trả lời họ.
   - Nếu bạn là người dùng thường, bạn có thể nhắn tin hỏi đáp. AI sẽ trả lời nếu không có Admin nào trực tuyến.
3. **Gọi AI trong nhóm**: Nhắn `@ai + câu hỏi` để gọi trợ lý trong các phòng chat công cộng.
4. **Trang Quản trị**: Admin có thể truy cập `Trang quản trị` từ Menu để thay đổi API Key trực tiếp mà không cần sửa file `.env`.

---

##  Liên hệ & Đóng góp
Nếu bạn gặp bất kỳ lỗi nào trong quá trình chạy code, vui lòng mở **Issue** trên GitHub hoặc gửi mail về: `support@linkup.chat`.

---
*LinkUp - Mang cộng đồng và trí tuệ nhân tạo lại gần nhau hơn.*
