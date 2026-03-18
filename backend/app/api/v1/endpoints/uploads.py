from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional
import uuid
import os
import shutil
from datetime import datetime, timezone
from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.app.core.admin_config import get_system_config

router = APIRouter()

# Ràng buộc mặc định
ALLOWED_EXTENSIONS = {
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp",
    "pdf", "docx", "doc", "txt", "xlsx", "xls", "pptx", "ppt", "csv",
    "zip", "rar", "7z", "mp3", "wav", "mp4", "mov"
}

# Cấu hình đường dẫn lưu trữ
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
AVATAR_DIR = os.path.join(UPLOAD_ROOT, "avatars")
MESSAGE_DIR = os.path.join(UPLOAD_ROOT, "messages")

for d in [AVATAR_DIR, MESSAGE_DIR]:
    os.makedirs(d, exist_ok=True)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Query("file", enum=["avatar", "file"]),
    room_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Tải lên tệp tin với phân loại bảo mật.
    - avatar: Lưu vào thư mục công khai, ai cũng có thể xem qua URL.
    - file: Lưu vào thư mục riêng tư, chỉ người trong phòng chat (room_id) mới xem được.
    """
    sys_config = await get_system_config(db)
    if not sys_config.get("file_upload_enabled", True):
        raise HTTPException(status_code=403, detail="Tính năng tải lên tệp đã bị tắt.")

    # 1. Kiểm tra kích thước
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    max_mb = sys_config.get("max_file_size_mb", 10) # Tăng lên 10MB mặc định
    if file_size > max_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Tệp quá lớn (Tối đa {max_mb}MB)")

    # 2. Kiểm tra định dạng
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Định dạng .{ext} không được hỗ trợ.")

    # 3. Phân loại lưu trữ
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.{ext}"
    
    if category == "avatar":
        target_dir = AVATAR_DIR
        public_url = f"/avatars/{safe_filename}"
    else:
        # Tệp tin trong chat cần room_id để bảo mật
        if not room_id:
            raise HTTPException(status_code=400, detail="Cần room_id để tải lên tệp tin trong chat.")
        target_dir = MESSAGE_DIR
        public_url = f"/api/v1/files/download/{file_id}"

    file_path = os.path.join(target_dir, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lưu tệp: {str(e)}")

    # 4. Lưu Metadata vào DB
    file_metadata = {
        "id": file_id,
        "owner_id": current_user["id"],
        "room_id": room_id,
        "filename": file.filename,
        "safe_filename": safe_filename,
        "extension": ext,
        "size": file_size,
        "category": category,
        "mime_type": file.content_type,
        "created_at": datetime.now(timezone.utc),
        "path": file_path
    }
    await db["files"].insert_one(file_metadata)

    file_type = "image" if ext in ["jpg", "jpeg", "png", "gif", "webp"] else ("video" if ext in ["mp4", "mov"] else "file")
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "url": public_url,
        "type": file_type,
        "size": file_size
    }

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Tải tệp tin an toàn. Kiểm tra quyền của người dùng đối với phòng chat chứa tệp đó.
    """
    file_meta = await db["files"].find_one({"id": file_id})
    if not file_meta:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin")

    # Nếu là tệp tin (không phải avatar), kiểm tra quyền truy cập phòng chat
    if file_meta["category"] == "file":
        room_id = file_meta.get("room_id")
        member = await db["room_members"].find_one({
            "room_id": room_id,
            "user_id": current_user["id"]
        })
        if not member:
            raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập tệp tin này.")

    if not os.path.exists(file_meta["path"]):
        raise HTTPException(status_code=404, detail="Tệp tin không tồn tại trên máy chủ")

    return FileResponse(
        path=file_meta["path"],
        filename=file_meta["filename"],
        media_type=file_meta.get("mime_type")
    )
