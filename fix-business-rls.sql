-- Fix Business RLS Policies
-- This ensures businesses are publicly visible

-- Step 1: Check current RLS status
SELECT 'Current RLS status:' as debug_step;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'businesses';

-- Step 2: Check existing policies
SELECT 'Existing policies:' as debug_step;
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'businesses';

-- Step 3: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public can view verified businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Public can view all businesses" ON public.businesses;

-- Step 4: Create a simple public read policy
CREATE POLICY "Public can view all businesses" ON public.businesses
  FOR SELECT USING (true);

-- Step 5: Ensure RLS is enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 6: Test the policy
SELECT 'Testing public access:' as debug_step;
SELECT 
  id,
  name,
  verified,
  city,
  state
FROM public.businesses 
LIMIT 3;

-- Step 7: Success message
SELECT 'Business RLS policies fixed successfully! 🚀' as status;
