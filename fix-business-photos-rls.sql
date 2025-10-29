-- Fix Business Photos RLS Policy
-- This fixes the RLS policy to allow business owners to upload photos without admin approval

-- First, let's check if the business-photos bucket exists and create it if needed
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-photos',
  'business-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can upload photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos for their own businesses" ON storage.objects;

-- Create new, more permissive policies for business photos
-- Allow public read access to business photos
CREATE POLICY "Public can view business photos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-photos');

-- Allow authenticated users to upload business photos
-- This is more permissive but still requires authentication
CREATE POLICY "Authenticated users can upload business photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update business photos
CREATE POLICY "Authenticated users can update business photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete business photos
CREATE POLICY "Authenticated users can delete business photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
);

-- Verify the policies were created
SELECT 'Business photos RLS policies fixed!' as status;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%';
