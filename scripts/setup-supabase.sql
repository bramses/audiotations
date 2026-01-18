-- Run this in Supabase SQL Editor to set up storage bucket

-- Create the audio storage bucket (if not exists via dashboard)
-- Note: You can also create this in the Supabase Dashboard under Storage

-- Enable RLS on the bucket (do this in Dashboard)
-- Then add these policies:

-- Policy: Allow authenticated users to upload to their own folder
-- CREATE POLICY "Users can upload audio to their folder"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'audio' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Allow public read access to audio files
-- CREATE POLICY "Public can read audio files"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'audio');

-- Policy: Allow users to delete their own files
-- CREATE POLICY "Users can delete their own audio"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'audio' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- For simplicity, since we're using service role key for uploads,
-- you can just make the bucket public in the Dashboard:
-- 1. Go to Storage > Create bucket named "audio"
-- 2. Make it public (or configure policies as above)
