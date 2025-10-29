-- Test Business Owner Upload Permissions
-- Run this to verify business owners can upload photos

-- Step 1: Check current user and their businesses
SELECT 'Current User Info:' as test_step;
SELECT 
  auth.uid() as user_id,
  p.role as user_role,
  p.full_name,
  p.email
FROM public.profiles p
WHERE p.id = auth.uid();

-- Step 2: Check user's businesses
SELECT 'User Businesses:' as test_step;
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.owner_id,
  b.verified,
  b.created_at
FROM public.businesses b
WHERE b.owner_id = auth.uid()
ORDER BY b.created_at DESC;

-- Step 3: Test storage policy logic
SELECT 'Storage Policy Test:' as test_step;
SELECT 
  'Testing if user can upload for their businesses' as test_description,
  b.id as business_id,
  b.name as business_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE id::text = split_part(b.id::text || '/logo_test.jpg', '/', 1)
      AND owner_id = auth.uid()
    ) THEN '✅ Would allow upload'
    ELSE '❌ Would NOT allow upload'
  END as upload_permission
FROM public.businesses b
WHERE b.owner_id = auth.uid()
LIMIT 3;

-- Step 4: Check all storage policies
SELECT 'All Storage Policies:' as test_step;
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

-- Step 5: Test specific filename pattern
SELECT 'Filename Pattern Test:' as test_step;
SELECT 
  'business-id/logo_1234567890.jpg' as sample_filename,
  split_part('business-id/logo_1234567890.jpg', '/', 1) as extracted_business_id,
  'This should match a business ID in the database' as explanation;
