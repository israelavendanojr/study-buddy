"""
Companion mood, streak, practice tracking, and XP/leveling logic.

All functions that touch the DB accept a Session and commit their own changes.
Pure calculation helpers are side-effect-free and fully unit-testable.

XP pacing (with default lesson XP of 50/lesson):
  ~30 min/day (1 lesson) → level 5 in ~20 days
  ~60 min/day (2 lessons) → level 5 in ~10 days
Formula: xp_needed = 100 * current_level  (scales linearly, stays readable)
"""

from datetime import datetime, timezone
from typing import TypedDict

from sqlalchemy.orm import Session

from ..models import CompanionEquipped, CompanionState, CosmeticItem, UserInventory


# ── XP / Level config ─────────────────────────────────────────────────────────

# Levels at which special rewards are granted
XP_MILESTONES: set[int] = {5, 10, 25, 50, 100}

_MILESTONE_REWARDS: dict[int, str] = {
    5:   "unlock_uncommon_cosmetics",
    10:  "unlock_rare_cosmetics",
    25:  "unlock_legendary_cosmetics",
    50:  "unlock_prestige_frame",
    100: "unlock_golden_companion",
}


def xp_to_next_level(current_level: int) -> int:
    """XP required to advance from current_level to current_level + 1."""
    return 100 * current_level


def check_level_milestones(level: int) -> dict:
    """Returns milestone metadata for a given level."""
    if level not in XP_MILESTONES:
        return {"is_milestone": False}
    return {
        "is_milestone": True,
        "milestone_type": "round",
        "reward": _MILESTONE_REWARDS.get(level, "milestone_badge"),
    }


def _next_milestone(current_level: int) -> int:
    """Returns the nearest milestone level above current_level."""
    for m in sorted(XP_MILESTONES):
        if m > current_level:
            return m
    return sorted(XP_MILESTONES)[-1]  # already past all milestones


# ── TypedDicts ────────────────────────────────────────────────────────────────

class MoodBreakdown(TypedDict):
    base_mood: int
    streak_bonus: int
    days_since_practice: int
    cosmetic_purchases_recent: int
    cosmetic_bonus: int
    room_decorations: int
    room_bonus: int
    final_mood: int


class StreakResult(TypedDict):
    streak_changed: bool
    streak_days: int
    broken: bool


# ── Pure helpers ──────────────────────────────────────────────────────────────

def _days_since(dt: datetime | None) -> int:
    """Return full calendar days between dt and now (UTC). None → 999."""
    if dt is None:
        return 999
    now = datetime.now(timezone.utc)
    # Ensure dt is timezone-aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (now - dt).days


def _streak_bonus(days_missed: int) -> int:
    if days_missed == 0:
        return 20
    if days_missed == 1:
        return 10
    if days_missed <= 3:
        return 5
    if days_missed < 7:
        return -10
    return -30


def calculate_mood(
    last_practice_date: datetime | None,
    streak_days: int,
    recent_cosmetic_purchases: list[datetime],
    room_decoration_count: int,
) -> int:
    """
    Pure mood calculation. Returns an int clamped to [0, 100].

    Args:
        last_practice_date: UTC datetime of last lesson/practice completion.
        streak_days: Current streak length (used for context but days_missed
                     is derived from last_practice_date for accuracy).
        recent_cosmetic_purchases: List of owned_date values for all owned items.
        room_decoration_count: Number of room decorations currently placed.
    """
    base = 50
    days_missed = _days_since(last_practice_date)

    # Streak bonus/penalty
    s_bonus = _streak_bonus(days_missed)

    # Cosmetic purchase bonus: +10 per purchase within last 7 days, max +20
    now = datetime.now(timezone.utc)
    recent_count = sum(
        1 for dt in recent_cosmetic_purchases
        if (now - (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt)).days <= 7
    )
    c_bonus = min(recent_count * 10, 20)

    # Room decoration bonus: +1 per decoration, max +15
    r_bonus = min(room_decoration_count, 15)

    return max(0, min(100, base + s_bonus + c_bonus + r_bonus))


# ── DB-backed functions ───────────────────────────────────────────────────────

