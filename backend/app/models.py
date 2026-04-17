from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from .database import Base

import enum


class ItemType(str, enum.Enum):
    color = "color"
    accessory = "accessory"
    outfit = "outfit"
    room_decoration = "room_decoration"


class Rarity(str, enum.Enum):
    common = "common"
    uncommon = "uncommon"
    rare = "rare"
    legendary = "legendary"


class FriendshipStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class LessonType(str, enum.Enum):
    technique = "technique"
    recipe = "recipe"
    concept = "concept"


class LessonCache(Base):
    __tablename__ = "lesson_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cache_key: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    lesson_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


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


class CosmeticItem(Base):
    __tablename__ = "cosmetic_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_key: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    item_type: Mapped[ItemType] = mapped_column(Enum(ItemType), nullable=False)
    cost_coins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_gems: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rarity: Mapped[Rarity] = mapped_column(Enum(Rarity), nullable=False, default=Rarity.common)
    unlock_condition: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class CompanionState(Base):
    __tablename__ = "companion_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clerk_user_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mood: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    coins: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    gems: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_practice_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_mood_update: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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


class UserInventory(Base):
    __tablename__ = "user_inventory"
    __table_args__ = (UniqueConstraint("clerk_user_id", "cosmetic_item_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clerk_user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    cosmetic_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("cosmetic_items.id"), nullable=False)
    owned_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    is_equipped: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class CompanionEquipped(Base):
    __tablename__ = "companion_equipped"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clerk_user_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    equipped_color_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cosmetic_items.id"), nullable=True)
    equipped_outfit_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cosmetic_items.id"), nullable=True)
    equipped_accessories: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    equipped_room_decorations: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clerk_user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    photo_url: Mapped[str] = mapped_column(String, nullable=False)
    caption: Mapped[str | None] = mapped_column(String, nullable=True)
    lesson_key: Mapped[str | None] = mapped_column(String, nullable=True)
    lesson_title: Mapped[str | None] = mapped_column(String, nullable=True)
    chapter_title: Mapped[str | None] = mapped_column(String, nullable=True)
    domain: Mapped[str | None] = mapped_column(String, nullable=True)
    companion_color_key: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("post_id", "clerk_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    clerk_user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class PostComment(Base):
    __tablename__ = "post_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    clerk_user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    companion_color_key: Mapped[str | None] = mapped_column(String, nullable=True)
    body: Mapped[str] = mapped_column(String(300), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("requester_id", "addressee_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    addressee_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    status: Mapped[FriendshipStatus] = mapped_column(
        Enum(FriendshipStatus), nullable=False, default=FriendshipStatus.pending
    )
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
