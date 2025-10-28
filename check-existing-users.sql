-- Check existing users and profiles in the database
-- Run this in Supabase SQL Editor to see what's actually there

-- First, check what users exist in auth.users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role
FROM auth.users 
ORDER BY created_at DESC;

-- Check what profiles exist in public.profiles
SELECT 
  id,
  role,
  full_name,
  phone,
  created_at
FROM public.profiles 
ORDER BY created_at DESC;

-- Check if there are any users without profiles
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.id as profile_id,
  p.role as profile_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Count users by role
SELECT 
  role,
  COUNT(*) as count
FROM public.profiles 
GROUP BY role;

-- Check RLS policies on profiles table
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
WHERE tablename = 'profiles';
