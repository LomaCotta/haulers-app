-- Add messages where current user is the RECEIVER
-- This will make messages appear in the conversations list

-- First, let's see what users we have and get the current user ID
SELECT 'Current users in the system:' as info;
SELECT id, full_name, role FROM public.profiles ORDER BY created_at;

-- Add messages where the current user receives messages from other users
-- Replace 'CURRENT_USER_ID' with the actual ID of the user you're testing with
-- Replace 'OTHER_USER_ID' with Alexander Shvetz or Donna's ID

-- Example: If you're testing as user X, add messages where X receives messages from Alexander and Donna
-- INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
-- VALUES 
--   ('ALEXANDER_USER_ID', 'Hey! How are you doing?', 'general', false, now() - interval '2 hours'),
--   ('DONNA_USER_ID', 'Hi there! I need help with moving.', 'general', false, now() - interval '1 hour 30 minutes'),
--   ('ALEXANDER_USER_ID', 'Want to grab coffee sometime?', 'general', false, now() - interval '1 hour'),
--   ('DONNA_USER_ID', 'Can you help me move next week?', 'general', false, now() - interval '45 minutes');

-- Check current messages
SELECT 'Current messages in the system:' as info;
SELECT 
  m.id,
  s.full_name as sender_name,
  m.body,
  m.created_at,
  m.is_read
FROM public.messages m
JOIN public.profiles s ON m.sender_id = s.id
ORDER BY m.created_at DESC;

-- To find the correct user IDs:
-- 1. Run the first SELECT query to see all users
-- 2. Note the ID of the user you're testing with (the receiver)
-- 3. Note the IDs of Alexander Shvetz and Donna (the senders)
-- 4. Replace the placeholders in the INSERT statements
-- 5. Uncomment and run the INSERT statements
