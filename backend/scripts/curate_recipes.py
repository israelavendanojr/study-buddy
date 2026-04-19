"""
Phase 1: Recipe Dataset Curation
Loads RecipeNLG CSV, filters to viable recipes, links to techniques + food science via Claude API.
"""

import ast
import csv
import json
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from scripts.config import (
    ANTHROPIC_MODEL,
    BACKEND_ROOT,
    CURRICULUM_TAXONOMY_PATH,
    get_anthropic_client,
    get_db_engine,
)

# Import Recipe model and Base for table creation
from app.models import Base, Recipe

CSV_PATH = (
    BACKEND_ROOT
    / "app"
    / "rag_resources"
    / "recipe_dataset"
    / "RecipeNLG_dataset.csv"
)
BATCH_SIZE = 10
EQUIPMENT_EXCLUSIONS = [
    "sous vide",
    "molecular",
    "dehydrator",
    "centrifuge",
    "liquid nitrogen",
    "pressure cooker",
    "air fryer",
    "instant pot",
    "thermomix",
    "spiralizer",
    "mandoline",
    "pasta machine",
    "ice cream maker",
]


def load_taxonomy():
    """Load technique and food_science lists from CURRICULUM_TAXONOMY.json."""
    data = json.loads(CURRICULUM_TAXONOMY_PATH.read_text())
    lessons = data["curriculum"]["lessons"]

    techniques = list(
        {l["title"] for l in lessons if l.get("lesson_type") == "technique"}
    )
    food_science = list(
        {l["lesson_key"] for l in lessons if l.get("lesson_type") == "food_science"}
    )

    return techniques, food_science


def load_and_filter_csv(path, limit=None):
    """
    Stream-filter RecipeNLG CSV.
    - Filters: step count 5-15, ingredient count 5-10, no excluded equipment.
    - Returns list of recipe dicts with keys: name, ingredients, steps, source_url.
    """
    recipes = []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    ingredients = ast.literal_eval(row["ingredients"])
                    steps = ast.literal_eval(row["directions"])
                except (ValueError, SyntaxError):
                    continue

                # Filter 1: step count 5-15
                if not (5 <= len(steps) <= 15):
                    continue

                # Filter 2: ingredient count 5-10
                if not (5 <= len(ingredients) <= 10):
                    continue

                # Filter 3: equipment exclusion (check ingredients + steps combined)
                combined_text = " ".join(ingredients + steps).lower()
                if any(eq in combined_text for eq in EQUIPMENT_EXCLUSIONS):
                    continue

                recipes.append(
                    {
                        "name": row["title"].strip(),
                        "ingredients": ingredients,
                        "steps": steps,
                        "source_url": row.get("link", "").strip() or None,
                    }
                )
                if limit and len(recipes) >= limit:
                    break
    except FileNotFoundError:
        print(f"ERROR: CSV file not found at {path}")
        sys.exit(1)

    return recipes


def estimate_difficulty(recipe):
    """
    Estimate difficulty and time from recipe structure (no API).
    difficulty: easy (<=7 steps), medium (8-12 steps), hard (>12 steps)
    estimated_minutes: (ingredient_count * 2) + (step_count * 1.5)
    """
    step_count = len(recipe["steps"])
    ingredient_count = len(recipe["ingredients"])

    if step_count <= 7:
        difficulty = "easy"
    elif step_count <= 12:
        difficulty = "medium"
    else:
        difficulty = "hard"

    estimated_minutes = int((ingredient_count * 2) + (step_count * 1.5))

    return {
        "difficulty": difficulty,
        "estimated_minutes": estimated_minutes,
    }


