"""Generate ~150 lessons from curriculum taxonomy using RAG."""
import json
import pathlib
import sys
from datetime import datetime, timezone

# Add project root to path
PROJECT_ROOT = pathlib.Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import text as sql_text

from backend.app.models import Lesson, KbChunk
from backend.app.services.lesson_prompt_builder import (
    build_activity_prompt,
    build_technique_lesson_prompt,
    build_food_science_lesson_prompt,
    build_recipe_lesson_prompt,
)
from backend.scripts.config import (
    CURRICULUM_TAXONOMY_PATH,
    ANTHROPIC_MODEL,
    RAG_TOP_K,
    PEPPER_SYSTEM,
    get_db_engine,
    get_anthropic_client,
    get_openai_client,
)


def load_taxonomy() -> list:
    """Load lesson taxonomy from CURRICULUM_TAXONOMY.json."""
    try:
        data = json.loads(CURRICULUM_TAXONOMY_PATH.read_text())
    except FileNotFoundError:
        print(f"ERROR: CURRICULUM_TAXONOMY.json not found at {CURRICULUM_TAXONOMY_PATH}")
        print("Please provide this file before running lesson generation.")
        sys.exit(1)

    # Extract lessons from curriculum.lessons
    lessons = []
    curriculum = data.get("curriculum", {})
    for lesson in curriculum.get("lessons", []):
        lessons.append({
            "lesson_key": lesson.get("lesson_key", ""),
            "lesson_title": lesson.get("title", ""),
            "chapter_title": lesson.get("chapter", ""),
            "domain": "cooking",
            "lesson_type": lesson.get("lesson_type", "concept"),  # Read from taxonomy
            "skill_tags": lesson.get("topic", "").split(", ") if lesson.get("topic") else [],
            "rag_query": lesson.get("rag_query", ""),  # Use provided query if available
        })
    return lessons


def embed_query(text: str, openai_client) -> list:
    """Embed a query string."""
    resp = openai_client.embeddings.create(model="text-embedding-3-small", input=[text])
    return resp.data[0].embedding


def retrieve_rag_chunks(lesson_title: str, chapter_title: str, domain: str, db, openai_client) -> list:
    """Retrieve top-k RAG chunks via pgvector similarity."""
    query = f"{chapter_title}: {lesson_title}"

    try:
        embedding = embed_query(query, openai_client)
    except Exception as e:
        print(f"    [rag] embedding failed: {e}")
        return []

    try:
        # pgvector cosine distance search
        result = db.execute(sql_text(
            "SELECT text, source_id, page_start, key_quote, quote_page "
            "FROM kb_chunks "
            "ORDER BY embedding <=> CAST(:emb AS vector) "
            "LIMIT :k"
        ), {"emb": str(embedding), "k": RAG_TOP_K})
        return [{"text": r.text, "source_id": r.source_id, "page_start": r.page_start, "key_quote": r.key_quote, "quote_page": r.quote_page} for r in result]
    except Exception as e:
        print(f"    [rag] vector search failed: {e}")
        return []


def build_lesson_prompt(lesson_entry: dict, chunks: list) -> str:
    """Build type-aware Claude prompt for lesson generation, routing to specialized builders."""
    lesson_type = lesson_entry.get("lesson_type", "concept")
    common_args = {
        "lesson_title": lesson_entry["lesson_title"],
        "chapter_title": lesson_entry["chapter_title"],
        "goal": "become a confident home cook",
        "experience": 2,  # Assume beginner for bulk generation
        "chunks": chunks,
    }

    if lesson_type == "technique":
        return build_technique_lesson_prompt(
            completed_lesson_titles=[],
            **common_args,
        )
    elif lesson_type == "food_science":
        return build_food_science_lesson_prompt(
            completed_lesson_titles=[],
            **common_args,
        )
    elif lesson_type == "recipe":
        # Batch script has no DB access for recipe lookup, pass None
        return build_recipe_lesson_prompt(
            recipe_json=None,
            techniques_to_teach=[],
            food_science_to_reinforce=[],
            **common_args,
        )
    else:  # concept, minigame, or unknown
        return build_activity_prompt(
            lesson_type=lesson_type,
            completed_lesson_titles=[],
            **common_args,
        )


