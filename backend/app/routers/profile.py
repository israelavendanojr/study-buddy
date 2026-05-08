from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import UserLessonProgress, UserMission, UserRoadmap

router = APIRouter()


@router.get("/")
async def get_profile(user_id: str, db: Session = Depends(get_db)) -> dict:
    """Aggregate profile stats for the profile screen."""
    roadmap_row = db.query(UserRoadmap).filter(UserRoadmap.clerk_user_id == user_id).first()

    # ── Roadmap-derived fields ──────────────────────────────────────────────
    goal = ""
    grading_mode = "balanced"
    streak_days = 0
    chapter_current = 0
    chapter_total = 0
    active_index = 0

    if roadmap_row:
        meta = roadmap_row.roadmap_json.get("_meta", {})
        goal = meta.get("goal", "")
        grading_mode = meta.get("grading_mode", "balanced")
        streak_days = roadmap_row.streak_days or 0

        chapters = roadmap_row.roadmap_json.get("chapters", [])
        chapter_total = len(chapters)
        active_index = roadmap_row.active_index or 0

        # Determine current chapter from active lesson index
        lesson_count = 0
        for i, chapter in enumerate(chapters):
            lessons_in_chapter = len(chapter.get("lessons", []))
            if active_index < lesson_count + lessons_in_chapter:
                chapter_current = i + 1
                break
            lesson_count += lessons_in_chapter
        else:
            chapter_current = chapter_total

    # ── Lessons completed ───────────────────────────────────────────────────
    lessons_completed = (
        db.query(func.count(UserLessonProgress.id))
        .filter(
            UserLessonProgress.clerk_user_id == user_id,
            UserLessonProgress.is_fully_complete == True,  # noqa: E712
        )
        .scalar()
        or 0
    )

    # ── Total XP ────────────────────────────────────────────────────────────
    # XP from lesson activities: each completed lesson = 20 XP per activity
    # Simplified: sum from UserLessonProgress.xp_earned if present, else estimate
    xp_from_lessons = (
        db.query(func.coalesce(func.sum(UserLessonProgress.xp_earned), 0))
        .filter(UserLessonProgress.clerk_user_id == user_id)
        .scalar()
        or 0
    )

    # XP from missions
    xp_from_missions = (
        db.query(func.coalesce(func.sum(UserMission.xp_awarded), 0))
        .filter(UserMission.clerk_user_id == user_id)
        .scalar()
        or 0
    )

    total_xp = int(xp_from_lessons) + int(xp_from_missions)

    # ── Missions submitted ──────────────────────────────────────────────────
    missions_submitted = (
        db.query(func.count(UserMission.id))
        .filter(
            UserMission.clerk_user_id == user_id,
            UserMission.status.in_(["submitted", "graded"]),
        )
        .scalar()
        or 0
    )

    # ── Recipes cooked (recipe lessons fully complete) ──────────────────────
    from ..models import Lesson
    recipe_lesson_keys = [
        row.lesson_key
        for row in db.query(Lesson.lesson_key).filter(Lesson.lesson_type == "recipe").all()
    ]
    recipes_cooked = 0
    if recipe_lesson_keys:
        recipes_cooked = (
            db.query(func.count(UserLessonProgress.id))
            .filter(
                UserLessonProgress.clerk_user_id == user_id,
                UserLessonProgress.is_fully_complete == True,  # noqa: E712
                UserLessonProgress.lesson_key.in_(recipe_lesson_keys),
            )
            .scalar()
            or 0
        )

    # ── Recent submissions ──────────────────────────────────────────────────
    recent_missions = (
        db.query(UserMission)
        .filter(
            UserMission.clerk_user_id == user_id,
            UserMission.status == "graded",
        )
        .order_by(UserMission.graded_at.desc())
        .limit(6)
        .all()
    )

    submissions = [
        {
            "id": m.id,
            "lesson_title": m.lesson_title,
            "mission_title": m.title,
            "overall_stars": (m.feedback_json or {}).get("overall_stars", 0),
            "type": "mission",
            "graded_at": m.graded_at.isoformat() if m.graded_at else None,
        }
        for m in recent_missions
    ]

    return {
        "goal": goal,
        "grading_mode": grading_mode,
        "streak_days": streak_days,
        "total_xp": total_xp,
        "lessons_completed": int(lessons_completed),
        "missions_submitted": int(missions_submitted),
        "recipes_cooked": int(recipes_cooked),
        "chapter_progress": {
            "current": chapter_current,
            "total": chapter_total,
        },
        "recent_submissions": submissions,
    }
