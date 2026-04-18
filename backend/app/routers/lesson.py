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
from ..services.lesson_prompt_builder import build_type_aware_prompt
from .roadmap import _strip_and_parse

router = APIRouter()

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
VISION_MODEL = "claude-sonnet-4-6"
XP_PER_MISSION = 20

RAG_ROOT = pathlib.Path(__file__).parent.parent / "rag_resources"

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


class MatchingPair(BaseModel):
    term: str
    definition: str


class Mission(BaseModel):
    id: str
    mission_type: str = "photo_submission"  # photo_submission | reflection_journal | pop_quiz | minigame_*
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
    # minigame_matching fields
    pairs: list[MatchingPair] = []
    # minigame_image_id fields
    images: list[str] = []  # 4 text descriptions of images
    correct_image_index: int | None = None
    # minigame_sequencing fields
    steps: list[str] = []  # scrambled order
    correct_order: list[int] | None = None
    # minigame_fill_blank fields
    fill_blank_sentence: str | None = None
    fill_blank_answer: str | None = None


class AnnotatedPoint(BaseModel):
    text: str
    source_ids: list[str] = []
    quote: str | None = None
    quote_author: str | None = None
    quote_book: str | None = None
    quote_page: int | None = None


class SourceCited(BaseModel):
    source_id: str
    title: str | None = None
    author: str | None = None
    page_start: int | None = None


class ImageItem(BaseModel):
    url: str
    caption: str | None = None


