import json
import os
import re

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")


# ---------------------------------------------------------------------------
# /roadmap/generate models
# ---------------------------------------------------------------------------

class RoadmapRequest(BaseModel):
    goal: str
    buddy_name: str
    experience: int = Field(ge=1, le=5)
    session_hours: int = Field(ge=0, le=8)
    session_minutes: int = Field(ge=0, le=45)
    days_per_week: int = Field(ge=1, le=7)
    weeks: int = Field(ge=1, le=52)
    success_vision: str
    coaching_result: dict | None = None


# ---------------------------------------------------------------------------
# /roadmap/coach models
# ---------------------------------------------------------------------------

class CoachRequest(BaseModel):
    goal: str
    buddy_name: str
    conversation_history: list[dict]  # [{role: "user"|"assistant", content: str}]
    experience: int | None = None
    session_minutes: int | None = None
    days_per_week: int | None = None
    weeks: int | None = None
    success_vision: str | None = None


class CoachResponse(BaseModel):
    message: str
    ready: bool
    coaching_result: dict | None = None


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def _build_prompt(req: RoadmapRequest) -> str:
    total_minutes = req.session_hours * 60 + req.session_minutes
    exp_label = (
        "total beginner" if req.experience <= 1
        else "some experience" if req.experience <= 3
        else "expert"
    )

    coaching_block = ""
    if req.coaching_result:
        cr = req.coaching_result
        obstacles = ", ".join(cr.get("known_obstacles", [])) or "none mentioned"
        interests = ", ".join(cr.get("key_interests", [])) or "none mentioned"
        coaching_block = f"""
DEEP CONTEXT FROM COACHING CONVERSATION:
- Refined goal: {cr.get("refined_goal", req.goal)}
- Success metric: {cr.get("success_metric", req.success_vision)}
- Motivation/WHY: {cr.get("motivation", "")}
- Learning style: {cr.get("learning_style", "")}
- Baseline: {cr.get("baseline", "")}
- Known obstacles: {obstacles}
- Recommended approach: {cr.get("recommended_approach", "")}
- Interests to weave in: {interests}

Use this context to:
1. Make chapter titles emotional and personal, not generic
   (e.g. 'Reading Your First Telenovela' not 'Intermediate Spanish')
2. Design the final milestone of each chapter as a direct test of the success metric
3. If learning_style is 'reading', bias lesson types toward reading-based activities
   If 'kinesthetic', bias toward practice/doing exercises
   If 'social', include conversation/partner activities as milestone lessons
4. Weave the listed interests into lesson titles where natural
   (e.g. interest=cooking → 'Ordering Food: Real Restaurant Vocabulary')
5. Address each obstacle in known_obstacles with a specific resilience lesson
   (e.g. obstacle='travels frequently' → add 'Offline Practice: No WiFi Sessions')
6. Front-load content matching their baseline — skip what they already know
"""

    return f"""You are a learning roadmap designer. Create a personalized learning roadmap as JSON.

User profile:
- Goal: {req.goal}
- Experience level: {req.experience}/5 ({exp_label})
- Daily session time: {total_minutes} minutes
- Days per week: {req.days_per_week}
- Duration: {req.weeks} weeks
- Success vision: {req.success_vision}
{coaching_block}
Return ONLY valid JSON matching this exact schema — no markdown, no explanation, nothing else:

{{
  "title": "string (short motivating roadmap title)",
  "chapters": [
    {{
      "id": "string (e.g. ch1)",
      "title": "string",
      "emoji": "string (single emoji)",
      "lessons": [
        {{
          "id": "string (e.g. ch1-l1)",
          "title": "string",
          "type": "lesson | practice | milestone",
          "emoji": "string (single emoji)",
          "estimatedMinutes": number,
          "side": "left | right"
        }}
      ]
    }}
  ]
}}

Rules:
- 3 to 5 chapters total
- 4 to 8 lessons per chapter
- The last lesson of every chapter must have type "milestone"
- Lessons alternate side: first is "left", second "right", third "left", and so on
- estimatedMinutes for each lesson must be <= {total_minutes}
- Front-load simpler foundational content for experience level {req.experience}/5
- Each lesson title should be specific and actionable, not generic
- Return ONLY the JSON object, starting with {{ and ending with }}"""


