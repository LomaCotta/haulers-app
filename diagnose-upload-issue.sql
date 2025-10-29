-- Diagnose Business Photo Upload Issue
-- This safely checks existing policies and identifies the real problem

-- Step 1: Check what policies currently exist
SELECT 'Current Business Photo Policies:' as info;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'
ORDER BY policyname;

-- Step 2: Check if the business-photos bucket exists
SELECT 'Bucket Status:' as info;
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'business-photos';

-- Step 3: Check current user and their businesses
SELECT 'Current User Info:' as info;
SELECT 
  auth.uid() as user_id,
  p.role as user_role,
  p.full_name
FROM public.profiles p
WHERE p.id = auth.uid();

-- Step 4: Check user's businesses
SELECT 'User Businesses:' as info;
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.owner_id,
  b.verified
FROM public.businesses b
WHERE b.owner_id = auth.uid()
ORDER BY b.created_at DESC
LIMIT 5;

-- Step 5: Test the policy logic with actual business IDs
SELECT 'Policy Logic Test:' as info;
SELECT 
  b.id as business_id,
  b.name as business_name,
  'Testing filename: ' || b.id::text || '/logo_test.jpg' as test_filename,
  split_part(b.id::text || '/logo_test.jpg', '/', 1) as extracted_id,
  CASE 
    WHEN b.id::text = split_part(b.id::text || '/logo_test.jpg', '/', 1) THEN '✅ Filename parsing works'
    ELSE '❌ Filename parsing failed'
  END as filename_test,
  CASE 
    WHEN b.owner_id = auth.uid() THEN '✅ User owns business'
    ELSE '❌ User does not own business'
  END as ownership_test
FROM public.businesses b
WHERE b.owner_id = auth.uid()
LIMIT 3;

-- Step 6: Check if there are any conflicting policies
SELECT 'Potential Conflicting Policies:' as info;
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname NOT LIKE '%business%'
AND (qual LIKE '%business-photos%' OR with_check LIKE '%business-photos%')
ORDER BY policyname;

-- Step 7: Check RLS status
SELECT 'RLS Status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
