-- Test RLS for Donna (owner of Shleppers Moving)
-- This simulates what Donna should see

-- Check if bookings exist for Shleppers Moving
SELECT 
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN booking_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN booking_status = 'completed' THEN 1 END) as completed
FROM public.bookings
WHERE business_id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Check bookings with customer info
SELECT 
  b.id,
  b.booking_status,
  b.requested_date,
  b.requested_time,
  b.service_address,
  b.service_city,
  b.service_state,
  b.total_price_cents,
  b.customer_email,
  b.customer_phone,
  c.full_name as customer_name,
  c.phone as customer_profile_phone
FROM public.bookings b
LEFT JOIN public.profiles c ON b.customer_id = c.id
WHERE b.business_id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95'
ORDER BY b.created_at DESC;

-- Verify RLS will allow Donna to see these bookings
-- (This simulates what the RLS policy checks)
SELECT 
  'Donna should see these bookings' as note,
  COUNT(*) as visible_count
FROM public.bookings b
WHERE b.business_id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95'
  AND EXISTS (
    SELECT 1 FROM public.businesses bus
    WHERE bus.id = b.business_id
    AND bus.owner_id = '66d204a4-7ecd-4714-a09b-6c57719ceac5' -- Donna's user_id
  );

