-- Add score column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS score integer DEFAULT 0 NOT NULL;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_score ON profiles(score DESC);

-- Function to update user score when voting
-- Awards 1 point for first vote on an issue, no points for changing vote
CREATE OR REPLACE FUNCTION update_user_score_on_vote()
RETURNS TRIGGER AS $$
DECLARE
  is_first_vote boolean;
BEGIN
  -- Check if this is the user's first vote on this issue
  -- TG_OP is 'INSERT' for new votes, 'UPDATE' for changed votes
  is_first_vote := (TG_OP = 'INSERT');
  
  -- Only increment score if this is a new vote (not a vote change)
  IF is_first_vote THEN
    UPDATE profiles 
    SET score = score + 1 
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update score when voting
DROP TRIGGER IF EXISTS trigger_update_score_on_vote ON votes;
CREATE TRIGGER trigger_update_score_on_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_score_on_vote();

-- Note: We only trigger on INSERT because the votes table has a unique constraint
-- on (user_id, issue_id), so changing a vote uses UPSERT which is UPDATE, not INSERT.
-- This ensures users only get 1 point per issue they vote on, regardless of vote changes.
