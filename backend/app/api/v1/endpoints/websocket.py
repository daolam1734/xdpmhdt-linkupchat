from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import json
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional
from jose import jwt
import uuid
import re
from datetime import datetime, timezone

# --- AI Cooldown management ---
# Stores the last time AI responded in a specific room to prevent spam
ai_cooldowns: Dict[str, datetime] = {}
from google import genai
from google.genai import types
from backend.app.core.config import settings
from backend.app.db.session import db
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.app.core.admin_config import get_system_api_key

router = APIRouter()

SELF_ISOLATED_ROOMS = ["ai", "help"]

LINKUP_SUPPORT_PROMPT = """
Bạn là Chuyên viên Hỗ trợ của LinkUp (LinkUp Support). 
Nhiệm vụ của bạn là giải đáp các thắc mắc về kỹ thuật, hướng dẫn sử dụng ứng dụng và hỗ trợ người dùng gặp khó khăn.

GIỚI THIỆU VỀ LINKUP:
LinkUp là nền tảng chat thời gian thực dành cho các cộng đồng trực tuyến, nơi mọi người có thể trao đổi, chia sẻ và thảo luận một cách cởi mở và liền mạch. Ứng dụng hỗ trợ hội thoại nhóm linh hoạt, phù hợp cho các cộng đồng học thuật, kỹ thuật, sáng tạo hoặc sở thích chung.

PHONG CÁCH:
- Chuyên nghiệp, lịch sự và kiên nhẫn.
- Luôn sẵn sàng giúp đỡ.

HƯỚNG DẪN:
1. Giải đáp các thắc mắc về tính năng của app: Nhắn tin, Tạo nhóm, Call Video, AI Assistant, Ký ức AI.
2. Nếu người dùng hỏi về các vấn đề tài khoản, hãy hướng dẫn họ bảo mật kỹ.
3. Nếu không biết câu trả lời, hãy báo người dùng liên hệ email: support@linkup.chat.
"""

# --- LINKUP AI (META AI STYLE) TRAINING CONFIG ---
LINKUP_SYSTEM_PROMPT = """
Bạn là một trợ lý AI hội thoại thân thiện (LinkUp Assistant), được tích hợp trong ứng dụng chat người-với-người.

KIẾN THỨC VỀ HỆ THỐNG (LINKUP):
LinkUp là nền tảng chat thời gian thực dành cho các cộng đồng trực tuyến, nơi mọi người có thể trao đổi, chia sẻ và thảo luận một cách cởi mở và liền mạch. Ứng dụng hỗ trợ hội thoại nhóm linh hoạt, phù hợp cho các cộng đồng học thuật, kỹ thuật, sáng tạo hoặc sở thích chung.

AI Assistant trong LinkUp đóng vai trò như trợ lý hỗ trợ kiến thức, chỉ phản hồi khi được gọi. Trong môi trường cộng đồng, AI có thể:
- Giải đáp nhanh các câu hỏi phổ biến.
- Tóm tắt nội dung thảo luận.
- Hỗ trợ giải thích kiến thức chung.
- Giúp thành viên mới nắm bắt nội dung nhanh hơn.

LinkUp đảm bảo AI không làm gián đoạn hoặc lấn át thảo luận của con người, giữ cho cộng đồng luôn tự nhiên, thân thiện và dễ kiểm soát.

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
- Không trả lời thay cho thành viên khác.

TONE MẶC ĐỊNH
- Gần gũi, Trung lập, Hỗ trợ, Không phán xét.

AI MEMORY & PREFERENCES
- Hệ thống sẽ cung cấp cho bạn "Ký ức nhẹ" (AI Memory) về người dùng này nếu có (ví dụ: họ thích trả lời ngắn, hay hỏi code, hoặc ngôn ngữ ưa thích). Hãy điều chỉnh phong cách phản hồi cho phù hợp với những ghi chú này.

AI MODES (CHẾ ĐỘ XỬ LÝ)
- Nếu người dùng yêu cầu hành động cụ thể (Tóm tắt, Giải thích, Viết lại, Dịch), bạn phải tuân thủ nghiêm ngặt định dạng đó:
  + GIẢI THÍCH: Chia nhỏ khái niệm phức tạp thành ngôn ngữ bình dân.
  + VIẾT LẠI: Giữ nguyên ý, thay đổi cách diễn đạt cho hay hơn/lịch sự hơn.
  + TÓM TẮT: Chỉ lấy ý chính, cực kỳ ngắn gọn.
  + DỊCH: Chuyển ngữ chính xác, tự nhiên.

MỤC TIÊU CUỐI CÙNG
- Giúp người dùng giao tiếp tốt hơn, làm trải nghiệm chat thuận tiện và không gây phiền nhiễu.
"""

