-- Comprehensive friends table setup and cleanup
-- This script ensures the friends table is properly configured

-- First, check if friends table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friends') THEN
        -- Create friends table
        CREATE TABLE public.friends (
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
        CREATE INDEX idx_friends_user_id ON public.friends(user_id);
        CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
        CREATE INDEX idx_friends_status ON public.friends(status);

        RAISE NOTICE 'Friends table created successfully';
    ELSE
        RAISE NOTICE 'Friends table already exists';
    END IF;
END $$;

-- Check current friends data
SELECT 'Current friends data:' as info;
SELECT id, user_id, friend_id, status, created_at FROM public.friends ORDER BY created_at DESC;

-- Check if there are any duplicate or invalid entries
SELECT 'Checking for issues:' as info;
SELECT 
    user_id, 
    friend_id, 
    COUNT(*) as count,
    array_agg(status) as statuses
FROM public.friends 
GROUP BY user_id, friend_id 
HAVING COUNT(*) > 1;

-- Clean up any duplicate entries (keep the most recent one)
WITH duplicates AS (
    SELECT id, user_id, friend_id,
           ROW_NUMBER() OVER (PARTITION BY user_id, friend_id ORDER BY created_at DESC) as rn
    FROM public.friends
)
DELETE FROM public.friends 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Verify cleanup
SELECT 'After cleanup:' as info;
SELECT id, user_id, friend_id, status, created_at FROM public.friends ORDER BY created_at DESC;
