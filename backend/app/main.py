from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .routers import onboarding, roadmap, lesson, companion, cosmetics
from .routers import social, friends
from . import models  # noqa: F401 — registers all models with Base.metadata

UPLOAD_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StudBud API")

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
app.include_router(companion.router, prefix="/companion")
app.include_router(cosmetics.router, prefix="/cosmetics")
app.include_router(social.router, prefix="/social")
app.include_router(friends.router, prefix="/friends")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "message": "hello from StudBud"}
