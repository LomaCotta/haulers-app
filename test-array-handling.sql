-- Test Array Handling in Approval Function
-- This tests that arrays are properly converted from JSONB to PostgreSQL arrays

-- Step 1: Create a test edit request with array fields
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
    'description', 'Testing array handling',
    'services_offered', '["Service 1", "Service 2", "Service 3"]'::jsonb,
    'features', '["Feature A", "Feature B"]'::jsonb,
    'languages_spoken', '["English", "Spanish", "French"]'::jsonb,
    'certifications', '["Cert 1", "Cert 2"]'::jsonb,
    'availability_days', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
    'gallery_photos', '["photo1.jpg", "photo2.jpg"]'::jsonb,
    'emergency_service', true,
    'same_day_service', false
  ) as proposed_changes
FROM public.businesses b
WHERE b.owner_id = auth.uid()
AND NOT EXISTS (
  SELECT 1 FROM public.business_edit_requests 
  WHERE business_id = b.id AND status = 'pending'
)
LIMIT 1;

-- Step 2: Show the test request
SELECT 'Test Request Created:' as info;
SELECT 
  id,
  business_id,
  proposed_changes->'services_offered' as services_offered_json,
  proposed_changes->'availability_days' as availability_days_json
FROM public.business_edit_requests 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 1;

-- Step 3: Test the approve function
SELECT 'Testing Array Handling:' as info;
WITH test_request AS (
  SELECT id
  FROM public.business_edit_requests 
  WHERE status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'Testing with request: ' || id as test_description,
  apply_business_edit_request(id) as result
FROM test_request;

-- Step 4: Check if arrays were properly converted
SELECT 'Checking Array Conversion:' as info;
SELECT 
  id,
  name,
  services_offered,
  features,
  languages_spoken,
  certifications,
  availability_days,
  gallery_photos,
  emergency_service,
  same_day_service,
  has_pending_edits
FROM public.businesses 
WHERE id IN (
  SELECT business_id 
  FROM public.business_edit_requests 
  WHERE status = 'approved'
  ORDER BY reviewed_at DESC
  LIMIT 1
);

-- Step 5: Verify array types
SELECT 'Array Type Verification:' as info;
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND table_schema = 'public'
AND column_name IN ('services_offered', 'features', 'languages_spoken', 'certifications', 'availability_days', 'gallery_photos');