def build_classification_prompt(batch, techniques, food_science):
    """
    Build a single prompt classifying up to BATCH_SIZE recipes.
    """
    technique_list = ", ".join(techniques)
    food_science_list = ", ".join(food_science)

    recipes_text = "\n".join(
        [
            f"Recipe {i}: {r['name']}\n"
            f"Ingredients: {', '.join(r['ingredients'][:5])}{'...' if len(r['ingredients']) > 5 else ''}\n"
            f"Steps: {' '.join([s[:300] for s in r['steps']])}"
            for i, r in enumerate(batch)
        ]
    )

    prompt = f"""You are a culinary classifier. Respond only with valid JSON.

TECHNIQUES (pick 1-3 that this recipe actively practices):
{technique_list}

FOOD SCIENCE CONCEPTS (pick 0-2 that are clearly demonstrated):
{food_science_list}

RECIPES:
{recipes_text}

Return a JSON array with exactly {len(batch)} objects:
[
  {{
    "index": 0,
    "techniques": ["technique name", ...],
    "primary_technique": "single most relevant technique name or null",
    "food_science": ["concept_key", ...]
  }},
  ...
]

Rules:
- "techniques" values must be exact strings from the TECHNIQUES list above
- "food_science" values must be exact strings from the FOOD SCIENCE list above
- "primary_technique" must be the single best match from "techniques" (or null if none match)
- If no techniques match, return "techniques": []
- Always return arrays (never null)
"""

    return prompt


def classify_batch(batch, techniques, food_science, client):
    """
    Call Claude API to classify a batch of recipes.
    Returns list of dicts (one per recipe) with techniques, primary_technique, food_science.
    On error, returns [None] * len(batch).
    """
    prompt = build_classification_prompt(batch, techniques, food_science)

    try:
        msg = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        return parse_classification(raw, len(batch))
    except Exception as e:
        print(f"  ERROR classifying batch: {e}")
        return [None] * len(batch)


def parse_classification(raw, expected_count):
    """
    Parse JSON response from Claude, stripping markdown fences.
    Returns list of dicts or list of None if parsing fails.
    """
    text = raw.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        results = json.loads(text)
        if not isinstance(results, list) or len(results) != expected_count:
            print(f"  WARNING: Expected {expected_count} results, got {len(results)}")
            return [None] * expected_count
        return results
    except json.JSONDecodeError as e:
        print(f"  ERROR parsing JSON: {e}")
        print(f"  Raw response: {raw[:200]}...")
        return [None] * expected_count


def bulk_insert(recipes, db, chunk_size=500):
    """
    Bulk insert recipes in chunks of chunk_size.
    Returns total count inserted.
    """
    total = 0
    for i in range(0, len(recipes), chunk_size):
        chunk = recipes[i : i + chunk_size]
        rows = [
            Recipe(
                name=r["name"],
                ingredients=r["ingredients"],
                steps=r["steps"],
                techniques=r.get("techniques", []),
                primary_technique=r.get("primary_technique"),
                food_science=r.get("food_science", []),
                difficulty=r.get("difficulty"),
                estimated_minutes=r.get("estimated_minutes"),
                source_url=r.get("source_url"),
                created_at=datetime.now(timezone.utc),
            )
            for r in chunk
        ]
        db.add_all(rows)
        db.commit()
        total += len(rows)
        print(f"  Inserted {total}/{len(recipes)} recipes")

    return total


def print_validation_report(raw_recipes, enriched_recipes, inserted_count, failures):
    """Print final validation report."""
    print("\n" + "=" * 60)
    print("RECIPE CURATION VALIDATION REPORT")
    print("=" * 60)
    print(f"Rows passing filters:        {len(raw_recipes):,}")
    print(f"Classification failures:     {failures} ({failures / max(1, len(raw_recipes)) * 100:.1f}%)")
    print(f"Successfully inserted:       {inserted_count:,}")

    # Difficulty breakdown
    difficulty_counts = Counter(r.get("difficulty") for r in enriched_recipes)
    total = sum(difficulty_counts.values())
    print("\nDIFFICULTY BREAKDOWN:")
    for diff in ["easy", "medium", "hard"]:
        count = difficulty_counts.get(diff, 0)
        pct = (count / total * 100) if total > 0 else 0
        print(f"  {diff:8s}: {count:6,} ({pct:5.1f}%)")

    # Top techniques
    tech_counts = Counter()
    for r in enriched_recipes:
        for t in r.get("techniques", []):
            tech_counts[t] += 1
    print("\nTOP 5 TECHNIQUES:")
    for tech, count in tech_counts.most_common(5):
        print(f"  {tech:40s}: {count:,}")

    # Top food science
    fs_counts = Counter()
    for r in enriched_recipes:
        for fs in r.get("food_science", []):
            fs_counts[fs] += 1
    print("\nTOP 3 FOOD SCIENCE CONCEPTS:")
    for fs, count in fs_counts.most_common(3):
        print(f"  {fs:40s}: {count:,}")

    # Sample recipes
    print("\nSAMPLE RECIPES (first 3):")
    for i, r in enumerate(enriched_recipes[:3], 1):
        print(f"  {i}. {r['name']}")
        print(f"     difficulty={r.get('difficulty')}, minutes={r.get('estimated_minutes')}")
        print(
            f"     techniques={r.get('techniques', [])}"
        )
        print(f"     food_science={r.get('food_science', [])}")

    print("=" * 60 + "\n")


