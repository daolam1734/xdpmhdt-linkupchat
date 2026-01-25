# LinkUp Chat - Quick Start Script Frontend (Windows)

Write-Host "============================" -ForegroundColor Magenta
Write-Host "   LinkUp Chat - Frontend   " -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

Set-Location frontend

# 1. Kiểm tra node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Đang cài đặt thư viện Frontend (NPM)..." -ForegroundColor Green
    npm install
}

# 2. Chạy Frontend
Write-Host "----------------------------"
Write-Host "[SUCCESS] Đang khởi động Frontend tại http://localhost:5173" -ForegroundColor Green
Write-Host "----------------------------"

npm run dev
