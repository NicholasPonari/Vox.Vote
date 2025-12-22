-- Create storage bucket for verification images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-images',
  'verification-images',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for verification-images bucket

-- Allow authenticated users to upload verification images
CREATE POLICY "Authenticated users can upload verification images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-images');

-- Allow public read access (needed for Python function to download images)
CREATE POLICY "Public can read verification images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'verification-images');

-- Allow service role to delete old images (for cleanup)
CREATE POLICY "Service can delete verification images"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'verification-images');

-- Allow users to update their own verification images
CREATE POLICY "Users can update own verification images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'verification-images');
