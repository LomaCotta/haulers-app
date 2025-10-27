-- Create profile for the reviewer user
-- First, let's find the user ID for contact.haulers@gmail.com

-- Check if the user exists in auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'contact.haulers@gmail.com';

-- If the user exists, create their profile
-- Replace 'USER_ID_HERE' with the actual user ID from the query above
INSERT INTO public.profiles (id, role, full_name, phone)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'consumer',
  'Nikki Scott',
  '(555) 123-4567'
);

-- Verify the profile was created
SELECT * FROM public.profiles WHERE full_name = 'Nikki Scott';
