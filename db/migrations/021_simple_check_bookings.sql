-- Simple query to check bookings (works regardless of column name)
-- This shows what bookings exist and their business relationships

-- First, check what columns actually exist
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
  AND column_name IN ('status', 'booking_status', 'consumer_id', 'customer_id')
ORDER BY column_name;

-- Then, just see what bookings exist (using actual schema columns)
SELECT 
  b.id,
  b.business_id,
  b.requested_date,
  b.requested_time,
  b.booking_status,
  b.total_price_cents,
  b.service_address,
  b.created_at
FROM public.bookings b
ORDER BY b.created_at DESC
LIMIT 20;

-- Then see which businesses they belong to
SELECT 
  bus.id as business_id,
  bus.name as business_name,
  bus.owner_id,
  COUNT(b.id) as booking_count
FROM public.businesses bus
LEFT JOIN public.bookings b ON b.business_id = bus.id
GROUP BY bus.id, bus.name, bus.owner_id
HAVING COUNT(b.id) > 0
ORDER BY booking_count DESC;

-- Check RLS policies on bookings
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 100) as policy_expression
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;

