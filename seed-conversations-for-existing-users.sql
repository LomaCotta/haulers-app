-- MANUAL CONVERSATION SEEDING FOR EXISTING USERS
-- Use this to add conversations for users who don't have any yet

-- Step 1: Check which users have no conversations
SELECT '=== USERS WITH NO CONVERSATIONS ===' as debug_info;
SELECT 
    p.id,
    p.full_name,
    p.role,
    COUNT(m.id) as message_count
FROM public.profiles p
LEFT JOIN public.messages m ON (m.sender_id = p.id OR m.recipient_id = p.id)
GROUP BY p.id, p.full_name, p.role
HAVING COUNT(m.id) = 0
ORDER BY p.created_at;

-- Step 2: Function to seed conversations for a specific user
CREATE OR REPLACE FUNCTION public.seed_conversations_for_user(target_user_id uuid)
RETURNS INTEGER AS $$
DECLARE
    existing_user RECORD;
    message_count INTEGER := 0;
    target_user RECORD;
BEGIN
    -- Get target user info
    SELECT id, full_name, role INTO target_user
    FROM public.profiles 
    WHERE id = target_user_id;
    
    IF target_user.id IS NULL THEN
        RAISE EXCEPTION 'User with ID % not found', target_user_id;
    END IF;
    
    -- Get a random existing user to start conversations with
    SELECT id, full_name, role 
    INTO existing_user
    FROM public.profiles 
    WHERE id != target_user_id 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- If we found an existing user, create some sample conversations
    IF existing_user.id IS NOT NULL THEN
        -- Add 2-3 sample messages from existing user to target user
        INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
        VALUES 
            (existing_user.id, target_user_id, 
             CASE 
                 WHEN existing_user.role = 'admin' THEN 'Welcome to Haulers! I''m here to help.'
                 WHEN existing_user.role = 'provider' THEN 'Hi! I''m a service provider on Haulers. How can I help?'
                 ELSE 'Hey! Welcome to the community!'
             END, 
             'general', false, now() - interval '2 hours'),
             
            (existing_user.id, target_user_id, 
             CASE 
                 WHEN existing_user.role = 'admin' THEN 'Feel free to ask me any questions about the platform.'
                 WHEN existing_user.role = 'provider' THEN 'I''d love to help you with your moving needs!'
                 ELSE 'Looking forward to connecting!'
             END, 
             'general', false, now() - interval '1 hour');
             
        message_count := 2;
        
        -- Add 1-2 sample messages from target user to existing user
        INSERT INTO public.messages (sender_id, recipient_id, body, message_type, is_read, created_at)
        VALUES 
            (target_user_id, existing_user.id, 
             CASE 
                 WHEN target_user.role = 'consumer' THEN 'Hi! Thanks for reaching out. I''m new here!'
                 WHEN target_user.role = 'provider' THEN 'Hello! I''m excited to join as a service provider.'
                 ELSE 'Hi! Thanks for the welcome message.'
             END, 
             'general', false, now() - interval '30 minutes');
             
        message_count := message_count + 1;
        
        RAISE NOTICE 'Seeded % conversations for user % (%)', message_count, target_user.full_name, target_user.role;
    END IF;
    
    RETURN message_count;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Example usage - seed conversations for a specific user
-- Replace 'USER_ID_HERE' with the actual user ID
-- SELECT public.seed_conversations_for_user('USER_ID_HERE');

-- Step 4: Seed conversations for all users who have no conversations
-- This will automatically add conversations for any user with 0 messages
DO $$
DECLARE
    user_record RECORD;
    total_seeded INTEGER := 0;
BEGIN
    FOR user_record IN 
        SELECT p.id, p.full_name, p.role
        FROM public.profiles p
        LEFT JOIN public.messages m ON (m.sender_id = p.id OR m.recipient_id = p.id)
        GROUP BY p.id, p.full_name, p.role
        HAVING COUNT(m.id) = 0
    LOOP
        total_seeded := total_seeded + public.seed_conversations_for_user(user_record.id);
    END LOOP;
    
    RAISE NOTICE 'Total conversations seeded: %', total_seeded;
END $$;

-- Step 5: Verify all users now have conversations
SELECT '=== FINAL VERIFICATION ===' as debug_info;
SELECT 
    p.full_name,
    p.role,
    COUNT(m.id) as message_count,
    COUNT(DISTINCT CASE WHEN m.sender_id = p.id THEN m.recipient_id ELSE m.sender_id END) as conversation_partners
FROM public.profiles p
LEFT JOIN public.messages m ON (m.sender_id = p.id OR m.recipient_id = p.id)
GROUP BY p.id, p.full_name, p.role
ORDER BY message_count DESC;