def _build_coach_system_prompt(req: CoachRequest) -> str:
    context_lines = [f'Goal: "{req.goal}"']
    if req.experience is not None:
        exp_label = (
            "beginner" if req.experience <= 1
            else "intermediate" if req.experience <= 3
            else "advanced"
        )
        context_lines.append(f"Experience: {req.experience}/5 ({exp_label})")
    if req.session_minutes is not None:
        context_lines.append(f"Session time: {req.session_minutes} min/day")
    if req.days_per_week is not None:
        context_lines.append(f"Schedule: {req.days_per_week} days/week")
    if req.weeks is not None:
        context_lines.append(f"Duration: {req.weeks} weeks")
    if req.success_vision:
        context_lines.append(f"Success vision: {req.success_vision}")
    context_block = "\n".join(f"- {line}" for line in context_lines)

    return f"""You produce ONE short follow-up question per turn for a learning app onboarding form.

User context already collected:
{context_block}

Ask about these dimensions (one per turn, in order, skip any already answered):
1. MOTIVATION: Why this goal matters to them
2. LEARNING STYLE: How they prefer to learn (reading, watching, doing, listening)
3. GOAL-SPECIFIC: One question unique to this domain
   (e.g. Spanish → "Anyone to practice with?", Coding → "What will you build first?")
4. INTERESTS: A hobby to weave into lessons (optional — skip if 3 answers are sufficient)

Rules:
- Question must be 10 words or fewer
- No greetings, no encouragement, no personality
- Output ONLY valid JSON, no markdown

Before ready:
{{ "ready": false, "message": "the short question" }}

After 3-4 questions answered (when you have enough context):
{{
  "ready": true,
  "message": "one sentence summary",
  "coaching_result": {{
    "refined_goal": "SMART version of their goal",
    "success_metric": "concrete measurable outcome",
    "motivation": "their stated why",
    "learning_style": "detected preference",
    "known_obstacles": ["obstacles if mentioned"],
    "baseline": "current skill from context",
    "recommended_approach": "method tailored to their style",
    "key_interests": ["interests if mentioned"]
  }}
}}"""


# ---------------------------------------------------------------------------
# Shared JSON parse helper
# ---------------------------------------------------------------------------

def _strip_and_parse(text: str, context: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=503,
            detail=f"{context} response was not valid JSON: {str(e)}. Raw: {text[:200]}",
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate")
async def generate_roadmap(req: RoadmapRequest) -> dict:  # type: ignore[return]
    prompt = _build_prompt(req)

    # SWAP: replace client.messages.create below with a different provider if needed
    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=4096,
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

    return _strip_and_parse(full_text, "Claude")


@router.post("/coach", response_model=CoachResponse)
async def coach_roadmap(req: CoachRequest) -> CoachResponse:
    system_prompt = _build_coach_system_prompt(req)

    # SWAP: replace client.messages.create below with a different provider if needed
    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=req.conversation_history if req.conversation_history else [
                {"role": "user", "content": req.success_vision or "Hi!"}
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

    parsed = _strip_and_parse(full_text, "Coach")
    return CoachResponse(**parsed)


class SummarizeRequest(BaseModel):
    goal: str
    buddy_name: str
    experience: int = Field(ge=1, le=5)
    session_hours: int = Field(ge=0, le=8)
    session_minutes: int = Field(ge=0, le=45)
    days_per_week: int = Field(ge=1, le=7)
    weeks: int = Field(ge=1, le=52)
    success_vision: str
    coaching_result: dict | None = None


@router.post("/summarize")
async def summarize_goal(req: SummarizeRequest) -> dict:
    total_minutes = req.session_hours * 60 + req.session_minutes
    exp_label = (
        "total beginner" if req.experience <= 1
        else "some experience" if req.experience <= 3
        else "advanced"
    )

    coaching_context = ""
    if req.coaching_result:
        cr = req.coaching_result
        coaching_context = f"""
Additional context from coaching:
- Motivation: {cr.get("motivation", "")}
- Learning style: {cr.get("learning_style", "")}
- Interests: {", ".join(cr.get("key_interests", []))}"""

    prompt = f"""Rewrite this user's learning goal into strict SMART format for a confirmation screen.

User info:
- Goal: {req.goal}
- Experience: {exp_label} ({req.experience}/5)
- Schedule: {total_minutes} min/day, {req.days_per_week} days/week
- Duration: {req.weeks} weeks
- Success vision: {req.success_vision}
{coaching_context}

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{{
  "smart_goal": "One sentence SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound). Max 20 words.",
  "schedule": "{req.days_per_week}x per week, {total_minutes} min/day, {req.weeks} weeks",
  "achievability": "very achievable" or "ambitious but doable" or "stretch goal"
}}

Rules:
- smart_goal must be one clear sentence, max 20 words
- smart_goal must include the specific skill and a measurable outcome
- achievability: "very achievable" if <= 7 hrs/week, "ambitious but doable" if <= 14, "stretch goal" otherwise"""

    # SWAP: replace client.messages.create below with a different provider if needed
    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        full_text = message.content[0].text
    except anthropic.APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Anthropic API.",
        )
    except anthropic.APIStatusError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Anthropic API error: {e.status_code} {e.message}",
        )

    return _strip_and_parse(full_text, "Summarize")
