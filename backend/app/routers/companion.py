from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CosmeticItem, CompanionEquipped, CompanionState, UserInventory
from ..services.companion_service import get_mood_breakdown, update_mood_for_user

router = APIRouter()

# XP required to reach the next level (index = current level, value = xp needed)
# Level 1 → 2 needs 100 xp, level 2 → 3 needs 200 xp, etc.
XP_PER_LEVEL = [0, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000]


def _xp_for_level(level: int) -> int:
    if level - 1 < len(XP_PER_LEVEL):
        return XP_PER_LEVEL[level - 1]
    return 5000  # cap for levels beyond the table


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
def initialize_companion(user_id: str, db: Session = Depends(get_db)):
    existing = db.query(CompanionState).filter(CompanionState.clerk_user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Companion already initialized for this user")

    state = CompanionState(
        clerk_user_id=user_id,
        level=1,
        xp=0,
        mood=50,
        streak_days=0,
    )
    db.add(state)

    equipped = CompanionEquipped(
        clerk_user_id=user_id,
        equipped_color_id=None,
        equipped_outfit_id=None,
        equipped_accessories=[],
        equipped_room_decorations=[],
    )

    # Equip the default color if it exists
    default_color = db.query(CosmeticItem).filter(CosmeticItem.unlock_condition == "default").first()
    if default_color:
        equipped.equipped_color_id = default_color.id
        inv = UserInventory(
            clerk_user_id=user_id,
            cosmetic_item_id=default_color.id,
            is_equipped=True,
        )
        db.add(inv)

    db.add(equipped)
    db.commit()
    db.refresh(state)

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
    if body.xp_amount < 0:
        raise HTTPException(status_code=400, detail="xp_amount must be non-negative")

    state = _get_state_or_404(user_id, db)

    state.xp += body.xp_amount
    state.updated_at = datetime.now(timezone.utc)

    leveled_up = False
    new_level = state.level

    threshold = _xp_for_level(state.level + 1)
    while state.xp >= threshold:
        state.xp -= threshold
        state.level += 1
        leveled_up = True
        new_level = state.level
        threshold = _xp_for_level(state.level + 1)

    db.commit()
    db.refresh(state)

    result: dict = {"level": state.level, "xp": state.xp, "level_up": leveled_up}
    if leveled_up:
        result["new_level"] = new_level
    return result


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
