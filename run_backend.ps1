# LinkUp Chat - Quick Start Script (Windows)

Write-Host "============================" -ForegroundColor Cyan
Write-Host "   LinkUp Chat - Backend    " -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# 0. Kiểm tra Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Không tìm thấy Python trong hệ thống. Vui lòng cài đặt Python tại python.org" -ForegroundColor Red
    exit
}

# 1. Kiểm tra File .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "[!] Đang tạo file .env từ file mẫu..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[*] Vui lòng mở file backend\.env và điền MONGODB_URL và GOOGLE_API_KEY trước khi chạy!" -ForegroundColor Red
}

# 2. Tạo môi trường ảo (Virtual Environment)
if (-not (Test-Path "backend\.venv")) {
    Write-Host "[*] Đang khởi tạo môi trường ảo Python..." -ForegroundColor Green
    python -m venv backend\.venv
}

# 3. Kích hoạt và cài đặt dependencies
Write-Host "[*] Đang cập nhật thư viện..." -ForegroundColor Green
& "backend\.venv\Scripts\pip.exe" install -r backend\requirements.txt

# 4. Chạy Backend
Write-Host "----------------------------"
Write-Host "[SUCCESS] LinkUp Backend đang khởi động!" -ForegroundColor Green
Write-Host "[INFO] API URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "[INFO] Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "[INFO] Dashboard Admin: Đăng nhập với quyền Admin để xem tab 'Hỗ trợ khách hàng'" -ForegroundColor Yellow
Write-Host "----------------------------"

& "backend\.venv\Scripts\python.exe" -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
