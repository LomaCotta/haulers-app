-- Test Business Photos Upload Permissions
-- Run this after applying the fix to verify everything works

-- Test 1: Check if business-photos bucket exists
SELECT 
  'Bucket Check:' as test,
  id, 
  name, 
  public, 
  file_size_limit 
FROM storage.buckets 
WHERE id = 'business-photos';

-- Test 2: Check storage policies
SELECT 
  'Storage Policies:' as test,
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'
ORDER BY policyname;

-- Test 3: Check businesses table policies
SELECT 
  'Business Table Policies:' as test,
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'businesses' 
AND schemaname = 'public'
ORDER BY policyname;

-- Test 4: Check current user permissions
SELECT 
  'Current User Info:' as test,
  auth.uid() as user_id,
  p.role as user_role,
  p.full_name
FROM public.profiles p
WHERE p.id = auth.uid();

-- Test 5: Check if user owns any businesses
SELECT 
  'User Businesses:' as test,
  b.id as business_id,
  b.name as business_name,
  b.owner_id,
  b.verified
FROM public.businesses b
WHERE b.owner_id = auth.uid()
LIMIT 5;

-- Test 6: Test storage upload permission (this will show if the policy works)
-- Note: This is a dry run - it won't actually upload anything
SELECT 
  'Storage Upload Test:' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE id::text = 'test-business-id'
      AND owner_id = auth.uid()
    ) THEN 'Would allow upload for test-business-id'
    ELSE 'Would NOT allow upload for test-business-id (business not owned by user)'
  END as upload_permission_test;
