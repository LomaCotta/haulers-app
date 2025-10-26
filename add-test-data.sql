-- Add some test data to make the dashboard more interesting
-- Run this in Supabase SQL Editor after the main setup

-- First, let's see what users exist and create profiles for them
SELECT id, email FROM auth.users LIMIT 5;

-- Create profiles for existing users if they don't have them
INSERT INTO public.profiles (id, role, full_name, created_at)
SELECT 
  id, 
  'provider' as role,
  COALESCE(raw_user_meta_data->>'full_name', 'Test User') as full_name,
  NOW() as created_at
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.profiles)
LIMIT 3;

-- Now insert some test businesses
INSERT INTO public.businesses (
  name,
  slug,
  description,
  service_types,
  address,
  city,
  state,
  postal_code,
  rating_avg,
  rating_count,
  verified,
  owner_id
) VALUES 
(
  'Premium Moving Services',
  'premium-moving',
  'Professional moving services with full insurance coverage and experienced team.',
  ARRAY['Moving', 'Packing', 'Storage'],
  '123 Main St',
  'Los Angeles',
  'CA',
  '90210',
  4.8,
  47,
  true,
  (SELECT id FROM public.profiles WHERE role = 'provider' LIMIT 1)
),
(
  'Quick Clean Services',
  'quick-clean',
  'Fast and reliable cleaning services for homes and offices.',
  ARRAY['Cleaning', 'Deep Cleaning', 'Office Cleaning'],
  '456 Oak Ave',
  'Los Angeles',
  'CA',
  '90211',
  4.6,
  23,
  true,
  (SELECT id FROM public.profiles WHERE role = 'provider' LIMIT 1)
),
(
  'Elite Plumbing Co',
  'elite-plumbing',
  '24/7 emergency plumbing services with licensed professionals.',
  ARRAY['Plumbing', 'Emergency', 'Repair'],
  '789 Pine St',
  'Los Angeles',
  'CA',
  '90212',
  4.9,
  34,
  true,
  (SELECT id FROM public.profiles WHERE role = 'provider' LIMIT 1)
);

-- Add some test bookings
INSERT INTO public.bookings (
  consumer_id,
  business_id,
  status,
  move_date,
  details,
  quote_cents
) VALUES 
(
  (SELECT id FROM public.profiles WHERE role = 'consumer' LIMIT 1),
  (SELECT id FROM public.businesses WHERE slug = 'premium-moving'),
  'scheduled',
  CURRENT_DATE + INTERVAL '7 days',
  '{"size": "2-bedroom", "notes": "Third floor apartment, no elevator"}',
  45000
),
(
  (SELECT id FROM public.profiles WHERE role = 'consumer' LIMIT 1),
  (SELECT id FROM public.businesses WHERE slug = 'quick-clean'),
  'completed',
  CURRENT_DATE - INTERVAL '3 days',
  '{"type": "deep-clean", "notes": "Post-renovation cleanup"}',
  25000
);

-- Add some test reviews
INSERT INTO public.reviews (
  booking_id,
  consumer_id,
  business_id,
  rating,
  body
) VALUES 
(
  (SELECT id FROM public.bookings WHERE status = 'completed' LIMIT 1),
  (SELECT id FROM public.profiles WHERE role = 'consumer' LIMIT 1),
  (SELECT id FROM public.businesses WHERE slug = 'quick-clean'),
  5,
  'Excellent service! The team was professional and thorough. Highly recommended!'
);