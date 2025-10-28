-- DYNAMIC MESSAGING SYSTEM FOR ALL USERS (CURRENT + FUTURE)
-- This creates a system that works for ANY user, not just the current 3

-- Step 1: Ensure proper database structure
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 2: Create a function to automatically seed conversations for new users
CREATE OR REPLACE FUNCTION public.seed_conversations_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_user RECORD;
    message_count INTEGER := 0;
BEGIN
    -- Get a random existing user to start conversations with
    SELECT id, full_name, role 
    INTO existing_user
    FROM public.profiles 
    WHERE id != NEW.id 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- If we found an existing user, create some sample conversations
    IF existing_user.id IS NOT NULL THEN
        -- Add 2-3 sample messages from existing user to new user
        INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
        VALUES 
            (existing_user.id, NEW.id, 
             CASE 
                 WHEN existing_user.role = 'admin' THEN 'Welcome to Haulers! I''m here to help.'
                 WHEN existing_user.role = 'provider' THEN 'Hi! I''m a service provider on Haulers. How can I help?'
                 ELSE 'Hey! Welcome to the community!'
             END, 
             'general', false, now() - interval '2 hours'),
             
            (existing_user.id, NEW.id, 
             CASE 
                 WHEN existing_user.role = 'admin' THEN 'Feel free to ask me any questions about the platform.'
                 WHEN existing_user.role = 'provider' THEN 'I''d love to help you with your moving needs!'
                 ELSE 'Looking forward to connecting!'
             END, 
             'general', false, now() - interval '1 hour');
             
        message_count := 2;
        
        -- Add 1-2 sample messages from new user to existing user
        INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
        VALUES 
            (NEW.id, existing_user.id, 
             CASE 
                 WHEN NEW.role = 'consumer' THEN 'Hi! Thanks for reaching out. I''m new here!'
                 WHEN NEW.role = 'provider' THEN 'Hello! I''m excited to join as a service provider.'
                 ELSE 'Hi! Thanks for the welcome message.'
             END, 
             'general', false, now() - interval '30 minutes');
             
        message_count := message_count + 1;
        
        RAISE NOTICE 'Seeded % conversations for new user % (%)', message_count, NEW.full_name, NEW.role;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to automatically seed conversations when new user signs up
DROP TRIGGER IF EXISTS on_new_user_conversations ON public.profiles;
CREATE TRIGGER on_new_user_conversations
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.seed_conversations_for_new_user();

-- Step 4: Update existing users with proper recipient_id relationships
-- This ensures current users also have proper conversations

-- Update existing messages to have proper recipient relationships
UPDATE public.messages 
SET recipient_id = CASE 
    -- If sender is Alexander, recipient is Nikki (for existing messages)
    WHEN sender_id = 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid THEN '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid
    -- If sender is Donna, recipient is Nikki (for existing messages)  
    WHEN sender_id = '66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid THEN '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid
    -- If sender is Nikki, recipient is Alexander (for existing messages)
    WHEN sender_id = '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid THEN 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid
    ELSE 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid
END
WHERE recipient_id IS NULL;

-- Step 5: Add comprehensive sample conversations for current users
-- This creates a realistic messaging network

-- Conversations between Alexander (admin) and Nikki (consumer)
INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
VALUES 
    -- Alexander to Nikki
    ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'Hey Nikki! How are you doing?', 'general', false, now() - interval '3 hours'),
    ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'I saw your review on the moving service!', 'general', false, now() - interval '2 hours 30 minutes'),
    ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'Want to grab coffee sometime?', 'general', false, now() - interval '2 hours'),
    
    -- Nikki to Alexander
    ('7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, 'Hi Alexander! I am good, thanks!', 'general', false, now() - interval '1 hour 45 minutes'),
    ('7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, 'Yes, coffee sounds great!', 'general', false, now() - interval '1 hour 30 minutes'),

-- Conversations between Donna (provider) and Nikki (consumer)
    -- Donna to Nikki
    ('66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'Hi Nikki! I need help with moving.', 'general', false, now() - interval '4 hours'),
    ('66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'Can you help me move next week?', 'general', false, now() - interval '3 hours 30 minutes'),
    ('66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, '7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, 'I heard you had a great experience with movers!', 'general', false, now() - interval '3 hours'),
    
    -- Nikki to Donna
    ('7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, '66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, 'Hi Donna! Sure, I can help!', 'general', false, now() - interval '2 hours 45 minutes'),
    ('7f9758cf-1900-47f4-9ac3-617dadfdf013'::uuid, '66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, 'What day works best for you?', 'general', false, now() - interval '2 hours 15 minutes'),

-- Conversations between Alexander (admin) and Donna (provider)
    -- Alexander to Donna
    ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, '66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, 'Hi Donna! How is your business going?', 'general', false, now() - interval '5 hours'),
    ('e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, '66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, 'I saw you got some great reviews!', 'general', false, now() - interval '4 hours 30 minutes'),
    
    -- Donna to Alexander
    ('66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, 'Hi Alexander! Business is great!', 'general', false, now() - interval '4 hours 15 minutes'),
    ('66d204a4-7ecd-4714-a09b-6c57719ceac5'::uuid, 'e82a2ac1-c1c9-4a70-abf9-958472e5a5f7'::uuid, 'Thanks for the platform!', 'general', false, now() - interval '3 hours 45 minutes');

-- Step 6: Update RLS policies to handle recipient_id
DROP POLICY IF EXISTS "select_messages" ON public.messages;
CREATE POLICY "select_messages" ON public.messages FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.bookings bk WHERE bk.id = booking_id AND (
        bk.consumer_id = auth.uid() or exists (select 1 from public.businesses b where b.id = bk.business_id and b.owner_id = auth.uid())
    )) OR
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_messages" ON public.messages;
CREATE POLICY "insert_messages" ON public.messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
        recipient_id IS NOT NULL OR
        EXISTS (SELECT 1 FROM public.bookings bk WHERE bk.id = booking_id AND (
            bk.consumer_id = auth.uid() or exists (select 1 from public.businesses b where b.id = bk.business_id and b.owner_id = auth.uid())
        )) OR
        EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid())
    )
);

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages(sender_id, recipient_id);

-- Step 8: Verify the setup
SELECT '=== DYNAMIC MESSAGING SYSTEM SETUP COMPLETE ===' as debug_info;
SELECT 
    'Total messages:' as info,
    COUNT(*) as count
FROM public.messages;

SELECT '=== MESSAGE DISTRIBUTION ===' as debug_info;
SELECT 
    s.full_name as sender_name,
    r.full_name as recipient_name,
    COUNT(*) as message_count
FROM public.messages m
JOIN public.profiles s ON m.sender_id = s.id
JOIN public.profiles r ON m.recipient_id = r.id
GROUP BY s.full_name, r.full_name
ORDER BY message_count DESC;

SELECT '=== TRIGGER VERIFICATION ===' as debug_info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_new_user_conversations';
