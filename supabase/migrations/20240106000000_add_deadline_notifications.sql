-- Create deadline_notifications table for storing alerts about upcoming/overdue deadlines
CREATE TABLE IF NOT EXISTS deadline_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_matter_id UUID NOT NULL REFERENCES case_matters(id) ON DELETE CASCADE,
  deadline_id UUID NOT NULL REFERENCES case_deadlines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('upcoming', 'overdue', 'reminder')),
  days_until_deadline INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for frequent queries
CREATE INDEX idx_deadline_notifications_user ON deadline_notifications(user_id);
CREATE INDEX idx_deadline_notifications_user_unread ON deadline_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_deadline_notifications_deadline ON deadline_notifications(deadline_id);
CREATE INDEX idx_deadline_notifications_created ON deadline_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE deadline_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own notifications
CREATE POLICY "Users can manage their own deadline notifications"
  ON deadline_notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
