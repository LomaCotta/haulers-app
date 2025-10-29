-- Test Exact Upload Pattern Used by Component
-- This tests the exact filename pattern: ${businessId}/${type}_${Date.now()}.${fileExt}

-- Step 1: Get a real business ID from the current user
SELECT 'Real Business Data:' as test_step;
SELECT 
  b.id as business_id,
  b.id::text as business_id_text,
  b.name as business_name,
  b.owner_id,
  auth.uid() as current_user_id,
  CASE 
    WHEN b.owner_id = auth.uid() THEN '✅ User owns this business'
    ELSE '❌ User does NOT own this business'
  END as ownership_check
FROM public.businesses b
WHERE b.owner_id = auth.uid()
ORDER BY b.created_at DESC
LIMIT 1;

-- Step 2: Test the exact filename pattern used by the component
-- Pattern: ${businessId}/${type}_${Date.now()}.${fileExt}
-- Example: "123e4567-e89b-12d3-a456-426614174000/logo_1703123456789.jpg"
SELECT 'Filename Pattern Test:' as test_step;
WITH sample_data AS (
  SELECT 
    b.id::text as business_id,
    'logo' as type,
    '1703123456789' as timestamp,
    'jpg' as extension
  FROM public.businesses b
  WHERE b.owner_id = auth.uid()
  LIMIT 1
)
SELECT 
  business_id,
  business_id || '/' || type || '_' || timestamp || '.' || extension as full_filename,
  split_part(business_id || '/' || type || '_' || timestamp || '.' || extension, '/', 1) as extracted_business_id,
  CASE 
    WHEN business_id = split_part(business_id || '/' || type || '_' || timestamp || '.' || extension, '/', 1) 
    THEN '✅ Filename parsing works correctly'
    ELSE '❌ Filename parsing failed'
  END as parsing_test
FROM sample_data;

-- Step 3: Test the RLS policy logic with real data
SELECT 'RLS Policy Logic Test:' as test_step;
WITH test_filename AS (
  SELECT 
    b.id::text || '/logo_1703123456789.jpg' as filename,
    b.id as business_id,
    b.owner_id
  FROM public.businesses b
  WHERE b.owner_id = auth.uid()
  LIMIT 1
)
SELECT 
  filename,
  business_id,
  owner_id,
  auth.uid() as current_user_id,
  split_part(filename, '/', 1) as extracted_id,
  CASE 
    WHEN business_id::text = split_part(filename, '/', 1) THEN '✅ ID extraction works'
    ELSE '❌ ID extraction failed'
  END as id_extraction_test,
  CASE 
    WHEN owner_id = auth.uid() THEN '✅ Ownership check works'
    ELSE '❌ Ownership check failed'
  END as ownership_test,
  CASE 
    WHEN business_id::text = split_part(filename, '/', 1) AND owner_id = auth.uid() THEN '✅ RLS policy should allow upload'
    ELSE '❌ RLS policy will block upload'
  END as overall_test
FROM test_filename;

-- Step 4: Check if there are any other policies that might interfere
SELECT 'Interfering Policies Check:' as test_step;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname NOT LIKE '%business%'
AND (qual LIKE '%business-photos%' OR with_check LIKE '%business-photos%')
ORDER BY policyname;

-- Step 5: Check the exact policy that should allow uploads
SELECT 'Upload Policy Details:' as test_step;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname = 'Business owners can upload photos';
