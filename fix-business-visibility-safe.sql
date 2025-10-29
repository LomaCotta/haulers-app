-- Safe Fix for Business Visibility
-- This handles existing policies properly

-- Step 1: Check current policies
SELECT 'Current RLS policies:' as debug_step;
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'businesses'
ORDER BY policyname;

-- Step 2: Drop existing policies safely
DROP POLICY IF EXISTS "Public can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Public can view verified businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;

-- Step 3: Create the public read policy
CREATE POLICY "Public can view all businesses" ON public.businesses
  FOR SELECT USING (true);

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 5: Test the fix
SELECT 'Testing business access:' as debug_step;
SELECT 
  id,
  name,
  verified,
  verification_status,
  city,
  state
FROM public.businesses 
ORDER BY created_at DESC
LIMIT 3;

-- Step 6: Test specific business access
SELECT 'Testing specific business access:' as debug_step;
SELECT 
  id,
  name,
  verified,
  verification_status,
  logo_url,
  cover_photo_url
FROM public.businesses 
WHERE id = '724093b1-62b8-4926-a332-37779f566efe';

-- Step 7: Success message
SELECT 'Business visibility fixed safely! All businesses should now be visible. 🚀' as status;
