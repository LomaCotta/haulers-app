-- Create Test Edit Request
-- This creates a test edit request if none exist

-- Step 1: Check if there are any pending requests
SELECT 'Current Pending Requests:' as info;
SELECT COUNT(*) as pending_count
FROM public.business_edit_requests 
WHERE status = 'pending';

-- Step 2: Get a business owned by the current user
SELECT 'User Businesses:' as info;
SELECT 
  id,
  name,
  owner_id,
  has_pending_edits
FROM public.businesses 
WHERE owner_id = auth.uid()
ORDER BY created_at DESC
LIMIT 3;

-- Step 3: Create a test edit request if none exist
INSERT INTO public.business_edit_requests (
  business_id,
  requester_id,
  status,
  proposed_changes
)
SELECT 
  b.id as business_id,
  auth.uid() as requester_id,
  'pending' as status,
  jsonb_build_object(
    'description', 'Updated description from test edit request',
    'phone', '555-123-4567',
    'email', 'test@example.com',
    'services_offered', '["Test Service 1", "Test Service 2"]'::jsonb,
    'features', '["Test Feature 1", "Test Feature 2"]'::jsonb
  ) as proposed_changes
FROM public.businesses b
WHERE b.owner_id = auth.uid()
AND NOT EXISTS (
  SELECT 1 FROM public.business_edit_requests 
  WHERE business_id = b.id AND status = 'pending'
)
LIMIT 1;

-- Step 4: Check if the test request was created
SELECT 'Test Request Created:' as info;
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

-- Step 5: Update the business has_pending_edits flag
UPDATE public.businesses 
SET has_pending_edits = true
WHERE id IN (
  SELECT business_id 
  FROM public.business_edit_requests 
  WHERE status = 'pending'
);

-- Step 6: Verify the business was updated
SELECT 'Businesses with Pending Edits:' as info;
SELECT 
  id,
  name,
  owner_id,
  has_pending_edits
FROM public.businesses 
WHERE has_pending_edits = true
ORDER BY updated_at DESC
LIMIT 3;
