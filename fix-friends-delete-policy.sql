-- Fix missing DELETE policy for friends table
-- This allows users to delete their own friend requests (cancel/decline)

-- Check if DELETE policy exists
SELECT 'Current friends table policies:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'friends' 
ORDER BY cmd, policyname;

-- Add DELETE policy if it doesn't exist
-- This allows users to delete friend requests they sent or received
DROP POLICY IF EXISTS "users_can_delete_own_friend_requests" ON public.friends;
CREATE POLICY "users_can_delete_own_friend_requests" ON public.friends
FOR DELETE USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

-- Verify the policy was created
SELECT 'After adding DELETE policy:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'friends' 
ORDER BY cmd, policyname;

-- Test the policy by checking if we can delete (this won't actually delete anything)
-- Replace 'YOUR_USER_ID' with an actual user ID to test
-- SELECT 'Testing DELETE policy (this query should work if policy is correct):' as info;
-- SELECT COUNT(*) as test_delete_count
-- FROM public.friends 
-- WHERE (user_id = 'YOUR_USER_ID' OR friend_id = 'YOUR_USER_ID');
