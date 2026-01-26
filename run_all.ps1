# LinkUp Chat - Full Project Launcher (Windows)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "         LinkUp Chat - Hệ Thống Tổng Thể       " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " 1. Chạy Backend (API, WebSocket, AI Support)"
Write-Host " 2. Chạy Frontend (Vite Dev Server)"
Write-Host " 3. Chạy Cả Hai (Trong hai cửa sổ mới)"
Write-Host " ---------------------------------------------"
$choice = Read-Host "Chọn một tùy chọn (1-3)"

switch ($choice) {
    "1" {
        ./run_backend.ps1
    }
    "2" {
        ./run_frontend.ps1
    }
    "3" {
        Write-Host "[*] Đang khởi động Backend..." -ForegroundColor Green
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "./run_backend.ps1"
        
        Write-Host "[*] Đang khởi động Frontend..." -ForegroundColor Magenta
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "./run_frontend.ps1"
        
        Write-Host "[SUCCESS] Hệ thống đang được khởi chạy trong cửa sổ riêng." -ForegroundColor Green
    }
    Default {
        Write-Host "[!] Lựa chọn không hợp lệ." -ForegroundColor Red
    }
}
