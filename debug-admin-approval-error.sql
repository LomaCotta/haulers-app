-- Debug Admin Approval Error
-- This helps identify exactly what's causing the approval to fail

-- Step 1: Check if the functions exist and are callable
SELECT 'Function Existence Check:' as debug_step;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  security_type,
  is_deterministic
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('apply_business_edit_request', 'reject_business_edit_request')
ORDER BY routine_name;

-- Step 2: Check if there are any pending edit requests
SELECT 'Pending Edit Requests:' as debug_step;
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

-- Step 3: Test the function with a sample request (if any exist)
SELECT 'Function Test:' as debug_step;
WITH sample_request AS (
  SELECT id, business_id, proposed_changes
  FROM public.business_edit_requests 
  WHERE status = 'pending'
  LIMIT 1
)
SELECT 
  'Testing function with sample request' as test_description,
  id as request_id,
  business_id,
  CASE 
    WHEN id IS NOT NULL THEN '✅ Sample request found - function can be tested'
    ELSE '❌ No pending requests found - cannot test function'
  END as test_status
FROM sample_request;

-- Step 4: Check RLS policies on business_edit_requests table
SELECT 'RLS Policies Check:' as debug_step;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'business_edit_requests' 
AND schemaname = 'public'
ORDER BY policyname;

-- Step 5: Check if the current user has admin role
SELECT 'Current User Admin Check:' as debug_step;
SELECT 
  auth.uid() as user_id,
  p.role as user_role,
  p.full_name,
  CASE 
    WHEN p.role = 'admin' THEN '✅ User is admin - can approve requests'
    ELSE '❌ User is not admin - cannot approve requests'
  END as admin_status
FROM public.profiles p
WHERE p.id = auth.uid();

-- Step 6: Check if there are any businesses with pending edits
SELECT 'Businesses with Pending Edits:' as debug_step;
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
