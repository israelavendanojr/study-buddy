import os
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UserMission, UserRoadmap

router = APIRouter()

VISION_MODEL = "claude-sonnet-4-6"
XP_PER_MISSION = 50

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


class MissionSubmitRequest(BaseModel):
    user_id: str
    photo_base64: str
    photo_media_type: str = "image/jpeg"
    notes: str | None = None


def _get_grading_mode(user_id: str, db: Session) -> str:
    roadmap = db.query(UserRoadmap).filter(UserRoadmap.clerk_user_id == user_id).first()
    if not roadmap:
        return "balanced"
    return roadmap.roadmap_json.get("_meta", {}).get("grading_mode", "balanced")


def _update_streak(user_id: str, db: Session) -> int:
    """Update streak_days and last_active_date on UserRoadmap. Returns updated streak count."""
    from datetime import date
    roadmap = db.query(UserRoadmap).filter(UserRoadmap.clerk_user_id == user_id).first()
    if not roadmap:
        return 0

    today = date.today()
    last = roadmap.last_active_date

    if last is None or (today - last).days > 1:
        roadmap.streak_days = 1
    elif (today - last).days == 1:
        roadmap.streak_days = (roadmap.streak_days or 0) + 1
    # same day: no change

    roadmap.last_active_date = today
    db.commit()
    return roadmap.streak_days


@router.get("/")
async def list_missions(user_id: str, db: Session = Depends(get_db)) -> list[dict]:
    """List all missions for a user, ordered newest first."""
    missions = (
        db.query(UserMission)
        .filter(UserMission.clerk_user_id == user_id)
        .order_by(UserMission.created_at.desc())
        .all()
    )
    return [
        {
            "id": m.id,
            "lesson_key": m.lesson_key,
            "lesson_title": m.lesson_title,
            "title": m.title,
            "description": m.description,
            "tips": m.tips or [],
            "status": m.status,
            "feedback": m.feedback_json,
            "xp_awarded": m.xp_awarded,
            "created_at": m.created_at.isoformat(),
            "submitted_at": m.submitted_at.isoformat() if m.submitted_at else None,
        }
        for m in missions
    ]


@router.post("/{mission_id}/submit")
async def submit_mission(
    mission_id: int,
    req: MissionSubmitRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Accept photo + notes, grade with Claude vision, return feedback."""
    mission = db.query(UserMission).filter(
        UserMission.id == mission_id,
        UserMission.clerk_user_id == req.user_id,
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    if mission.status == "graded":
        return {
            "feedback": mission.feedback_json,
            "xp_earned": mission.xp_awarded,
            "already_graded": True,
        }

    grading_mode = _get_grading_mode(req.user_id, db)
    grading_instructions = {
        "encouraging": "Be generous. Give 4-5 stars if there's any sign of genuine effort. Celebrate what went right.",
        "strict": "Hold a high bar. 2-3 stars unless execution is genuinely strong. Be honest about what's missing.",
        "balanced": "Be honest but fair. 3-4 stars for solid work. Acknowledge both what worked and what didn't.",
    }.get(grading_mode, "Be honest but fair.")

    tips_text = ""
    if mission.tips:
        tips_text = "\nKey technique tips for this mission:\n" + "\n".join(f"- {t}" for t in mission.tips)

    notes_text = f"\nUser's notes: {req.notes}" if req.notes else ""

    prompt = (
        f"Mission: {mission.title}\n"
        f"Description: {mission.description}"
        f"{tips_text}"
        f"{notes_text}\n\n"
        f"Grading mode: {grading_instructions}\n\n"
        f"Look at this photo submission. Grade it on these criteria:\n"
        f"1. Technique execution — did they apply the core skill correctly?\n"
        f"2. Visual result — does the food look right?\n"
        f"3. Attention to detail — mise en place, cleanliness, presentation\n\n"
        f"Return ONLY valid JSON:\n"
        f'{{\n'
        f'  "overall_stars": <1-5 integer>,\n'
        f'  "criteria": [\n'
        f'    {{"label": "Technique", "stars": <1-5>}},\n'
        f'    {{"label": "Visual result", "stars": <1-5>}},\n'
        f'    {{"label": "Attention to detail", "stars": <1-5>}}\n'
        f'  ],\n'
        f'  "comment": "<2-3 sentences from Pepper — specific to what you see, not generic>"\n'
        f'}}'
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
        import json, re
        raw = message.content[0].text.strip()
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON in response")
        feedback = json.loads(json_match.group())
    except Exception as e:
        print(f"[mission] grading error: {e}")
        feedback = {
            "overall_stars": 3,
            "criteria": [
                {"label": "Technique", "stars": 3},
                {"label": "Visual result", "stars": 3},
                {"label": "Attention to detail", "stars": 3},
            ],
            "comment": "Couldn't fully grade the photo, but the effort is clear. Keep pushing.",
        }

    mission.status = "graded"
    mission.notes = req.notes
    mission.feedback_json = feedback
    mission.xp_awarded = XP_PER_MISSION
    mission.submitted_at = datetime.now(timezone.utc)
    mission.graded_at = datetime.now(timezone.utc)
    db.commit()

    _update_streak(req.user_id, db)

    return {
        "feedback": feedback,
        "xp_earned": XP_PER_MISSION,
        "already_graded": False,
    }
