from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
import asyncio
from typing import Optional
from datetime import datetime, timezone
from backend.app.api.deps import get_current_user_ws
from backend.app.db.session import db
from .manager import manager
from .utils import notify_user_status_change, handle_admin_offline_catchup
from .handlers import (
    handle_edit_message, 
    handle_recall_message, 
    handle_delete_message, 
    handle_send_message,
    handle_pin_message,
    handle_read_receipt,
    handle_reaction
)

router = APIRouter()

@router.websocket("/ws/{token}")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str
):
    # Khôi phục user từ token
    user = await get_current_user_ws(token)
    if not user:
        # Nếu token không hợp lệ, đóng kết nối với lỗi chính sách
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    user_id = user.get("id")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    manager.connect(websocket, user_id)
    
    # Cập nhật trạng thái online
    await db["users"].update_one(
        {"id": user_id}, 
        {"$set": {"is_online": True, "last_seen": datetime.now(timezone.utc)}}
    )
    await notify_user_status_change(user_id, True)

    try:
        error_count = 0
        while True:
            try:
                # Sử dụng receive_json thay vì receive_text nếu client gửi JSON
                data = await websocket.receive_json()
                error_count = 0 # Reset error count on successful receive
                
                # Kiểm tra loại message
                msg_type = data.get("type")
                
                if msg_type == "send_message" or msg_type == "message":
                    await handle_send_message(user_id, user, data)
                
                elif msg_type == "edit_message" or msg_type == "edit":
                    await handle_edit_message(user_id, data)
                    
                elif msg_type == "recall_message" or msg_type == "recall":
                    await handle_recall_message(user_id, data)
                    
                elif msg_type == "delete_message" or msg_type == "delete_for_me":
                    await handle_delete_message(user_id, data)
                    
                elif msg_type == "pin_message" or msg_type == "pin":
                    await handle_pin_message(user_id, data)
                    
                elif msg_type == "read_receipt":
                    await handle_read_receipt(user_id, data)
                
                elif msg_type == "reaction":
                    await handle_reaction(user_id, data)
                    
                elif msg_type == "typing":
                    await manager.broadcast_to_room(data.get("room_id"), {
                        "type": "typing",
                        "user_id": user_id,
                        "username": user.get("username"),
                        "room_id": data.get("room_id"),
                        "status": data.get("status", True)
                    })
                
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                # Bắt riêng WebSocketDisconnect để thoát khỏi vòng lặp và đi vào khối xử lý ngắt kết nối
                raise
            except Exception as e:
                error_count += 1
                print(f"Error handling websocket message (Attempt {error_count}): {e}")
                
                # Nếu xảy ra quá nhiều lỗi liên tiếp hoặc lỗi nghiêm trọng, ta ngắt kết nối để tránh spam loop
                if error_count > 10:
                    print("Too many consecutive errors, closing connection.")
                    break

                # Gửi thông báo lỗi cho client nếu có thể
                try:
                    await websocket.send_json({"type": "error", "message": "An error occurred processing your request"})
                except:
                    pass
                
                # Sleep một chút để tránh vòng lặp quá nhanh nếu lỗi lặp lại liên tục
                await asyncio.sleep(0.1)
                continue

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        if user:
            await db["users"].update_one(
                {"id": user_id}, 
                {"$set": {"is_online": False, "last_seen": datetime.now(timezone.utc)}}
            )
            await notify_user_status_change(user_id, False)
            
            # Xử lý admin offline (cho fallback AI)
            if user.get("is_superuser"):
                await handle_admin_offline_catchup(user_id)
    except Exception as e:
        print(f"WebSocket fatal error: {e}")
        manager.disconnect(websocket, user_id)