def main():
    """Main orchestration function."""
    # Parse CLI flags
    force = "--force" in sys.argv
    limit = None
    for arg in sys.argv:
        if arg.startswith("--limit="):
            try:
                limit = int(arg.split("=")[1])
            except ValueError:
                print("ERROR: --limit must be an integer")
                sys.exit(1)

    # Load taxonomy
    print("Loading taxonomy...")
    techniques, food_science = load_taxonomy()
    print(f"  Techniques: {len(techniques)}, Food science: {len(food_science)}")

    # Setup DB
    print("Setting up database...")
    engine = get_db_engine()
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Handle --force truncation
    if force:
        print("--force: truncating recipes table...")
        db.execute(text("TRUNCATE TABLE recipes RESTART IDENTITY"))
        db.commit()
    else:
        count = db.query(Recipe).count()
        if count > 0:
            print(
                f"  {count:,} recipes already exist. Use --force to reinsert."
            )
            db.close()
            sys.exit(0)

    # Load + filter CSV
    print(f"\nLoading CSV from {CSV_PATH}...")
    if not CSV_PATH.exists():
        print(f"ERROR: CSV file not found at {CSV_PATH}")
        sys.exit(1)

    raw_recipes = load_and_filter_csv(CSV_PATH, limit=limit)
    print(f"  {len(raw_recipes):,} recipes passed filters")

    if not raw_recipes:
        print("No recipes passed filters. Exiting.")
        db.close()
        sys.exit(0)

    # Apply heuristic difficulty/time (no API)
    print("\nEstimating difficulty and time...")
    for r in raw_recipes:
        r.update(estimate_difficulty(r))

    # Classify in batches of BATCH_SIZE via Claude API
    print(
        f"\nClassifying {len(raw_recipes):,} recipes in batches of {BATCH_SIZE}..."
    )
    enriched = []
    failures = 0
    anthropic_client = get_anthropic_client()

    for i in range(0, len(raw_recipes), BATCH_SIZE):
        batch = raw_recipes[i : i + BATCH_SIZE]
        results = classify_batch(batch, techniques, food_science, anthropic_client)

        for recipe, classification in zip(batch, results):
            if classification is not None:
                recipe["techniques"] = classification.get("techniques", [])
                recipe["primary_technique"] = classification.get(
                    "primary_technique"
                )
                recipe["food_science"] = classification.get("food_science", [])
            else:
                recipe["techniques"] = []
                recipe["primary_technique"] = None
                recipe["food_science"] = []
                failures += 1

            enriched.append(recipe)

        if (i + BATCH_SIZE) % (BATCH_SIZE * 10) == 0 or i + BATCH_SIZE >= len(raw_recipes):
            print(f"  [{i + BATCH_SIZE}/{len(raw_recipes):,}] classified...")

        time.sleep(0.5)  # Rate limit

    # Bulk insert
    print(f"\nInserting {len(enriched):,} recipes...")
    inserted = bulk_insert(enriched, db)

    # Print validation report
    print_validation_report(raw_recipes, enriched, inserted, failures)

    db.close()
    print("Done!")


if __name__ == "__main__":
    main()