def _fetch_state(user_id: str, db: Session) -> CompanionState | None:
    return db.query(CompanionState).filter(CompanionState.clerk_user_id == user_id).first()


def initialize_companion(user_id: str, db: Session) -> bool:
    """
    Creates CompanionState + CompanionEquipped for a user and grants default cosmetics.
    Idempotent — returns False immediately if the companion already exists.
    Returns True if a new companion was created.
    """
    if _fetch_state(user_id, db) is not None:
        return False

    state = CompanionState(
        clerk_user_id=user_id,
        level=1,
        xp=0,
        mood=50,
        streak_days=0,
        coins=100,
        gems=0,
    )
    db.add(state)

    equipped = CompanionEquipped(
        clerk_user_id=user_id,
        equipped_color_id=None,
        equipped_outfit_id=None,
        equipped_accessories=[],
        equipped_room_decorations=[],
    )

    default_color = (
        db.query(CosmeticItem)
        .filter(CosmeticItem.unlock_condition == "default")
        .first()
    )
    if default_color:
        equipped.equipped_color_id = default_color.id
        db.add(UserInventory(
            clerk_user_id=user_id,
            cosmetic_item_id=default_color.id,
            is_equipped=True,
        ))

    db.add(equipped)
    db.commit()
    return True


def add_xp_to_companion(user_id: str, xp_amount: int, source: str, db: Session) -> dict:  # noqa: ARG001 (source reserved for analytics)
    """
    Adds XP to the companion, handling multi-level-ups in a single transaction.
    Uses SELECT FOR UPDATE to prevent concurrent double-credit.

    Returns a dict with: level, xp, xp_next_level, level_up, levels_gained,
    new_level (if leveled up), milestone (bool), milestone_info (if milestone).
    """
    if xp_amount <= 0:
        raise ValueError(f"xp_amount must be positive, got {xp_amount}")

    state = (
        db.query(CompanionState)
        .filter(CompanionState.clerk_user_id == user_id)
        .with_for_update()
        .first()
    )
    if not state:
        raise LookupError(f"No companion found for user {user_id}")

    original_level = state.level
    state.xp += xp_amount

    while state.xp >= xp_to_next_level(state.level):
        state.xp -= xp_to_next_level(state.level)
        state.level += 1

    state.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(state)

    leveled_up = state.level > original_level
    levels_gained = state.level - original_level
    milestone_info = check_level_milestones(state.level) if leveled_up else {"is_milestone": False}

    result: dict = {
        "level": state.level,
        "xp": state.xp,
        "xp_next_level": xp_to_next_level(state.level),
        "level_up": leveled_up,
        "levels_gained": levels_gained,
        "milestone": milestone_info["is_milestone"],
    }
    if leveled_up:
        result["new_level"] = state.level
    if milestone_info["is_milestone"]:
        result["milestone_info"] = milestone_info
    return result


def get_companion_progress(user_id: str, db: Session) -> dict | None:
    """
    Returns level/XP progress for the home-screen progress bar.
    Returns None if companion doesn't exist.
    """
    state = _fetch_state(user_id, db)
    if not state:
        return None

    threshold = xp_to_next_level(state.level)
    pct = round((state.xp / threshold) * 100, 1) if threshold > 0 else 0.0

    return {
        "level": state.level,
        "xp": state.xp,
        "xp_to_next_level": threshold,
        "xp_progress_pct": pct,
        "next_milestone": _next_milestone(state.level),
    }


def update_mood_for_user(user_id: str, db: Session) -> int:
    """
    Recalculates mood from live DB data and persists it if it shifted >= 10 points.
    Returns the new mood value.
    """
    state = _fetch_state(user_id, db)
    if not state:
        return 50  # no companion yet — caller handles 404 if needed

    inv_rows = (
        db.query(UserInventory)
        .filter(UserInventory.clerk_user_id == user_id)
        .all()
    )
    purchase_dates = [row.owned_date for row in inv_rows]

    equipped = (
        db.query(CompanionEquipped)
        .filter(CompanionEquipped.clerk_user_id == user_id)
        .first()
    )
    room_count = len(equipped.equipped_room_decorations) if equipped else 0

    new_mood = calculate_mood(
        last_practice_date=state.last_practice_date,
        streak_days=state.streak_days,
        recent_cosmetic_purchases=purchase_dates,
        room_decoration_count=room_count,
    )

    if abs(new_mood - state.mood) >= 10:
        state.mood = new_mood
        state.last_mood_update = datetime.now(timezone.utc)
        state.updated_at = datetime.now(timezone.utc)
        db.commit()
    else:
        # Still update the in-memory value so callers see the fresh number
        state.mood = new_mood

    return new_mood


