-- Add sample messages for testing the messaging system
-- This script will create some test conversations between users

-- First, let's get the user IDs from the profiles table
SELECT 'Current users in the system:' as info;
SELECT id, full_name, role FROM public.profiles ORDER BY created_at;

-- Create sample messages between users
-- Replace these with actual user IDs from your system after running the query above

-- Example: Create messages between two users
-- You'll need to replace 'USER_ID_1' and 'USER_ID_2' with actual user IDs

-- Sample conversation 1: User A sends messages to User B
-- INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
-- VALUES 
--   ('USER_ID_1', 'USER_ID_2', 'Hey! How are you doing?', 'general', false, now() - interval '2 hours'),
--   ('USER_ID_2', 'USER_ID_1', 'I''m doing great! Thanks for asking.', 'general', false, now() - interval '1 hour 45 minutes'),
--   ('USER_ID_1', 'USER_ID_2', 'Want to grab coffee sometime?', 'general', false, now() - interval '1 hour 30 minutes'),
--   ('USER_ID_2', 'USER_ID_1', 'That sounds great! When works for you?', 'general', false, now() - interval '1 hour 15 minutes'),
--   ('USER_ID_1', 'USER_ID_2', 'How about tomorrow at 2 PM?', 'general', false, now() - interval '1 hour');

-- Sample conversation 2: User B sends messages to User C
-- INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
-- VALUES 
--   ('USER_ID_2', 'USER_ID_3', 'Hi! I heard you''re looking for moving services?', 'general', false, now() - interval '3 hours'),
--   ('USER_ID_3', 'USER_ID_2', 'Yes! I need help moving next week.', 'general', false, now() - interval '2 hours 45 minutes'),
--   ('USER_ID_2', 'USER_ID_3', 'Perfect! I can help with that. What day works best?', 'general', false, now() - interval '2 hours 30 minutes');

-- Sample conversation 3: User A sends messages to User C
-- INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
-- VALUES 
--   ('USER_ID_1', 'USER_ID_3', 'Hello! I saw your post about needing help.', 'general', false, now() - interval '4 hours'),
--   ('USER_ID_3', 'USER_ID_1', 'Hi! Yes, I need assistance with my move.', 'general', false, now() - interval '3 hours 45 minutes'),
--   ('USER_ID_1', 'USER_ID_3', 'I''d be happy to help! What do you need?', 'general', false, now() - interval '3 hours 30 minutes');

-- To create actual sample data, run this query first to get user IDs:
-- SELECT id, full_name FROM public.profiles LIMIT 3;

-- Then replace USER_ID_1, USER_ID_2, USER_ID_3 with the actual IDs and uncomment the INSERT statements above.

-- Verify messages were created
SELECT 'Sample messages created:' as info;
SELECT 
  m.id,
  s.full_name as sender_name,
  r.full_name as recipient_name,
  m.body,
  m.created_at,
  m.is_read
FROM public.messages m
JOIN public.profiles s ON m.sender_id = s.id
JOIN public.profiles r ON m.recipient_id = r.id
ORDER BY m.created_at DESC;
