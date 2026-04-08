"""
Companion mood, streak, and practice tracking logic.

All functions that touch the DB accept a Session and commit their own changes.
Pure calculation helpers are side-effect-free and fully unit-testable.
"""

from datetime import datetime, timezone
from typing import TypedDict

from sqlalchemy.orm import Session

from ..models import CompanionEquipped, CompanionState, UserInventory


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


def update_last_practice(user_id: str, db: Session) -> None:
    """
    Records a practice event. Increments streak if within the valid window,
    resets if the gap was too long. Called by the lesson validation endpoint.
    """
    state = _fetch_state(user_id, db)
    if not state:
        return

    days = _days_since(state.last_practice_date)
    now = datetime.now(timezone.utc)

    if days == 0:
        # Already practiced today — just refresh timestamp, don't double-count streak
        state.last_practice_date = now
    elif days <= 1:
        # Continuing streak
        state.streak_days += 1
        state.last_practice_date = now
    else:
        # Gap too large — restart streak
        state.streak_days = 1
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
