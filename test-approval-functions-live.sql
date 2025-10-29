-- Test Approval Functions Live
-- This actually calls the functions to see if they work

-- Step 1: Get a pending request to test with
SELECT 'Getting Pending Request:' as test_step;
WITH pending_request AS (
  SELECT id, business_id, requester_id, status, created_at
  FROM public.business_edit_requests 
  WHERE status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  id as request_id,
  business_id,
  requester_id,
  status,
  created_at,
  'This request will be used for testing' as note
FROM pending_request;

-- Step 2: Test the reject function with a real request
-- (We'll test reject first since it's safer)
SELECT 'Testing Reject Function:' as test_step;
WITH test_request AS (
  SELECT id
  FROM public.business_edit_requests 
  WHERE status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'Testing reject function with request: ' || id as test_description,
  reject_business_edit_request(id, 'Test rejection from SQL script') as result
FROM test_request;

-- Step 3: Check if the reject worked
SELECT 'Checking Reject Result:' as test_step;
SELECT 
  id,
  business_id,
  status,
  admin_notes,
  reviewed_at,
  reviewed_by
FROM public.business_edit_requests 
WHERE status = 'rejected'
ORDER BY reviewed_at DESC
LIMIT 3;

-- Step 4: If we have another pending request, test the approve function
SELECT 'Testing Approve Function:' as test_step;
WITH test_request AS (
  SELECT id
  FROM public.business_edit_requests 
  WHERE status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'Testing approve function with request: ' || id as test_description,
  apply_business_edit_request(id) as result
FROM test_request;

-- Step 5: Check if the approve worked
SELECT 'Checking Approve Result:' as test_step;
SELECT 
  id,
  business_id,
  status,
  reviewed_at,
  reviewed_by
FROM public.business_edit_requests 
WHERE status = 'approved'
ORDER BY reviewed_at DESC
LIMIT 3;

-- Step 6: Check businesses with pending edits
SELECT 'Businesses with Pending Edits:' as test_step;
SELECT 
  id,
  name,
  owner_id,
  has_pending_edits,
  updated_at
FROM public.businesses 
WHERE has_pending_edits = true
ORDER BY updated_at DESC
LIMIT 3;
