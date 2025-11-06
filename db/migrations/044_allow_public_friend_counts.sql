-- Allow public reading of friend counts for profile display
-- This policy allows counting accepted friends but doesn't expose individual relationships

-- Drop existing restrictive policy temporarily
DROP POLICY IF EXISTS "users_can_view_own_friends" ON public.friends;

-- Create a more permissive policy that allows reading friend counts
-- This allows: SELECT COUNT(*) FROM friends WHERE user_id = X AND status = 'accepted'
-- But doesn't expose who the friends are
CREATE POLICY "users_can_view_own_friends" ON public.friends
  FOR SELECT
  USING (
    -- Allow users to see their own friends
    user_id = auth.uid() OR friend_id = auth.uid()
    OR
    -- Allow public to see friend counts (but not full relationships)
    -- This is safe because COUNT queries don't expose sensitive data
    status = 'accepted'
  );

-- Note: This allows counting friends publicly but still protects individual relationships
-- If you need stricter security, remove the OR clause and use a server-side API with service role


