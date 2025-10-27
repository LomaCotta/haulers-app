-- Comprehensive debugging script for friend request deletion issues

-- 1. Check all current friend requests with details
SELECT '=== CURRENT FRIEND REQUESTS ===' as debug_info;
SELECT 
    f.id as request_id,
    f.user_id as sender_id,
    f.friend_id as receiver_id,
    f.status,
    f.created_at,
    f.updated_at,
    p1.full_name as sender_name,
    p2.full_name as receiver_name
FROM public.friends f
LEFT JOIN public.profiles p1 ON f.user_id = p1.id
LEFT JOIN public.profiles p2 ON f.friend_id = p2.id
ORDER BY f.created_at DESC;

-- 2. Check RLS policies for friends table
SELECT '=== RLS POLICIES FOR FRIENDS TABLE ===' as debug_info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'friends' 
ORDER BY cmd, policyname;

-- 3. Check if DELETE policy exists specifically
SELECT '=== DELETE POLICY CHECK ===' as debug_info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'friends' AND cmd = 'DELETE'
        ) 
        THEN 'DELETE policy EXISTS' 
        ELSE 'DELETE policy MISSING' 
    END as delete_policy_status;

-- 4. Test current user context (replace with actual user ID)
-- SELECT '=== CURRENT USER CONTEXT ===' as debug_info;
-- SELECT auth.uid() as current_user_id;

-- 5. Check table structure
SELECT '=== FRIENDS TABLE STRUCTURE ===' as debug_info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'friends' 
ORDER BY ordinal_position;

-- 6. Check for any constraints or triggers
SELECT '=== CONSTRAINTS AND TRIGGERS ===' as debug_info;
SELECT 
    'CONSTRAINTS' as type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'friends'
UNION ALL
SELECT 
    'TRIGGERS' as type,
    trigger_name,
    'TRIGGER' as constraint_type
FROM information_schema.triggers 
WHERE event_object_table = 'friends';
