-- Fix Business Photos RLS Policy with Ownership Check
-- This creates a more secure policy that checks business ownership with correct filename pattern

-- First, let's check if the business-photos bucket exists and create it if needed
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-photos',
  'business-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Public can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete business photos" ON storage.objects;

-- Create new policies with correct filename pattern matching
-- The filename pattern is: {businessId}/{type}_{timestamp}.{ext}
-- So we need to extract businessId from the first part of the path

-- Allow public read access to business photos
CREATE POLICY "Public can view business photos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-photos');

-- Allow business owners to upload photos for their own businesses
CREATE POLICY "Business owners can upload photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Allow business owners to update photos for their own businesses
CREATE POLICY "Business owners can update photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Allow business owners to delete photos for their own businesses
CREATE POLICY "Business owners can delete photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Also allow admins to manage all business photos
CREATE POLICY "Admins can manage all business photos" ON storage.objects
FOR ALL USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Verify the policies were created
SELECT 'Business photos ownership-based RLS policies created!' as status;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%';
