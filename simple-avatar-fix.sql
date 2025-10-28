-- Simple Avatar Upload Fix - Run this first for immediate testing
-- This creates very permissive policies to test the upload functionality

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

-- Drop all existing policies on storage.objects for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to manage avatars" ON storage.objects;

-- Create very simple policies for testing
-- Public read access
CREATE POLICY "Public read avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow all authenticated users to upload/update/delete avatars
CREATE POLICY "Authenticated users can manage avatars" ON storage.objects
FOR ALL USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Verify policies were created
SELECT 'Simple avatar policies created!' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
