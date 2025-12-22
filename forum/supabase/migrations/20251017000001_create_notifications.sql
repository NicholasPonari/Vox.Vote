-- Notifications table for tracking user interactions
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('comment_on_post', 'reply_to_comment', 'bookmark_summary')),
  
  -- Related entities
  issue_id bigint REFERENCES issues(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content
  content_preview text,
  aggregate_count integer DEFAULT 1,
  
  -- Status
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Indexes for efficient queries
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Index for cleanup queries
CREATE INDEX idx_notifications_read_created_at ON notifications(is_read, created_at) WHERE is_read = true;
