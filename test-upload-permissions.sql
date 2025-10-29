-- Test Upload Permissions
-- This tests if the current user can upload photos

-- Step 1: Get current user info
SELECT 'Current User:' as test_step;
SELECT 
  auth.uid() as user_id,
  p.role as user_role,
  p.full_name
FROM public.profiles p
WHERE p.id = auth.uid();

-- Step 2: Get user's businesses
SELECT 'User Businesses:' as test_step;
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.owner_id,
  b.verified
FROM public.businesses b
WHERE b.owner_id = auth.uid()
ORDER BY b.created_at DESC;

-- Step 3: Test upload permission for each business
SELECT 'Upload Permission Test:' as test_step;
SELECT 
  b.id as business_id,
  b.name as business_name,
  'Testing upload for business: ' || b.id::text as test_description,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE id::text = split_part(b.id::text || '/logo_test.jpg', '/', 1)
      AND owner_id = auth.uid()
    ) THEN '✅ CAN upload photos'
    ELSE '❌ CANNOT upload photos'
  END as upload_permission
FROM public.businesses b
WHERE b.owner_id = auth.uid()
ORDER BY b.created_at DESC
LIMIT 3;

-- Step 4: Check if there are any blocking policies
SELECT 'Blocking Policies Check:' as test_step;
SELECT 
  'Looking for policies that might block uploads' as check_description,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%business-photos%' THEN 'Might affect business photos'
    WHEN with_check LIKE '%business-photos%' THEN 'Might affect business photos'
    ELSE 'Does not affect business photos'
  END as impact
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname NOT LIKE '%business%'
AND (qual LIKE '%business-photos%' OR with_check LIKE '%business-photos%')
ORDER BY policyname;
