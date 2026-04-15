from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CompanionEquipped, CompanionState, CosmeticItem, Friendship, FriendshipStatus, Post

router = APIRouter()


def _get_color_key(user_id: str, db: Session) -> str | None:
    equipped = db.query(CompanionEquipped).filter(CompanionEquipped.clerk_user_id == user_id).first()
    if not equipped or not equipped.equipped_color_id:
        return None
    item = db.get(CosmeticItem, equipped.equipped_color_id)
    return item.item_key if item else None


def _get_display_name(user_id: str, db: Session) -> str | None:
    post = (
        db.query(Post)
        .filter(Post.clerk_user_id == user_id, Post.display_name.isnot(None))
        .order_by(Post.created_at.desc())
        .first()
    )
    return post.display_name if post else None


# ── POST /friends/request ─────────────────────────────────────────────────────

class FriendRequestBody(BaseModel):
    requester_id: str
    addressee_id: str


@router.post("/request")
def send_friend_request(body: FriendRequestBody, db: Session = Depends(get_db)):
    if body.requester_id == body.addressee_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    existing = db.query(Friendship).filter(
        Friendship.requester_id == body.requester_id,
        Friendship.addressee_id == body.addressee_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Friend request already exists")

    # Auto-accept if reverse pending request exists
    reverse = db.query(Friendship).filter(
        Friendship.requester_id == body.addressee_id,
        Friendship.addressee_id == body.requester_id,
        Friendship.status == FriendshipStatus.pending,
    ).first()
    if reverse:
        reverse.status = FriendshipStatus.accepted
        reverse.updated_at = datetime.now(timezone.utc)
        friendship = Friendship(
            requester_id=body.requester_id,
            addressee_id=body.addressee_id,
            status=FriendshipStatus.accepted,
        )
        db.add(friendship)
        db.commit()
        db.refresh(friendship)
        return {"id": friendship.id, "status": friendship.status.value, "auto_accepted": True}

    friendship = Friendship(
        requester_id=body.requester_id,
        addressee_id=body.addressee_id,
        status=FriendshipStatus.pending,
    )
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return {"id": friendship.id, "status": friendship.status.value, "auto_accepted": False}


# ── POST /friends/accept ──────────────────────────────────────────────────────

class AcceptDeclineBody(BaseModel):
    user_id: str
    requester_id: str


@router.post("/accept")
def accept_request(body: AcceptDeclineBody, db: Session = Depends(get_db)):
    friendship = db.query(Friendship).filter(
        Friendship.requester_id == body.requester_id,
        Friendship.addressee_id == body.user_id,
        Friendship.status == FriendshipStatus.pending,
    ).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Pending friend request not found")
    friendship.status = FriendshipStatus.accepted
    friendship.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": friendship.id, "status": friendship.status.value}


# ── POST /friends/decline ─────────────────────────────────────────────────────

@router.post("/decline")
def decline_request(body: AcceptDeclineBody, db: Session = Depends(get_db)):
    friendship = db.query(Friendship).filter(
        Friendship.requester_id == body.requester_id,
        Friendship.addressee_id == body.user_id,
        Friendship.status == FriendshipStatus.pending,
    ).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Pending friend request not found")
    friendship.status = FriendshipStatus.declined
    friendship.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": friendship.id, "status": friendship.status.value}


# ── GET /friends/search ───────────────────────────────────────────────────────
# NOTE: must be registered BEFORE /{user_id} to avoid path conflict

@router.get("/search")
def search_users(username: str = Query(...), db: Session = Depends(get_db)):
    rows = (
        db.query(Post.clerk_user_id, Post.display_name)
        .filter(Post.display_name.ilike(f"%{username}%"))
        .distinct(Post.clerk_user_id)
        .limit(10)
        .all()
    )
    seen: set[str] = set()
    result = []
    for clerk_user_id, display_name in rows:
        if clerk_user_id in seen:
            continue
        seen.add(clerk_user_id)
        state = db.query(CompanionState).filter(CompanionState.clerk_user_id == clerk_user_id).first()
        result.append({
            "clerk_user_id": clerk_user_id,
            "display_name": display_name,
            "companion_color_key": _get_color_key(clerk_user_id, db),
            "level": state.level if state else 1,
        })
    return {"users": result}


# ── GET /friends/{user_id} ────────────────────────────────────────────────────

@router.get("/{user_id}")
def get_friends(user_id: str, db: Session = Depends(get_db)):
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.accepted,
        or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
    ).all()

    result = []
    for f in friendships:
        other_id = f.addressee_id if f.requester_id == user_id else f.requester_id
        state = db.query(CompanionState).filter(CompanionState.clerk_user_id == other_id).first()
        result.append({
            "clerk_user_id": other_id,
            "display_name": _get_display_name(other_id, db),
            "companion_color_key": _get_color_key(other_id, db),
            "level": state.level if state else 1,
            "streak_days": state.streak_days if state else 0,
        })
    return {"friends": result}


# ── GET /friends/{user_id}/requests ──────────────────────────────────────────

@router.get("/{user_id}/requests")
def get_pending_requests(user_id: str, db: Session = Depends(get_db)):
    friendships = db.query(Friendship).filter(
        Friendship.addressee_id == user_id,
        Friendship.status == FriendshipStatus.pending,
    ).all()

    result = []
    for f in friendships:
        state = db.query(CompanionState).filter(CompanionState.clerk_user_id == f.requester_id).first()
        result.append({
            "friendship_id": f.id,
            "requester_id": f.requester_id,
            "display_name": _get_display_name(f.requester_id, db),
            "companion_color_key": _get_color_key(f.requester_id, db),
            "level": state.level if state else 1,
            "created_at": f.created_at.isoformat(),
        })
    return {"requests": result}
