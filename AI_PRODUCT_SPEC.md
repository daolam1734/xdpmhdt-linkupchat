# 🤖 AI PRODUCT SPEC

## LinkUp AI Assistant

**Phiên bản:** v1.0
**Trạng thái:** Public Beta
**Sản phẩm:** LinkUp – Nền tảng chat người-với-người
**Thành phần:** AI Assistant (không phải chatbot trung tâm)

---

## 1. Mục tiêu sản phẩm (Product Goals)

### 1.1. Mục tiêu chính

LinkUp AI Assistant được xây dựng để:

* **Hỗ trợ người dùng giao tiếp hiệu quả hơn**
* **Tăng giá trị hội thoại**, không thay thế con người
* **Tích hợp tự nhiên vào trải nghiệm chat xã hội**

### 1.2. Mục tiêu KHÔNG theo đuổi

LinkUp AI **không nhằm**:

* Trở thành người tham gia chính trong hội thoại
* Tự động trả lời thay người dùng
* Thao túng hoặc dẫn dắt cảm xúc người dùng
* Hoạt động như một “customer support bot” truyền thống

---

## 2. Nguyên tắc thiết kế cốt lõi (Design Principles)

### 2.1. AI-on-Demand

* AI **chỉ xuất hiện khi người dùng chủ động gọi**
* Không có phản hồi tự động ngoài ý muốn

### 2.2. Human-first

* Con người luôn là trung tâm
* AI đứng sau hỗ trợ

### 2.3. Rõ ràng & minh bạch

* AI có danh tính riêng
* Không giả làm người thật
* Không che giấu giới hạn

### 2.4. Không gây phiền

* Không spam
* Không chen ngang
* Không lặp lại

---

## 3. Đối tượng người dùng (User Types)

### 3.1. Người dùng cá nhân

* Chat 1–1
* Hỏi AI khi cần giải thích, viết lại, dịch

### 3.2. Người dùng nhóm

* Chat nhóm bạn bè / cộng đồng
* Gọi AI để:

  * giải đáp nhanh
  * tổng hợp nội dung
  * hỗ trợ kiến thức

### 3.3. Người dùng kỹ thuật / học tập

* Hỏi code
* Giải thích khái niệm
* Soạn nội dung đa ngôn ngữ

---

## 4. Phạm vi tính năng (Feature Scope)

### 4.1. Cách AI được kích hoạt (Entry Points)

| Cách             | Mô tả             |
| ---------------- | ----------------- |
| Phòng chat riêng | “LinkUp AI”       |
| Mention          | `@ai`             |
| Slash command    | `/ai`             |
| Nút gợi ý        | Smart Suggestions |

---

### 4.2. Hành vi phản hồi

* Trả lời **theo dạng streaming**
* Hiển thị trạng thái *“AI đang soạn thảo…”*
* Nội dung ngắn gọn, đúng trọng tâm
* Không trả lời thay người dùng

---

### 4.3. Smart Suggestions

* Sau mỗi phản hồi AI:

  * Gợi ý **tối đa 3 hành động tiếp theo**
* Gợi ý chỉ mang tính **tùy chọn**
* Người dùng có thể:

  * bấm để tiếp tục
  * hoặc bỏ qua hoàn toàn

---

### 4.4. Context Awareness

* AI được phép sử dụng:

  * tối đa **10 tin nhắn gần nhất**
  * chỉ trong **phòng chat đang hoạt động**
* Không đọc lịch sử ngoài phạm vi được gọi

---

## 5. Những hành vi BỊ CẤM (Hard Constraints)

LinkUp AI **KHÔNG BAO GIỜ**:

* Tự gửi tin nhắn trong chat người-với-người
* Tự động tham gia hội thoại
* Trả lời thay danh tính người dùng
* Đọc tin nhắn riêng tư không được cung cấp
* Suy đoán cảm xúc, ý định cá nhân
* Ghi nhớ thông tin cá nhân nếu chưa được cho phép

---

## 6. Trải nghiệm giao diện (UX Specification)

### 6.1. Nhận diện AI

* Avatar riêng
* Icon AI
* Gradient / màu khác biệt
* Nhãn “AI”

### 6.2. Hiển thị an toàn

* Dòng chú thích:

  > “AI có thể không chính xác. Vui lòng kiểm tra thông tin quan trọng.”

---

## 7. Yêu cầu kỹ thuật & Dữ liệu

### 7.1. Độ trễ (Latency)

* TTFT (Time To First Token) < 2 giây
* Tốc độ stream ổn định

### 7.2. Độ tin cậy (Reliability)

* Đảm bảo uptime
* Không gián đoạn hội thoại

---

### 7.3. Dữ liệu & lưu trữ

* Tin nhắn AI = tin nhắn hệ thống
* Có thể:

  * tìm kiếm
  * ghim
  * xóa
* Không dùng để train model mặc định

---

## 8. Bảo mật & quyền riêng tư

* AI chỉ xử lý dữ liệu **trong phạm vi yêu cầu**
* Không chia sẻ dữ liệu cho bên thứ ba ngoài nhà cung cấp model
* Cho phép người dùng:

  * bật / tắt AI
  * giới hạn AI trong group
  * xóa lịch sử AI

---

## 9. Chỉ số đánh giá (Success Metrics)

### 9.1. Chỉ số chính

* AI Invocation Rate
* AI Assisted Message Completion
* Retention sau khi dùng AI
* Thời gian phản hồi AI

### 9.2. Chỉ số cần tránh

* AI Spam Rate
* AI Overuse trong group
* User Mute AI

---

## 10. Phạm vi KHÔNG triển khai ở phiên bản hiện tại

* AI tự động trả lời thay người dùng
* AI chủ động nhắn tin
* Emotion manipulation
* Voice AI
* AI cá nhân hóa sâu (memory dài hạn)

---

## 11. Định hướng phát triển (Roadmap – rút gọn)

### Phase 1 (hiện tại)

* Chat AI cơ bản
* Smart Suggestions
* Fallback model

### Phase 2

* AI preference (nhẹ)
* Tóm tắt hội thoại
* AI mode (dịch / viết lại / giải thích)

### Phase 3

* AI cá nhân hóa có kiểm soát
* Multi-model routing
* AI analytics cho admin

---

## 12. Tuyên ngôn sản phẩm (Product Statement)

> **LinkUp AI không thay thế cuộc trò chuyện của con người.
> Nó tồn tại để làm cho cuộc trò chuyện đó tốt hơn.**
