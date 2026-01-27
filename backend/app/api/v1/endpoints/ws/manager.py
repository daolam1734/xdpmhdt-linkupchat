from typing import Dict, List
from fastapi import WebSocket
from backend.app.db.session import db

class ConnectionManager:
    def __init__(self):
        # Dict of user_id -> list of websockets
        self.user_connections: Dict[str, List[WebSocket]] = {}

    def connect(self, websocket: WebSocket, user_id: str):
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.user_connections:
            # Làm sạch message trước khi gửi để tránh lỗi serializing (e.g. ObjectId, datetime)
            import json
            from bson import ObjectId
            from datetime import datetime

            def json_serializable(obj):
                if isinstance(obj, (datetime)):
                    return obj.isoformat()
                if isinstance(obj, ObjectId):
                    return str(obj)
                return str(obj)

            try:
                # Ghost conversion to ensure it's serializable
                clean_message = json.loads(json.dumps(message, default=json_serializable))
                
                # Copy list to avoid concurrent modification issues
                active_connections = self.user_connections[user_id][:]
                for connection in active_connections:
                    try:
                        # Check if connection is still alive before sending
                        from starlette.websockets import WebSocketState
                        if connection.client_state == WebSocketState.CONNECTED:
                            await connection.send_json(clean_message)
                        else:
                            # If not connected, clean up
                            if connection in self.user_connections[user_id]:
                                self.user_connections[user_id].remove(connection)
                    except Exception as e:
                        # "Cannot call 'send' once a close message has been sent" is common during disconnect
                        friendly_error = str(e)
                        if "once a close message has been sent" in friendly_error:
                            pass # Silent cleanup
                        else:
                            print(f"Error sending to connection for user {user_id}: {friendly_error}")
                        
                        # Cleanup the broken connection
                        if connection in self.user_connections[user_id]:
                            self.user_connections[user_id].remove(connection)

                # Clean up empty user entries
                if user_id in self.user_connections and not self.user_connections[user_id]:
                    del self.user_connections[user_id]

            except Exception as e:
                print(f"Error cleaning message for user {user_id}: {e}")

    async def force_disconnect(self, user_id: str):
        """
        Đóng tất cả các kết nối WebSocket của một người dùng và gửi thông báo logout.
        """
        if user_id in self.user_connections:
            # Gửi thông điệp cuối cùng
            await self.send_to_user(user_id, {"type": "force_logout", "message": "Admin has ended your session."})
            
            # Đóng tất cả connections
            connections = self.user_connections[user_id][:]
            for connection in connections:
                try:
                    await connection.close(code=1000)
                except:
                    pass
            # disconnect sẽ được gọi tự động khi close, nhưng ta dọn dẹp luôn nếu cần
            if user_id in self.user_connections:
                del self.user_connections[user_id]

    async def broadcast_to_room(self, room_id: str, message: dict):
        """
        Tìm tất cả thành viên của phòng và gửi cho họ.
        """
        if not room_id:
            return

        # Đảm bảo room_id luôn được xử lý đúng định dạng (cả string và ObjectId)
        search_query = {"room_id": {"$in": [str(room_id)]}}
        try:
            from bson import ObjectId
            if ObjectId.is_valid(room_id):
                search_query["room_id"]["$in"].append(ObjectId(room_id))
        except:
            pass

        members = await db["room_members"].find(search_query).to_list(length=1000)
        
        # Gửi đến tất cả thành viên (bao gồm cả sender để sync UI nếu cần)
        for member in members:
            u_id = member.get("user_id")
            if u_id:
                await self.send_to_user(str(u_id), message)

    async def broadcast_to_admins(self, message: dict):
        """
        Gửi tin nhắn cho tất cả các Admin đang online.
        """
        # Thay vì dựa vào "is_online" trong DB, ta kiểm tra trực tiếp các kết nối đang active
        # và lọc ra những user có quyền admin/superuser
        admins = await db["users"].find({
            "$or": [{"is_superuser": True}, {"role": "admin"}]
        }).to_list(length=100)
        
        for admin in admins:
            admin_id = str(admin.get("id") or admin.get("_id"))
            await self.send_to_user(admin_id, message)

manager = ConnectionManager()
