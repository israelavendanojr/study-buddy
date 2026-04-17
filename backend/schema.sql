-- RAG Pipeline Schema
-- Run this BEFORE app restart (Base.metadata.create_all needs vector extension)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS sources (
    id          SERIAL PRIMARY KEY,
    source_id   VARCHAR(128) UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    author      TEXT,
    url         TEXT,
    license     VARCHAR(64),
    description TEXT,
    topics      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_chunks (
    id          SERIAL PRIMARY KEY,
    source_id   VARCHAR(128) NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_start  INTEGER,
    text        TEXT NOT NULL,
    token_count INTEGER,
    embedding   vector(1536),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_id, chunk_index)
);

-- Run AFTER ingestion (needs rows to exist):
-- CREATE INDEX kb_chunks_embedding_idx ON kb_chunks
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add new columns to existing lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS sources_cited JSONB;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS generated_at  TIMESTAMPTZ;
