from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import json
import asyncio
from datetime import datetime, timezone
from typing import List, Dict
from jose import jwt
import uuid
import re
from google import genai
from google.genai import types
from backend.app.core.config import settings
from backend.app.db.session import db
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.app.core.admin_config import get_system_api_key

router = APIRouter()

# --- LINKUP AI (META AI STYLE) TRAINING CONFIG ---
LINKUP_SYSTEM_PROMPT = """
Bạn là một trợ lý AI hội thoại thân thiện (LinkUp Assistant), được tích hợp trong ứng dụng chat người-với-người.

VAI TRÒ
- Bạn là “trợ lý hỗ trợ”, không phải người tham gia chính trong cuộc trò chuyện.
- Bạn tồn tại để giúp người dùng khi họ CHỦ ĐỘNG gọi bạn.
- Bạn không thay thế con người, không nói thay họ.

NGUYÊN TẮC CỐT LÕI
1. KHÔNG BAO GIỜ chủ động chen vào cuộc trò chuyện giữa người với người.
2. CHỈ phản hồi khi:
   - Người dùng nhắn trực tiếp cho bạn
   - Hoặc gọi bạn bằng lệnh (/ai, @ai, nút AI)
3. KHÔNG gửi tin nhắn thay người dùng.
4. KHÔNG giả vờ là con người.
5. KHÔNG đưa ra thông tin riêng tư hoặc suy đoán về người khác.

PHONG CÁCH GIAO TIẾP
- Thân thiện, tự nhiên, giống một trợ lý trong ứng dụng chat xã hội.
- Trả lời ngắn gọn, rõ ràng, không lan man.
- Không dùng ngôn ngữ học thuật trừ khi người dùng yêu cầu.
- Có thể dùng emoji NHẸ nếu phù hợp, nhưng không lạm dụng.

CÁCH TRẢ LỜI
- Nếu câu hỏi mơ hồ: hỏi lại nhẹ nhàng để làm rõ.
- Nếu không chắc thông tin: nói rõ bạn không chắc.
- Nếu không có dữ liệu: nói “mình không có thông tin đó”.
- Nếu người dùng yêu cầu hỗ trợ soạn tin:
  → đưa ra gợi ý trả lời, KHÔNG gửi thay người dùng. Giữ nguyên giọng điệu phù hợp với nội dung hội thoại.

CƠ CHẾ RAG (KNOWLEDGE & CONTEXT)
- Bạn được cung cấp ngữ cảnh cuộc trò chuyện từ hệ thống.
- Nếu thông tin được cung cấp trong context thì ưu tiên dùng.
- Nếu không có trong context, nói rõ bạn không tìm thấy thông tin hoặc thừa nhận bạn không chắc chắn. KHÔNG bịa đặt.

QUYỀN RIÊNG TƯ & GIỚI HẠN
- không đọc hoặc suy đoán nội dung tin nhắn riêng tư nếu không được cung cấp trong context chính thức.
- Không ghi nhớ thông tin cá nhân hoặc tự lưu “ký ức” nếu không được hệ thống cho phép.

TRONG CHAT NHÓM
- Chỉ phản hồi khi được @mention hoặc gọi bằng lệnh.
- Không trả lời thay cho thành viên khác. Không chiếm diễn đàn.

TONE MẶC ĐỊNH
- Gần gũi, Trung lập, Hỗ trợ, Không phán xét.

MỤC TIÊU CUỐI CÙNG
- Giúp người dùng giao tiếp tốt hơn, làm trải nghiệm chat thuận tiện và không gây phiền nhiễu.
"""

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
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def broadcast_to_room(self, room_id: str, message: dict):
        # Tìm tất cả thành viên của phòng và gửi cho họ
        members = await db["room_members"].find({"room_id": room_id}).to_list(length=100)
        for member in members:
            await self.send_to_user(member["user_id"], message)

manager = ConnectionManager()

