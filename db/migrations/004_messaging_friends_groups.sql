-- Enhanced database schema for messaging, friends, and groups
-- Run this in your Supabase SQL editor

-- Friends table for user connections
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Groups table for user groups/communities
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Group members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('member', 'admin', 'moderator')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enhanced messages table (extending existing)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text CHECK (message_type IN ('booking', 'general', 'group')) DEFAULT 'general';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  privacy_level text CHECK (privacy_level IN ('public', 'friends', 'private')) DEFAULT 'friends',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);

-- RLS Policies
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Friends policies
CREATE POLICY "users_can_view_own_friends" ON public.friends FOR SELECT USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

CREATE POLICY "users_can_create_friend_requests" ON public.friends FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "users_can_update_own_friend_requests" ON public.friends FOR UPDATE USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

-- Groups policies
CREATE POLICY "public_groups_visible" ON public.groups FOR SELECT USING (
  is_public = true OR created_by = auth.uid()
);

CREATE POLICY "users_can_create_groups" ON public.groups FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "group_creators_can_update" ON public.groups FOR UPDATE USING (
  created_by = auth.uid()
);

-- Group members policies
CREATE POLICY "group_members_visible" ON public.group_members FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid())
);

CREATE POLICY "users_can_join_groups" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "users_can_leave_groups" ON public.group_members FOR DELETE USING (
  user_id = auth.uid()
);

-- User preferences policies
CREATE POLICY "users_can_view_own_preferences" ON public.user_preferences FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "users_can_create_own_preferences" ON public.user_preferences FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "users_can_update_own_preferences" ON public.user_preferences FOR UPDATE USING (
  user_id = auth.uid()
);

-- Update existing messages policies to include new columns
DROP POLICY IF EXISTS "select_messages" ON public.messages;
CREATE POLICY "select_messages" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.bookings bk WHERE bk.id = booking_id AND (
    bk.consumer_id = auth.uid() or exists (select 1 from public.businesses b where b.id = bk.business_id and b.owner_id = auth.uid())
  )) OR
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid())
);

-- Insert policy for messages
DROP POLICY IF EXISTS "insert_messages" ON public.messages;
CREATE POLICY "insert_messages" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.bookings bk WHERE bk.id = booking_id AND (
      bk.consumer_id = auth.uid() or exists (select 1 from public.businesses b where b.id = bk.business_id and b.owner_id = auth.uid())
    )) OR
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid()) OR
    booking_id IS NULL AND group_id IS NULL -- General messages
  )
);
