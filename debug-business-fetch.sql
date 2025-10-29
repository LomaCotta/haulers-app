-- Debug Business Fetch Issues
-- This helps diagnose why business fetching is failing

-- Step 1: Check if businesses table exists and has data
SELECT 'Checking businesses table:' as debug_step;
SELECT 
  COUNT(*) as total_businesses,
  COUNT(CASE WHEN verified = true THEN 1 END) as verified_businesses,
  COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as businesses_with_logos
FROM public.businesses;

-- Step 2: Check sample business data
SELECT 'Sample business data:' as debug_step;
SELECT 
  id, 
  name, 
  verified, 
  logo_url, 
  cover_photo_url,
  city,
  state
FROM public.businesses 
LIMIT 3;

-- Step 3: Check RLS policies on businesses table
SELECT 'Checking RLS policies:' as debug_step;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'businesses'
ORDER BY policyname;

-- Step 4: Test a simple business query (this should work for public access)
SELECT 'Testing public business query:' as debug_step;
SELECT 
  id, 
  name, 
  verified,
  city,
  state
FROM public.businesses 
WHERE verified = true
LIMIT 1;

-- Step 5: Check if there are any businesses with the specific ID format
SELECT 'Checking for UUID format businesses:' as debug_step;
SELECT 
  id,
  name,
  verified,
  CASE 
    WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN 'Valid UUID' 
    ELSE 'Invalid UUID' 
  END as uuid_status
FROM public.businesses 
LIMIT 5;

-- Step 6: Check profiles table for owner references
SELECT 'Checking profiles table:' as debug_step;
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'business_owner' THEN 1 END) as business_owners
FROM public.profiles;

-- Step 7: Test the exact query that's failing
SELECT 'Testing the exact query from the app:' as debug_step;
-- This simulates the query from the React component
SELECT 
  b.*,
  p.id as owner_id,
  p.full_name as owner_full_name
FROM public.businesses b
LEFT JOIN public.profiles p ON b.owner_id = p.id
WHERE b.id = (SELECT id FROM public.businesses LIMIT 1)
LIMIT 1;
