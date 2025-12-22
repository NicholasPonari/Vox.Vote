-- Track when users last viewed each post (for bookmark aggregation)
CREATE TABLE IF NOT EXISTS last_seen_timestamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  issue_id bigint REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  last_seen_at timestamptz DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, issue_id)
);

-- Index for efficient lookup
CREATE INDEX idx_last_seen_user_issue ON last_seen_timestamps(user_id, issue_id);
CREATE INDEX idx_last_seen_issue_time ON last_seen_timestamps(issue_id, last_seen_at);