class QuizCheckpoint(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class ReflectionCheckpoint(BaseModel):
    prompt: str
    min_words: int = 30


class Card1Hook(BaseModel):
    motivation: str
    learn_points: list[AnnotatedPoint | str]  # union for backward-compat
    images: list[ImageItem] | None = None


class ScoreCriterion(BaseModel):
    label: str
    stars: int


class Card3Why(BaseModel):
    headline: str
    points: list[AnnotatedPoint | str]  # union for backward-compat
    tell_me_more: str
    images: list[ImageItem] | None = None
    quiz_checkpoint: QuizCheckpoint | None = None
    reflection_prompt: ReflectionCheckpoint | None = None


class LessonContent(BaseModel):
    lesson_type: str | None = None  # technique | food_science | recipe | minigame | concept
    card1: Card1Hook
    card3: Card3Why
    missions: list[Mission]
    sources_cited: list[SourceCited] = []


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
    lesson_type: str | None = None  # technique | food_science | recipe | minigame | concept


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


class ReflectInlineRequest(BaseModel):
    lesson_title: str
    prompt: str
    reflection_text: str
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
# Taxonomy helpers
# ---------------------------------------------------------------------------

def _get_lesson_type_from_taxonomy(lesson_key: str) -> str | None:
    """
    Load lesson_type from CURRICULUM_TAXONOMY.json based on lesson_key.
    Returns the lesson_type string or None if not found.
    """
    try:
        taxonomy_path = RAG_ROOT.parent / "CURRICULUM_TAXONOMY.json"
        if not taxonomy_path.exists():
            return None
        with open(taxonomy_path) as f:
            data = json.load(f)
        lessons = data.get("curriculum", {}).get("lessons", [])
        for lesson in lessons:
            if lesson.get("lesson_key") == lesson_key:
                return lesson.get("lesson_type")
        return None
    except Exception as e:
        print(f"[taxonomy] Failed to load lesson_type for {lesson_key}: {e}")
        return None


# ---------------------------------------------------------------------------
# RAG helpers
# ---------------------------------------------------------------------------

def _retrieve_rag_chunks(lesson_title: str, chapter_title: str, domain: str, db: Session) -> list[dict]:
    """Retrieve top-k RAG chunks from kb_chunks via pgvector cosine similarity."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        query = f"{chapter_title}: {lesson_title}"
        resp = client.embeddings.create(model="text-embedding-3-small", input=[query])
        embedding = resp.data[0].embedding
    except Exception as e:
        print(f"[rag] embedding failed: {e}")
        return []

    try:
        from sqlalchemy import text as sql_text
        result = db.execute(sql_text(
            "SELECT kc.text, kc.source_id, kc.page_start, kc.key_quote, kc.quote_page, s.title AS source_title, s.author "
            "FROM kb_chunks kc "
            "LEFT JOIN sources s ON s.source_id = kc.source_id "
            "ORDER BY kc.embedding <=> CAST(:emb AS vector) "
            "LIMIT 5"
        ), {"emb": str(embedding)})
        return [
            {
                "text": r.text,
                "source_id": r.source_id,
                "page_start": r.page_start,
                "key_quote": r.key_quote,
                "quote_page": r.quote_page or r.page_start,
                "source_title": r.source_title,
                "author": r.author,
            }
            for r in result
        ]
    except Exception as e:
        print(f"[rag] vector search failed: {e}")
        return []


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

def _generate_companion_hook(req: LessonRequest, content: dict) -> dict:
    """Generate a personalized hook with objective + learn_points for a fixed-content lesson."""
    exp_label = (
        "total beginner" if req.experience <= 1
        else "some experience" if req.experience <= 3
        else "experienced cook"
    )
    headline = content.get("content", {}).get("headline", "")
    content_points = content.get("content", {}).get("points", [])[:3]

    prompt = (
        f"Lesson: {content['title']}\n"
        f"Core insight: {headline}\n"
        f"Key skill points: {json.dumps(content_points)}\n"
        f"User's cooking goal: {req.goal}\n"
        f"Their level: {exp_label}\n\n"
        f"Write a hook for this lesson. Return ONLY valid JSON — no markdown.\n"
        f'{{\n'
        f'  "motivation": "One compelling sentence — why THIS skill matters for THIS goal right now (verb-first, e.g. \'Master the 3-min sear that turns flat chicken into restaurant-quality browning\')",\n'
        f'  "learn_points": ["Specific skill point 1 — what they\'ll be able to do (≤12 words)", "Point 2", "Point 3"]\n'
        f'}}\n'
        f"Rules: motivation specific to THIS lesson and THIS goal, learn_points 2-3 items ≤12 words each, no generic intros, return ONLY JSON"
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=256,
            system=PEPPER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        parsed = _strip_and_parse(message.content[0].text, "Hook")
        return {
            "motivation": parsed.get("motivation", "Master this core skill and understand how it elevates your cooking."),
            "learn_points": parsed.get("learn_points", [])[:3],
        }
    except Exception:
        return {
            "motivation": "Master this core skill and understand how it elevates your cooking.",
            "learn_points": ["Understand the core technique", "Know when to apply it", "Spot what success looks like"],
        }


def _generate_reflection_feedback(
    reflection_text: str,
    lesson_title: str,
    mission_prompt: str,
    goal: str,
) -> str:
    """Generate Pepper's quippy 1-2 sentence coaching response to a reflection journal entry."""
    prompt = (
        f"The user is learning '{lesson_title}' toward their goal: {goal}.\n"
        f"The reflection prompt was: {mission_prompt}\n"
        f"Their reflection: {reflection_text}\n\n"
        f"Write exactly 1-2 sentences, ~25 words total. Style: quippy, like a chef mentor dropping one sharp observation.\n"
        f"(1) Reference something specific they mentioned, "
        f"(2) Validate what they noticed. "
        f"Return only the feedback text, no extra commentary."
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=128,
            system=PEPPER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception:
        return "That's a solid observation. Next time, notice what surprised you—that's where learning happens."


# ---------------------------------------------------------------------------
# Prompt builder (legacy full-generation fallback)
# ---------------------------------------------------------------------------

def _build_lesson_prompt(req: LessonRequest, chunks: list[dict]) -> str:
    """Build type-aware prompt using shared builder."""
    return build_type_aware_prompt(
        lesson_title=req.lesson_title,
        chapter_title=req.chapter_title,
        goal=req.goal,
        experience=req.experience,
        lesson_type=req.lesson_type,
        completed_lesson_titles=req.completed_lesson_titles,
        chunks=chunks,
    )


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


def _is_lesson_json_stale(lj: dict) -> bool:
    """Return True if cached lesson JSON should be regenerated."""
    if "missions" not in lj:
        return True
    if "card2" in lj:
        return True
    card1 = lj.get("card1", {})
    if "motivation" not in card1:
        return True
    # New check: learn_points must be list of dicts, not strings (old format)
    learn_points = card1.get("learn_points", [])
    if learn_points and isinstance(learn_points[0], str):
        return True
    # New check: card3.points must be list of dicts
    card3 = lj.get("card3", {})
    points = card3.get("points", [])
    if points and isinstance(points[0], str):
        return True
    return False


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate")
async def generate_lesson(req: LessonRequest, db: Session = Depends(get_db)) -> dict:
    # ── 0. Load lesson_type from taxonomy if not provided ────────────────────
    if not req.lesson_type:
        req.lesson_type = _get_lesson_type_from_taxonomy(req.lesson_key)
    if not req.lesson_type:
        req.lesson_type = "technique"  # fallback

    # ── 1. DB cache check ────────────────────────────────────────────────────
    cached = db.query(Lesson).filter(Lesson.lesson_key == req.lesson_key).first()
    if cached:
        lj = cached.lesson_json
        if not _is_lesson_json_stale(lj):
            # Valid cache hit — return with prior feedback if available
            last_rf = None
            if req.user_id:
                progress = db.query(UserLessonProgress).filter(
                    UserLessonProgress.clerk_user_id == req.user_id,
                    UserLessonProgress.lesson_key == cached.lesson_key,
                ).first()
                if progress:
                    last_rf = getattr(progress, "last_reflection_feedback", None)
            return {**lj, "lesson_key": cached.lesson_key, "last_reflection_feedback": last_rf}
        # Old format — delete and fall through to regeneration
        db.delete(cached)
        db.commit()

    # ── 2. RAG retrieval ─────────────────────────────────────────────────────
    chunks = _retrieve_rag_chunks(req.lesson_title, req.chapter_title, req.domain, db)
    prompt = _build_lesson_prompt(req, chunks)

    # ── 3. LLM generation ────────────────────────────────────────────────────
    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2560,
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

    # ── 4. Store in DB ───────────────────────────────────────────────────────
    row = Lesson(
        lesson_key=req.lesson_key,
        title=req.lesson_title,
        chapter_title=req.chapter_title,
        domain=req.domain,
        lesson_type=req.lesson_type,  # NEW: write lesson_type to DB
        lesson_json=lesson_data,
        sources_cited=[c["source_id"] for c in chunks] if chunks else None,
        generated_at=datetime.now(timezone.utc),
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


@router.post("/reflect-inline")
async def reflect_inline(req: ReflectInlineRequest) -> dict:
    """Lightweight inline reflection feedback — no DB writes, no XP, no mission completion.
    Used for the optional card3 reflection checkpoint."""
    feedback = _generate_reflection_feedback(
        req.reflection_text,
        req.lesson_title,
        req.prompt,
        req.goal,
    )
    return {"feedback": feedback}


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
    """Return all unfinished missions from the user's current roadmap only."""
    roadmap_row = db.query(UserRoadmap).filter(UserRoadmap.clerk_user_id == user_id).first()
    meta = (roadmap_row.roadmap_json.get("_meta") or {}) if roadmap_row else {}
    goal = meta.get("goal", "")
    buddy_name = meta.get("buddy_name", "Buddy")
    experience = meta.get("experience", 1)
    domain = meta.get("domain", "cooking")

    # Build the set of lesson keys that belong to the current roadmap.
    # Roadmap-derived keys cover LLM-generated lessons (stored with that exact key).
    # Fixed-content lessons are stored in the DB with a canonical key (e.g. "searing_meat"),
    # not the roadmap-derived key (e.g. "ch1-l1_searing_meat"), so we do a title-based
    # lookup to also include those canonical keys.
    current_roadmap_keys: set[str] = set()
    roadmap_lesson_titles: list[str] = []
    if roadmap_row:
        for chapter in roadmap_row.roadmap_json.get("chapters", []):
            for lesson in chapter.get("lessons", []):
                title_snake = re.sub(r"[^a-z0-9]+", "_", lesson["title"].lower())
                current_roadmap_keys.add(f"{lesson['id']}_{title_snake}")
                roadmap_lesson_titles.append(lesson["title"])

        if roadmap_lesson_titles:
            for (canonical_key,) in db.query(Lesson.lesson_key).filter(
                Lesson.title.in_(roadmap_lesson_titles)
            ).all():
                current_roadmap_keys.add(canonical_key)

    progress_records = (
        db.query(UserLessonProgress)
        .filter(
            UserLessonProgress.clerk_user_id == user_id,
            UserLessonProgress.is_fully_complete == False,  # noqa: E712
            UserLessonProgress.lesson_key.in_(current_roadmap_keys),
        )
        .order_by(UserLessonProgress.last_visited_at.desc())
        .all()
    ) if current_roadmap_keys else []

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
                if not lesson_row:
                    # Fixed-content lessons are stored with a canonical key; fall back to title lookup
                    lesson_row = db.query(Lesson).filter(
                        Lesson.title == active_lesson_data["title"]
                    ).first()
                # Skip if the canonical key was already covered by the progress_records loop
                if lesson_row and lesson_row.lesson_key in seen_lesson_keys:
                    lesson_row = None
                if lesson_row:
                    active_missions = lesson_row.lesson_json.get("missions", [])
                    active_entries = [
                        {
                            "lesson_key": lesson_row.lesson_key,
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
        "GRADING MODE: encouraging. Rate generously 4–5 stars on any genuine attempt. Criteria ratings should lean positive."
        if grading_mode == "encouraging"
        else "GRADING MODE: strict. Hold a high bar on each criterion. Rate honestly — a 3-star rating means decent but improvable. Call out exactly what missed the mark."
        if grading_mode == "strict"
        else "GRADING MODE: balanced. Rate each criterion honestly based on what's visible. A genuine attempt deserves is_valid true even if some criteria score 2–3 stars."
    )

    prompt = (
        f"You are a head chef and tutor. You gave your student this mission:\n"
        f"Title: {mission['title']}\n"
        f"Description: {mission['description']}\n"
        f"Task: {mission.get('prompt', 'n/a')}\n"
        f"Their reflection choice: '{req.reflection_choice}'\n\n"
        f"STEP 1 — RELEVANCE CHECK:\n"
        f"Does this photo actually show an attempt at the mission above? "
        f"Reject if the photo is of something completely unrelated to the task "
        f"(e.g. a pet, a car, an empty plate when the task required food, the wrong dish entirely). "
        f"Be specific to THIS mission — not just 'is it food?' but 'is it THIS food/technique?'\n\n"
        f"If NOT relevant, return:\n"
        '{"is_relevant": false, "rejection_message": "Encouraging but firm 1-sentence callout, chef tone, ≤15 words.", "is_valid": false}\n\n'
        f"If relevant, proceed to STEP 2 — GRADING:\n"
        f"{grading_instruction}\n"
        f"Derive 2–4 grading criteria SPECIFIC to this mission (not generic). Rate each 1–5 stars based strictly on what is visible. "
        f"Then write one punchy coaching sentence (≤20 words).\n\n"
        'Return ONLY valid JSON:\n'
        '{"is_relevant": true, "criteria": [{"label": "Crust Color", "stars": 4}, {"label": "Even Coverage", "stars": 3}], "note": "That mahogany edge shows you nailed the heat.", "is_valid": true}'
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=VISION_MODEL,
            max_tokens=768,
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
