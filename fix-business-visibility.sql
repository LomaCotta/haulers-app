-- Fix Business Visibility Issues
-- This ensures all businesses are visible regardless of verification status

-- Step 1: Check current RLS policies
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

-- Step 2: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can view verified businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Public can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON public.businesses;

-- Step 3: Create comprehensive RLS policies
-- Allow public to view ALL businesses (verified or not)
CREATE POLICY "Public can view all businesses" ON public.businesses
  FOR SELECT USING (true);

-- Allow business owners to update their own businesses
CREATE POLICY "Business owners can update their businesses" ON public.businesses
  FOR UPDATE USING (owner_id = auth.uid());

-- Allow business owners to insert new businesses
CREATE POLICY "Business owners can insert businesses" ON public.businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Allow business owners to delete their own businesses
CREATE POLICY "Business owners can delete their businesses" ON public.businesses
  FOR DELETE USING (owner_id = auth.uid());

-- Allow admins to do everything
CREATE POLICY "Admins can manage all businesses" ON public.businesses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 5: Test the policies
SELECT 'Testing public access to all businesses:' as debug_step;
SELECT 
  id,
  name,
  verified,
  verification_status,
  city,
  state,
  owner_id
FROM public.businesses 
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Test specific business access
SELECT 'Testing specific business access:' as debug_step;
SELECT 
  id,
  name,
  verified,
  verification_status,
  logo_url,
  cover_photo_url,
  gallery_photos
FROM public.businesses 
WHERE id = '724093b1-62b8-4926-a332-37779f566efe';

-- Step 7: Check if there are any other tables that might be blocking access
SELECT 'Checking related table policies:' as debug_step;
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'reviews')
ORDER BY tablename, policyname;

-- Step 8: Success message
SELECT 'Business visibility fixed! All businesses should now be visible. 🚀' as status;
