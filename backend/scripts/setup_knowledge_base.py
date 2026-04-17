"""Ingest 7 PDF textbooks into PostgreSQL with pgvector embeddings."""
import json
import pathlib
import sys
import time
from datetime import datetime, timezone

# Add project root to path
PROJECT_ROOT = pathlib.Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import tiktoken
from pypdf import PdfReader
from sqlalchemy.orm import Session, sessionmaker

from backend.app.models import Source, KbChunk
from backend.scripts.config import (
    RAG_RESOURCES_DIR,
    DATABASE_URL,
    CHUNK_TOKENS,
    CHUNK_OVERLAP,
    EMBEDDING_MODEL,
    EMBEDDING_BATCH_SIZE,
    get_db_engine,
    get_openai_client,
)


def load_citations() -> dict:
    """Load source metadata from citations.JSON."""
    citations_path = RAG_RESOURCES_DIR / "citations.JSON"
    try:
        return json.loads(citations_path.read_text())
    except FileNotFoundError:
        print(f"ERROR: citations.JSON not found at {citations_path}")
        sys.exit(1)


def upsert_sources(citations: dict, db: Session) -> None:
    """Insert or update sources table rows from citations dict."""
    for source_id, data in citations.items():
        existing = db.query(Source).filter(Source.source_id == source_id).first()
        if existing:
            existing.title = data.get("title", "")
            existing.author = data.get("author")
            existing.url = data.get("url")
            existing.license = data.get("license")
            existing.description = data.get("description")
            existing.topics = data.get("topics")
        else:
            row = Source(
                source_id=source_id,
                title=data.get("title", ""),
                author=data.get("author"),
                url=data.get("url"),
                license=data.get("license"),
                description=data.get("description"),
                topics=data.get("topics"),
                created_at=datetime.now(timezone.utc),
            )
            db.add(row)
    db.commit()


def _match_pdfs_to_sources(citations: dict) -> dict:
    """Match PDF files to source_ids using fuzzy title matching."""
    pdf_files = list(RAG_RESOURCES_DIR.glob("*.pdf"))
    source_to_pdf = {}

    for source_id, metadata in citations.items():
        title = metadata.get("title", "").lower()
        matched_pdf = None

        for pdf_file in pdf_files:
            pdf_name_lower = pdf_file.stem.lower()
            # Check if the PDF filename contains most of the key words from the title
            title_words = [w for w in title.split() if len(w) > 3]
            # Count how many title words appear in the PDF filename
            matches = [w for w in title_words if w in pdf_name_lower]
            if len(matches) >= len(title_words) - 1:  # At least N-1 words match
                matched_pdf = pdf_file
                break

        if matched_pdf:
            source_to_pdf[source_id] = matched_pdf
            print(f"  Matched {source_id} -> {matched_pdf.name}")
        else:
            print(f"  WARNING: No PDF found for {source_id}")

    return source_to_pdf


def extract_text_from_pdf(pdf_path: pathlib.Path) -> list:
    """Extract text from PDF, returning list of (page_num, text) tuples."""
    reader = PdfReader(pdf_path)
    pages = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        # Filter out nearly-empty pages
        if text and len(text.strip()) > 100:
            # Fix common ligatures
            text = text.replace("\ufb01", "fi").replace("\ufb02", "fl")
            pages.append((page_num, text))

    return pages


def chunk_text(pages: list, source_id: str) -> list:
    """Split pages into overlapping chunks using tiktoken."""
    encoding = tiktoken.get_encoding("cl100k_base")
    chunks = []
    chunk_index = 0

    # Concatenate all pages with page breaks
    full_text = "\n\n--- PAGE BREAK ---\n\n".join([text for _, text in pages])
    tokens = encoding.encode(full_text)

    # Sliding window
    start_idx = 0
    while start_idx < len(tokens):
        end_idx = min(start_idx + CHUNK_TOKENS, len(tokens))
        chunk_tokens = tokens[start_idx:end_idx]
        chunk_text = encoding.decode(chunk_tokens)

        # Find the page where this chunk starts
        page_start = 0
        chars_so_far = 0
        for page_num, page_text in pages:
            if chars_so_far + len(page_text) > sum(len(pt) for _, pt in pages[:page_num]):
                page_start = page_num
                break

        chunks.append({
            "source_id": source_id,
            "chunk_index": chunk_index,
            "page_start": page_start,
            "text": chunk_text,
            "token_count": len(chunk_tokens),
        })
        chunk_index += 1

        # Step forward by (chunk_size - overlap)
        step = max(1, CHUNK_TOKENS - CHUNK_OVERLAP)
        start_idx += step

    return chunks


