from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from backend.app.db.session import db
from backend.app.schemas.forum import Post, PostCreate, PostUpdate, PostDetail, Comment, CommentCreate
from backend.app.api.deps import get_current_user
from backend.app.schemas.user import User
from backend.app.core.admin_config import get_system_api_key
from google import genai
from google.genai import types

router = APIRouter()

@router.post("/posts/{post_id}/summarize")
async def summarize_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    post = await db["forum_posts"].find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    content = post.get("content", "")
    if not content or len(content.strip()) < 50:
        return {"summary": "Bài viết quá ngắn để tóm tắt."}

    try:
        api_key = await get_system_api_key(db, "google")
        if not api_key:
            print("Summarize error: API key missing")
            raise HTTPException(status_code=500, detail="Chưa cấu hình Google API Key.")
            
        client = genai.Client(api_key=api_key)
        
        prompt = f"Hãy tóm tắt bài viết sau đây một cách ngắn gọn, súc tích trong khoảng 2-3 câu:\n\n{content}"
        
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="Bạn là chuyên gia tóm tắt nội dung diễn đàn. Hãy viết tiếng Việt tự nhiên."
            )
        )
        return {"summary": response.text}
    except Exception as e:
        print(f"Summarize error: {e}")
        raise HTTPException(status_code=500, detail="Không thể tóm tắt bài viết vào lúc này.")

@router.post("/posts/{post_id}/analyze")
async def analyze_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    print(f"DEBUG: analyze_post called for post_id: {post_id}")
    post = await db["forum_posts"].find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    content = post.get("content", "")
    if not content or len(content.strip()) < 10:
        return {"analysis": "Bài viết quá nhỏ để phân tích."}

    try:
        api_key = await get_system_api_key(db, "google")
        if not api_key:
            print("Analyze error: API key missing")
            raise HTTPException(status_code=500, detail="Chưa cấu hình Google API Key.")
            
        client = genai.Client(api_key=api_key)
        
        prompt = f"Phân tích bài viết này và đưa ra 1 lời khuyên hoặc ý kiến đóng góp mang tính xây dựng:\n\n{content}"
        
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="Bạn là LinkUp Buddy, một người bạn thông thái trên diễn đàn. Hãy trả lời thân thiện, sử dụng emoji."
            )
        )
        return {"analysis": response.text}
    except Exception as e:
        print(f"Analyze error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi phân tích AI.")

@router.get("/posts", response_model=List[Post])
async def get_posts(
    skip: int = 0, 
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    cursor = db["forum_posts"].find().sort("timestamp", -1).skip(skip).limit(limit)
    posts_data = await cursor.to_list(length=limit)
    
    results = []
    for p in posts_data:
        p["id"] = p["_id"] if "_id" in p and isinstance(p["_id"], str) else str(p.get("_id", ""))
        p["is_liked"] = str(current_user["id"]) in p.get("likes", [])
        p["comment_count"] = await db["forum_comments"].count_documents({"post_id": p["id"]})
        results.append(Post(**p))
    return results

@router.post("/posts", response_model=Post)
async def create_post(
    post_in: PostCreate,
    current_user: dict = Depends(get_current_user)
):
    post_id = str(uuid.uuid4())
    new_post = {
        "_id": post_id,
        "id": post_id,
        "title": post_in.title,
        "content": post_in.content,
        "tags": post_in.tags,
        "author_id": str(current_user["id"]),
        "author_name": current_user.get("full_name") or current_user.get("username"),
        "author_avatar": current_user.get("avatar"),
        "timestamp": datetime.now(timezone.utc),
        "likes": []
    }
    await db["forum_posts"].insert_one(new_post)
    return Post(**new_post, comment_count=0, is_liked=False)

@router.get("/posts/{post_id}", response_model=PostDetail)
async def get_post_detail(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    post = await db["forum_posts"].find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post["id"] = post["_id"]
    post["is_liked"] = str(current_user["id"]) in post.get("likes", [])
    
    # Get comments
    comments_cursor = db["forum_comments"].find({"post_id": post_id}).sort("timestamp", 1)
    comments_data = await comments_cursor.to_list(length=100)
    comments = []
    for c in comments_data:
        c["id"] = c["_id"]
        comments.append(Comment(**c))
    
    return PostDetail(**post, comments=comments, comment_count=len(comments))

@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    post = await db["forum_posts"].find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if user_id in post.get("likes", []):
        # Unlike
        await db["forum_posts"].update_one(
            {"_id": post_id},
            {"$pull": {"likes": user_id}}
        )
        liked = False
    else:
        # Like
        await db["forum_posts"].update_one(
            {"_id": post_id},
            {"$addToSet": {"likes": user_id}}
        )
        liked = True
    
    # Get updated post for likes
    updated_post = await db["forum_posts"].find_one({"_id": post_id})
    return {"liked": liked, "likes": updated_post.get("likes", [])}

@router.post("/posts/{post_id}/comments", response_model=Comment)
async def add_comment(
    post_id: str,
    comment_in: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    comment_id = str(uuid.uuid4())
    new_comment = {
        "_id": comment_id,
        "id": comment_id,
        "post_id": post_id,
        "content": comment_in.content,
        "author_id": str(current_user["id"]),
        "author_name": current_user.get("full_name") or current_user.get("username"),
        "author_avatar": current_user.get("avatar"),
        "timestamp": datetime.now(timezone.utc)
    }
    await db["forum_comments"].insert_one(new_comment)
    return Comment(**new_comment)

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    post = await db["forum_posts"].find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["author_id"] != str(current_user["id"]) and not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    await db["forum_posts"].delete_one({"_id": post_id})
    await db["forum_comments"].delete_many({"post_id": post_id})
    return {"message": "Success"}
