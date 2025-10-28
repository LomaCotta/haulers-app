-- Fix duplicate policies on profiles table
-- Run this in Supabase SQL Editor

-- Drop the duplicate insert policy
DROP POLICY IF EXISTS "insert_profile" ON public.profiles;

-- Keep only the insert_own_profile policy
-- Verify the remaining policies
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
WHERE tablename = 'profiles'
ORDER BY policyname;
