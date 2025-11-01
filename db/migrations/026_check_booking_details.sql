-- Check detailed booking information to see who created them
-- This helps identify if the customer can see their own bookings

-- Show full booking details
SELECT 
  b.id as booking_id,
  b.customer_id as created_by_user_id,
  b.business_id,
  b.booking_status,
  b.requested_date,
  b.requested_time,
  b.service_address,
  b.service_city,
  b.service_state,
  b.total_price_cents,
  b.customer_email,
  b.customer_phone,
  b.created_at,
  -- Customer who created the booking
  c.full_name as customer_name,
  c.id as customer_profile_id,
  -- Business owner
  bus.name as business_name,
  bus.owner_id as business_owner_id,
  owner_profile.full_name as business_owner_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.customer_id = c.id
LEFT JOIN public.businesses bus ON b.business_id = bus.id
LEFT JOIN public.profiles owner_profile ON bus.owner_id = owner_profile.id
WHERE b.business_id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95'  -- Shleppers Moving
ORDER BY b.created_at DESC;

-- Check if bookings are accessible via RLS
-- This simulates what happens when Donna logs in (owner_id = 66d204a4-7ecd-4714-a09b-6c57719ceac5)
SELECT 
  'Bookings visible to Donna (business owner)' as access_type,
  COUNT(*) as count
FROM public.bookings b
WHERE b.business_id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95'
  AND EXISTS (
    SELECT 1 FROM public.businesses bus
    WHERE bus.id = b.business_id
    AND bus.owner_id = '66d204a4-7ecd-4714-a09b-6c57719ceac5'  -- Donna's user_id
  );

-- Check if bookings are accessible to the customer who created them
SELECT 
  'Bookings visible to customer (if logged in as customer)' as access_type,
  b.customer_id,
  c.full_name as customer_name,
  COUNT(*) as count
FROM public.bookings b
LEFT JOIN public.profiles c ON b.customer_id = c.id
WHERE b.business_id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95'
GROUP BY b.customer_id, c.full_name;

