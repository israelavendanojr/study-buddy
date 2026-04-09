import json
import os
import pathlib
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Lesson, UserLessonProgress
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
VIDEO_MAPPING_PATH = RAG_ROOT / "video_mapping.json"


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class Card1Hook(BaseModel):
    companion_message: str  # 1-2 sentences


class Card2Concept(BaseModel):
    companion_tip: str  # 1-2 sentences: what to watch for in the video
    video_key: str     # matched from video_mapping.json, may be empty string


class Card3Why(BaseModel):
    explanation: str    # 4-6 sentences, companion-voiced
    tell_me_more: str   # 2-3 additional sentences, hidden by default


class Mission(BaseModel):
    id: str
    title: str
    description: str
    is_required: bool
    duration_minutes: int
    prompt: str                    # specific question about the photo
    reflection_choices: list[str]  # 3-4 options


class LessonContent(BaseModel):
    card1: Card1Hook
    card2: Card2Concept
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


def _lookup_video(lesson_title: str) -> str:
    """Fuzzy-match lesson_title against video_mapping.json keys."""
    try:
        mapping: dict = json.loads(VIDEO_MAPPING_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ""

    normalized = lesson_title.lower().replace(" ", "_")
    # exact match first
    if normalized in mapping:
        return mapping[normalized].get("youtube_short_id", "")

    # substring match both ways
    for key, value in mapping.items():
        if key in normalized or normalized in key:
            return value.get("youtube_short_id", "")

    return ""


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_lesson_prompt(req: LessonRequest, rag_content: str, video_key: str) -> str:
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
  "card2": {{
    "companion_tip": "1-2 sentences: what specific thing to watch for or focus on in the video",
    "video_key": "{video_key}"
  }},
  "card3": {{
    "explanation": "4-6 sentences explaining the concept in companion voice — direct, warm, never textbook",
    "tell_me_more": "2-3 additional sentences that deepen the idea, revealed on tap"
  }},
  "missions": [
    {{
      "id": "mission_1",
      "title": "Short mission title",
      "description": "Full task description — specific thing the learner will actually do",
      "is_required": true,
      "duration_minutes": 10,
      "prompt": "A specific question about what they made or discovered — NOT generic like 'How did it go?'",
      "reflection_choices": ["Option 1 specific to this skill", "Option 2", "Option 3"]
    }},
    {{
      "id": "mission_2",
      "title": "Second mission title",
      "description": "Another specific task that builds on the first",
      "is_required": true,
      "duration_minutes": 15,
      "prompt": "Specific question about mission 2",
      "reflection_choices": ["Option 1", "Option 2", "Option 3"]
    }},
    {{
      "id": "mission_3",
      "title": "Optional challenge",
      "description": "An optional stretch task for the curious learner",
      "is_required": false,
      "duration_minutes": 10,
      "prompt": "Specific question about mission 3",
      "reflection_choices": ["Option 1", "Option 2", "Option 3"]
    }}
  ]
}}

Rules:
- Generate 2-4 missions total. Must include at least 1-2 required missions
- Required missions should be core skill-building tasks the learner must do
- Optional missions should be stretch tasks (teach someone, try a harder version, etc.)
- Each mission must have a specific description — not generic like "Practice the skill"
- Each mission prompt must reference what should be visible in the photo
- reflection_choices must be exactly 3-4 options relevant to this specific mission
- hook (card1) must be 1-2 sentences max
- explanation (card3) must be 4-6 sentences
- Speak as {req.buddy_name}, a warm knowledgeable friend helping someone learn {req.goal}
- Return ONLY the JSON object"""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate")
async def generate_lesson(req: LessonRequest, db: Session = Depends(get_db)) -> dict:
    # Check cache by lesson_key
    cached = db.query(Lesson).filter(Lesson.lesson_key == req.lesson_key).first()
    if cached:
        return cached.lesson_json

    # RAG retrieval
    rag_content = _retrieve_rag_docs(req.lesson_title, req.chapter_title, req.domain)

    # Video lookup
    video_key = _lookup_video(req.lesson_title)

    # Build prompt
    prompt = _build_lesson_prompt(req, rag_content, video_key)

    # Call Claude
    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2048,
            system=(
                f"You are a warm, knowledgeable companion helping someone learn {req.goal} ({req.domain}). "
                f"Your name is {req.buddy_name}. Speak directly to the user, like a knowledgeable "
                f"friend who knows {req.domain} deeply — never like a textbook."
            ),
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

    # Cache in Lesson table
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

    prompt = (
        f"The user is learning '{req.lesson_title}' as part of their goal: {req.goal}. "
        f"Their mission was: {mission['description']}. "
        f"They selected this reflection: '{req.reflection_choice}'. "
        "Here is their photo. Give specific, warm feedback in 2-3 sentences that references something "
        "visible in the photo OR directly acknowledges their reflection choice. "
        "Never give generic feedback like 'Great job!'. "
        "If the photo is unrelated to the task, gently note it but stay encouraging. "
        "Also determine if this submission is valid (did they attempt the task).\n\n"
        "Return ONLY valid JSON:\n"
        '{"feedback": "string", "is_valid": true}'
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=VISION_MODEL,
            max_tokens=512,
            system=(
                f"You are {req.buddy_name}, a warm and encouraging learning companion. "
                f"You help people learn {req.goal}."
            ),
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

    # Update UserLessonProgress
    was_required_complete = False
    progress: UserLessonProgress | None = None

    if req.user_id:
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
        req.user_id and progress and progress.is_fully_complete
        and is_valid  # only true when this submission triggered full completion
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
