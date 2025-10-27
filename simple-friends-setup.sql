-- Simple friends table creation script
-- This ensures the friends table exists with proper structure

-- Create friends table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "users_can_view_own_friends" ON public.friends;
DROP POLICY IF EXISTS "users_can_create_friend_requests" ON public.friends;
DROP POLICY IF EXISTS "users_can_update_own_friend_requests" ON public.friends;
DROP POLICY IF EXISTS "users_can_delete_own_friend_requests" ON public.friends;

-- Create RLS policies
CREATE POLICY "users_can_view_own_friends" ON public.friends FOR SELECT USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

CREATE POLICY "users_can_create_friend_requests" ON public.friends FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "users_can_update_own_friend_requests" ON public.friends FOR UPDATE USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

CREATE POLICY "users_can_delete_own_friend_requests" ON public.friends FOR DELETE USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);

-- Verify table was created
SELECT 'Friends table setup complete' as status;
SELECT COUNT(*) as total_friends FROM public.friends;