def parse_lesson_json(raw_text: str, lesson_key: str, lesson_type: str = "concept") -> dict | None:
    """Parse lesson JSON from Claude response, with type-aware validation."""
    # Strip markdown fences
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        lesson_data = json.loads(text)

        # Type-aware validation
        if lesson_type == "recipe":
            # Recipe lessons must have ingredient_list and steps, NO card3/activities
            if "card1" not in lesson_data:
                print(f"    Recipe lesson missing card1")
                return None
            if "ingredient_list" not in lesson_data or not lesson_data.get("ingredient_list"):
                print(f"    Recipe lesson missing ingredient_list")
                return None
            if "steps" not in lesson_data or not lesson_data.get("steps"):
                print(f"    Recipe lesson missing steps")
                return None
            return lesson_data
        else:
            # Non-recipe lessons must have card1, card3, and activities (not missions)
            if "card1" not in lesson_data or "card3" not in lesson_data:
                print(f"    Missing required keys (card1/card3) in JSON")
                return None
            if "activities" not in lesson_data:
                # Old missions format or malformed
                if "missions" not in lesson_data:
                    print(f"    Missing activities array")
                    return None
            return lesson_data
    except json.JSONDecodeError as e:
        print(f"    JSON parse error: {e}")
        return None


def store_lesson(lesson_entry: dict, lesson_data: dict, chunks: list, db) -> None:
    """Upsert lesson in database, populating recipe columns when applicable."""
    sources_cited = list({c["source_id"] for c in chunks}) if chunks else None
    lesson_type = lesson_entry.get("lesson_type")

    now = datetime.now(timezone.utc)
    recipe_columns = {}
    if lesson_type == "recipe":
        recipe_columns = {
            "ingredient_list": lesson_data.get("ingredient_list"),
            "steps": lesson_data.get("steps"),
            "final_photo_prompt": lesson_data.get("final_photo_prompt"),
            "reflection_prompt": lesson_data.get("reflection_prompt"),
        }

    existing = db.query(Lesson).filter(Lesson.lesson_key == lesson_entry["lesson_key"]).first()
    if existing:
        existing.lesson_json = lesson_data
        existing.lesson_type = lesson_type
        existing.sources_cited = sources_cited
        existing.generated_at = now
        existing.updated_at = now
        for col, val in recipe_columns.items():
            setattr(existing, col, val)
    else:
        row = Lesson(
            lesson_key=lesson_entry["lesson_key"],
            title=lesson_entry["lesson_title"],
            chapter_title=lesson_entry["chapter_title"],
            domain=lesson_entry["domain"],
            lesson_json=lesson_data,
            lesson_type=lesson_type,
            skill_tags=lesson_entry.get("skill_tags"),
            sources_cited=sources_cited,
            generated_at=now,
            created_at=now,
            updated_at=now,
            **recipe_columns,
        )
        db.add(row)
    db.commit()


def main():
    print("Loading curriculum taxonomy...")
    lessons = load_taxonomy()
    print(f"  Found {len(lessons)} lessons")

    engine = get_db_engine()
    Session = sessionmaker(bind=engine)
    db = Session()
    anthropic_client = get_anthropic_client()
    openai_client = get_openai_client()

    force = "--force" in sys.argv
    success, skipped, failed = 0, 0, 0

    for i, lesson_entry in enumerate(lessons):
        lesson_key = lesson_entry["lesson_key"]
        print(f"\n[{i+1}/{len(lessons)}] {lesson_key}")

        # Skip already-generated unless --force
        if not force:
            existing = db.query(Lesson).filter(Lesson.lesson_key == lesson_key).first()
            if existing and existing.generated_at is not None:
                print(f"  SKIP (already generated)")
                skipped += 1
                continue

        # Retrieve RAG chunks
        chunks = retrieve_rag_chunks(
            lesson_entry["lesson_title"],
            lesson_entry["chapter_title"],
            lesson_entry["domain"],
            db,
            openai_client,
        )
        print(f"  Retrieved {len(chunks)} RAG chunks")

        # Build prompt
        prompt = build_lesson_prompt(lesson_entry, chunks)

        # Generate with Claude
        try:
            max_tokens = 4096 if lesson_entry.get("lesson_type") == "recipe" else 2048
            message = anthropic_client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=max_tokens,
                system=PEPPER_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw_text = message.content[0].text
        except Exception as e:
            print(f"  ERROR: Claude API failed: {e}")
            failed += 1
            continue

        # Parse JSON
        lesson_data = parse_lesson_json(raw_text, lesson_key, lesson_type=lesson_entry.get("lesson_type", "concept"))
        if lesson_data is None:
            print(f"  ERROR: JSON parse failed")
            failed += 1
            continue

        # Store in DB
        store_lesson(lesson_entry, lesson_data, chunks, db)
        success += 1
        print(f"  ✓ Generated and cached")

    db.close()
    print(f"\n{'='*60}")
    print(f"Summary: {success} success, {skipped} skipped, {failed} failed")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
