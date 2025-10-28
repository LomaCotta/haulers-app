-- Add sample messages for testing (works with current database structure)
-- This script creates test messages between users

-- First, let's see what users we have
SELECT 'Current users in the system:' as info;
SELECT id, full_name, role FROM public.profiles ORDER BY created_at;

-- Add some sample messages
-- Replace USER_ID_1, USER_ID_2, etc. with actual user IDs from the query above

-- Example messages (uncomment and replace with actual user IDs):
-- INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
-- VALUES 
--   ('USER_ID_1', 'Hey! How are you doing?', 'general', false, now() - interval '2 hours'),
--   ('USER_ID_2', 'I''m doing great! Thanks for asking.', 'general', false, now() - interval '1 hour 45 minutes'),
--   ('USER_ID_1', 'Want to grab coffee sometime?', 'general', false, now() - interval '1 hour 30 minutes'),
--   ('USER_ID_2', 'That sounds great! When works for you?', 'general', false, now() - interval '1 hour 15 minutes'),
--   ('USER_ID_1', 'How about tomorrow at 2 PM?', 'general', false, now() - interval '1 hour'),
--   ('USER_ID_3', 'Hi! I heard you''re looking for moving services?', 'general', false, now() - interval '3 hours'),
--   ('USER_ID_4', 'Yes! I need help moving next week.', 'general', false, now() - interval '2 hours 45 minutes'),
--   ('USER_ID_3', 'Perfect! I can help with that. What day works best?', 'general', false, now() - interval '2 hours 30 minutes');

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
