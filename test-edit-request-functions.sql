-- Test Edit Request Functions
-- This tests if the approval functions work correctly

-- Step 1: Check if functions exist
SELECT 'Function Check:' as test_step;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%business_edit%'
ORDER BY routine_name;

-- Step 2: Check if there are any pending edit requests
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
LIMIT 5;

-- Step 3: Check if the business_edit_requests table has the right structure
SELECT 'Table Structure Check:' as test_step;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'business_edit_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Test function permissions
SELECT 'Permission Check:' as test_step;
SELECT 
  routine_name,
  security_type,
  is_deterministic
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('apply_business_edit_request', 'reject_business_edit_request');

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
LIMIT 5;
