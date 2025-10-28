-- Add messages where Nikki Scott receives messages from Alexander and Donna
-- This will make messages appear in Nikki's conversations list

-- Messages from Alexander to Nikki
INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
VALUES 
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Hey Nikki! How are you doing?', 'general', false, now() - interval '2 hours'),
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'Want to grab coffee sometime?', 'general', false, now() - interval '1 hour'),
  ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7', 'I saw your review on the moving service!', 'general', false, now() - interval '30 minutes');

-- Messages from Donna to Nikki  
INSERT INTO public.messages (sender_id, body, message_type, is_read, created_at)
VALUES 
  ('66d204a4-7ecd-4714-a09b-6c57719ceac5', 'Hi Nikki! I need help with moving.', 'general', false, now() - interval '1 hour 30 minutes'),
  ('66d204a4-7ecd-4714-a09b-6c57719ceac5', 'Can you help me move next week?', 'general', false, now() - interval '45 minutes'),
  ('66d204a4-7ecd-4714-a09b-6c57719ceac5', 'I heard you had a great experience with movers!', 'general', false, now() - interval '15 minutes');

-- Verify the messages were added
SELECT '=== NEW MESSAGES ADDED ===' as debug_info;
SELECT 
  m.id,
  s.full_name as sender_name,
  m.body,
  m.created_at,
  m.is_read
FROM public.messages m
JOIN public.profiles s ON m.sender_id = s.id
ORDER BY m.created_at DESC
LIMIT 10;
