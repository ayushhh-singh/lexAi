-- Case notes table for lawyer notes on case matters
CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_matter_id UUID NOT NULL REFERENCES case_matters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_case_notes_case_matter ON case_notes(case_matter_id);
CREATE INDEX idx_case_notes_user ON case_notes(user_id);

-- RLS
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own case notes"
  ON case_notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
