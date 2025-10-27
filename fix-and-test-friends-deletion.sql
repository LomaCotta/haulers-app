-- Step-by-step debugging for friend request deletion

-- STEP 1: Check if DELETE policy exists and add it if missing
SELECT 'STEP 1: Checking DELETE policy...' as step;

-- Check if DELETE policy exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'friends' AND cmd = 'DELETE'
        ) 
        THEN 'DELETE policy EXISTS' 
        ELSE 'DELETE policy MISSING - Adding it now...' 
    END as delete_policy_status;

-- Add DELETE policy if it doesn't exist
DROP POLICY IF EXISTS "users_can_delete_own_friend_requests" ON public.friends;
CREATE POLICY "users_can_delete_own_friend_requests" ON public.friends
FOR DELETE USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

-- Verify policy was created
SELECT 'DELETE policy created successfully!' as result;

-- STEP 2: Show all current friend requests
SELECT 'STEP 2: Current friend requests...' as step;
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

-- STEP 3: Test manual deletion (replace REQUEST_ID with actual ID)
-- Uncomment and replace REQUEST_ID with an actual request ID to test
-- SELECT 'STEP 3: Testing manual deletion...' as step;
-- DELETE FROM public.friends WHERE id = 'REQUEST_ID_HERE';
-- SELECT 'Manual deletion completed!' as result;

-- STEP 4: Show all policies after fix
SELECT 'STEP 4: All friends table policies after fix...' as step;
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
