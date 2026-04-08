from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..database import get_db
from ..models import CosmeticItem, CompanionEquipped, CompanionState, ItemType, UserInventory

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cosmetic_to_dict(item: CosmeticItem) -> dict:
    return {
        "id": item.id,
        "item_key": item.item_key,
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type.value,
        "cost_coins": item.cost_coins,
        "cost_gems": item.cost_gems,
        "rarity": item.rarity.value,
        "unlock_condition": item.unlock_condition,
        "created_at": item.created_at.isoformat(),
    }


def _build_equipped_response(equipped: CompanionEquipped | None, db: Session) -> dict:
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


def _get_state_or_404(user_id: str, db: Session) -> CompanionState:
    state = db.query(CompanionState).filter(CompanionState.clerk_user_id == user_id).first()
    if not state:
        raise HTTPException(status_code=404, detail="Companion not initialized for this user")
    return state


# ── GET /cosmetics ────────────────────────────────────────────────────────────

@router.get("")
def list_cosmetics(
    item_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(CosmeticItem)
    if item_type:
        try:
            type_enum = ItemType(item_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid item_type '{item_type}'. Must be one of: color, accessory, outfit, room_decoration")
        query = query.filter(CosmeticItem.item_type == type_enum)
    return [_cosmetic_to_dict(item) for item in query.all()]


# ── GET /cosmetics/{user_id}/inventory ───────────────────────────────────────

@router.get("/{user_id}/inventory")
def get_inventory(user_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(UserInventory, CosmeticItem)
        .join(CosmeticItem, UserInventory.cosmetic_item_id == CosmeticItem.id)
        .filter(UserInventory.clerk_user_id == user_id)
        .all()
    )
    return [
        {
            **_cosmetic_to_dict(item),
            "is_equipped": inv.is_equipped,
            "owned_date": inv.owned_date.isoformat(),
        }
        for inv, item in rows
    ]


# ── GET /cosmetics/{user_id}/equipped ────────────────────────────────────────

@router.get("/{user_id}/equipped")
def get_equipped(user_id: str, db: Session = Depends(get_db)):
    equipped = db.query(CompanionEquipped).filter(CompanionEquipped.clerk_user_id == user_id).first()
    return _build_equipped_response(equipped, db)


# ── POST /cosmetics/{user_id}/purchase ───────────────────────────────────────

class PurchaseBody(BaseModel):
    cosmetic_id: int
    currency_type: str  # "coins" | "gems"


@router.post("/{user_id}/purchase")
def purchase_cosmetic(user_id: str, body: PurchaseBody, db: Session = Depends(get_db)):
    item = db.get(CosmeticItem, body.cosmetic_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cosmetic not found")

    if body.currency_type not in ("coins", "gems"):
        raise HTTPException(status_code=400, detail="currency_type must be 'coins' or 'gems'")

    # Check already owned
    existing = (
        db.query(UserInventory)
        .filter(
            UserInventory.clerk_user_id == user_id,
            UserInventory.cosmetic_item_id == body.cosmetic_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Item already owned")

    state = _get_state_or_404(user_id, db)

    if body.currency_type == "coins":
        if state.coins < item.cost_coins:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient coins. Need {item.cost_coins}, have {state.coins}",
            )
        state.coins -= item.cost_coins
    else:  # gems
        if state.gems < item.cost_gems:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient gems. Need {item.cost_gems}, have {state.gems}",
            )
        state.gems -= item.cost_gems

    inv = UserInventory(
        clerk_user_id=user_id,
        cosmetic_item_id=body.cosmetic_id,
        is_equipped=False,
    )
    db.add(inv)
    state.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "success": True,
        "item": _cosmetic_to_dict(item),
        "remaining_coins": state.coins,
        "remaining_gems": state.gems,
    }


# ── POST /cosmetics/{user_id}/equip ──────────────────────────────────────────

class EquipBody(BaseModel):
    cosmetic_id: int
    slot: str  # "color" | "accessory" | "outfit" | "room_decoration"


@router.post("/{user_id}/equip")
def equip_cosmetic(user_id: str, body: EquipBody, db: Session = Depends(get_db)):
    valid_slots = ("color", "accessory", "outfit", "room_decoration")
    if body.slot not in valid_slots:
        raise HTTPException(status_code=400, detail=f"slot must be one of: {', '.join(valid_slots)}")

    item = db.get(CosmeticItem, body.cosmetic_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cosmetic not found")

    inv = (
        db.query(UserInventory)
        .filter(
            UserInventory.clerk_user_id == user_id,
            UserInventory.cosmetic_item_id == body.cosmetic_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=403, detail="Item not owned")

    equipped = db.query(CompanionEquipped).filter(CompanionEquipped.clerk_user_id == user_id).first()
    if not equipped:
        equipped = CompanionEquipped(
            clerk_user_id=user_id,
            equipped_accessories=[],
            equipped_room_decorations=[],
        )
        db.add(equipped)

    if body.slot == "color":
        if equipped.equipped_color_id:
            prev = (
                db.query(UserInventory)
                .filter(
                    UserInventory.clerk_user_id == user_id,
                    UserInventory.cosmetic_item_id == equipped.equipped_color_id,
                )
                .first()
            )
            if prev:
                prev.is_equipped = False
        equipped.equipped_color_id = body.cosmetic_id
        inv.is_equipped = True

    elif body.slot == "outfit":
        if equipped.equipped_outfit_id:
            prev = (
                db.query(UserInventory)
                .filter(
                    UserInventory.clerk_user_id == user_id,
                    UserInventory.cosmetic_item_id == equipped.equipped_outfit_id,
                )
                .first()
            )
            if prev:
                prev.is_equipped = False
        equipped.equipped_outfit_id = body.cosmetic_id
        inv.is_equipped = True

    elif body.slot == "accessory":
        accessories = list(equipped.equipped_accessories or [])
        if item.item_key not in accessories:
            accessories.append(item.item_key)
        equipped.equipped_accessories = accessories
        flag_modified(equipped, "equipped_accessories")
        inv.is_equipped = True

    elif body.slot == "room_decoration":
        decorations = list(equipped.equipped_room_decorations or [])
        existing_keys = [
            d.get("item_id") if isinstance(d, dict) else d for d in decorations
        ]
        if item.item_key not in existing_keys:
            decorations.append({"item_id": item.item_key, "x": 100, "y": 150})
        equipped.equipped_room_decorations = decorations
        flag_modified(equipped, "equipped_room_decorations")
        inv.is_equipped = True

    db.commit()
    db.refresh(equipped)

    return {
        "success": True,
        "equipped": _build_equipped_response(equipped, db),
    }


# ── POST /cosmetics/{user_id}/unequip ────────────────────────────────────────

class UnequipBody(BaseModel):
    cosmetic_id: int
    slot: str  # "color" | "accessory" | "outfit" | "room_decoration"


@router.post("/{user_id}/unequip")
def unequip_cosmetic(user_id: str, body: UnequipBody, db: Session = Depends(get_db)):
    valid_slots = ("color", "accessory", "outfit", "room_decoration")
    if body.slot not in valid_slots:
        raise HTTPException(status_code=400, detail=f"slot must be one of: {', '.join(valid_slots)}")

    item = db.get(CosmeticItem, body.cosmetic_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cosmetic not found")

    inv = (
        db.query(UserInventory)
        .filter(
            UserInventory.clerk_user_id == user_id,
            UserInventory.cosmetic_item_id == body.cosmetic_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=403, detail="Item not owned")

    equipped = db.query(CompanionEquipped).filter(CompanionEquipped.clerk_user_id == user_id).first()
    if not equipped:
        raise HTTPException(status_code=404, detail="No equipped state found")

    if body.slot == "color":
        equipped.equipped_color_id = None
        inv.is_equipped = False

    elif body.slot == "outfit":
        equipped.equipped_outfit_id = None
        inv.is_equipped = False

    elif body.slot == "accessory":
        accessories = [k for k in (equipped.equipped_accessories or []) if k != item.item_key]
        equipped.equipped_accessories = accessories
        flag_modified(equipped, "equipped_accessories")
        inv.is_equipped = False

    elif body.slot == "room_decoration":
        decorations = [
            d for d in (equipped.equipped_room_decorations or [])
            if (d.get("item_id") if isinstance(d, dict) else d) != item.item_key
        ]
        equipped.equipped_room_decorations = decorations
        flag_modified(equipped, "equipped_room_decorations")
        inv.is_equipped = False

    db.commit()
    db.refresh(equipped)

    return {
        "success": True,
        "equipped": _build_equipped_response(equipped, db),
    }
