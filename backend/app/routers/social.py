import base64
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    CompanionEquipped,
    CosmeticItem,
    Friendship,
    FriendshipStatus,
    Post,
    PostComment,
    PostLike,
)
from ..services.companion_service import add_xp_to_companion

router = APIRouter()

UPLOAD_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _get_color_key(user_id: str, db: Session) -> str | None:
    equipped = db.query(CompanionEquipped).filter(CompanionEquipped.clerk_user_id == user_id).first()
    if not equipped or not equipped.equipped_color_id:
        return None
    item = db.get(CosmeticItem, equipped.equipped_color_id)
    return item.item_key if item else None


def _post_to_dict(post: Post, viewer_id: str | None, db: Session) -> dict:
    like_count = db.query(func.count(PostLike.id)).filter(PostLike.post_id == post.id).scalar() or 0
    comment_count = db.query(func.count(PostComment.id)).filter(PostComment.post_id == post.id).scalar() or 0
    liked_by_me = False
    if viewer_id:
        liked_by_me = (
            db.query(PostLike)
            .filter(PostLike.post_id == post.id, PostLike.clerk_user_id == viewer_id)
            .first()
        ) is not None
    return {
        "id": post.id,
        "clerk_user_id": post.clerk_user_id,
        "photo_url": post.photo_url,
        "caption": post.caption,
        "lesson_key": post.lesson_key,
        "lesson_title": post.lesson_title,
        "chapter_title": post.chapter_title,
        "domain": post.domain,
        "companion_color_key": post.companion_color_key,
        "display_name": post.display_name,
        "created_at": post.created_at.isoformat(),
        "like_count": like_count,
        "comment_count": comment_count,
        "liked_by_me": liked_by_me,
    }


# ── POST /social/posts ────────────────────────────────────────────────────────

class CreatePostRequest(BaseModel):
    clerk_user_id: str
    photo_base64: str
    display_name: str | None = None
    caption: str | None = None
    lesson_key: str | None = None
    lesson_title: str | None = None
    chapter_title: str | None = None
    domain: str | None = None


@router.post("/posts")
def create_post(body: CreatePostRequest, db: Session = Depends(get_db)):
    try:
        img_data = base64.b64decode(body.photo_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(img_data)

    photo_url = f"/uploads/{filename}"
    companion_color_key = _get_color_key(body.clerk_user_id, db)

    post = Post(
        clerk_user_id=body.clerk_user_id,
        photo_url=photo_url,
        caption=body.caption,
        lesson_key=body.lesson_key,
        lesson_title=body.lesson_title,
        chapter_title=body.chapter_title,
        domain=body.domain,
        companion_color_key=companion_color_key,
        display_name=body.display_name,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_to_dict(post, body.clerk_user_id, db)


# ── GET /social/feed ──────────────────────────────────────────────────────────

@router.get("/feed")
def get_feed(
    user_id: str = Query(...),
    filter: str = Query("global"),
    cursor: str | None = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db),
):
    query = db.query(Post)

    if filter == "friends":
        friendships = db.query(Friendship).filter(
            Friendship.status == FriendshipStatus.accepted,
            or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
        ).all()
        friend_ids = {user_id}
        for f in friendships:
            friend_ids.add(f.addressee_id if f.requester_id == user_id else f.requester_id)
        query = query.filter(Post.clerk_user_id.in_(list(friend_ids)))

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.filter(Post.created_at < cursor_dt)
        except ValueError:
            pass

    posts = query.order_by(Post.created_at.desc()).limit(limit).all()
    result = [_post_to_dict(p, user_id, db) for p in posts]
    next_cursor = posts[-1].created_at.isoformat() if len(posts) == limit else None
    return {"posts": result, "next_cursor": next_cursor}


# ── POST /social/posts/{post_id}/like ────────────────────────────────────────

class LikeRequest(BaseModel):
    clerk_user_id: str


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: int, body: LikeRequest, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.clerk_user_id == body.clerk_user_id)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        like = PostLike(post_id=post_id, clerk_user_id=body.clerk_user_id)
        db.add(like)
        db.commit()
        liked = True
        try:
            add_xp_to_companion(body.clerk_user_id, 5, "like_given", db)
        except Exception:
            pass
        try:
            add_xp_to_companion(post.clerk_user_id, 10, "like_received", db)
        except Exception:
            pass

    like_count = db.query(func.count(PostLike.id)).filter(PostLike.post_id == post_id).scalar() or 0
    return {"liked": liked, "like_count": like_count}


# ── GET /social/posts/{post_id}/likes ────────────────────────────────────────

@router.get("/posts/{post_id}/likes")
def get_likes(post_id: int, db: Session = Depends(get_db)):
    if not db.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    likes = db.query(PostLike).filter(PostLike.post_id == post_id).order_by(PostLike.created_at.asc()).all()
    result = []
    for like in likes:
        # Resolve display_name from most recent post by this user
        user_post = (
            db.query(Post)
            .filter(Post.clerk_user_id == like.clerk_user_id, Post.display_name.isnot(None))
            .order_by(Post.created_at.desc())
            .first()
        )
        result.append({
            "clerk_user_id": like.clerk_user_id,
            "display_name": user_post.display_name if user_post else None,
            "companion_color_key": _get_color_key(like.clerk_user_id, db),
            "created_at": like.created_at.isoformat(),
        })
    return {"likes": result}


# ── GET /social/posts/{post_id}/comments ─────────────────────────────────────

@router.get("/posts/{post_id}/comments")
def get_comments(
    post_id: int,
    cursor: str | None = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db),
):
    if not db.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    query = db.query(PostComment).filter(PostComment.post_id == post_id)
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.filter(PostComment.created_at > cursor_dt)
        except ValueError:
            pass

    comments = query.order_by(PostComment.created_at.asc()).limit(limit).all()
    result = [
        {
            "id": c.id,
            "post_id": c.post_id,
            "clerk_user_id": c.clerk_user_id,
            "display_name": c.display_name,
            "companion_color_key": c.companion_color_key,
            "body": c.body,
            "created_at": c.created_at.isoformat(),
        }
        for c in comments
    ]
    next_cursor = comments[-1].created_at.isoformat() if len(comments) == limit else None
    return {"comments": result, "next_cursor": next_cursor}


# ── POST /social/posts/{post_id}/comments ────────────────────────────────────

class CreateCommentRequest(BaseModel):
    clerk_user_id: str
    display_name: str
    companion_color_key: str | None = None
    body: str = Field(..., max_length=300)


@router.post("/posts/{post_id}/comments")
def create_comment(post_id: int, body: CreateCommentRequest, db: Session = Depends(get_db)):
    if not db.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    comment = PostComment(
        post_id=post_id,
        clerk_user_id=body.clerk_user_id,
        display_name=body.display_name,
        companion_color_key=body.companion_color_key,
        body=body.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "clerk_user_id": comment.clerk_user_id,
        "display_name": comment.display_name,
        "companion_color_key": comment.companion_color_key,
        "body": comment.body,
        "created_at": comment.created_at.isoformat(),
    }


# ── DELETE /social/posts/{post_id}/comments/{comment_id} ─────────────────────

@router.delete("/posts/{post_id}/comments/{comment_id}")
def delete_comment(
    post_id: int,
    comment_id: int,
    clerk_user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    comment = (
        db.query(PostComment)
        .filter(PostComment.id == comment_id, PostComment.post_id == post_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.clerk_user_id != clerk_user_id:
        raise HTTPException(status_code=403, detail="Not your comment")
    db.delete(comment)
    db.commit()
    return {"deleted": True}
