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

    # Scale roadmap size to goal duration
    weeks = req.weeks
    if weeks <= 2:
        min_chapters, max_chapters = 2, 3
        min_lessons, max_lessons = 3, 5
    elif weeks <= 8:
        min_chapters, max_chapters = 3, 5
        min_lessons, max_lessons = 4, 6
    elif weeks <= 24:
        min_chapters, max_chapters = 4, 7
        min_lessons, max_lessons = 5, 8
    else:
        min_chapters, max_chapters = 6, 10
        min_lessons, max_lessons = 6, 10

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
- User interests: {interests}

How to use this context:
1. Make chapter titles personal and emotionally resonant, not generic textbook names
2. Design the final milestone of each chapter as a direct test of the success metric
3. Adapt lesson types to learning_style:
   reading → reading-based activities, kinesthetic → hands-on practice,
   social → conversation/partner activities, visual → video/diagram-based
4. User interests are for SUBTLE flavor — reference them occasionally in 1-2 lesson
   titles where it fits naturally. Do NOT force them into every chapter.
   Bad: every chapter mentions the interest. Good: one or two lessons nod to it.
5. Address obstacles with at most 1-2 targeted resilience lessons across the whole
   roadmap, not one per chapter
6. Front-load content matching their baseline — skip what they already know
"""

    return f"""You are a learning roadmap designer. Create a personalized learning roadmap as JSON.

User profile:
- Goal: {req.goal}
- Experience level: {req.experience}/5 ({exp_label})
- Daily session time: {total_minutes} minutes
- Days per week: {req.days_per_week}
- Duration: {weeks} weeks
- Success vision: {req.success_vision}
{coaching_block}
Return ONLY valid JSON matching this exact schema — no markdown, no explanation, nothing else:

{{
  "title": "string (short motivating roadmap title)",
  "chapters": [
    {{
      "id": "string (e.g. ch1)",
      "title": "string",
      "lessons": [
        {{
          "id": "string (e.g. ch1-l1)",
          "title": "string",
          "type": "lesson | practice | milestone",
          "estimatedMinutes": number
        }}
      ]
    }}
  ]
}}

Rules:
- {min_chapters} to {max_chapters} chapters total (scale to the {weeks}-week duration)
- {min_lessons} to {max_lessons} lessons per chapter
- The last lesson of every chapter must have type "milestone"
- estimatedMinutes for each lesson must be <= {total_minutes}
- Front-load simpler foundational content for experience level {req.experience}/5
- Each lesson title should be specific and actionable, not generic
- Chapters should represent meaningful phases of progression, not arbitrary groupings
- Later chapters should build on skills from earlier ones — the roadmap must tell a coherent learning story
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
Your job is to fill in the gaps that generic sliders can't capture — ask what a real tutor would ask.

User context already collected:
{context_block}

Ask about these dimensions (one per turn, adapt order to what matters most for this goal):

1. CURRENT LEVEL PROBE: The user rated themselves {req.experience}/5, but that's vague.
   Ask ONE specific question to pin down where they actually are in domain-specific terms.
   Examples:
   - Spanish → "What's your current level? (A1, A2, B1…)"
   - Chess → "Do you know basic openings and tactics?"
   - Coding → "Have you built anything beyond tutorials?"
   - Guitar → "Can you play any songs start to finish?"
   - Cooking → "Can you follow a recipe or do you improvise?"
   The answer to this question is MORE important than the 1-5 slider for planning.

2. MOTIVATION: Why this goal matters to them — what's driving it?

3. GOAL-SPECIFIC GAP: Based on their stated success vision and current level,
   ask ONE question that probes the biggest gap or assumption.
   Examples:
   - Goal is B1 Spanish but they're A2 → "Are you stronger in reading or speaking?"
   - Goal is run a marathon but beginner → "Have you run any shorter races?"
   - Goal is build an app but knows basics → "Frontend, backend, or full stack?"
   This question should feel like a coach zeroing in on what matters.

