-- Debug and fix bookings query issues
-- Run this in Supabase SQL Editor to test the query

-- First, let's check what bookings exist
SELECT 
  id,
  consumer_id,
  business_id,
  status,
  move_date,
  quote_cents,
  created_at
FROM public.bookings 
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any bookings at all
SELECT COUNT(*) as total_bookings FROM public.bookings;

-- Check the relationships
SELECT 
  b.id as booking_id,
  b.status,
  b.move_date,
  c.full_name as consumer_name,
  bus.name as business_name,
  bo.full_name as business_owner_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.consumer_id = c.id
LEFT JOIN public.businesses bus ON b.business_id = bus.id
LEFT JOIN public.profiles bo ON bus.owner_id = bo.id
ORDER BY b.created_at DESC
LIMIT 5;

-- Check for any foreign key issues
SELECT 
  'bookings' as table_name,
  COUNT(*) as count
FROM public.bookings
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
  'businesses' as table_name,
  COUNT(*) as count
FROM public.businesses;

-- Check RLS policies on bookings table
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
WHERE tablename = 'bookings';