async def notify_user_status_change(user_id: str, is_online: bool):
    """
    Thông báo cho tất cả bạn bè về việc người dùng thay đổi trạng thái online.
    """
    try:
        user = await db["users"].find_one({"id": user_id})
        if not user: return
        
        # Nếu người dùng tắt chế độ hiển thị trạng thái, luôn hiện offline cho người khác
        effective_online = is_online and user.get("show_online_status", True)
        
        # Lấy danh sách bạn bè
        friends_reqs = await db["friend_requests"].find({
            "status": "accepted",
            "$or": [{"from_id": user_id}, {"to_id": user_id}]
        }).to_list(length=1000)

        friend_ids = []
        for req in friends_reqs:
            friend_ids.append(req["to_id"] if req["from_id"] == user_id else req["from_id"])
            
        # Gửi thông báo cho từng bạn bè đang online
        for friend_id in friend_ids:
            # Ràng buộc: Không gửi status nếu có quan hệ chặn
            friend_user = await db["users"].find_one({"id": friend_id})
            if friend_user:
                is_blocked = (user_id in friend_user.get("blocked_users", []) or 
                             friend_id in user.get("blocked_users", []))
                
                status_to_send = effective_online if not is_blocked else False
                
                await manager.send_to_user(friend_id, {
                    "type": "user_status_change",
                    "user_id": user_id,
                    "is_online": status_to_send
                })
    except Exception as e:
        print(f"Error in notify_user_status_change: {e}")

async def handle_admin_offline_catchup(admin_id: str):
    """
    Khi một Admin offline, kiểm tra xem còn Admin nào khác online không.
    Nếu không còn Admin nào, tìm các tin nhắn chưa được trả lời trong phòng 'help' để AI trả lời.
    """
    try:
        # Kiểm tra xem còn admin nào online không
        active_admins_count = await db["users"].count_documents({
            "is_superuser": True, 
            "is_online": True,
            "id": {"$ne": admin_id}
        })

        if active_admins_count == 0:
            # Không còn admin nào online -> Kích hoạt AI trả lời các câu hỏi tồn đọng
            # Ta tìm các user đã gửi tin nhắn vào phòng 'help' mà tin nhắn cuối cùng của họ chưa được Admin/AI trả lời
            
            # Lấy danh sách user_id đã từng nhắn vào 'help'
            help_messages = await db["messages"].aggregate([
                {"$match": {"room_id": "help", "is_bot": False}},
                {"$group": {"_id": "$sender_id", "last_msg": {"$last": "$$ROOT"}}}
            ]).to_list(length=100)

            for entry in help_messages:
                user_id = entry["_id"]
                last_msg = entry["last_msg"]
                
                # Kiểm tra xem tin nhắn cuối cùng trong context của user này đã có phản hồi chưa
                has_reply = await db["messages"].find_one({
                    "room_id": "help",
                    "timestamp": {"$gt": last_msg["timestamp"]},
                    "$or": [
                        {"receiver_id": user_id},
                        {"is_bot": True}
                    ]
                })

                if not has_reply:
                    # AI bắt đầu trả lời
                    ai_msg_id = str(uuid.uuid4())
                    
                    user_obj = await db["users"].find_one({"id": user_id})
                    if not user_obj: continue
                    username = user_obj.get("username", "Người dùng")
                    
                    chat_context = f"Hệ thống: Admin vừa ngoại tuyến. AI đang tiếp quản hỗ trợ.\n--- Lịch sử chat gần đây ---\n"
                    # Lấy tin nhắn liên quan đến user này
                    recent_msgs = await db["messages"].find({
                        "room_id": "help",
                        "$or": [{"sender_id": user_id}, {"receiver_id": user_id}, {"is_bot": True}]
                    }).sort("timestamp", -1).limit(5).to_list(length=5)
                    recent_msgs.reverse()
                    
                    for m in recent_msgs:
                        sender = m.get("sender_name") or "AI"
                        chat_context += f"[{sender}]: {m.get('content')}\n"

                    # Chạy task AI
                    asyncio.create_task(run_ai_generation_task(
                        room_id="help",
                        prompt=last_msg["content"],
                        chat_context=chat_context,
                        user_id=user_id,
                        username=username,
                        ai_msg_id=ai_msg_id,
                        ai_identity="LinkUp Support"
                    ))
    except Exception as e:
        print(f"Error in admin catchup: {e}")

