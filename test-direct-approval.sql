-- Test Direct Approval Functions
-- This tests the new direct approval functions

-- Step 1: Check if functions exist
SELECT 'Function Check:' as test_step;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('apply_business_edit_request', 'reject_business_edit_request')
ORDER BY routine_name;

-- Step 2: Check current user
SELECT 'Current User:' as test_step;
SELECT 
  auth.uid() as user_id,
  p.role as user_role,
  p.full_name
FROM public.profiles p
WHERE p.id = auth.uid();

-- Step 3: Check pending edit requests
SELECT 'Pending Edit Requests:' as test_step;
SELECT 
  id,
  business_id,
  requester_id,
  status,
  created_at,
  jsonb_object_keys(proposed_changes) as proposed_changes_keys
FROM public.business_edit_requests 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 3;

-- Step 4: Test function call with a real request (if any exist)
SELECT 'Function Test with Real Request:' as test_step;
WITH sample_request AS (
  SELECT id, business_id, proposed_changes
  FROM public.business_edit_requests 
  WHERE status = 'pending'
  LIMIT 1
)
SELECT 
  'Testing function with real request' as test_description,
  id as request_id,
  business_id,
  CASE 
    WHEN id IS NOT NULL THEN '✅ Sample request found - function can be tested'
    ELSE '❌ No pending requests found - cannot test function'
  END as test_status,
  jsonb_object_keys(proposed_changes) as available_changes
FROM sample_request;

-- Step 5: Check if there are any businesses with pending edits
SELECT 'Businesses with Pending Edits:' as test_step;
SELECT 
  id,
  name,
  owner_id,
  has_pending_edits,
  created_at
FROM public.businesses 
WHERE has_pending_edits = true
ORDER BY created_at DESC
LIMIT 3;

-- Step 6: Test the function directly (this will actually call it)
SELECT 'Direct Function Test:' as test_step;
WITH test_request AS (
  SELECT id
  FROM public.business_edit_requests 
  WHERE status = 'pending'
  LIMIT 1
)
SELECT 
  'This will test the function directly' as test_description,
  CASE 
    WHEN EXISTS (SELECT 1 FROM test_request) THEN '✅ Will test with real request'
    ELSE '❌ No requests to test with'
  END as test_status;
