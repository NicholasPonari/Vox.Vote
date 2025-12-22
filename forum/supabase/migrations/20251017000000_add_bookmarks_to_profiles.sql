-- Add bookmarks array to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bookmarks text[] DEFAULT '{}';

-- Create GIN index for efficient array operations
CREATE INDEX IF NOT EXISTS idx_profiles_bookmarks ON profiles USING GIN (bookmarks);
