from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CosmeticItem, CompanionEquipped, CompanionState, UserInventory
from ..services.companion_service import (
    add_xp_to_companion,
    get_companion_progress,
    get_mood_breakdown,
    initialize_companion,
    update_mood_for_user,
)

router = APIRouter()


def _get_state_or_404(user_id: str, db: Session) -> CompanionState:
    state = db.query(CompanionState).filter(CompanionState.clerk_user_id == user_id).first()
    if not state:
        raise HTTPException(status_code=404, detail="Companion not initialized for this user")
    return state


def _build_inventory_list(user_id: str, db: Session) -> list[dict]:
    rows = (
        db.query(UserInventory, CosmeticItem)
        .join(CosmeticItem, UserInventory.cosmetic_item_id == CosmeticItem.id)
        .filter(UserInventory.clerk_user_id == user_id)
        .all()
    )
    return [
        {
            "item_key": item.item_key,
            "name": item.name,
            "item_type": item.item_type.value,
            "is_equipped": inv.is_equipped,
        }
        for inv, item in rows
    ]


def _build_equipped_dict(equipped: CompanionEquipped | None, db: Session) -> dict:
    if not equipped:
        return {"color": None, "outfit": None, "accessories": [], "room_decorations": []}

    color_key = None
    if equipped.equipped_color_id:
        item = db.get(CosmeticItem, equipped.equipped_color_id)
        color_key = item.item_key if item else None

    outfit_key = None
    if equipped.equipped_outfit_id:
        item = db.get(CosmeticItem, equipped.equipped_outfit_id)
        outfit_key = item.item_key if item else None

    return {
        "color": color_key,
        "outfit": outfit_key,
        "accessories": equipped.equipped_accessories or [],
        "room_decorations": equipped.equipped_room_decorations or [],
    }


# ── GET /companion/{user_id} ──────────────────────────────────────────────────

@router.get("/{user_id}")
def get_companion(user_id: str, db: Session = Depends(get_db)):
    state = _get_state_or_404(user_id, db)
    equipped = db.query(CompanionEquipped).filter(CompanionEquipped.clerk_user_id == user_id).first()

    return {
        "level": state.level,
        "xp": state.xp,
        "mood": state.mood,
        "streak_days": state.streak_days,
        "last_practice_date": state.last_practice_date,
        "inventory": _build_inventory_list(user_id, db),
        "equipped": _build_equipped_dict(equipped, db),
    }


# ── GET /companion/{user_id}/stats ───────────────────────────────────────────

@router.get("/{user_id}/stats")
def get_companion_stats(user_id: str, db: Session = Depends(get_db)):
    state = _get_state_or_404(user_id, db)
    return {
        "level": state.level,
        "xp": state.xp,
        "mood": state.mood,
        "streak_days": state.streak_days,
        "last_practice_date": state.last_practice_date,
    }


# ── POST /companion/{user_id}/initialize ─────────────────────────────────────

@router.post("/{user_id}/initialize", status_code=201)
def initialize_companion_endpoint(user_id: str, db: Session = Depends(get_db)):
    created = initialize_companion(user_id, db)
    if not created:
        raise HTTPException(status_code=400, detail="Companion already initialized for this user")

    state = _get_state_or_404(user_id, db)
    equipped = db.query(CompanionEquipped).filter(CompanionEquipped.clerk_user_id == user_id).first()
    return {
        "level": state.level,
        "xp": state.xp,
        "mood": state.mood,
        "streak_days": state.streak_days,
        "last_practice_date": state.last_practice_date,
        "equipped": _build_equipped_dict(equipped, db),
    }


# ── POST /companion/{user_id}/add-xp ─────────────────────────────────────────

class AddXpBody(BaseModel):
    xp_amount: int
    source: str


@router.post("/{user_id}/add-xp")
def add_xp(user_id: str, body: AddXpBody, db: Session = Depends(get_db)):
    if body.xp_amount <= 0:
        raise HTTPException(status_code=400, detail="xp_amount must be positive")
    try:
        return add_xp_to_companion(user_id, body.xp_amount, body.source, db)
    except LookupError:
        raise HTTPException(status_code=404, detail="Companion not initialized for this user")


# ── GET /companion/{user_id}/progress ────────────────────────────────────────

@router.get("/{user_id}/progress")
def companion_progress(user_id: str, db: Session = Depends(get_db)):
    progress = get_companion_progress(user_id, db)
    if progress is None:
        raise HTTPException(status_code=404, detail="Companion not initialized for this user")
    return progress


# ── GET /companion/{user_id}/mood-breakdown ───────────────────────────────────

@router.get("/{user_id}/mood-breakdown")
def mood_breakdown(user_id: str, db: Session = Depends(get_db)):
    breakdown = get_mood_breakdown(user_id, db)
    if breakdown is None:
        raise HTTPException(status_code=404, detail="Companion not initialized for this user")
    return breakdown


# ── POST /companion/{user_id}/update-mood ────────────────────────────────────

@router.post("/{user_id}/update-mood")
def update_mood(user_id: str, db: Session = Depends(get_db)):
    state = db.query(CompanionState).filter(CompanionState.clerk_user_id == user_id).first()
    if not state:
        raise HTTPException(status_code=404, detail="Companion not initialized for this user")

    old_mood = state.mood
    new_mood = update_mood_for_user(user_id, db)
    breakdown = get_mood_breakdown(user_id, db)

    return {
        "mood": new_mood,
        "changed": abs(new_mood - old_mood) >= 10,
        "breakdown": breakdown,
    }