async def notify_block_status_change(target_user_id: str, by_user_id: str, is_blocked: bool):
    """
    Thông báo thời gian thực về trạng thái chặn/bỏ chặn cho cả người chặn và người bị chặn.
    """
    # 1. Gửi cho người bị chặn
    msg_type_target = "user_blocked_me" if is_blocked else "user_unblocked_me"
    await manager.send_to_user(target_user_id, {
        "type": msg_type_target,
        "by_user_id": by_user_id
    })
    
    # Nếu là chặn, gửi thêm tín hiệu offline giả lập để ẩn trạng thái ngay lập tức
    if is_blocked:
        await manager.send_to_user(target_user_id, {
            "type": "user_status_change",
            "user_id": by_user_id,
            "is_online": False
        })
    
    # 2. Gửi cho người chặn (để đồng bộ các session khác)
    msg_type_actor = "user_i_blocked" if is_blocked else "user_i_unblocked"
    await manager.send_to_user(by_user_id, {
        "type": msg_type_actor,
        "target_user_id": target_user_id
    })
    
    # Nếu chặn, ẩn luôn trạng thái của đối phương trên máy người chặn
    if is_blocked:
        await manager.send_to_user(by_user_id, {
            "type": "user_status_change",
            "user_id": target_user_id,
            "is_online": False
        })
    else:
        # Nếu bỏ chặn, cập nhật lại trạng thái online thực tế cho cả hai
        target_user = await db["users"].find_one({"id": target_user_id})
        actor_user = await db["users"].find_one({"id": by_user_id})
        
        if target_user:
            # Gửi cho người thực hiện bỏ chặn (by_user_id) trạng thái của target
            eff_target_online = target_user.get("is_online", False) and target_user.get("show_online_status", True)
            await manager.send_to_user(by_user_id, {
                "type": "user_status_change",
                "user_id": target_user_id,
                "is_online": eff_target_online
            })
            
        if actor_user:
            # Gửi cho người vừa được bỏ chặn (target_user_id) trạng thái của actor
            eff_actor_online = actor_user.get("is_online", False) and actor_user.get("show_online_status", True)
            await manager.send_to_user(target_user_id, {
                "type": "user_status_change",
                "user_id": by_user_id,
                "is_online": eff_actor_online
            })

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
    is_suggestion_mode: bool,
    is_ai_room: bool = False,
    user_prefs: Optional[dict] = None
):
    """
    Chạy xử lý AI trong background task để WebSocket không bị block.
    """
    try:
        from backend.app.db.session import db
        import uuid
        
        async def send_ai_data(data: dict):
            # Chỉ hiển thị hiệu ứng trung gian (typing, streaming) trong các phòng chuyên dụng cho AI (AI Room / Support Room)
            # Trong các phòng chat cộng đồng, AI sẽ "im lặng" xử lý và chỉ xuất hiện khi có kết quả cuối cùng.
            if not is_ai_room and data["type"] in ["typing", "start", "chunk"]:
                return

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
            elif is_ai_room:
                # Chỉ gửi cho người dùng yêu cầu (Isolation cho Chat AI/Support)
                await manager.send_to_user(user_id, data)
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

        if room_id == "help":
            ai_identity = "Hỗ trợ LinkUp"
            personalized_system_prompt = (
                "Bạn là nhân viên hỗ trợ khách hàng tại LinkUp Chat. "
                "Nhiệm vụ của bạn là hướng dẫn người dùng sử dụng ứng dụng, giải đáp thắc mắc về tính năng. "
                "Hãy trả lời với giọng điệu chuyên nghiệp, lịch sự và cực kỳ tận tâm. "
                "Tránh trả lời các vấn đề không liên quan đến ứng dụng LinkUp."
            )
        else:
            ai_identity = "LinkUp Assistant"
            personalized_system_prompt = LINKUP_SYSTEM_PROMPT

        if user_prefs:
            memory_ctx = "\n=== AI USER MEMORY (KÝ ỨC NGƯỜI DÙNG) ===\n"
            if user_prefs.get("preferred_style") == "short":
                memory_ctx += "- Người dùng này thích câu trả lời cực kỳ ngắn gọn.\n"
            if user_prefs.get("coding_frequency") == "high":
                memory_ctx += "- Người dùng hay hỏi về lập trình, hãy trả lời chuyên sâu và cung cấp code blocks nếu cần.\n"
            if user_prefs.get("language") == "en":
                memory_ctx += "- Ưu tiên phản hồi bằng tiếng Anh.\n"
            
            personalized_system_prompt += memory_ctx

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
                            system_instruction=personalized_system_prompt
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
                    messages = [SystemMessage(content=personalized_system_prompt), HumanMessage(content=final_prompt)]
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
                "receiver_id": user_id if room_id in SELF_ISOLATED_ROOMS else None,
                "room_id": room_id,
                "timestamp": ai_final_ts,
                "is_bot": True,
                "deleted_by_users": []
            }
            await db["messages"].insert_one(db_ai_msg)
            await db["chat_rooms"].update_one({"id": room_id}, {"$set": {"updated_at": ai_final_ts}})

        # Gửi tin nhắn hoàn chỉnh cuối cùng để cập nhật sidebar và lưu trạng thái cuối cùng
        # (Đối với phòng cộng đồng, điều này thay thế hiệu ứng streaming đã bị chặn.
        # Đối với phòng AI, điều này đồng bộ hóa trạng thái cuối cùng với sidebar)
        await send_ai_data({
            "type": "message",
            "message_id": ai_msg_id,
            "sender_id": None,
            "sender_name": ai_identity,
            "content": full_response,
            "is_bot": True,
            "room_id": room_id,
            "timestamp": ai_final_ts.isoformat()
        })

        await send_ai_data({
            "type": "end",
            "message_id": ai_msg_id,
            "room_id": room_id,
            "timestamp": ai_final_ts.isoformat()
        })
        
        # Đảm bảo tắt trạng thái typing khi kết thúc thành công
        await send_ai_data({"type": "typing", "room_id": room_id, "status": False})

    except Exception as e:
        print(f"❌ Background AI Error: {e}")
        # Đảm bảo tắt trạng thái typing khi có lỗi
        await send_ai_data({"type": "typing", "room_id": room_id, "status": False})
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
    
    # Thông báo cho bạn bè
    await notify_user_status_change(user_id, True)
    
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
                    if room_id not in SELF_ISOLATED_ROOMS:
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

                # Kiểm tra chặn người dùng (trong trường hợp chat 1-1)
                room_obj = await db["chat_rooms"].find_one({"id": room_id})
                if room_obj and room_obj.get("type") == "direct":
                    members = await db["room_members"].find({"room_id": room_id}).to_list(length=2)
                    other_member_id = next((m["user_id"] for m in members if m["user_id"] != user_id), None)
                    if other_member_id:
                        other_user = await db["users"].find_one({"id": other_member_id})
                        if other_user and user_id in other_user.get("blocked_users", []):
                            await manager.send_to_user(user_id, {
                                "type": "error", 
                                "message": "Không thể gửi tin nhắn. Người dùng này đã chặn bạn."
                            })
                            continue
                        if other_member_id in user_obj.get("blocked_users", []):
                            await manager.send_to_user(user_id, {
                                "type": "error", 
                                "message": "Bạn đang chặn người dùng này."
                            })
                            continue

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
                receiver_id = message_json.get("receiver_id")
                
                db_msg = {
                    "id": msg_id,
                    "content": content,
                    "file_url": file_url,
                    "file_type": file_type,
                    "sender_id": user_id,
                    "sender_name": username,
                    "receiver_id": receiver_id,
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
                    "receiver_id": receiver_id,
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
                
                if room_id == "help":
                    # Luôn gửi cho người gửi
                    await manager.send_to_user(user_id, metadata)
                    
                    # Nếu người gửi KHÔNG phải admin, gửi cho tất cả admin online
                    if not user_obj.get("is_superuser"):
                        admins = await db["users"].find({"is_superuser": True, "is_online": True}).to_list(length=50)
                        for admin in admins:
                            if admin["id"] != user_id:
                                await manager.send_to_user(admin["id"], metadata)
                    else:
                        # Nếu người gửi LÀ admin, họ phải có receiver_id để phản hồi đúng người
                        if receiver_id:
                            await manager.send_to_user(receiver_id, metadata)
                elif room_id in SELF_ISOLATED_ROOMS:
                    await manager.send_to_user(user_id, metadata)
                else:
                    await manager.broadcast_to_room(room_id, metadata)

                # --- AI LOGIC START ---
                # Check room type from database for more accurate detection
                room_obj = await db["chat_rooms"].find_one({"id": room_id})
                is_ai_room = (room_obj and room_obj.get("is_ai_room", False)) or room_id in SELF_ISOLATED_ROOMS
                room_type = room_obj.get("type", "private") if room_obj else "private"
                
                # Cải tiến: Nhận diện @ai linh hoạt hơn
                content_lower = content.lower()
                is_explicit_call = any(trigger in content_lower for trigger in ["@ai", "/ai", "@ ai", "bot ai"])
                
                is_suggestion_mode = False 
                
                # Meta-AI Style refinement: 
                # 1. AI chỉ tự động trả lời trong phòng AI Room riêng.
                # 2. Trong Group/Private chat khác, AI chỉ trả lời nếu được @mention và nội dung đủ dài.
                should_ai_respond = False
                if is_ai_room:
                    should_ai_respond = True
                    # Nếu là phòng Help & Support, không AI phản hồi nếu có Admin online
                    if room_id == "help":
                        active_admins_count = await db["users"].count_documents({"is_superuser": True, "is_online": True})
                        if active_admins_count > 0:
                            should_ai_respond = False
                elif is_explicit_call:
                    # Trích xuất prompt sạch để kiểm tra độ dài
                    test_prompt = content
                    for trigger in ["@ai", "/ai", "@ ai", "bot ai"]:
                        test_prompt = re.sub(re.escape(trigger), '', test_prompt, flags=re.IGNORECASE).strip()
                    if len(test_prompt) >= 2: # Ít nhất 2 ký tự (ví dụ: "hi")
                        should_ai_respond = True

                # Check cooldown for non-AI rooms to prevent spam
                if should_ai_respond and not is_ai_room:
                    now_ts = datetime.now(timezone.utc)
                    last_response = ai_cooldowns.get(room_id)
                    if last_response and (now_ts - last_response).total_seconds() < 5:
                        # Cooldown 5s cho phòng chat thông thường để tránh spam
                        should_ai_respond = False

                if should_ai_respond:
                    ai_msg_id = str(uuid.uuid4())
                    ai_identity = "LinkUp Assistant"
                    if room_id == "help":
                        ai_identity = "LinkUp Support"
                    
                    # Trích xuất prompt sạch
                    prompt_clean = content
                    if is_explicit_call:
                        for trigger in ["@ai", "/ai", "@ ai", "bot ai"]:
                            prompt_clean = re.sub(re.escape(trigger), '', prompt_clean, flags=re.IGNORECASE).strip()
                        if not prompt_clean: prompt_clean = "Chào bạn! Tôi có thể giúp gì for you?"

                    # Meta-AI Style RAG: Lấy ngữ cảnh (Giảm xuống 5 tin nhắn để tối ưu)
                    room_info = f"Phòng: {room_obj.get('name', 'Cá nhân')}" if room_obj else "Phòng: Cá nhân"
                    user_info = f"Người đang chat với bạn: {username}"
                    chat_context = f"Bối cảnh: {room_info}\n{user_info}\n--- Lịch sử chat gần đây ---\n"
                    
                    recent_msgs = await db["messages"].find({"room_id": room_id}).sort("timestamp", -1).limit(5).to_list(length=5)
                    recent_msgs.reverse()
                    for m in recent_msgs:
                        if m.get("id") == msg_id: continue
                        sender = m.get("sender_name") or "AI"
                        chat_context += f"[{sender}]: {m.get('content')}\n"

                    # Cập nhật cooldown
                    ai_cooldowns[room_id] = datetime.now(timezone.utc)

                    # Lấy preferences người dùng cho AI Memory
                    user_prefs = user_obj.get("ai_preferences")

                    # CHẠY REALTIME BACKGROUND TASK
                    asyncio.create_task(run_ai_generation_task(
                        room_id=room_id,
                        prompt=prompt_clean,
                        chat_context=chat_context,
                        user_id=user_id,
                        username=username,
                        ai_msg_id=ai_msg_id,
                        ai_identity=ai_identity,
                        is_suggestion_mode=is_suggestion_mode,
                        is_ai_room=is_ai_room or is_explicit_call, # Coi như AI room để luôn có suggestions
                        user_prefs=user_prefs
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

            elif msg_type == "delete_for_me":
                # Messenger style: Xóa phía bản thân (ẩn tin nhắn)
                msg_id = message_json.get("message_id")
                if msg_id:
                    await db["messages"].update_one(
                        {"id": msg_id},
                        {"$addToSet": {"deleted_by_users": user_id}}
                    )
                    # Chỉ phản hồi về cho chính user thực hiện để cập nhật UI locally
                    await manager.send_to_user(user_id, {
                        "type": "delete_for_me_success",
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
        now = datetime.now(timezone.utc)
        await db["users"].update_one(
            {"id": user_id},
            {"$set": {"is_online": False, "last_seen": now}}
        )
        # Thông báo cho bạn bè
        await notify_user_status_change(user_id, False)

        # Nếu là Admin offline, kiểm tra để AI tiếp quản Help room
        if user_obj.get("is_superuser"):
            asyncio.create_task(handle_admin_offline_catchup(user_id))
            
        print(f"ℹ️ WebSocket Disconnected: User {user_id}")
    except Exception as e:
        print(f"❌ WebSocket error ({user_id}): {e}")
        try:
            manager.disconnect(websocket, user_id)
            if user_id:
                now = datetime.now(timezone.utc)
                await db["users"].update_one(
                    {"id": user_id},
                    {"$set": {"is_online": False, "last_seen": now}}
                )
                await notify_user_status_change(user_id, False)
                # Nếu là Admin offline
                if user_obj.get("is_superuser"):
                    asyncio.create_task(handle_admin_offline_catchup(user_id))
        except:
            pass

