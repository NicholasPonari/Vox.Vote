-- Ensure comment_votes table exists
CREATE TABLE IF NOT EXISTS comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  value integer NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, comment_id)
);

-- Add bias column to comments if it doesn't exist
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS bias text DEFAULT 'neutral';

-- Create index for comment votes
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);

-- Function to award 10 points when a user creates a comment
CREATE OR REPLACE FUNCTION update_score_on_comment_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 10 points for creating a comment (including replies)
  UPDATE profiles 
  SET score = score + 10 
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment creation
DROP TRIGGER IF EXISTS trigger_score_on_comment_create ON comments;
CREATE TRIGGER trigger_score_on_comment_create
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_score_on_comment_create();

-- Create a table to track which comments a user has ever voted on
-- This prevents score spamming by vote/unvote/revote cycles
CREATE TABLE IF NOT EXISTS comment_vote_history (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  first_voted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, comment_id)
);

-- Create index for vote history lookups
CREATE INDEX IF NOT EXISTS idx_comment_vote_history_user ON comment_vote_history(user_id);

-- Function to award 1 point when a user votes on a comment for the first time EVER
-- Tracks vote history to prevent score spamming via vote/unvote/revote cycles
CREATE OR REPLACE FUNCTION update_score_on_comment_vote()
RETURNS TRIGGER AS $$
DECLARE
  has_voted_before boolean;
BEGIN
  -- Check if user has EVER voted on this comment before
  SELECT EXISTS(
    SELECT 1 FROM comment_vote_history 
    WHERE user_id = NEW.user_id AND comment_id = NEW.comment_id
  ) INTO has_voted_before;
  
  -- Only award point if this is truly the first time voting on this comment
  IF NOT has_voted_before THEN
    -- Record that user has now voted on this comment
    INSERT INTO comment_vote_history (user_id, comment_id)
    VALUES (NEW.user_id, NEW.comment_id)
    ON CONFLICT (user_id, comment_id) DO NOTHING;
    
    -- Award the point
    UPDATE profiles 
    SET score = score + 1 
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment voting
DROP TRIGGER IF EXISTS trigger_score_on_comment_vote ON comment_votes;
CREATE TRIGGER trigger_score_on_comment_vote
  AFTER INSERT ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_score_on_comment_vote();

-- Note on scoring logic:
-- 1. Creating a comment (or reply): +10 points (always)
-- 2. First vote EVER on a comment: +1 point (tracked in comment_vote_history)
-- 3. Changing vote on same comment: 0 points (UPDATE operation, not INSERT)
-- 4. Removing vote and re-voting: 0 points (history table prevents re-awarding)
-- Maximum comment vote points = Total number of unique comments voted on
