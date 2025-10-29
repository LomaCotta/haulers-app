-- Test Business Links
-- This creates working business profile links

-- Step 1: Get all available businesses with their IDs
SELECT 'Available Businesses:' as info;
SELECT 
  id,
  name,
  verified,
  city,
  state,
  created_at
FROM public.businesses 
ORDER BY created_at DESC;

-- Step 2: Test specific business access
SELECT 'Testing Shleppers Moving:' as info;
SELECT 
  id,
  name,
  verified,
  logo_url,
  cover_photo_url,
  city,
  state
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 3: Test Thunder business
SELECT 'Testing Thunder (Male):' as info;
SELECT 
  id,
  name,
  verified,
  logo_url,
  cover_photo_url,
  city,
  state
FROM public.businesses 
WHERE id = '724093b1-62b8-4926-a332-37779f566efe';

-- Step 4: Create working links
SELECT 'Working Business Profile Links:' as info;
SELECT 
  'http://localhost:3000/b/' || id as business_url,
  name,
  verified
FROM public.businesses 
ORDER BY created_at DESC;