def check_and_update_streak(user_id: str, db: Session) -> StreakResult:
    """
    Evaluates whether the streak is intact or broken based on last_practice_date.

    Day counting:
      - 0 days since practice  → intact (practiced today)
      - 1 day since practice   → intact (yesterday counts)
      - 2+ days since practice → broken, reset to 0
    """
    state = _fetch_state(user_id, db)
    if not state:
        return StreakResult(streak_changed=False, streak_days=0, broken=False)

    days = _days_since(state.last_practice_date)

    if days <= 1:
        return StreakResult(streak_changed=False, streak_days=state.streak_days, broken=False)

    # Streak broken
    state.streak_days = 0
    state.updated_at = datetime.now(timezone.utc)
    db.commit()

    return StreakResult(streak_changed=True, streak_days=0, broken=True)


def update_last_practice(user_id: str, db: Session) -> dict:
    """
    Records a successful practice event. Increments streak if within the valid
    window, resets if the gap was too long.
    Returns { streak_days, streak_changed }.
    """
    state = _fetch_state(user_id, db)
    if not state:
        return {"streak_days": 0, "streak_changed": False}

    days = _days_since(state.last_practice_date)
    now = datetime.now(timezone.utc)
    streak_changed = False

    if days == 0:
        # Already practiced today — refresh timestamp, don't double-count streak
        state.last_practice_date = now
    elif days <= 1:
        state.streak_days += 1
        state.last_practice_date = now
        streak_changed = True
    else:
        # Gap too large — restart streak
        state.streak_days = 1
        state.last_practice_date = now
        streak_changed = True

    state.updated_at = now
    db.commit()
    return {"streak_days": state.streak_days, "streak_changed": streak_changed}


def _touch_last_practice_timestamp(user_id: str, db: Session) -> None:
    """
    Updates last_practice_date without touching streak or XP.
    Used when a submission is invalid (attempted but failed) so mood
    doesn't decay from perceived inactivity.
    """
    state = _fetch_state(user_id, db)
    if not state:
        return
    now = datetime.now(timezone.utc)
    state.last_practice_date = now
    state.updated_at = now
    db.commit()


def get_mood_breakdown(user_id: str, db: Session) -> MoodBreakdown | None:
    """
    Returns a detailed breakdown of how mood is computed for this user.
    Returns None if the companion doesn't exist.
    """
    state = _fetch_state(user_id, db)
    if not state:
        return None

    inv_rows = (
        db.query(UserInventory)
        .filter(UserInventory.clerk_user_id == user_id)
        .all()
    )
    purchase_dates = [row.owned_date for row in inv_rows]

    equipped = (
        db.query(CompanionEquipped)
        .filter(CompanionEquipped.clerk_user_id == user_id)
        .first()
    )
    room_count = len(equipped.equipped_room_decorations) if equipped else 0

    days_missed = _days_since(state.last_practice_date)
    s_bonus = _streak_bonus(days_missed)

    now = datetime.now(timezone.utc)
    recent_count = sum(
        1 for dt in purchase_dates
        if (now - (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt)).days <= 7
    )
    c_bonus = min(recent_count * 10, 20)
    r_bonus = min(room_count, 15)
    final = max(0, min(100, 50 + s_bonus + c_bonus + r_bonus))

    return MoodBreakdown(
        base_mood=50,
        streak_bonus=s_bonus,
        days_since_practice=days_missed if days_missed < 999 else -1,
        cosmetic_purchases_recent=recent_count,
        cosmetic_bonus=c_bonus,
        room_decorations=room_count,
        room_bonus=r_bonus,
        final_mood=final,
    )
