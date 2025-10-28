-- Fix message visibility issue
-- The problem: Messages are sent BY Alexander and Donna, but current user needs to RECEIVE messages to see them

-- Step 1: Check current user and all users
SELECT '=== CURRENT USER CHECK ===' as debug_info;
SELECT 
  auth.uid() as current_user_id,
  p.full_name as current_user_name,
  p.role as current_user_role
FROM public.profiles p 
WHERE p.id = auth.uid();

SELECT '=== ALL USERS IN SYSTEM ===' as debug_info;
SELECT id, full_name, role, created_at FROM public.profiles ORDER BY created_at;

-- Step 2: Check current messages
SELECT '=== CURRENT MESSAGES ===' as debug_info;
SELECT 
  m.id,
  s.full_name as sender_name,
  m.body,
  m.created_at,
  m.is_read
FROM public.messages m
JOIN public.profiles s ON m.sender_id = s.id
ORDER BY m.created_at DESC;

-- Step 3: Add messages where CURRENT USER receives messages from Alexander and Donna
-- This will make messages appear in the conversations list

-- Get Alexander's ID (assuming he's the admin)
-- Get Donna's ID (assuming she's a consumer)
-- Get current user's ID

-- Example: If current user ID is 'your-user-id', add these messages:
/*
INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
VALUES 
  -- Messages from Alexander to current user
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Hey! How are you doing?', 'general', false, now() - interval '2 hours'),
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Want to grab coffee sometime?', 'general', false, now() - interval '1 hour'),
  
  -- Messages from Donna to current user  
  ('7b70ac1d-dee5-4bfe-b3d7-d50d371918c2', 'Hi there! I need help with moving.', 'general', false, now() - interval '1 hour 30 minutes'),
  ('7b70ac1d-dee5-4bfe-b3d7-d50d371918c2', 'Can you help me move next week?', 'general', false, now() - interval '45 minutes');
*/

-- Step 4: Instructions for manual fix
SELECT '=== MANUAL FIX INSTRUCTIONS ===' as debug_info;
SELECT 
  '1. Note your current user ID from the first query' as step1,
  '2. Note Alexander Shvetz ID (e82a2ac1-c1c9-4a70-abf9-958472e5a5f7)' as step2,
  '3. Note Donna ID (7b70ac1d-dee5-4bfe-b3d7-d50d371918c2)' as step3,
  '4. Replace YOUR_USER_ID in the INSERT statements below' as step4,
  '5. Uncomment and run the INSERT statements' as step5;

-- Step 5: Template INSERT statements (uncomment and modify)
/*
-- Replace 'YOUR_USER_ID' with your actual user ID from step 1
INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
VALUES 
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Hey! How are you doing?', 'general', false, now() - interval '2 hours'),
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Want to grab coffee sometime?', 'general', false, now() - interval '1 hour'),
  ('7b70ac1d-dee5-4bfe-b3d7-d50d371918c2', 'Hi there! I need help with moving.', 'general', false, now() - interval '1 hour 30 minutes'),
  ('7b70ac1d-dee5-4bfe-b3d7-d50d371918c2', 'Can you help me move next week?', 'general', false, now() - interval '45 minutes');
*/
