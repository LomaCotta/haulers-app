-- Manual friend request cleanup script
-- Use this to manually delete friend requests if needed

-- Check current friend requests
SELECT 'Current friend requests:' as info;
SELECT 
    f.id,
    f.user_id,
    f.friend_id,
    f.status,
    f.created_at,
    p1.full_name as sender_name,
    p2.full_name as receiver_name
FROM public.friends f
LEFT JOIN public.profiles p1 ON f.user_id = p1.id
LEFT JOIN public.profiles p2 ON f.friend_id = p2.id
ORDER BY f.created_at DESC;

-- Delete all pending friend requests (use with caution!)
-- Uncomment the line below if you want to delete all pending requests
-- DELETE FROM public.friends WHERE status = 'pending';

-- Delete specific friend request by ID
-- Replace 'REQUEST_ID_HERE' with the actual request ID
-- DELETE FROM public.friends WHERE id = 'REQUEST_ID_HERE';

-- Check if friends table exists and has proper structure
SELECT 'Table structure check:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'friends' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 'RLS policies check:' as info;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'friends' 
AND schemaname = 'public';
