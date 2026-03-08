-- Document analysis results table
create table if not exists document_analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legal_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  key_issues jsonb not null default '[]',
  relevant_statutes jsonb not null default '[]',
  risk_assessment jsonb not null default '[]',
  next_steps jsonb not null default '[]',
  extracted_text_length integer not null default 0,
  extraction_method text not null default 'pdf-parse',
  tokens_used integer not null default 0,
  analysis_time_ms integer not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_document_analyses_document_id on document_analyses(document_id);
create index idx_document_analyses_user_id on document_analyses(user_id);

-- RLS
alter table document_analyses enable row level security;

create policy "Users can view own analyses"
  on document_analyses for select
  using (auth.uid() = user_id);

create policy "Service role can manage analyses"
  on document_analyses for all
  using (true)
  with check (true);
