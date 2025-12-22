-- Create verification_attempts table
CREATE TABLE IF NOT EXISTS verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  selfie_url TEXT NOT NULL,
  id_photo_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'failed', 'manual_review')),
  failure_reason TEXT,
  face_match_score FLOAT,
  ocr_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Add verification fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_attempt_id UUID REFERENCES verification_attempts(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_attempts(email);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_attempts(status);

-- Enable RLS
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own verification attempts
CREATE POLICY "Users can view own verification attempts"
  ON verification_attempts
  FOR SELECT
  USING (auth.email() = email);

-- Policy: Service role can insert verification attempts
CREATE POLICY "Service can insert verification attempts"
  ON verification_attempts
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update verification attempts
CREATE POLICY "Service can update verification attempts"
  ON verification_attempts
  FOR UPDATE
  USING (true);