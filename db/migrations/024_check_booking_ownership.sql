-- Check booking ownership and customer details
-- This helps identify why bookings aren't showing

-- Check ALL bookings and their relationships
SELECT 
  b.id as booking_id,
  b.customer_id,
  b.business_id,
  b.booking_status,
  b.requested_date,
  b.requested_time,
  b.customer_email,
  b.customer_phone,
  b.total_price_cents,
  b.created_at,
  c.full_name as customer_name,
  c.id as customer_profile_id,
  c.phone as customer_profile_phone,
  bus.name as business_name,
  bus.owner_id as business_owner_id,
  owner_profile.full_name as business_owner_name,
  owner_profile.phone as owner_phone
FROM public.bookings b
LEFT JOIN public.profiles c ON b.customer_id = c.id
LEFT JOIN public.businesses bus ON b.business_id = bus.id
LEFT JOIN public.profiles owner_profile ON bus.owner_id = owner_profile.id
ORDER BY b.created_at DESC
LIMIT 20;

-- Check specifically for bookings for Raul Moving Service (Harry's business)
SELECT 
  b.id as booking_id,
  b.customer_id,
  b.booking_status,
  b.requested_date,
  b.created_at,
  c.full_name as customer_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.customer_id = c.id
WHERE b.business_id = '473b1f87-533b-44e6-8a04-2dda21cea676'
ORDER BY b.created_at DESC;

-- Check specifically for bookings for Shleppers Moving (Donna's business)
SELECT 
  b.id as booking_id,
  b.customer_id,
  b.booking_status,
  b.requested_date,
  b.created_at,
  c.full_name as customer_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.customer_id = c.id
WHERE b.business_id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95'
ORDER BY b.created_at DESC;

-- Count bookings by business
SELECT 
  bus.name as business_name,
  bus.id as business_id,
  bus.owner_id,
  (SELECT full_name FROM public.profiles WHERE id = bus.owner_id) as owner_name,
  COUNT(b.id) as booking_count
FROM public.businesses bus
LEFT JOIN public.bookings b ON b.business_id = bus.id
GROUP BY bus.id, bus.name, bus.owner_id
ORDER BY booking_count DESC;

