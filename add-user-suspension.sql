-- Add user suspension functionality to profiles table
-- Run this in Supabase SQL Editor

-- Add suspension fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_reason text,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES public.profiles(id);

-- Create index for suspended users
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended);

-- Update RLS policies to hide suspended users' content
-- First, drop existing policies that need updating
DROP POLICY IF EXISTS "read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "read_businesses" ON public.businesses;
DROP POLICY IF EXISTS "select_booking" ON public.bookings;
DROP POLICY IF EXISTS "select_messages" ON public.messages;

-- Recreate policies that hide suspended users' content
CREATE POLICY "read_profiles" ON public.profiles 
FOR SELECT 
USING (
  -- Show all profiles to admins, hide suspended users from others
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) OR suspended = false
);

CREATE POLICY "read_businesses" ON public.businesses 
FOR SELECT 
USING (
  -- Show all businesses to admins, hide businesses of suspended users from others
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = owner_id AND p.suspended = false
  )
);

CREATE POLICY "select_booking" ON public.bookings 
FOR SELECT 
USING (
  -- Show bookings to admins, hide bookings involving suspended users from others
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) OR (
    (consumer_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE (p.id = consumer_id OR p.id = (SELECT owner_id FROM public.businesses WHERE id = business_id))
      AND p.suspended = true
    )
  )
);

CREATE POLICY "select_messages" ON public.messages 
FOR SELECT 
USING (
  -- Show messages to admins, hide messages involving suspended users from others
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) OR (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE (p.id = sender_id OR p.id = receiver_id)
      AND p.suspended = true
    )
  )
);

-- Create function to suspend a user
CREATE OR REPLACE FUNCTION suspend_user(
  user_id uuid,
  reason text DEFAULT 'Suspended by administrator',
  suspended_by_admin uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
  -- Check if the person suspending is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = suspended_by_admin AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can suspend users';
  END IF;
  
  -- Suspend the user
  UPDATE public.profiles 
  SET 
    suspended = true,
    suspended_at = NOW(),
    suspended_reason = reason,
    suspended_by = suspended_by_admin
  WHERE id = user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unsuspend a user
CREATE OR REPLACE FUNCTION unsuspend_user(
  user_id uuid,
  unsuspended_by_admin uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
  -- Check if the person unsuspending is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = unsuspended_by_admin AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can unsuspend users';
  END IF;
  
  -- Unsuspend the user
  UPDATE public.profiles 
  SET 
    suspended = false,
    suspended_at = NULL,
    suspended_reason = NULL,
    suspended_by = NULL
  WHERE id = user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to permanently delete a user and all their data
CREATE OR REPLACE FUNCTION delete_user_permanently(
  user_id uuid,
  deleted_by_admin uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
  -- Check if the person deleting is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = deleted_by_admin AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can permanently delete users';
  END IF;
  
  -- Prevent deleting other admins
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot delete administrator accounts';
  END IF;
  
  -- Delete user data in order (respecting foreign key constraints)
  DELETE FROM public.messages WHERE sender_id = user_id OR receiver_id = user_id;
  DELETE FROM public.reviews WHERE consumer_id = user_id;
  DELETE FROM public.bookings WHERE consumer_id = user_id;
  DELETE FROM public.availability WHERE business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = user_id
  );
  DELETE FROM public.businesses WHERE owner_id = user_id;
  DELETE FROM public.profiles WHERE id = user_id;
  
  -- Note: auth.users deletion should be done through Supabase Auth API
  -- This function only deletes the public profile and related data
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (they'll be checked inside the functions)
GRANT EXECUTE ON FUNCTION suspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION unsuspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_permanently TO authenticated;
