import json
import os
import pathlib
import re
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Lesson, UserLessonProgress, UserRoadmap
from ..services.companion_service import (
    _touch_last_practice_timestamp,
    add_xp_to_companion,
    initialize_companion,
    update_last_practice,
    update_mood_for_user,
)
from .roadmap import _strip_and_parse

router = APIRouter()

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
VISION_MODEL = "claude-sonnet-4-6"
XP_PER_MISSION = 20

RAG_ROOT = pathlib.Path(__file__).parent.parent / "rag_resources"
LESSON_CONTENT_ROOT = pathlib.Path(__file__).parent.parent / "lesson_content"

PEPPER_SYSTEM = (
    "You are Pepper, a self-taught home cook who spent years making expensive mistakes "
    "before things finally clicked. You're warm and encouraging but you have real opinions — "
    "you believe butter is almost always worth it, you get quietly excited about a good sear, "
    "and you're gently but firmly against skipping steps. You speak directly, use specific "
    "cooking language without being pretentious about it, and you always give the user one "
    "concrete thing to focus on rather than overwhelming them. When someone struggles, you "
    "normalize it with a specific story or analogy. You never say 'Great job!' without saying "
    "exactly what was great about it."
)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class QuizQuestion(BaseModel):
    question_text: str
    options: list[str]
    correct_index: int
    explanation: str


class Mission(BaseModel):
    id: str
    mission_type: str = "photo_submission"  # photo_submission | reflection_journal | pop_quiz
    title: str
    description: str
    why_it_matters: str
    is_required: bool
    duration_minutes: int
    # photo_submission fields
    prompt: str | None = None
    reflection_choices: list[str] = []
    # reflection_journal fields
    min_words: int | None = None
    # pop_quiz fields
    questions: list[QuizQuestion] = []


class Card1Hook(BaseModel):
    companion_message: str


class Card3Why(BaseModel):
    headline: str
    points: list[str]
    tell_me_more: str


class LessonContent(BaseModel):
    card1: Card1Hook
    card3: Card3Why
    missions: list[Mission]


class LessonRequest(BaseModel):
    user_id: str | None = None
    lesson_key: str
    lesson_title: str
    chapter_title: str
    goal: str
    buddy_name: str
    experience: int
    completed_lesson_titles: list[str] = []
    domain: str = "cooking"


class ValidateRequest(BaseModel):
    user_id: str | None = None
    lesson_key: str
    mission_id: str
    photo_base64: str
    photo_media_type: str  # "image/jpeg" | "image/png"
    reflection_choice: str
    buddy_name: str
    goal: str
    lesson_title: str
    domain: str = "cooking"


class ReflectRequest(BaseModel):
    user_id: str
    lesson_key: str
    mission_id: str
    reflection_text: str
    buddy_name: str
    lesson_title: str
    goal: str


class QuizAnswerRequest(BaseModel):
    user_id: str
    lesson_key: str
    mission_id: str
    answers: list[int]


# ---------------------------------------------------------------------------
# Grading mode helper
# ---------------------------------------------------------------------------

def _get_grading_mode(user_id: str, db: Session) -> str:
    roadmap = db.query(UserRoadmap).filter(UserRoadmap.clerk_user_id == user_id).first()
    if not roadmap:
        return "balanced"
    return roadmap.roadmap_json.get("_meta", {}).get("grading_mode", "balanced")


# ---------------------------------------------------------------------------
# Fixed content file helpers
# ---------------------------------------------------------------------------

def _find_lesson_content(lesson_key: str, lesson_title: str) -> dict | None:
    """Scan lesson_content/** for a JSON file matching lesson_key or normalized title."""
    if not LESSON_CONTENT_ROOT.exists():
        return None

    title_snake = re.sub(r"[^a-z0-9]+", "_", lesson_title.lower()).strip("_")

    for json_file in LESSON_CONTENT_ROOT.rglob("*.json"):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        file_key = data.get("lesson_key", "")
        file_title_snake = re.sub(r"[^a-z0-9]+", "_", data.get("title", "").lower()).strip("_")

        # Exact key match, suffix/prefix match, or title match
        # Handles: "searing_meat" == "searing_meat"
        #          "ch1-l1_searing_meat" ends with "_searing_meat"
        #          "searing_meat_searing_meat" starts with "searing_meat_" (id==key from catalog roadmap)
        if (file_key == lesson_key
                or lesson_key.endswith(f"_{file_key}")
                or lesson_key.startswith(f"{file_key}_")
                or file_title_snake == title_snake):
            return data

    return None


