-- Quick Fix for Business Photos Upload
-- This provides immediate access for testing - run this first

-- Ensure business-photos bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-photos',
  'business-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Drop all existing business photo policies
DROP POLICY IF EXISTS "Users can upload photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Public can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete business photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all business photos" ON storage.objects;

-- Create very permissive policies for immediate testing
-- WARNING: These are permissive - use only for testing
CREATE POLICY "Public can view business photos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-photos');

CREATE POLICY "Authenticated users can manage business photos" ON storage.objects
FOR ALL USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
);

-- Verify the fix
SELECT 'Quick fix applied! Business photos should now work for all authenticated users.' as status;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%';
