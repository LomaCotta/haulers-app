-- Safe Avatar Upload Fix - Handles existing policies
-- Run this in Supabase SQL Editor

-- Ensure avatars bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies safely (ignore if they don't exist)
DO $$ 
BEGIN
  -- Drop all possible existing policies
  DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Allow all authenticated users to manage avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can manage avatars" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if policies don't exist
    NULL;
END $$;

-- Create new policies
CREATE POLICY "Public read avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can manage avatars" ON storage.objects
FOR ALL USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Verify policies were created
SELECT 'Avatar policies created successfully!' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%avatar%';
