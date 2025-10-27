-- Check and fix admin profile for info@oneshotmove.com
-- User ID from logs: e82a2ac1-c1c9-4a70-abf9-958472e5a5f7

-- First, check if profile exists
SELECT * FROM public.profiles WHERE id = 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7';

-- If no profile exists, create one
INSERT INTO public.profiles (id, role, full_name, phone)
VALUES ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'admin', 'Alexander Shvetz', '(555) 123-4567')
ON CONFLICT (id) DO UPDATE SET 
  role = 'admin',
  full_name = 'Alexander Shvetz',
  phone = '(555) 123-4567';

-- Verify the profile was created/updated
SELECT * FROM public.profiles WHERE id = 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7';
