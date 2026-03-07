-- ============================================================
-- RPC: Semantic search via pgvector cosine similarity
-- ============================================================
CREATE OR REPLACE FUNCTION match_chunks_semantic(
  query_embedding extensions.vector(1536),
  match_limit INT DEFAULT 20,
  filter_source_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_title TEXT,
  section_ref TEXT,
  content TEXT,
  summary TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  safe_limit INT;
BEGIN
  safe_limit := LEAST(GREATEST(match_limit, 1), 100);

  RETURN QUERY
  SELECT
    lc.id,
    lc.source_type,
    lc.source_title,
    lc.section_ref,
    lc.content,
    lc.summary,
    lc.metadata,
    1 - (lc.embedding <=> query_embedding) AS similarity
  FROM public.legal_chunks lc
  WHERE lc.embedding IS NOT NULL
    AND (filter_source_type IS NULL OR lc.source_type = filter_source_type)
  ORDER BY lc.embedding <=> query_embedding
  LIMIT safe_limit;
END;
$$;

-- ============================================================
-- RPC: Keyword search via PostgreSQL full-text search
-- ============================================================
CREATE OR REPLACE FUNCTION match_chunks_keyword(
  search_query TEXT,
  match_limit INT DEFAULT 20,
  filter_source_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_title TEXT,
  section_ref TEXT,
  content TEXT,
  summary TEXT,
  metadata JSONB,
  fts_rank FLOAT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  tsquery_val TSQUERY;
  safe_limit INT;
BEGIN
  safe_limit := LEAST(GREATEST(match_limit, 1), 100);
  tsquery_val := plainto_tsquery('english', search_query);

  IF tsquery_val IS NULL OR tsquery_val = ''::TSQUERY THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    lc.id,
    lc.source_type,
    lc.source_title,
    lc.section_ref,
    lc.content,
    lc.summary,
    lc.metadata,
    ts_rank(lc.fts, tsquery_val)::FLOAT AS fts_rank
  FROM public.legal_chunks lc
  WHERE lc.fts @@ tsquery_val
    AND (filter_source_type IS NULL OR lc.source_type = filter_source_type)
  ORDER BY fts_rank DESC
  LIMIT safe_limit;
END;
$$;

-- ============================================================
-- Cache table for research explanations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.research_cache (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  query_hash TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  source_chunk_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_research_cache_hash ON public.research_cache (query_hash);
CREATE INDEX idx_research_cache_expires ON public.research_cache (expires_at);

ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read research cache" ON public.research_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert research cache" ON public.research_cache
  FOR INSERT TO authenticated WITH CHECK (true);