def _ensure_lesson_row(content: dict, db: Session) -> Lesson:
    """Upsert a Lesson DB row for a fixed-content lesson."""
    lesson_key = content["lesson_key"]
    row = db.query(Lesson).filter(Lesson.lesson_key == lesson_key).first()
    if row:
        return row
    row = Lesson(
        lesson_key=lesson_key,
        title=content["title"],
        chapter_title=content["chapter_title"],
        domain=content["domain"],
        lesson_json=content,
        lesson_type=content.get("lesson_type"),
        skill_tags=content.get("skill_tags"),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# RAG helpers
# ---------------------------------------------------------------------------

def _retrieve_rag_docs(lesson_title: str, chapter_title: str, domain: str) -> str:
    """Scan .md files under rag_resources/{domain}/, falling back to root if missing."""
    domain_dir = RAG_ROOT / domain
    scan_root = domain_dir if domain_dir.is_dir() else RAG_ROOT

    title_lower = lesson_title.lower()
    chapter_lower = chapter_title.lower()

    matches: list[tuple[int, pathlib.Path]] = []
    for md_file in scan_root.rglob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
        except OSError:
            continue
        content_lower = content.lower()
        score = 0
        if title_lower in content_lower:
            score += 2
        if chapter_lower in content_lower:
            score += 1
        for word in title_lower.split():
            if len(word) > 3 and word in content_lower:
                score += 1
        if score > 0:
            matches.append((score, md_file))

    matches.sort(key=lambda x: x[0], reverse=True)
    top = matches[:3]

    if not top:
        return ""

    parts: list[str] = []
    for _, md_file in top:
        parts.append(f"### {md_file.stem}\n{md_file.read_text(encoding='utf-8')}")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

def _generate_companion_hook(req: LessonRequest, content: dict) -> str:
    """Generate a personalized 1-2 sentence intro for a fixed-content lesson."""
    exp_label = (
        "total beginner" if req.experience <= 1
        else "some experience" if req.experience <= 3
        else "experienced cook"
    )
    headline = content.get("content", {}).get("headline", "")

    prompt = (
        f"Lesson: {content['title']}\n"
        f"Core insight: {headline}\n"
        f"User's cooking goal: {req.goal}\n"
        f"Their level: {exp_label}\n\n"
        f"Write a 1-2 sentence intro that connects THIS specific lesson to THIS specific goal. "
        f"Be direct and specific — no generic welcome phrases. Return only the message text."
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=150,
            system=PEPPER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception:
        return (
            f"This is one of the skills that separates meals people merely eat from meals they "
            f"remember — and it connects directly to what you're working toward."
        )


def _generate_reflection_feedback(
    reflection_text: str,
    lesson_title: str,
    mission_prompt: str,
    goal: str,
) -> str:
    """Generate Pepper's coaching response to a reflection journal entry."""
    prompt = (
        f"The user is learning '{lesson_title}' toward their goal: {goal}.\n"
        f"The reflection prompt was: {mission_prompt}\n"
        f"Their reflection: {reflection_text}\n\n"
        f"Write a 2-3 sentence response that: "
        f"(1) references something specific they mentioned, "
        f"(2) validates what they noticed, and "
        f"(3) gives exactly one concrete actionable tip for next time. "
        f"Return only the feedback text."
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=256,
            system=PEPPER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception:
        return (
            "Thanks for reflecting on that. Next time, try to notice one specific thing that "
            "surprised you — those surprises are where the real learning lives."
        )


# ---------------------------------------------------------------------------
# Prompt builder (legacy full-generation fallback)
# ---------------------------------------------------------------------------

def _build_lesson_prompt(req: LessonRequest, rag_content: str) -> str:
    exp_label = (
        "total beginner" if req.experience <= 1
        else "some experience" if req.experience <= 3
        else "experienced"
    )
    completed_block = (
        f"They've already completed: {', '.join(req.completed_lesson_titles)}."
        if req.completed_lesson_titles
        else "This is one of their first lessons."
    )
    rag_block = (
        f"Here is reference material for this lesson:\n\n{rag_content}\n\n"
        if rag_content
        else ""
    )

    return f"""{rag_block}Generate a structured lesson for a learning app. Return ONLY valid JSON — no markdown, no explanation.

Lesson context:
- Lesson title: {req.lesson_title}
- Chapter: {req.chapter_title}
- Goal: {req.goal}
- Experience: {req.experience}/5 ({exp_label})
- {completed_block}

Return JSON matching this exact schema:

{{
  "card1": {{
    "companion_message": "1-2 sentences max — hook the learner on why this specific skill matters right now"
  }},
  "card3": {{
    "headline": "The single most important insight in 1 sentence",
    "points": ["Key point 1 — short and direct", "Key point 2", "Key point 3"],
    "tell_me_more": "2-3 sentences deepening the concept, revealed on tap"
  }},
  "missions": [
    {{
      "id": "mission_1",
      "mission_type": "photo_submission",
      "title": "Short mission title",
      "description": "1-2 sentences max: the specific thing the learner will do",
      "why_it_matters": "1 sentence: why this task builds the skill",
      "is_required": true,
      "duration_minutes": 10,
      "prompt": "A specific question about what they made or discovered — NOT generic",
      "reflection_choices": ["Option 1 specific to this skill", "Option 2", "Option 3", "Option 4"]
    }},
    {{
      "id": "mission_2",
      "mission_type": "photo_submission",
      "title": "Second mission title",
      "description": "1-2 sentences max",
      "why_it_matters": "1 sentence",
      "is_required": false,
      "duration_minutes": 15,
      "prompt": "Specific question about mission 2",
      "reflection_choices": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }}
  ]
}}

Rules:
- Generate 2-4 missions total. Must include at least 1-2 required missions
- Each mission must include mission_type field set to "photo_submission"
- reflection_choices must be exactly 3-4 options
- Return ONLY the JSON object"""


# ---------------------------------------------------------------------------
# Progress helpers (shared by reflect, quiz, validate)
# ---------------------------------------------------------------------------

def _mark_mission_complete(
    user_id: str,
    lesson_key: str,
    mission_id: str,
    missions: list[dict],
    db: Session,
) -> tuple["UserLessonProgress", bool, bool]:
    """Mark mission_id complete on UserLessonProgress.
    Returns (progress, lesson_now_required_complete, lesson_now_fully_complete).
    """
    progress = db.query(UserLessonProgress).filter(
        UserLessonProgress.clerk_user_id == user_id,
        UserLessonProgress.lesson_key == lesson_key,
    ).first()

    if not progress:
        progress = UserLessonProgress(
            clerk_user_id=user_id,
            lesson_key=lesson_key,
            completed_missions=[],
            is_required_complete=False,
            is_fully_complete=False,
        )
        db.add(progress)

    was_required_complete = progress.is_required_complete
    was_fully_complete = progress.is_fully_complete

    if mission_id not in progress.completed_missions:
        progress.completed_missions = [*progress.completed_missions, mission_id]

    required_ids = {m["id"] for m in missions if m.get("is_required")}
    all_ids = {m["id"] for m in missions}
    completed_set = set(progress.completed_missions)

    if not progress.is_required_complete and required_ids.issubset(completed_set):
        progress.is_required_complete = True
        progress.first_required_completed_at = datetime.now(timezone.utc)

    if all_ids.issubset(completed_set):
        progress.is_fully_complete = True

    progress.last_visited_at = datetime.now(timezone.utc)
    progress.updated_at = datetime.now(timezone.utc)
    db.commit()

    return (
        progress,
        not was_required_complete and progress.is_required_complete,
        not was_fully_complete and progress.is_fully_complete,
    )


def _apply_xp_and_streak(
    user_id: str,
    lesson_now_required_complete: bool,
    db: Session,
) -> dict:
    """Award XP and update streak/mood. Returns companion_result dict."""
    initialize_companion(user_id, db)
    xp_result = add_xp_to_companion(user_id, XP_PER_MISSION, "lesson", db)
    companion_result: dict = {**xp_result}

    if lesson_now_required_complete:
        streak_result = update_last_practice(user_id, db)
        new_mood = update_mood_for_user(user_id, db)
        companion_result = {
            **xp_result,
            "mood": new_mood,
            "streak_days": streak_result["streak_days"],
            "streak_changed": streak_result["streak_changed"],
        }

    return companion_result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate")
async def generate_lesson(req: LessonRequest, db: Session = Depends(get_db)) -> dict:
    # ── Try fixed content file first ─────────────────────────────────────────
    fixed = _find_lesson_content(req.lesson_key, req.lesson_title)
    if fixed:
        lesson_row = _ensure_lesson_row(fixed, db)

        # Generate fresh personalized companion hook per user/session
        companion_message = _generate_companion_hook(req, fixed)

        # Surface prior reflection feedback if the user has visited before
        last_reflection_feedback = None
        if req.user_id:
            progress = db.query(UserLessonProgress).filter(
                UserLessonProgress.clerk_user_id == req.user_id,
                UserLessonProgress.lesson_key == lesson_row.lesson_key,
            ).first()
            if progress:
                last_reflection_feedback = getattr(progress, "last_reflection_feedback", None)

        return {
            "lesson_type": fixed.get("lesson_type", "technique"),
            "lesson_key": lesson_row.lesson_key,
            "card1": {"companion_message": companion_message},
            "card3": {
                "headline": fixed["content"]["headline"],
                "points": fixed["content"]["points"],
                "tell_me_more": fixed["content"]["tell_me_more"],
            },
            "missions": fixed["missions"],
            "last_reflection_feedback": last_reflection_feedback,
        }

    # ── Fallback: full LLM generation for lessons without a content file ──────
    cached = db.query(Lesson).filter(Lesson.lesson_key == req.lesson_key).first()
    if cached:
        if "missions" in cached.lesson_json and "card2" not in cached.lesson_json:
            return cached.lesson_json
        # Old format — delete and regenerate
        db.delete(cached)
        db.commit()

    rag_content = _retrieve_rag_docs(req.lesson_title, req.chapter_title, req.domain)
    prompt = _build_lesson_prompt(req, rag_content)

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2048,
            system=PEPPER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        full_text = message.content[0].text

    except anthropic.APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Anthropic API. Check your network and API key.",
        )
    except anthropic.APIStatusError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Anthropic API error: {e.status_code} {e.message}",
        )

    lesson_data = _strip_and_parse(full_text, "Lesson")

    row = Lesson(
        lesson_key=req.lesson_key,
        title=req.lesson_title,
        chapter_title=req.chapter_title,
        domain=req.domain,
        lesson_json=lesson_data,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()

    return lesson_data


@router.post("/reflect")
async def submit_reflection(req: ReflectRequest, db: Session = Depends(get_db)) -> dict:
    lesson_row = db.query(Lesson).filter(Lesson.lesson_key == req.lesson_key).first()
    if not lesson_row:
        raise HTTPException(status_code=404, detail="Lesson not found")

    missions = lesson_row.lesson_json.get("missions", [])
    mission = next((m for m in missions if m["id"] == req.mission_id), None)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Generate Pepper's coaching response
    feedback = _generate_reflection_feedback(
        req.reflection_text,
        req.lesson_title,
        mission.get("prompt", ""),
        req.goal,
    )

    # Update progress and store feedback
    lesson_now_required_complete = False
    lesson_now_fully_complete = False
    try:
        progress, lesson_now_required_complete, lesson_now_fully_complete = _mark_mission_complete(
            req.user_id, req.lesson_key, req.mission_id, missions, db
        )
        progress.last_reflection_feedback = feedback
        db.commit()
    except Exception as e:
        print(f"[reflect] progress DB error for user {req.user_id}: {e}")
        db.rollback()

    # XP and streak — reflection counts for streak
    companion_result: dict | None = None
    try:
        companion_result = _apply_xp_and_streak(req.user_id, lesson_now_required_complete, db)
    except Exception as e:
        print(f"[companion] reflect update failed for user {req.user_id}: {e}")

    return {
        "feedback": feedback,
        "mission_completed": True,
        "lesson_now_required_complete": lesson_now_required_complete,
        "lesson_now_fully_complete": lesson_now_fully_complete,
        "xp_earned": XP_PER_MISSION,
        "companion": companion_result,
    }


@router.post("/quiz")
async def submit_quiz(req: QuizAnswerRequest, db: Session = Depends(get_db)) -> dict:
    lesson_row = db.query(Lesson).filter(Lesson.lesson_key == req.lesson_key).first()
    if not lesson_row:
        raise HTTPException(status_code=404, detail="Lesson not found")

    missions = lesson_row.lesson_json.get("missions", [])
    mission = next((m for m in missions if m["id"] == req.mission_id), None)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    questions = mission.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="Mission has no quiz questions")

    # Grade server-side for integrity
    results = []
    correct_count = 0
    for i, q in enumerate(questions):
        selected = req.answers[i] if i < len(req.answers) else -1
        is_correct = selected == q["correct_index"]
        if is_correct:
            correct_count += 1
        results.append({
            "question_index": i,
            "selected": selected,
            "correct_index": q["correct_index"],
            "is_correct": is_correct,
            "explanation": q["explanation"],
        })

    total = len(questions)
    # Pass threshold: ≥ 2/3 correct (rounds to nearest integer)
    passed = correct_count >= max(1, round(total * 0.67))

    # Update progress — quiz completion counts for streak
    lesson_now_required_complete = False
    lesson_now_fully_complete = False
    try:
        _, lesson_now_required_complete, lesson_now_fully_complete = _mark_mission_complete(
            req.user_id, req.lesson_key, req.mission_id, missions, db
        )
    except Exception as e:
        print(f"[quiz] progress DB error for user {req.user_id}: {e}")
        db.rollback()

    companion_result: dict | None = None
    try:
        companion_result = _apply_xp_and_streak(req.user_id, lesson_now_required_complete, db)
    except Exception as e:
        print(f"[companion] quiz update failed for user {req.user_id}: {e}")

    return {
        "results": results,
        "score": correct_count,
        "total": total,
        "passed": passed,
        "mission_completed": True,
        "lesson_now_required_complete": lesson_now_required_complete,
        "lesson_now_fully_complete": lesson_now_fully_complete,
        "xp_earned": XP_PER_MISSION,
        "companion": companion_result,
    }


@router.get("/user/{user_id}/missions")
async def get_incomplete_missions(user_id: str, db: Session = Depends(get_db)) -> list[dict]:
    """Return all unfinished missions across every lesson the user has started."""
    progress_records = (
        db.query(UserLessonProgress)
        .filter(
            UserLessonProgress.clerk_user_id == user_id,
            UserLessonProgress.is_fully_complete == False,  # noqa: E712
        )
        .order_by(UserLessonProgress.last_visited_at.desc())
        .all()
    )

    roadmap_row = db.query(UserRoadmap).filter(UserRoadmap.clerk_user_id == user_id).first()
    meta = (roadmap_row.roadmap_json.get("_meta") or {}) if roadmap_row else {}
    goal = meta.get("goal", "")
    buddy_name = meta.get("buddy_name", "Buddy")
    experience = meta.get("experience", 1)
    domain = meta.get("domain", "cooking")

    results: list[dict] = []
    seen_lesson_keys: set[str] = set()

    for progress in progress_records:
        lesson = db.query(Lesson).filter(Lesson.lesson_key == progress.lesson_key).first()
        if not lesson:
            continue
        seen_lesson_keys.add(progress.lesson_key)
        missions = lesson.lesson_json.get("missions", [])
        completed_set = set(progress.completed_missions or [])
        for mission in missions:
            if mission["id"] not in completed_set:
                results.append({
                    "lesson_key": progress.lesson_key,
                    "lesson_title": lesson.title,
                    "chapter_title": lesson.chapter_title,
                    "domain": lesson.domain or domain,
                    "goal": goal,
                    "buddy_name": buddy_name,
                    "experience": experience,
                    "mission_id": mission["id"],
                    "mission_title": mission["title"],
                    "mission_description": mission.get("description", ""),
                    "is_required": mission.get("is_required", True),
                    "duration_minutes": mission.get("duration_minutes", 10),
                    "mission_type": mission.get("mission_type", "photo_submission"),
                })

    # Also include the current active roadmap lesson if not yet started
    if roadmap_row:
        roadmap_json = roadmap_row.roadmap_json
        active_index = roadmap_row.active_index
        global_idx = 0
        active_lesson_data = None
        active_chapter_title = ""
        for chapter in roadmap_json.get("chapters", []):
            for lesson in chapter.get("lessons", []):
                if global_idx == active_index:
                    active_lesson_data = lesson
                    active_chapter_title = chapter.get("title", "")
                    break
                global_idx += 1
            if active_lesson_data:
                break

        if active_lesson_data:
            title_snake = re.sub(r"[^a-z0-9]+", "_", active_lesson_data["title"].lower())
            active_lesson_key = f"{active_lesson_data['id']}_{title_snake}"
            if active_lesson_key not in seen_lesson_keys:
                lesson_row = db.query(Lesson).filter(Lesson.lesson_key == active_lesson_key).first()
                if lesson_row:
                    active_missions = lesson_row.lesson_json.get("missions", [])
                    active_entries = [
                        {
                            "lesson_key": active_lesson_key,
                            "lesson_title": lesson_row.title,
                            "chapter_title": lesson_row.chapter_title or active_chapter_title,
                            "domain": lesson_row.domain or domain,
                            "goal": goal,
                            "buddy_name": buddy_name,
                            "experience": experience,
                            "mission_id": mission["id"],
                            "mission_title": mission["title"],
                            "mission_description": mission.get("description", ""),
                            "is_required": mission.get("is_required", True),
                            "duration_minutes": mission.get("duration_minutes", 10),
                            "mission_type": mission.get("mission_type", "photo_submission"),
                        }
                        for mission in active_missions
                    ]
                    results = active_entries + results

    return results


@router.get("/{lesson_key}")
async def get_lesson(lesson_key: str, db: Session = Depends(get_db)) -> dict:
    lesson = db.query(Lesson).filter(Lesson.lesson_key == lesson_key).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson.lesson_json


@router.get("/{lesson_key}/{user_id}/progress")
async def get_lesson_progress(lesson_key: str, user_id: str, db: Session = Depends(get_db)) -> dict:
    lesson = db.query(Lesson).filter(Lesson.lesson_key == lesson_key).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress = db.query(UserLessonProgress).filter(
        UserLessonProgress.clerk_user_id == user_id,
        UserLessonProgress.lesson_key == lesson_key,
    ).first()

    missions = lesson.lesson_json.get("missions", [])
    completed_set = set(progress.completed_missions if progress else [])

    missions_list = [
        {
            "id": m["id"],
            "title": m["title"],
            "mission_type": m.get("mission_type", "photo_submission"),
            "is_required": m.get("is_required", True),
            "is_completed": m["id"] in completed_set,
        }
        for m in missions
    ]

    return {
        "lesson_key": lesson_key,
        "is_required_complete": progress.is_required_complete if progress else False,
        "is_fully_complete": progress.is_fully_complete if progress else False,
        "completed_missions": progress.completed_missions if progress else [],
        "missions_list": missions_list,
        "last_visited_at": progress.last_visited_at.isoformat() if progress else None,
        "last_reflection_feedback": getattr(progress, "last_reflection_feedback", None) if progress else None,
    }


@router.post("/validate")
async def validate_lesson(req: ValidateRequest, db: Session = Depends(get_db)) -> dict:
    # Fetch lesson and find mission
    lesson_row = db.query(Lesson).filter(Lesson.lesson_key == req.lesson_key).first()
    if not lesson_row:
        raise HTTPException(status_code=404, detail="Lesson not found")

    missions = lesson_row.lesson_json.get("missions", [])
    mission = next((m for m in missions if m["id"] == req.mission_id), None)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    grading_mode = _get_grading_mode(req.user_id, db) if req.user_id else "balanced"
    grading_instruction = (
        'Grading mode: encouraging. Be generous. If there\'s any genuine attempt visible, is_valid = true. Focus feedback on what worked.'
        if grading_mode == "encouraging"
        else 'Grading mode: strict. Hold a high bar. The technique should be visible and executed with reasonable care. Call out what specifically missed the mark.'
        if grading_mode == "strict"
        else 'Grading mode: balanced. Standard grading. Genuine attempt required. Feedback is honest and specific.'
    )

    prompt = (
        f"The user is learning '{req.lesson_title}' as part of their goal: {req.goal}. "
        f"Their mission was: {mission['description']}. "
        f"They selected this reflection: '{req.reflection_choice}'. "
        f"{grading_instruction}\n\n"
        "Here is their photo. Give specific, warm feedback in 2-3 sentences that references something "
        "visible in the photo OR directly acknowledges their reflection choice. "
        "Never give generic feedback like 'Great job!'.\n\n"
        "Set is_valid to true if the photo shows any genuine attempt at the task — food, cooking, "
        "ingredients, equipment, or a result. Set is_valid to false ONLY if the photo is completely "
        "blank, a UI screenshot, or has absolutely nothing to do with cooking or food.\n\n"
        "Return ONLY valid JSON:\n"
        '{"feedback": "string", "is_valid": true}'
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=VISION_MODEL,
            max_tokens=512,
            system=PEPPER_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": req.photo_media_type,
                                "data": req.photo_base64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        full_text = message.content[0].text

    except anthropic.APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Anthropic API. Check your network and API key.",
        )
    except anthropic.APIStatusError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Anthropic API error: {e.status_code} {e.message}",
        )

    parsed = _strip_and_parse(full_text, "Validate")
    is_valid = parsed.get("is_valid", False)
    print(f"[validate] lesson={req.lesson_key} mission={req.mission_id} user={req.user_id} is_valid={is_valid}")

    # Update UserLessonProgress
    was_required_complete = False
    was_fully_complete = False
    progress: UserLessonProgress | None = None

    if req.user_id:
        try:
            progress = db.query(UserLessonProgress).filter(
                UserLessonProgress.clerk_user_id == req.user_id,
                UserLessonProgress.lesson_key == req.lesson_key,
            ).first()

            if not progress:
                progress = UserLessonProgress(
                    clerk_user_id=req.user_id,
                    lesson_key=req.lesson_key,
                    completed_missions=[],
                    is_required_complete=False,
                    is_fully_complete=False,
                )
                db.add(progress)

            was_required_complete = progress.is_required_complete
            was_fully_complete = progress.is_fully_complete

            if is_valid and req.mission_id not in progress.completed_missions:
                progress.completed_missions = [*progress.completed_missions, req.mission_id]

                required_ids = {m["id"] for m in missions if m.get("is_required")}
                all_ids = {m["id"] for m in missions}
                completed_set = set(progress.completed_missions)

                if not progress.is_required_complete and required_ids.issubset(completed_set):
                    progress.is_required_complete = True
                    progress.first_required_completed_at = datetime.now(timezone.utc)

                if all_ids.issubset(completed_set):
                    progress.is_fully_complete = True

            progress.last_visited_at = datetime.now(timezone.utc)
            progress.updated_at = datetime.now(timezone.utc)
            db.commit()
        except Exception as e:
            print(f"[validate] progress DB error for user {req.user_id}: {e}")
            db.rollback()

    lesson_now_required_complete = bool(
        req.user_id
        and progress
        and not was_required_complete
        and progress.is_required_complete
    )

    # XP and companion update
    companion_result: dict | None = None
    if req.user_id:
        try:
            initialize_companion(req.user_id, db)

            if is_valid:
                xp_result = add_xp_to_companion(req.user_id, XP_PER_MISSION, "lesson", db)
                companion_result = {**xp_result}

                if lesson_now_required_complete:
                    streak_result = update_last_practice(req.user_id, db)
                    new_mood = update_mood_for_user(req.user_id, db)
                    companion_result = {
                        **xp_result,
                        "mood": new_mood,
                        "streak_days": streak_result["streak_days"],
                        "streak_changed": streak_result["streak_changed"],
                    }
            else:
                _touch_last_practice_timestamp(req.user_id, db)
                new_mood = update_mood_for_user(req.user_id, db)
                companion_result = {"mood": new_mood}

        except Exception as e:
            print(f"[companion] update failed for user {req.user_id}: {e}")

    lesson_now_fully_complete = bool(
        req.user_id
        and progress
        and not was_fully_complete
        and progress.is_fully_complete
    )

    response = {
        **parsed,
        "xp_earned": XP_PER_MISSION,
        "mission_completed": is_valid,
        "lesson_now_required_complete": lesson_now_required_complete,
        "lesson_now_fully_complete": lesson_now_fully_complete,
    }
    if companion_result is not None:
        response["companion"] = companion_result
    return response
