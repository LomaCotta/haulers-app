-- Alternative approach to get user ID and fix messaging
-- Since auth.uid() isn't working, let's check all users and identify the current one

-- Step 1: Check all users in the system
SELECT '=== ALL USERS IN SYSTEM ===' as debug_info;
SELECT id, full_name, role, created_at FROM public.profiles ORDER BY created_at;

-- Step 2: Check current messages to see who sent them
SELECT '=== CURRENT MESSAGES ===' as debug_info;
SELECT 
  m.id,
  s.full_name as sender_name,
  s.id as sender_id,
  m.body,
  m.created_at,
  m.is_read
FROM public.messages m
JOIN public.profiles s ON m.sender_id = s.id
ORDER BY m.created_at DESC;

-- Step 3: Since we can't get auth.uid(), let's add messages for ALL users
-- This way, every user will see conversations

-- Add messages where each user receives messages from others
-- Replace the user IDs below with actual IDs from the first query

-- Example for user 1 (replace with actual ID):
/*
INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
VALUES 
  -- Messages from Alexander to user 1
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Hey! How are you doing?', 'general', false, now() - interval '2 hours'),
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Want to grab coffee sometime?', 'general', false, now() - interval '1 hour'),
  
  -- Messages from Donna to user 1
  ('7b70ac1d-dee5-4bfe-b3d7-d50d371918c2', 'Hi there! I need help with moving.', 'general', false, now() - interval '1 hour 30 minutes'),
  ('7b70ac1d-dee5-4bfe-b3d7-d50d371918c2', 'Can you help me move next week?', 'general', false, now() - interval '45 minutes');
*/

-- Step 4: Quick fix - add messages for the most recent user
-- This assumes the most recent user is the one you're testing with
/*
INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
SELECT 
  'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7' as sender_id,
  'Hey! How are you doing?' as body,
  'general' as message_type,
  false as is_read,
  now() - interval '2 hours' as created_at
FROM public.profiles 
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at DESC LIMIT 1);
*/
