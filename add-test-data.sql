-- Add some test data to make the dashboard more interesting

-- Insert a test profile (you'll need to replace the UUID with a real user ID)
-- First, sign up a user through the app, then get their ID from the auth.users table

-- Example test businesses
INSERT INTO public.businesses (
  id,
  owner_id,
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
  verified
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1), -- This will use the first user
  'Premium Moving Services',
  'premium-moving',
  'Professional moving services with full insurance coverage',
  ARRAY['Moving', 'Packing', 'Storage'],
  '123 Main St',
  'Los Angeles',
  'CA',
  '90210',
  4.8,
  47,
  true
);

-- Add some test bookings
INSERT INTO public.bookings (
  id,
  consumer_id,
  business_id,
  status,
  move_date,
  details,
  quote_cents
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM public.businesses LIMIT 1),
  'scheduled',
  CURRENT_DATE + INTERVAL '7 days',
  '{"size": "2-bedroom", "notes": "Third floor apartment"}',
  45000
);
