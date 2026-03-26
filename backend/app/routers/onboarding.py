from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class OnboardingInput(BaseModel):
    goal: str
    buddy_name: str
    experience: int = Field(ge=1, le=5)
    session_hours: int = Field(ge=0, le=8)
    session_minutes: int = Field(ge=0, le=45)
    days_per_week: int = Field(ge=1, le=7)
    weeks: int = Field(ge=1, le=52)
    success_vision: str


@router.post("/submit")
def submit_onboarding(input: OnboardingInput):
    exp_label = (
        "total beginner" if input.experience <= 1
        else "some experience" if input.experience <= 3
        else "pretty confident"
    )
    total_min = input.session_hours * 60 + input.session_minutes
    if input.session_hours > 0 and input.session_minutes > 0:
        time_label = f"{input.session_hours}h {input.session_minutes}m"
    elif input.session_hours > 0:
        time_label = f"{input.session_hours} hour{'s' if input.session_hours != 1 else ''}"
    else:
        time_label = f"{input.session_minutes} minutes"

    return {
        "status": "received",
        "user_id": "dev-user-1",
        "message": (
            f"In {input.weeks} weeks, you'll go from {exp_label} "
            f"to {input.success_vision}, "
            f"practicing {input.days_per_week}x per week "
            f"for {time_label}."
        ),
    }
