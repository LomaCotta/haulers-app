-- Fix messages table to support proper conversations
-- Add recipient_id field to track who receives the message

-- Add recipient_id column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages(sender_id, recipient_id);

-- Update RLS policies to include recipient_id
DROP POLICY IF EXISTS "select_messages" ON public.messages;
CREATE POLICY "select_messages" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

DROP POLICY IF EXISTS "insert_messages" ON public.messages;
CREATE POLICY "insert_messages" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);

-- Add some sample messages for testing
-- First, let's get some user IDs to create sample conversations
-- Replace these with actual user IDs from your system

-- Sample messages between users (replace with actual user IDs)
-- INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read)
-- VALUES 
--   ('USER_ID_1', 'USER_ID_2', 'Hey! How are you doing?', 'general', false),
--   ('USER_ID_2', 'USER_ID_1', 'I''m doing great! Thanks for asking.', 'general', false),
--   ('USER_ID_1', 'USER_ID_2', 'Want to grab coffee sometime?', 'general', false),
--   ('USER_ID_2', 'USER_ID_1', 'That sounds great! When works for you?', 'general', false);

-- Verify the changes
SELECT 'Messages table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

SELECT 'Messages table policies:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'messages' 
ORDER BY cmd, policyname;