4. LEARNING STYLE: How they naturally prefer to learn
   (reading, watching videos, hands-on practice, listening, with others, solo)

5. OBSTACLES: What might get in the way or has tripped them up before?
   Examples:
   - "What's been your biggest blocker so far?"
   - "Anything that might get in the way?"
   This helps build resilience lessons into the plan.

6. INTERESTS (optional): Only ask if the prior answers haven't revealed enough
   personality to flavor the roadmap. Skip if you already have enough.

Rules:
- Question must be 12 words or fewer
- No greetings, no encouragement, no filler
- Ask the most important missing dimension first, not necessarily in listed order
- If the user's success vision implies a specific standard (certification, race, etc.),
  treat that as a fixed target and probe their distance from it
- Output ONLY valid JSON, no markdown

Before ready:
{{ "ready": false, "message": "the short question" }}

After 4-5 questions answered (when you have enough to build a precise roadmap):
{{
  "ready": true,
  "message": "one sentence summary",
  "coaching_result": {{
    "refined_goal": "SMART version with specific measurable target",
    "success_metric": "concrete measurable outcome (use domain terms like A2→B1, sub-4hr marathon, etc.)",
    "motivation": "their stated why",
    "learning_style": "detected preference",
    "known_obstacles": ["obstacles if mentioned, empty array if none"],
    "baseline": "their SPECIFIC current level in domain terms, not just a number",
    "recommended_approach": "method tailored to closing the gap between baseline and target",
    "key_interests": ["interests if mentioned, empty array if none"]
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
            max_tokens=16384,
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
    motivation = ""
    baseline = ""
    if req.coaching_result:
        cr = req.coaching_result
        motivation = cr.get("motivation", "")
        baseline = cr.get("baseline", "")
        coaching_context = f"""
Context from coaching conversation:
- Motivation: {motivation}
- Baseline: {baseline}
- Learning style: {cr.get("learning_style", "")}
- Interests: {", ".join(cr.get("key_interests", []))}"""

    # Friendly duration label
    if req.weeks <= 2:
        duration_label = f"{req.weeks} week{'s' if req.weeks > 1 else ''}"
    elif req.weeks <= 8:
        months = req.weeks // 4
        duration_label = f"about {months} month{'s' if months > 1 else ''}" if months >= 1 else f"{req.weeks} weeks"
    elif req.weeks <= 52:
        months = round(req.weeks / 4.3)
        duration_label = f"about {months} months" if months < 12 else "about a year"
    else:
        duration_label = f"{req.weeks} weeks"

    # Friendly time label
    if total_minutes >= 60:
        hours = total_minutes // 60
        mins = total_minutes % 60
        time_label = f"about {hours} hour{'s' if hours > 1 else ''}" + (f" {mins} min" if mins else "")
    else:
        time_label = f"about {total_minutes} minutes"

    prompt = f"""Write a goal confirmation for a learning app. Be warm and encouraging, not clinical.

User info:
- Goal: {req.goal}
- Experience: {exp_label} ({req.experience}/5)
- Time per session: {time_label}
- Frequency: {req.days_per_week} days a week
- Duration: {duration_label}
- Success vision: {req.success_vision}
{coaching_context}

Return ONLY valid JSON — no markdown:
{{
  "motivation_line": "A short personal sentence reflecting their WHY — show you were listening. Max 12 words. If no motivation known, write something encouraging about their goal.",
  "smart_goal": "Their goal rewritten as one clear, specific sentence. Max 20 words. Include what they'll achieve and by when.",
  "schedule": "Friendly description of their commitment. Use casual language like 'a few times a week' not '3x per week, 75 min/day'. Max 10 words.",
  "achievability": "A short encouraging phrase. Not just a label — something like 'Totally doable at your pace' or 'A good challenge — you got this'. Max 8 words."
}}

Rules:
- motivation_line should feel personal — reference something specific they said if possible
- schedule should sound easy and approachable, not like a contract
- achievability should always feel positive, never scary
- Do NOT include raw numbers like '75 minutes' or '52 weeks' — paraphrase naturally"""

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
