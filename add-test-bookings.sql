-- Add test bookings if none exist
-- Run this in Supabase SQL Editor

-- First check if we have any bookings
SELECT COUNT(*) as booking_count FROM public.bookings;

-- If no bookings exist, create some test data
INSERT INTO public.bookings (
  consumer_id,
  business_id,
  status,
  move_date,
  details,
  quote_cents,
  created_at
)
SELECT 
  (SELECT id FROM public.profiles WHERE role = 'consumer' LIMIT 1) as consumer_id,
  (SELECT id FROM public.businesses LIMIT 1) as business_id,
  'requested' as status,
  CURRENT_DATE + INTERVAL '7 days' as move_date,
  '{"size": "2-bedroom", "notes": "Moving from downtown to suburbs"}' as details,
  45000 as quote_cents,
  NOW() as created_at
WHERE NOT EXISTS (SELECT 1 FROM public.bookings LIMIT 1);

-- Add a few more test bookings with different statuses
INSERT INTO public.bookings (
  consumer_id,
  business_id,
  status,
  move_date,
  details,
  quote_cents,
  created_at
)
SELECT 
  (SELECT id FROM public.profiles WHERE role = 'consumer' LIMIT 1) as consumer_id,
  (SELECT id FROM public.businesses LIMIT 1) as business_id,
  'quoted' as status,
  CURRENT_DATE + INTERVAL '14 days' as move_date,
  '{"size": "1-bedroom", "notes": "Small apartment move"}' as details,
  25000 as quote_cents,
  NOW() - INTERVAL '2 days' as created_at
WHERE (SELECT COUNT(*) FROM public.bookings) < 2;

INSERT INTO public.bookings (
  consumer_id,
  business_id,
  status,
  move_date,
  details,
  quote_cents,
  created_at
)
SELECT 
  (SELECT id FROM public.profiles WHERE role = 'consumer' LIMIT 1) as consumer_id,
  (SELECT id FROM public.businesses LIMIT 1) as business_id,
  'completed' as status,
  CURRENT_DATE - INTERVAL '5 days' as move_date,
  '{"size": "3-bedroom", "notes": "Family home move"}' as details,
  75000 as quote_cents,
  NOW() - INTERVAL '10 days' as created_at
WHERE (SELECT COUNT(*) FROM public.bookings) < 3;

-- Verify the bookings were created
SELECT 
  b.id,
  b.status,
  b.move_date,
  b.quote_cents,
  c.full_name as consumer_name,
  bus.name as business_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.consumer_id = c.id
LEFT JOIN public.businesses bus ON b.business_id = bus.id
ORDER BY b.created_at DESC;
