from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
import uuid
import os
import shutil
from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.app.core.admin_config import get_system_config

router = APIRouter()

# Ràng buộc mặc định (sẽ được ghi đè bởi Database nếu có)
MAX_FILE_SIZE_DEFAULT = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {
    # Images
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp",
    # Documents
    "pdf", "docx", "doc", "txt", "xlsx", "xls", "pptx", "ppt", "csv",
    # Archives
    "zip", "rar", "7z",
    # Audio/Video
    "mp3", "wav", "mp4", "mov"
}

# Xác định UPLOAD_DIR tuyệt đối dựa trên vị trí file này
# backend/app/api/v1/endpoints/uploads.py -> 5 levels up to reach 'backend'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # 0. Kiểm tra cấu hình hệ thống
    sys_config = await get_system_config(db)
    
    if not sys_config.get("file_upload_enabled", True):
        raise HTTPException(status_code=403, detail="Tính năng tải lên tệp đã bị quản trị viên tắt.")

    # 1. Kiểm tra kích thước tệp
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    max_mb = sys_config.get("max_file_size_mb", 5)
    max_bytes = max_mb * 1024 * 1024
    
    if file_size > max_bytes:
        raise HTTPException(status_code=400, detail=f"Tệp quá lớn. Giới hạn tối đa là {max_mb} MB.")

    # 2. Kiểm tra định dạng tệp
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Định dạng .{ext} không được hỗ trợ.")

    # 3. Lưu tệp với tên duy nhất
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu tệp: {str(e)}")

    # 4. Trả lời URL và thông tin tệp
    # Phân loại loại tệp dựa trên extension
    file_type = "image" if ext in ["jpg", "jpeg", "png", "gif", "webp"] else ("video" if ext in ["mp4", "mov"] else "file")
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "url": f"/static/uploads/{safe_filename}",
        "type": file_type,
        "size": file_size
    }
