-- Add role column to profiles table
-- Roles: Resident (default), Politician, Candidate
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'Resident' CHECK (type IN ('Resident', 'Politician', 'Candidate', 'Admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);

-- Update existing profiles to have 'Resident' type if null
UPDATE profiles SET type = 'Resident' WHERE type IS NULL;
