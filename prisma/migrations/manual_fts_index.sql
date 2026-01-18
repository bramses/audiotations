-- Run this manually in Supabase SQL Editor after running Prisma migrations

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create GIN index for full-text search on transcript
CREATE INDEX IF NOT EXISTS annotation_transcript_fts_idx
ON "Annotation"
USING GIN (to_tsvector('english', transcript));

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS annotation_embedding_idx
ON "Annotation"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
-- Note: For small datasets, you may want to use hnsw instead:
-- CREATE INDEX IF NOT EXISTS annotation_embedding_idx
-- ON "Annotation"
-- USING hnsw (embedding vector_cosine_ops);
