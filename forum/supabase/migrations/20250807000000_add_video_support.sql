-- Add video support to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('photo', 'video')),
ADD COLUMN IF NOT EXISTS location_lat decimal,
ADD COLUMN IF NOT EXISTS location_lng decimal;

-- Update existing location column to be nullable since we're moving to lat/lng
ALTER TABLE issues ALTER COLUMN location DROP NOT NULL;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues(location_lat, location_lng);

-- Create index for media type queries
CREATE INDEX IF NOT EXISTS idx_issues_media_type ON issues(media_type);