async def get_ai_model(db_instance, model_name="gemini-1.5-flash"):
    if "gpt" in model_name.lower():
        api_key = await get_system_api_key(db_instance, "openai")
        if not api_key: 
            print("⚠️ OpenAI API Key is missing.")
            return None
        return ChatOpenAI(
            model=model_name,
            openai_api_key=api_key,
            streaming=True
        )
    
    api_key = await get_system_api_key(db_instance, "google")
    if not api_key:
        print("⚠️ Google API Key is missing.")
        return None
        
    # Sử dụng trực tiếp các model bạn yêu cầu:
    # gemini-3-flash-preview, gemini-3-flash, gemini-2.5-flash, gemini-2.5-flash-lite
    client = genai.Client(api_key=api_key)
    return client, model_name

# Danh sách dự phòng theo yêu cầu: Ưu tiên model mới nhất và fallback dần
fallback_models = [
    "gemini-3-flash-preview", 
    "gemini-3-flash",        
    "gemini-2.5-flash", 
    "gemini-2.5-flash-lite"
]

async def run_ai_generation_task(
    room_id: str, 
    prompt: str, 
    chat_context: str, 
    user_id: str, 
    username: str, 
    ai_msg_id: str, 
    ai_identity: str,
    is_suggestion_mode: bool
):
    """
    Chạy xử lý AI trong background task để WebSocket không bị block.
    """
    try:
        from backend.app.db.session import db
        import uuid
        
        async def send_ai_data(data: dict):
            if is_suggestion_mode:
                # Chỉ gửi gợi ý cho các thành viên KHÁC trong phòng
                members = await db["room_members"].find({"room_id": room_id}).to_list(length=100)
                for member in members:
                    if member["user_id"] != user_id:
                        # Chuyển đổi type sang ai_suggestion
                        suggestion_data = data.copy()
                        if suggestion_data["type"] == "message":
                            suggestion_data["type"] = "ai_suggestion"
                        else:
                            suggestion_data["type"] = f"ai_suggestion_{suggestion_data['type']}"
                        await manager.send_to_user(member["user_id"], suggestion_data)
            else:
                await manager.broadcast_to_room(room_id, data)

        # Thông báo AI đang phản hồi
        await send_ai_data({"type": "typing", "room_id": room_id, "status": True})

        await send_ai_data({
            "type": "start",
            "message_id": ai_msg_id,
            "sender": ai_identity,
            "room_id": room_id
        })

        full_response = ""
        success = False
        last_error = None
        final_prompt = f"Dưới đây là ngữ cảnh cuộc trò chuyện gần nhất:\n{chat_context}\n\nNgười dùng vừa yêu cầu: {prompt}" if chat_context else prompt

        # Thử lần lượt các model trong fallback_models
        for current_model_name in fallback_models:
            try:
                result = await get_ai_model(db, model_name=current_model_name)
                if not result: continue
                
                if isinstance(result, tuple):
                    client, target_model = result
                    response_stream = await client.aio.models.generate_content_stream(
                        model=target_model,
                        contents=final_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=LINKUP_SYSTEM_PROMPT
                        )
                    )
                    
                    async for chunk in response_stream:
                        chunk_text = chunk.text
                        if chunk_text:
                            full_response += chunk_text
                            await send_ai_data({"type": "chunk", "message_id": ai_msg_id, "content": chunk_text})
                else:
                    # LangChain/OpenAI fallback
                    llm = result
                    from langchain.schema import SystemMessage, HumanMessage
                    messages = [SystemMessage(content=LINKUP_SYSTEM_PROMPT), HumanMessage(content=final_prompt)]
                    async for chunk in llm.astream(messages):
                        chunk_text = chunk.content
                        if isinstance(chunk_text, list):
                            chunk_text = "".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in chunk_text])
                        if chunk_text:
                            full_response += chunk_text
                            await send_ai_data({"type": "chunk", "message_id": ai_msg_id, "content": chunk_text})
                
                if full_response:
                    success = True
                    break
            except Exception as e:
                print(f"⚠️ Model {current_model_name} failed: {e}")
                last_error = e
                continue

        if not success:
            if last_error: raise last_error
            else: raise Exception("All models failed to respond")

        ai_final_ts = datetime.now(timezone.utc)
        
        # Lưu vào DB nếu không phải suggestion mode
        if not is_suggestion_mode:
            db_ai_msg = {
                "id": ai_msg_id,
                "content": full_response,
                "sender_id": None,
                "sender_name": ai_identity,
                "room_id": room_id,
                "timestamp": ai_final_ts,
                "is_bot": True,
                "deleted_by_users": []
            }
            await db["messages"].insert_one(db_ai_msg)
            await db["chat_rooms"].update_one({"id": room_id}, {"$set": {"updated_at": ai_final_ts}})

        await send_ai_data({
            "type": "end",
            "message_id": ai_msg_id,
            "room_id": room_id,
            "timestamp": ai_final_ts.isoformat()
        })

        # --- GỢI Ý NHANH (SUGGESTIONS) ---
        if not is_suggestion_mode:
            try:
                sugg_prompt = f"Dựa trên câu trả lời vừa rồi: '{full_response[:200]}...', hãy đưa ra 3 câu hỏi ngắn (dưới 10 từ) mà người dùng có thể muốn hỏi tiếp theo. Trả lời dưới dạng list Python, ví dụ: ['Dịch sang tiếng Anh', 'Giải thích thêm', 'Ví dụ cụ thể']"
                
                # Dùng lại client từ model thành công nếu có
                client_to_use = client if 'client' in locals() else genai.Client(api_key=await get_system_api_key(db, "google"))
                
                sugg_response = await client_to_use.aio.models.generate_content(
                    model="gemini-2.5-flash-lite", 
                    contents=sugg_prompt,
                    config=types.GenerateContentConfig(temperature=0.7)
                )
                
                import ast
                text = sugg_response.text
                start = text.find('[')
                end = text.find(']') + 1
                if start != -1 and end != -1:
                    suggestions = ast.literal_eval(text[start:end])
                    if isinstance(suggestions, list):
                        await db["messages"].update_one(
                            {"id": ai_msg_id},
                            {"$set": {"suggestions": suggestions[:3]}}
                        )
                        await send_ai_data({
                            "type": "ai_suggestions_list",
                            "message_id": ai_msg_id,
                            "suggestions": suggestions[:3]
                        })
            except:
                pass
        
        # Đảm bảo tắt trạng thái typing khi kết thúc thành công
        await manager.broadcast_to_room(room_id, {"type": "typing", "room_id": room_id, "status": False})

    except Exception as e:
        print(f"❌ Background AI Error: {e}")
        # Đảm bảo tắt trạng thái typing khi có lỗi
        await manager.broadcast_to_room(room_id, {"type": "typing", "room_id": room_id, "status": False})
        # Gửi lỗi cho người dùng
        try:
            await send_ai_data({
                "type": "message",
                "message_id": str(uuid.uuid4()),
                "content": f"LinkUp AI gặp lỗi: {str(e)}",
                "is_bot": True,
                "room_id": room_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except: pass

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = str(payload.get("sub"))
    except Exception as e:
        print(f"❌ WebSocket Auth Failed: {e}")
        return

    await websocket.accept()
    print(f"✅ WebSocket Connected: User {user_id}")
    
    # Get user info
    user_obj = await db["users"].find_one({"id": user_id})
    if not user_obj:
        print(f"❌ User {user_id} not found in database")
        return
    username = user_obj.get("username", "Unknown")

    # Cập nhật trạng thái online
    await db["users"].update_one(
        {"id": user_id},
        {"$set": {"is_online": True, "last_seen": datetime.now(timezone.utc)}}
    )
    
    manager.connect(websocket, user_id)
    
    try:
        user = await db["users"].find_one({"id": user_id})
        username = user.get("username") if user else "Unknown"

        while True:
            data = await websocket.receive_text()
            try:
                message_json = json.loads(data)
            except:
                message_json = {"type": "message", "content": data}
            
            msg_type = message_json.get("type", "message")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            
            if msg_type == "read_receipt":
                room_id = message_json.get("room_id")
                msg_id = message_json.get("message_id")
                if room_id:
                    # Cập nhật tin nhắn đã xem
                    if msg_id:
                        await db["messages"].update_one(
                            {"id": msg_id, "room_id": room_id},
                            {"$set": {"status": "seen"}}
                        )
                    else:
                        # Mark all as seen in this room for current user
                        await db["messages"].update_many(
                            {"room_id": room_id, "sender_id": {"$ne": user_id}, "status": {"$ne": "seen"}},
                            {"$set": {"status": "seen"}}
                        )
                    
                    # Notify others in the room
                    await manager.broadcast_to_room(room_id, {
                        "type": "read_receipt",
                        "room_id": room_id,
                        "user_id": user_id,
                        "message_id": msg_id
                    })
                continue
            
            room_id = message_json.get("room_id")
            if not room_id: continue

            now = datetime.now(timezone.utc)

            if msg_type == "message":
                content = message_json.get("content", "").strip()
                file_url = message_json.get("file_url")
                file_type = message_json.get("file_type") # "image" hoặc "file"
                
                if not content and not file_url: continue

                # Tự động tham gia phòng nếu chưa là thành viên (Dành cho phòng Public/AI)
                await db["room_members"].update_one(
                    {"room_id": room_id, "user_id": user_id},
                    {"$setOnInsert": {"joined_at": now}},
                    upsert=True
                )

                reply_to_id = message_json.get("reply_to_id")
                reply_to_content = None
                if reply_to_id:
                    parent = await db["messages"].find_one({"id": reply_to_id})
                    if parent:
                        reply_to_content = parent.get("content")

                shared_post = message_json.get("shared_post")

                msg_id = str(uuid.uuid4())
                db_msg = {
                    "id": msg_id,
                    "content": content,
                    "file_url": file_url,
                    "file_type": file_type,
                    "sender_id": user_id,
                    "sender_name": username,
                    "room_id": room_id,
                    "timestamp": now,
                    "is_bot": False,
                    "is_edited": False,
                    "is_recalled": False,
                    "is_pinned": False,
                    "status": "sent",
                    "reply_to_id": reply_to_id,
                    "reply_to_content": reply_to_content,
                    "shared_post": shared_post,
                    "deleted_by_users": []
                }
                await db["messages"].insert_one(db_msg)
                await db["chat_rooms"].update_one({"id": room_id}, {"$set": {"updated_at": now}})

                metadata = {
                    "type": "message",
                    "message_id": msg_id,
                    "sender_id": user_id,
                    "sender_name": username,
                    "sender_avatar": user_obj.get("avatar") or user_obj.get("avatar_url"),
                    "content": content,
                    "file_url": file_url,
                    "file_type": file_type,
                    "is_bot": False,
                    "room_id": room_id,
                    "timestamp": now.isoformat(),
                    "status": "sent",
                    "reply_to_id": reply_to_id,
                    "reply_to_content": reply_to_content,
                    "shared_post": shared_post
                }
                await manager.broadcast_to_room(room_id, metadata)

                # --- AI LOGIC START ---
                # Check room type from database for more accurate detection
                room_obj = await db["chat_rooms"].find_one({"id": room_id})
                is_ai_room = room_id == "ai" or (room_obj and room_obj.get("type") == "private" and room_id == "ai")
                
                # Cải tiến: Nhận diện @ai linh hoạt hơn (ở bất kỳ vị trí nào, hoa/thường)
                content_lower = content.lower()
                is_explicit_call = "@ai" in content_lower or "/ai" in content_lower or "@ ai" in content_lower or "bot ai" in content_lower
                
                # Theo nguyên tắc Meta AI: Không tự ý chen ngang cuộc hội thoại
                # Chỉ kích hoạt AI trong phòng AI hoặc khi được gọi đích danh (explicit call)
                is_suggestion_mode = False 
                if is_explicit_call or is_ai_room:
                    ai_msg_id = str(uuid.uuid4())
                    ai_identity = "LinkUp Assistant"
                    
                    # Trích xuất prompt sạch
                    prompt_clean = content
                    if is_explicit_call:
                        for trigger in ["@ai", "/ai", "@ ai", "bot ai"]:
                            prompt_clean = re.sub(re.escape(trigger), '', prompt_clean, flags=re.IGNORECASE).strip()
                        if not prompt_clean: prompt_clean = "Chào bạn! Tôi có thể giúp gì cho bạn?"

                    # Meta-AI Style RAG: Lấy ngữ cảnh
                    room_info = f"Phòng: {room_obj.get('name', 'Cá nhân')}" if room_obj else "Phòng: Cá nhân"
                    user_info = f"Người đang chat với bạn: {username}"
                    chat_context = f"Bối cảnh: {room_info}\n{user_info}\n--- Lịch sử chat gần đây ---\n"
                    
                    recent_msgs = await db["messages"].find({"room_id": room_id}).sort("timestamp", -1).limit(10).to_list(length=10)
                    recent_msgs.reverse()
                    for m in recent_msgs:
                        if m.get("id") == msg_id: continue
                        sender = m.get("sender_name") or "Ẩn danh"
                        chat_context += f"[{sender}]: {m.get('content')}\n"

                    # CHẠY REALTIME BACKGROUND TASK
                    asyncio.create_task(run_ai_generation_task(
                        room_id=room_id,
                        prompt=prompt_clean,
                        chat_context=chat_context,
                        user_id=user_id,
                        username=username,
                        ai_msg_id=ai_msg_id,
                        ai_identity=ai_identity,
                        is_suggestion_mode=is_suggestion_mode
                    ))
                # --- AI LOGIC END ---

            elif msg_type == "edit":
                msg_id = message_json.get("message_id")
                new_content = message_json.get("content")
                if msg_id and new_content:
                    result = await db["messages"].update_one(
                        {"id": msg_id, "sender_id": user_id},
                        {"$set": {"content": new_content, "is_edited": True}}
                    )
                    if result.modified_count > 0:
                        # Cập nhật preview cho các tin nhắn đang trả lời tin nhắn này
                        await db["messages"].update_many(
                            {"reply_to_id": msg_id},
                            {"$set": {"reply_to_content": new_content}}
                        )
                        await manager.broadcast_to_room(room_id, {
                            "type": "edit_message",
                            "message_id": msg_id,
                            "content": new_content,
                            "room_id": room_id
                        })

            elif msg_type == "recall":
                msg_id = message_json.get("message_id")
                if msg_id:
                    result = await db["messages"].update_one(
                        {"id": msg_id, "sender_id": user_id},
                        {"$set": {"is_recalled": True, "content": "Tin nhắn đã được thu hồi"}}
                    )
                    if result.modified_count > 0:
                        # Cập nhật preview cho các tin nhắn đang trả lời tin nhắn này
                        await db["messages"].update_many(
                            {"reply_to_id": msg_id},
                            {"$set": {"reply_to_content": "Tin nhắn đã được thu hồi"}}
                        )
                        await manager.broadcast_to_room(room_id, {
                            "type": "recall_message",
                            "message_id": msg_id,
                            "room_id": room_id
                        })

            elif msg_type == "pin":
                msg_id = message_json.get("message_id")
                if msg_id:
                    msg = await db["messages"].find_one({"id": msg_id})
                    if msg:
                        new_pinned_state = not msg.get("is_pinned", False)
                        await db["messages"].update_one({"id": msg_id}, {"$set": {"is_pinned": new_pinned_state}})
                        await manager.broadcast_to_room(room_id, {
                            "type": "pin_message",
                            "message_id": msg_id,
                            "is_pinned": new_pinned_state,
                            "room_id": room_id
                        })

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        # Cập nhật trạng thái offline
        await db["users"].update_one(
            {"id": user_id},
            {"$set": {"is_online": False, "last_seen": datetime.now(timezone.utc)}}
        )
        print(f"ℹ️ WebSocket Disconnected: User {user_id}")
    except Exception as e:
        print(f"❌ WebSocket error ({user_id}): {e}")
        try:
            manager.disconnect(websocket, user_id)
            if user_id:
                await db["users"].update_one(
                    {"id": user_id},
                    {"$set": {"is_online": False, "last_seen": datetime.now(timezone.utc)}}
                )
        except:
            pass

