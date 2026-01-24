from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
import uuid
import os
import shutil
from backend.app.api.deps import get_current_user

router = APIRouter()

# Ràng buộc hệ thống
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {
    # Images
    "jpg", "jpeg", "png", "gif", "webp",
    # Documents
    "pdf", "docx", "txt", "xlsx"
}
UPLOAD_DIR = "backend/static/uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # 1. Kiểm tra kích thước tệp
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Tệp quá lớn. Giới hạn tối đa là 5MB.")

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

    # 4. Trả về URL và thông tin tệp
    # Lưu ý: Client sẽ sử dụng URL này để hiển thị hoặc gửi qua WebSocket
    return {
        "file_id": file_id,
        "filename": file.filename,
        "url": f"/static/uploads/{safe_filename}",
        "type": "image" if ext in ["jpg", "jpeg", "png", "gif", "webp"] else "file",
        "size": file_size
    }
