import json
import os
import re

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")


class RoadmapRequest(BaseModel):
    goal: str
    buddy_name: str
    experience: int = Field(ge=1, le=5)
    session_hours: int = Field(ge=0, le=8)
    session_minutes: int = Field(ge=0, le=45)
    days_per_week: int = Field(ge=1, le=7)
    weeks: int = Field(ge=1, le=52)
    success_vision: str


def _build_prompt(req: RoadmapRequest) -> str:
    total_minutes = req.session_hours * 60 + req.session_minutes
    exp_label = (
        "total beginner" if req.experience <= 1
        else "some experience" if req.experience <= 3
        else "expert"
    )
    return f"""You are a learning roadmap designer. Create a personalized learning roadmap as JSON.

User profile:
- Goal: {req.goal}
- Experience level: {req.experience}/5 ({exp_label})
- Daily session time: {total_minutes} minutes
- Days per week: {req.days_per_week}
- Duration: {req.weeks} weeks
- Success vision: {req.success_vision}

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


@router.post("/generate")
async def generate_roadmap(req: RoadmapRequest) -> dict:  # type: ignore[return]
    prompt = _build_prompt(req)

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

    # Strip markdown fences if the model wrapped the JSON anyway
    full_text = full_text.strip()
    full_text = re.sub(r"^```(?:json)?\s*", "", full_text)
    full_text = re.sub(r"\s*```$", "", full_text)
    full_text = full_text.strip()

    try:
        roadmap = json.loads(full_text)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Claude response was not valid JSON: {str(e)}. Raw: {full_text[:200]}",
        )

    return roadmap
