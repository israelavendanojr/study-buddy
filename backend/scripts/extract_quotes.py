"""Extract key quotes from kb_chunks using Claude and populate key_quote + quote_page."""
import sys
import pathlib

PROJECT_ROOT = pathlib.Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy.orm import sessionmaker
from backend.app.models import KbChunk
from backend.scripts.config import get_db_engine, get_anthropic_client, ANTHROPIC_MODEL

PROMPT_TEMPLATE = """Extract the single most important 1-2 sentence claim from this passage.

RULES:
- Quote must be EXACT text from the passage (word-for-word)
- Keep it under 30 words
- Must be a complete, standalone sentence
- Focus on actionable or technique claims, not vague statements
- If no strong claim exists, return NONE

PASSAGE:
{chunk_text}

Return ONLY one of:
QUOTE: "exact text here"
QUOTE: NONE"""


def extract_quote(text: str, client) -> str | None:
    """Extract a key quote from chunk text using Claude."""
    if len(text) < 100:
        return None
    try:
        msg = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=100,
            messages=[
                {"role": "user", "content": PROMPT_TEMPLATE.format(chunk_text=text[:800])}
            ],
        )
        result = msg.content[0].text.strip()
        if "QUOTE: NONE" in result:
            return None
        if "QUOTE:" in result:
            return result.split("QUOTE:")[1].strip().strip('"')
        return None
    except Exception as e:
        print(f"  extraction error: {e}")
        return None


def run():
    """Extract quotes from all chunks that don't have them yet."""
    engine = get_db_engine()
    Session = sessionmaker(bind=engine)
    db = Session()
    client = get_anthropic_client()

    chunks = db.query(KbChunk).filter(KbChunk.key_quote.is_(None)).all()
    print(f"Processing {len(chunks)} chunks...")

    for i, chunk in enumerate(chunks):
        if i % 25 == 0 and i > 0:
            print(f"  [{i}/{len(chunks)}]")
            db.commit()
        quote = extract_quote(chunk.text, client)
        if quote:
            chunk.key_quote = quote
            chunk.quote_page = chunk.page_start  # page_start is the PDF page number

    db.commit()
    db.close()
    print("Done.")


if __name__ == "__main__":
    run()
