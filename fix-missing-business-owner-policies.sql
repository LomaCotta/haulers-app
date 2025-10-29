-- Fix Missing Business Owner Upload Policies
-- This adds the missing policies that allow business owners to upload photos

-- Check current policies first
SELECT 'Current Storage Policies:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'
ORDER BY policyname;

-- Add missing policies for business owners
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

-- Verify all policies are now present
SELECT 'Updated Storage Policies:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'
ORDER BY policyname;

-- Test the policy logic
SELECT 'Policy Test:' as info;
SELECT 
  'Testing filename pattern matching' as test,
  split_part('test-business-id/logo_1234567890.jpg', '/', 1) as business_id_from_filename;
