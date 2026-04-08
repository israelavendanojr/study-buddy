from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

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
