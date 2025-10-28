-- Fix RLS policies for admin bookings access
-- Run this in Supabase SQL Editor

-- First, check current RLS policies on bookings
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

-- Drop existing policies that might be blocking admin access
DROP POLICY IF EXISTS "select_booking" ON public.bookings;
DROP POLICY IF EXISTS "insert_booking" ON public.bookings;
DROP POLICY IF EXISTS "update_booking_business" ON public.bookings;

-- Create new policies that allow admin full access
CREATE POLICY "admin_full_access_bookings" ON public.bookings 
FOR ALL 
USING (
  -- Allow full access to admins
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Allow consumers to see their own bookings
  consumer_id = auth.uid()
  OR
  -- Allow business owners to see bookings for their businesses
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);

-- Verify the new policy was created
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

-- Test the query that the admin page uses
SELECT 
  b.id,
  b.consumer_id,
  b.business_id,
  b.status,
  b.move_date,
  b.details,
  b.quote_cents,
  b.created_at,
  c.full_name as consumer_name,
  bus.name as business_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.consumer_id = c.id
LEFT JOIN public.businesses bus ON b.business_id = bus.id
ORDER BY b.created_at DESC;
