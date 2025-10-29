-- Debug Storage Upload Issue
-- This helps identify why the upload is failing

-- Step 1: Check if the business-photos bucket exists and is accessible
SELECT 'Bucket Check:' as debug_step;
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'business-photos';

-- Step 2: Check all storage policies for business-photos
SELECT 'Storage Policies Check:' as debug_step;
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

-- Step 3: Check if RLS is enabled on storage.objects
SELECT 'RLS Check:' as debug_step;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Step 4: Test the business ownership check logic
SELECT 'Ownership Logic Test:' as debug_step;
SELECT 
  'Testing with sample business ID' as test,
  b.id as business_id,
  b.name as business_name,
  b.owner_id,
  auth.uid() as current_user_id,
  CASE 
    WHEN b.owner_id = auth.uid() THEN '✅ User owns this business'
    ELSE '❌ User does NOT own this business'
  END as ownership_check
FROM public.businesses b
WHERE b.owner_id = auth.uid()
LIMIT 1;

-- Step 5: Test filename parsing
SELECT 'Filename Parsing Test:' as debug_step;
SELECT 
  'test-business-id/logo_1234567890.jpg' as sample_filename,
  split_part('test-business-id/logo_1234567890.jpg', '/', 1) as business_id_from_filename,
  'This should extract the business ID from the filename' as explanation;

-- Step 6: Check if there are any conflicting policies
SELECT 'Conflicting Policies Check:' as debug_step;
SELECT 
  'Looking for policies that might block uploads' as check_description,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND (qual LIKE '%business-photos%' OR policyname LIKE '%business%')
ORDER BY policyname;
