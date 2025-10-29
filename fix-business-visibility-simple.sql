-- Simple Fix for Business Visibility
-- This ensures all businesses are visible regardless of verification status

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "Public can view verified businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;

-- Step 2: Create a simple public read policy
CREATE POLICY "Public can view all businesses" ON public.businesses
  FOR SELECT USING (true);

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 4: Test the fix
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

-- Step 5: Success message
SELECT 'Business visibility fixed! All businesses should now be visible. 🚀' as status;
