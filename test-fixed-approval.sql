-- Test Fixed Approval Function
-- This tests the function with only existing columns

-- Step 1: Check what columns exist
SELECT 'Available Columns in Businesses Table:' as info;
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND table_schema = 'public'
AND column_name IN (
  'description', 'phone', 'email', 'website', 'service_type',
  'address', 'city', 'state', 'postal_code', 'service_radius_km',
  'base_rate_cents', 'hourly_rate_cents', 'services_offered', 'features',
  'years_experience', 'languages_spoken', 'certifications',
  'emergency_service', 'same_day_service', 'insurance_verified',
  'licensed', 'bonded', 'response_time_hours', 'min_booking_notice_hours',
  'availability_days', 'availability_hours', 'logo_url', 'cover_photo_url', 'gallery_photos'
)
ORDER BY column_name;

-- Step 2: Create a test edit request with only existing columns
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
    'description', 'Updated description from fixed test',
    'phone', '555-999-8888',
    'email', 'fixed@example.com',
    'services_offered', '["Fixed Service 1", "Fixed Service 2"]'::jsonb,
    'features', '["Fixed Feature 1", "Fixed Feature 2"]'::jsonb,
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

-- Step 3: Test the approve function
SELECT 'Testing Fixed Approve Function:' as info;
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

-- Step 4: Check the result
SELECT 'Checking Approval Result:' as info;
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

-- Step 5: Check if business was updated
SELECT 'Checking Business Updates:' as info;
SELECT 
  id,
  name,
  description,
  phone,
  email,
  services_offered,
  features,
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
