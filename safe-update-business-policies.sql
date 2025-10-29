-- Safe Update of Business Photo Policies
-- This updates existing policies without causing conflicts

-- Step 1: Check current policies first
SELECT 'Before Update - Current Policies:' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'
ORDER BY policyname;

-- Step 2: Drop and recreate policies safely
-- Drop existing policies one by one
DROP POLICY IF EXISTS "Business owners can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all business photos" ON storage.objects;

-- Step 3: Recreate policies with correct logic
-- Public read access
CREATE POLICY "Public can view business photos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-photos');

-- Business owners can upload photos
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

-- Business owners can update photos
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

-- Business owners can delete photos
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

-- Admins can manage all business photos
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

-- Step 4: Verify policies were updated
SELECT 'After Update - Updated Policies:' as info;
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as has_with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'
ORDER BY policyname;

-- Step 5: Test the policy logic
SELECT 'Policy Test Results:' as info;
SELECT 
  'Testing with sample data' as test_description,
  'business-123/logo_456.jpg' as sample_filename,
  split_part('business-123/logo_456.jpg', '/', 1) as extracted_business_id,
  'This should extract "business-123" from the filename' as expected_result;
