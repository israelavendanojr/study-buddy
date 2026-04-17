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
            "lesson_type": "technique",
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
            "SELECT text, source_id, page_start "
            "FROM kb_chunks "
            "ORDER BY embedding <=> CAST(:emb AS vector) "
            "LIMIT :k"
        ), {"emb": str(embedding), "k": RAG_TOP_K})
        return [{"text": r.text, "source_id": r.source_id, "page_start": r.page_start} for r in result]
    except Exception as e:
        print(f"    [rag] vector search failed: {e}")
        return []


def build_lesson_prompt(lesson_entry: dict, chunks: list) -> str:
    """Build Claude prompt for lesson generation."""
    exp_label = "beginner (2/5)"
    goal = "become a confident home cook"
    completed_block = "This is one of their first lessons."

    rag_block = ""
    if chunks:
        parts = []
        for c in chunks:
            parts.append(f"[Source: {c['source_id']}]\n{c['text'][:1000]}")
        rag_block = "Reference material from culinary textbooks:\n\n" + "\n\n---\n\n".join(parts) + "\n\n"

    return f"""{rag_block}Generate a structured lesson for a learning app. Return ONLY valid JSON — no markdown, no explanation.

Lesson context:
- Lesson title: {lesson_entry['lesson_title']}
- Chapter: {lesson_entry['chapter_title']}
- Goal: {goal}
- Experience: 2/5 ({exp_label})
- {completed_block}

Return JSON matching this exact schema:

{{
  "card1": {{
    "motivation": "One verb-first sentence — why THIS skill matters for THIS goal (e.g. 'Master the 3-min sear that turns flat chicken into restaurant-quality browning')",
    "learn_points": ["Specific skill point 1 — what they'll be able to do (≤12 words)", "Point 2", "Point 3"]
  }},
  "card3": {{
    "headline": "The single most important insight in 1 sentence",
    "points": ["Key point 1 — short and direct", "Key point 2", "Key point 3"],
    "tell_me_more": "2-3 sentences deepening the concept, revealed on tap"
  }},
  "missions": [
    {{
      "id": "mission_1",
      "mission_type": "photo_submission",
      "title": "Short mission title",
      "description": "1-2 sentences max: the specific thing the learner will do",
      "why_it_matters": "1 sentence: why this task builds the skill",
      "is_required": true,
      "duration_minutes": 10,
      "prompt": "A specific question about what they made or discovered — NOT generic",
      "reflection_choices": ["Option 1 specific to this skill", "Option 2", "Option 3", "Option 4"]
    }},
    {{
      "id": "mission_2",
      "mission_type": "photo_submission",
      "title": "Second mission title",
      "description": "1-2 sentences max",
      "why_it_matters": "1 sentence",
      "is_required": false,
      "duration_minutes": 15,
      "prompt": "Specific question about mission 2",
      "reflection_choices": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }}
  ]
}}

Rules:
- Generate 2-4 missions total. Must include at least 1-2 required missions
- Each mission must include mission_type field set to "photo_submission"
- reflection_choices must be exactly 3-4 options
- Return ONLY the JSON object"""


def parse_lesson_json(raw_text: str, lesson_key: str) -> dict | None:
    """Parse lesson JSON from Claude response."""
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
        # Validate structure
        if "card1" not in lesson_data or "card3" not in lesson_data or "missions" not in lesson_data:
            print(f"    Missing required keys in JSON")
            return None
        return lesson_data
    except json.JSONDecodeError as e:
        print(f"    JSON parse error: {e}")
        return None


def store_lesson(lesson_entry: dict, lesson_data: dict, chunks: list, db) -> None:
    """Upsert lesson in database."""
    sources_cited = list({c["source_id"] for c in chunks}) if chunks else None

    existing = db.query(Lesson).filter(Lesson.lesson_key == lesson_entry["lesson_key"]).first()
    if existing:
        existing.lesson_json = lesson_data
        existing.sources_cited = sources_cited
        existing.generated_at = datetime.now(timezone.utc)
    else:
        row = Lesson(
            lesson_key=lesson_entry["lesson_key"],
            title=lesson_entry["lesson_title"],
            chapter_title=lesson_entry["chapter_title"],
            domain=lesson_entry["domain"],
            lesson_json=lesson_data,
            lesson_type=lesson_entry.get("lesson_type"),
            skill_tags=lesson_entry.get("skill_tags"),
            sources_cited=sources_cited,
            generated_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
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
            message = anthropic_client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=2048,
                system=PEPPER_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw_text = message.content[0].text
        except Exception as e:
            print(f"  ERROR: Claude API failed: {e}")
            failed += 1
            continue

        # Parse JSON
        lesson_data = parse_lesson_json(raw_text, lesson_key)
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
