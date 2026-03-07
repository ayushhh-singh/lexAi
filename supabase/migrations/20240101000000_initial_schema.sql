-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'lawyer', 'admin')),
  avatar_url TEXT,
  bar_council_id TEXT,
  practice_areas TEXT[] DEFAULT '{}',
  experience_years INTEGER,
  bio TEXT,
  languages TEXT[] DEFAULT '{}',
  courts_practiced TEXT[] DEFAULT '{}',
  consultation_fee NUMERIC(10, 2),
  rating NUMERIC(3, 2) DEFAULT 0,
  total_cases INTEGER DEFAULT 0,
  win_rate NUMERIC(5, 2),
  is_verified BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  ai_credits INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CASE MATTERS
-- ============================================================
CREATE TABLE public.case_matters (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lawyer_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  case_number TEXT,
  case_type TEXT NOT NULL,
  court_level TEXT NOT NULL,
  court_name TEXT,
  practice_area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'filed', 'in_progress', 'hearing_scheduled',
    'judgement_reserved', 'disposed', 'appealed', 'closed'
  )),
  filing_date DATE,
  next_hearing_date DATE,
  opposing_party TEXT,
  opposing_counsel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEGAL DOCUMENTS
-- ============================================================
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_matter_id UUID REFERENCES public.case_matters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_id TEXT,
  file_size INTEGER,
  mime_type TEXT,
  generation_method TEXT CHECK (generation_method IN ('manual', 'ai_chat', 'ai_skill')),
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_matter_id UUID REFERENCES public.case_matters(id) ON DELETE SET NULL,
  title TEXT,
  practice_area TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  ai_model TEXT,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEGAL CHUNKS (RAG knowledge base)
-- ============================================================
CREATE TABLE public.legal_chunks (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  source_type TEXT NOT NULL CHECK (source_type IN ('act', 'judgement', 'commentary', 'article')),
  source_title TEXT NOT NULL,
  section_ref TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  embedding extensions.vector(1536),
  fts TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CASE DEADLINES
-- ============================================================
CREATE TABLE public.case_deadlines (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  case_matter_id UUID NOT NULL REFERENCES public.case_matters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline_date DATE NOT NULL,
  deadline_type TEXT NOT NULL CHECK (deadline_type IN (
    'hearing', 'filing', 'limitation', 'compliance', 'other'
  )),
  reminder_days INTEGER[] DEFAULT '{7, 3, 1}',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SKILL GENERATIONS
-- ============================================================
CREATE TABLE public.skill_generations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_matter_id UUID REFERENCES public.case_matters(id) ON DELETE SET NULL,
  skill_ids TEXT[] NOT NULL,
  prompt TEXT NOT NULL,
  anthropic_file_id TEXT,
  output_format TEXT,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BETA USAGE ANALYTICS
-- ============================================================
CREATE TABLE public.beta_usage_analytics (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  feature TEXT,
  credits_would_cost INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  response_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- HNSW index on embeddings for vector similarity search
CREATE INDEX idx_legal_chunks_embedding ON public.legal_chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index on full-text search
CREATE INDEX idx_legal_chunks_fts ON public.legal_chunks USING gin (fts);

-- B-tree indexes on foreign keys and common query columns
CREATE INDEX idx_case_matters_user_id ON public.case_matters(user_id);
CREATE INDEX idx_case_matters_lawyer_id ON public.case_matters(lawyer_id);
CREATE INDEX idx_case_matters_status ON public.case_matters(status);
CREATE INDEX idx_legal_documents_user_id ON public.legal_documents(user_id);
CREATE INDEX idx_legal_documents_case_matter_id ON public.legal_documents(case_matter_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_case_deadlines_case_matter_id ON public.case_deadlines(case_matter_id);
CREATE INDEX idx_case_deadlines_user_id ON public.case_deadlines(user_id);
CREATE INDEX idx_case_deadlines_deadline_date ON public.case_deadlines(deadline_date);
CREATE INDEX idx_skill_generations_user_id ON public.skill_generations(user_id);
CREATE INDEX idx_beta_usage_analytics_user_id ON public.beta_usage_analytics(user_id);
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Case matters: user_id isolation
CREATE POLICY "Users can CRUD own cases" ON public.case_matters
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Lawyers can view assigned cases" ON public.case_matters
  FOR SELECT USING (auth.uid() = lawyer_id);

-- Legal documents: user_id isolation
CREATE POLICY "Users can CRUD own documents" ON public.legal_documents
  FOR ALL USING (auth.uid() = user_id);

-- Conversations: user_id isolation
CREATE POLICY "Users can CRUD own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

-- Messages: via conversation ownership
CREATE POLICY "Users can CRUD own messages" ON public.messages
  FOR ALL USING (auth.uid() = user_id);

-- Legal chunks: readable by all authenticated users
CREATE POLICY "Authenticated users can read legal chunks" ON public.legal_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Case deadlines: user_id isolation
CREATE POLICY "Users can CRUD own deadlines" ON public.case_deadlines
  FOR ALL USING (auth.uid() = user_id);

-- Skill generations: user_id isolation
CREATE POLICY "Users can CRUD own skill generations" ON public.skill_generations
  FOR ALL USING (auth.uid() = user_id);

-- Beta usage analytics: user_id isolation
CREATE POLICY "Users can CRUD own analytics" ON public.beta_usage_analytics
  FOR ALL USING (auth.uid() = user_id);

-- Feedback: user_id isolation
CREATE POLICY "Users can CRUD own feedback" ON public.feedback
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.case_matters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.legal_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.case_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.skill_generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
