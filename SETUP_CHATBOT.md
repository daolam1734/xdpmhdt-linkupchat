# 🤖 Hướng dẫn Cài đặt & Cấu hình Chatbot LinkUp

Tài liệu này hướng dẫn chi tiết cách thiết lập hệ thống Chatbot LinkUp sử dụng FastAPI (Backend), React (Frontend) và tích hợp Google Gemini AI qua SDK mới nhất.

---

## 📌 1. Yêu cầu hệ thống
*   **Python**: 3.10+
*   **Node.js**: 18.x+
*   **Database**: MongoDB Atlas (Đã cấu hình SSL/TLS)
*   **AI SDK**: `google-genai` (v1.60.0)

---

## ⚙️ 2. Cấu hình Môi trường (.env)

Tạo hoặc cập nhật file `.env` tại thư mục gốc của dự án:

```dotenv
# --- GOOGLE AI CONFIG ---
GOOGLE_API_KEY=

# --- MONGODB CONFIG (ATLAS) ---
MONGODB_URL=
MONGODB_DB=linkupchat

# --- SECURITY ---
SECRET_KEY=yoursecretkeyhere
ALGORITHM=HS256
```

---

## 🚀 3. Khởi chạy dự án

### Bước 1: Thiết lập Backend
```powershell
cd backend
# Cài đặt thư viện
pip install -r requirements.txt
pip install google-genai certifi motor

# Chạy server (Port 8000)
python -m uvicorn app.main:app --reload --port 8000
```

## 🛡️ 4. Quản lý Admin & Hot-swap API Key

Hệ thống LinkUp đã tích hợp cơ chế **Hot-swap Configuration**. Bạn không cần khởi động lại server để thay đổi API Key:

1.  Truy cập vào trang **Admin Dashboard**.
2.  Tìm mục **Cấu hình Hệ thống** (System Config).
3.  Cập nhật API Key mới cho Google (Gemini).
4.  Hệ thống sẽ tự động thực hiện:
    *   Cập nhật vào Database (MongoDB).
    *   Ghi đè trực tiếp vào file `.env` vật lý.
    *   Áp dụng ngay lập tức cho các phiên Chat tiếp theo.

---

## ✨ 5. Trải nghiệm Meta AI Style

Chatbot đã được tối ưu hóa để mang lại trải nghiệm tương tự Meta AI:
*   **Proactive Suggestions**: Sau mỗi câu trả lời, AI sẽ tự động gợi ý 3 nút hành động nhanh.
*   **Gradient UI**: Huy hiệu "LinkUp AI" và viền Avatar sử dụng dải màu gradient cao cấp.
*   **Smart RAG**: AI tự động đọc 10 tin nhắn gần nhất để hiểu ngữ cảnh phòng chat.
*   **Intelligence Fallback Path**: Hệ thống tự động chuyển đổi giữa các dòng model thế hệ mới:
    *   `gemini-3-flash-preview` (Model chủ lực)
    *   `gemini-3-flash`
    *   `gemini-2.5-flash`
    *   `gemini-2.5-flash-lite` (Fallback cuối cùng)

---

## 🛠️ 6. Troubleshooting
*   **Lỗi 429**: Hết hạn ngạch (Quota). Hãy kiểm tra API Key trong Admin.
*   **Lỗi SSL**: Đã được xử lý bằng `certifi` trong code. Đảm bảo pip đã cài `certifi`.
*   **Markdown**: Sử dụng `react-markdown` ở Frontend để hiển thị định dạng đẹp nhất.
npm install

# Chạy dev server (Port 5173)
npm run dev
```

---

## 🤖 4. Cơ chế hoạt động của AI

### Danh sách Model hỗ trợ (Strict List)
Hệ thống được cấu hình chỉ sử dụng 3 model Gemini thế hệ mới nhất theo thứ tự ưu tiên:
1.  **Gemini 3 Flash** (`gemini-3-flash-preview`)
2.  **Gemini 2.5 Flash** (`gemini-2.0-flash`)
3.  **Gemini 2.5 Flash Lite** (`gemini-2.0-flash-lite-preview-02-05`)

### Cơ chế dự phòng (Fallback)
Nếu model ưu tiên (Gemini 3) gặp lỗi **429 (Too Many Requests)** hoặc quá tải, hệ thống sẽ tự động chuyển sang các model tiếp theo trong danh sách mà không làm gián đoạn cuộc trò chuyện.

### Quản lý API Key (Hot-Swap)
Hệ thống ưu tiên lấy API Key từ **MongoDB** (Collection: `system_configs`). Bạn có thể thay đổi Key trong trang Admin mà không cần khởi động lại Server.

---

## 🛠 5. Cách gọi AI trong Chat
1.  **Phòng AI Assistant**: Nhắn tin trực tiếp, AI sẽ tự động phản hồi.
2.  **Lệnh gọi trực tiếp**: Sử dụng `@ai`, `/ai`, hoặc `bot ai` kèm theo câu hỏi trong bất kỳ phòng chat nào.
3.  **AI Gợi ý (Suggestions)**: AI sẽ tự động đưa ra gợi ý khi tin nhắn trong phòng hội thoại đủ dài (>15 ký tự).

---

## ⚠️ Lưu ý quan trọng
*   Luôn đảm bảo cài đặt thư viện `certifi` để tránh lỗi SSL khi kết nối với MongoDB Atlas.
*   Nếu AI báo lỗi 429 liên tục, hãy kiểm tra hạn mức (Quota) của API Key tại [Google AI Studio](https://aistudio.google.com/).
