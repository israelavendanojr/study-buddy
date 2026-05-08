from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .routers import onboarding, roadmap, lesson, mission, profile
from . import models  # noqa: F401 — registers all models with Base.metadata

Base.metadata.create_all(bind=engine)

# Add new columns to existing tables if they don't exist (safe no-op if already present)
with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE user_roadmaps ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0"
    ))
    conn.execute(text(
        "ALTER TABLE user_roadmaps ADD COLUMN IF NOT EXISTS last_active_date DATE"
    ))
    conn.execute(text(
        "ALTER TABLE user_lesson_progress ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0"
    ))
    conn.commit()

app = FastAPI(title="GarlicMonkey API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:19000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding.router, prefix="/onboarding")
app.include_router(roadmap.router, prefix="/roadmap")
app.include_router(lesson.router, prefix="/lesson")
app.include_router(mission.router, prefix="/mission")
app.include_router(profile.router, prefix="/profile")


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "message": "hello from GarlicMonkey"}
