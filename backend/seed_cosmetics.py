"""
Seed script for cosmetic_items table.

Usage (from backend/ with venv active):
    python seed_cosmetics.py

Safe to re-run — skips items whose item_key already exists.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models import CosmeticItem, ItemType, Rarity

ITEMS = [
    # ── Colors ────────────────────────────────────────────────────────────────
    # item_key must match the keys in COLOR_MAP in CompanionShopScreen.tsx
    dict(
        item_key="mint_color",
        name="Mint",
        description="The classic starter look.",
        item_type=ItemType.color,
        cost_coins=0,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="peach_color",
        name="Peach",
        description="Warm and welcoming.",
        item_type=ItemType.color,
        cost_coins=100,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="sky_color",
        name="Sky Blue",
        description="Cool and focused.",
        item_type=ItemType.color,
        cost_coins=100,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="golden_color",
        name="Golden",
        description="For when you're feeling shiny.",
        item_type=ItemType.color,
        cost_coins=150,
        cost_gems=0,
        rarity=Rarity.uncommon,
    ),
    dict(
        item_key="lavender_color",
        name="Lavender",
        description="Calm and creative.",
        item_type=ItemType.color,
        cost_coins=200,
        cost_gems=0,
        rarity=Rarity.uncommon,
    ),
    dict(
        item_key="coral_color",
        name="Coral",
        description="Bold and expressive.",
        item_type=ItemType.color,
        cost_coins=200,
        cost_gems=0,
        rarity=Rarity.uncommon,
    ),
    dict(
        item_key="sage_color",
        name="Sage Green",
        description="Earthy and grounded.",
        item_type=ItemType.color,
        cost_coins=150,
        cost_gems=0,
        rarity=Rarity.uncommon,
    ),
    dict(
        item_key="rose_color",
        name="Rose Pink",
        description="Sweet and spirited.",
        item_type=ItemType.color,
        cost_coins=250,
        cost_gems=0,
        rarity=Rarity.rare,
    ),

    # ── Outfits ───────────────────────────────────────────────────────────────
    dict(
        item_key="chef_apron",
        name="Chef's Apron",
        description="A classic kitchen apron — ready to cook.",
        item_type=ItemType.outfit,
        cost_coins=300,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="scholar_robe",
        name="Scholar's Robe",
        description="For the studious type who means business.",
        item_type=ItemType.outfit,
        cost_coins=500,
        cost_gems=0,
        rarity=Rarity.uncommon,
    ),
    dict(
        item_key="explorer_jacket",
        name="Explorer Jacket",
        description="Adventure awaits. Pockets included.",
        item_type=ItemType.outfit,
        cost_coins=800,
        cost_gems=0,
        rarity=Rarity.rare,
    ),
    dict(
        item_key="master_chef_coat",
        name="Master Chef Coat",
        description="Earned by those who never stop learning.",
        item_type=ItemType.outfit,
        cost_coins=0,
        cost_gems=0,
        rarity=Rarity.legendary,
        unlock_condition="Reach level 25",
    ),

    # ── Accessories ───────────────────────────────────────────────────────────
    dict(
        item_key="reading_glasses",
        name="Reading Glasses",
        description="See the recipe more clearly.",
        item_type=ItemType.accessory,
        cost_coins=200,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="study_headband",
        name="Study Headband",
        description="Keep focus. Keep hair back.",
        item_type=ItemType.accessory,
        cost_coins=250,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="cozy_scarf",
        name="Cozy Scarf",
        description="For late-night study sessions.",
        item_type=ItemType.accessory,
        cost_coins=350,
        cost_gems=0,
        rarity=Rarity.uncommon,
    ),
    dict(
        item_key="chef_hat",
        name="Chef's Hat",
        description="The toque. The legend.",
        item_type=ItemType.accessory,
        cost_coins=600,
        cost_gems=0,
        rarity=Rarity.rare,
    ),

    # ── Room Decorations ──────────────────────────────────────────────────────
    dict(
        item_key="cozy_bookshelf",
        name="Cozy Bookshelf",
        description="Fill it with cookbooks.",
        item_type=ItemType.room_decoration,
        cost_coins=400,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="potted_plant",
        name="Potted Plant",
        description="A little green goes a long way.",
        item_type=ItemType.room_decoration,
        cost_coins=200,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="desk_lamp",
        name="Desk Lamp",
        description="Good lighting, good vibes.",
        item_type=ItemType.room_decoration,
        cost_coins=300,
        cost_gems=0,
        rarity=Rarity.common,
    ),
    dict(
        item_key="recipe_board",
        name="Recipe Board",
        description="Pin your favourite lessons.",
        item_type=ItemType.room_decoration,
        cost_coins=500,
        cost_gems=0,
        rarity=Rarity.uncommon,
    ),
]


def seed():
    db = SessionLocal()
    inserted = 0
    skipped = 0
    try:
        existing_keys = {row.item_key for row in db.query(CosmeticItem.item_key).all()}
        for data in ITEMS:
            if data["item_key"] in existing_keys:
                skipped += 1
                continue
            db.add(CosmeticItem(**data))
            inserted += 1
        db.commit()
        print(f"Done — inserted {inserted}, skipped {skipped} (already existed)")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
