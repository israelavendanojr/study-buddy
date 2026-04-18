from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from .database import Base

import enum


class LessonType(str, enum.Enum):
    technique = "technique"
    recipe = "recipe"
    concept = "concept"
    food_science = "food_science"
    minigame = "minigame"


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    license: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    topics: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class KbChunk(Base):
    __tablename__ = "kb_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("sources.source_id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding: Mapped[list | None] = mapped_column(Vector(1536), nullable=True)
    key_quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    quote_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    __table_args__ = (UniqueConstraint("source_id", "chunk_index"),)


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lesson_key: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    chapter_title: Mapped[str] = mapped_column(String, nullable=False)
    domain: Mapped[str] = mapped_column(String, nullable=False)
    lesson_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    lesson_type: Mapped[str | None] = mapped_column(String, nullable=True)  # technique|recipe|concept
    skill_tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    sources_cited: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class UserLessonProgress(Base):
    __tablename__ = "user_lesson_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clerk_user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    lesson_key: Mapped[str] = mapped_column(String, nullable=False, index=True)
    completed_missions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    completed_activities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_required_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_fully_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    first_required_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reflection_feedback: Mapped[str | None] = mapped_column(String, nullable=True)
    last_visited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class UserRoadmap(Base):
    __tablename__ = "user_roadmaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clerk_user_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    roadmap_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    active_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


