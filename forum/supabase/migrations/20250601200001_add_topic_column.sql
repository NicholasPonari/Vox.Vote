-- Add topic column to issues table
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS topic text NULL;

-- Create index for faster topic filtering
CREATE INDEX IF NOT EXISTS idx_issues_topic ON public.issues(topic);
