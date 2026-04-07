import json
import os
import pathlib
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import LessonCache
from .roadmap import _strip_and_parse

router = APIRouter()

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
VISION_MODEL = "claude-sonnet-4-6"

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


class Card4Mission(BaseModel):
    description: str        # full task description
    duration_minutes: int   # estimated minutes
    focus_point: str        # single highlighted callout, one sentence


class Card5Submission(BaseModel):
    prompt: str                    # specific question about what they made
    reflection_choices: list[str]  # exactly 3-4 options


class LessonContent(BaseModel):
    card1: Card1Hook
    card2: Card2Concept
    card3: Card3Why
    card4: Card4Mission
    card5: Card5Submission


class LessonRequest(BaseModel):
    user_id: str | None = None
    lesson_title: str
    lesson_type: str  # "lesson" | "practice" | "milestone"
    chapter_title: str
    goal: str
    buddy_name: str
    experience: int
    completed_lesson_titles: list[str] = []
    domain: str = "cooking"


class ValidateRequest(BaseModel):
    photo_base64: str
    photo_media_type: str  # "image/jpeg" | "image/png"
    reflection_choice: str
    lesson_title: str
    mission_description: str
    buddy_name: str
    goal: str
    lesson_type: str = "lesson"  # for XP calculation


# ---------------------------------------------------------------------------
# RAG helpers
# ---------------------------------------------------------------------------

def _retrieve_rag_docs(lesson_title: str, chapter_title: str) -> str:
    """Scan all .md files under RAG_ROOT, return content of up to 3 most relevant."""
    title_lower = lesson_title.lower()
    chapter_lower = chapter_title.lower()

    matches: list[tuple[int, pathlib.Path]] = []
    for md_file in RAG_ROOT.rglob("*.md"):
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
        # also check if the stem words appear
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
- Type: {req.lesson_type}
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
  "card4": {{
    "description": "Full mission description — specific task the learner will actually do",
    "duration_minutes": 15,
    "focus_point": "One sentence callout highlighting the single most important thing to get right"
  }},
  "card5": {{
    "prompt": "A specific question about what they made or discovered — NOT 'How did it go?'",
    "reflection_choices": [
      "Option relevant to this specific skill (3-4 total)"
    ]
  }}
}}

Rules:
- hook (card1) must be 1-2 sentences max
- explanation (card3) must be 4-6 sentences
- mission (card4) must be specific and timed
- submission prompt (card5) must be specific, NOT generic like 'How did it go?'
- reflection_choices must be exactly 3-4 options relevant to this specific skill
- Speak as {req.buddy_name}, a warm knowledgeable friend helping someone learn {req.goal}
- Return ONLY the JSON object"""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

XP_MAP = {"lesson": 50, "practice": 75, "milestone": 100}


@router.post("/generate")
async def generate_lesson(req: LessonRequest, db: Session = Depends(get_db)) -> dict:
    cache_key = f"{req.lesson_title}::{req.goal}::{req.experience}"

    # Check cache
    cached = db.query(LessonCache).filter(LessonCache.cache_key == cache_key).first()
    if cached:
        return cached.lesson_json

    # RAG retrieval
    rag_content = _retrieve_rag_docs(req.lesson_title, req.chapter_title)

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
                f"You are a warm, knowledgeable companion helping someone learn {req.goal}. "
                f"Your name is {req.buddy_name}. Speak directly to the user, like a knowledgeable "
                "friend — never like a textbook."
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

    # Store in cache
    row = LessonCache(
        cache_key=cache_key,
        lesson_json=lesson_data,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()

    return lesson_data


@router.post("/validate")
async def validate_lesson(req: ValidateRequest) -> dict:
    prompt = (
        f"The user just completed a lesson on '{req.lesson_title}' as part of learning {req.goal}. "
        f"Their mission was: {req.mission_description}. "
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
    xp_earned = XP_MAP.get(req.lesson_type, 50)
    return {**parsed, "xp_earned": xp_earned}