def embed_chunks(chunks: list, openai_client) -> list:
    """Add embeddings to chunks by calling OpenAI API."""
    for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
        batch = chunks[i : i + EMBEDDING_BATCH_SIZE]
        texts = [c["text"] for c in batch]

        try:
            resp = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
            for j, c in enumerate(batch):
                c["embedding"] = resp.data[j].embedding
            print(f"  Embedded {i + len(batch)}/{len(chunks)} chunks")
        except Exception as e:
            print(f"  ERROR embedding batch {i}: {e}")
            # Sleep and retry on rate limit
            if "rate_limit" in str(e).lower():
                time.sleep(1)
                continue
            raise

        time.sleep(1)  # Rate limit courtesy

    return chunks


def upsert_chunks(chunks: list, db: Session) -> int:
    """Insert or update chunks in the database."""
    count = 0
    for chunk in chunks:
        existing = db.query(KbChunk).filter(
            KbChunk.source_id == chunk["source_id"],
            KbChunk.chunk_index == chunk["chunk_index"],
        ).first()

        if existing:
            # Only update if text changed
            if existing.text != chunk["text"]:
                existing.text = chunk["text"]
                existing.token_count = chunk.get("token_count")
                existing.embedding = chunk.get("embedding")
                count += 1
        else:
            row = KbChunk(
                source_id=chunk["source_id"],
                chunk_index=chunk["chunk_index"],
                page_start=chunk.get("page_start"),
                text=chunk["text"],
                token_count=chunk.get("token_count"),
                embedding=chunk.get("embedding"),
                created_at=datetime.now(timezone.utc),
            )
            db.add(row)
            count += 1

    db.commit()
    return count


def build_ivfflat_index(engine) -> None:
    """Create IVFFlat index on embeddings (run after ingestion)."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx ON kb_chunks "
                "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
            ))
            conn.commit()
            print("Created IVFFlat index on kb_chunks.embedding")
    except Exception as e:
        print(f"WARNING: Could not create IVFFlat index: {e}")


def main():
    print("Loading citations...")
    citations = load_citations()
    print(f"  Found {len(citations)} sources")

    engine = get_db_engine()
    Session = sessionmaker(bind=engine)
    db = Session()

    print("\nUpserting sources...")
    upsert_sources(citations, db)

    print("\nMatching PDFs to sources...")
    source_to_pdf = _match_pdfs_to_sources(citations)

    print("\nIngesting PDFs...")
    total_chunks = 0
    for source_id, pdf_path in source_to_pdf.items():
        print(f"\nProcessing {pdf_path.name}...")

        # Skip if already ingested
        existing_count = db.query(KbChunk).filter(KbChunk.source_id == source_id).count()
        if existing_count > 0:
            print(f"  SKIP (already {existing_count} chunks in DB)")
            continue

        pages = extract_text_from_pdf(pdf_path)
        print(f"  Extracted {len(pages)} pages")

        chunks = chunk_text(pages, source_id)
        print(f"  Split into {len(chunks)} chunks")

        chunks = embed_chunks(chunks, get_openai_client())
        print(f"  Embedded chunks")

        n = upsert_chunks(chunks, db)
        total_chunks += n
        print(f"  Upserted {n} chunks")

    print(f"\n✓ Total chunks ingested: {total_chunks}")

    print("\nBuilding IVFFlat index...")
    build_ivfflat_index(engine)

    db.close()
    print("Done!")


if __name__ == "__main__":
    main()
