-- Fix UUID Business ID Matching for Storage Policies
-- This fixes the issue where business IDs are UUIDs but filename parsing expects strings

-- Step 1: Check what the actual business IDs look like
SELECT 'Actual Business IDs:' as info;
SELECT 
  b.id as business_id,
  b.id::text as business_id_as_text,
  b.name as business_name,
  b.owner_id
FROM public.businesses b
WHERE b.owner_id = auth.uid()
ORDER BY b.created_at DESC
LIMIT 3;

-- Step 2: Test filename pattern with actual UUID
SELECT 'Filename Pattern Test with Real UUID:' as info;
SELECT 
  b.id as business_id,
  b.id::text as business_id_text,
  b.id::text || '/logo_test.jpg' as test_filename,
  split_part(b.id::text || '/logo_test.jpg', '/', 1) as extracted_id,
  CASE 
    WHEN b.id::text = split_part(b.id::text || '/logo_test.jpg', '/', 1) THEN '✅ Pattern matching works'
    ELSE '❌ Pattern matching failed'
  END as pattern_test
FROM public.businesses b
WHERE b.owner_id = auth.uid()
LIMIT 1;

-- Step 3: Drop and recreate policies with proper UUID handling
DROP POLICY IF EXISTS "Business owners can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete photos" ON storage.objects;

-- Create policies that properly handle UUID business IDs
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

-- Step 4: Test the updated policies
SELECT 'Updated Policy Test:' as info;
SELECT 
  b.id as business_id,
  b.name as business_name,
  'Testing upload permission for: ' || b.id::text as test_description,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE id::text = split_part(b.id::text || '/logo_test.jpg', '/', 1)
      AND owner_id = auth.uid()
    ) THEN '✅ Upload should work'
    ELSE '❌ Upload will fail'
  END as upload_test
FROM public.businesses b
WHERE b.owner_id = auth.uid()
LIMIT 1;

-- Step 5: Show all current policies
SELECT 'Current Storage Policies:' as info;
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
