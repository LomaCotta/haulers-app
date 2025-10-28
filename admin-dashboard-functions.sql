-- SQL functions for admin dashboard user management
-- Run this in Supabase SQL Editor

-- Function to suspend a user (callable from admin dashboard)
CREATE OR REPLACE FUNCTION admin_suspend_user(
  target_user_id uuid,
  suspension_reason text DEFAULT 'Suspended by administrator'
)
RETURNS json AS $$
DECLARE
  admin_user_id uuid;
  result json;
BEGIN
  -- Get current admin user
  admin_user_id := auth.uid();
  
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Prevent suspending other admins
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_user_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot suspend administrator accounts'
    );
  END IF;
  
  -- Suspend the user
  UPDATE public.profiles 
  SET 
    suspended = true,
    suspended_at = NOW(),
    suspended_reason = suspension_reason,
    suspended_by = admin_user_id
  WHERE id = target_user_id;
  
  -- Return success with user info
  SELECT json_build_object(
    'success', true,
    'message', 'User suspended successfully',
    'user', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'role', p.role,
      'suspended', p.suspended,
      'suspended_at', p.suspended_at,
      'suspended_reason', p.suspended_reason
    )
  ) INTO result
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsuspend a user (callable from admin dashboard)
CREATE OR REPLACE FUNCTION admin_unsuspend_user(
  target_user_id uuid
)
RETURNS json AS $$
DECLARE
  admin_user_id uuid;
  result json;
BEGIN
  -- Get current admin user
  admin_user_id := auth.uid();
  
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Unsuspend the user
  UPDATE public.profiles 
  SET 
    suspended = false,
    suspended_at = NULL,
    suspended_reason = NULL,
    suspended_by = NULL
  WHERE id = target_user_id;
  
  -- Return success with user info
  SELECT json_build_object(
    'success', true,
    'message', 'User unsuspended successfully',
    'user', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'role', p.role,
      'suspended', p.suspended
    )
  ) INTO result
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete a user (callable from admin dashboard)
CREATE OR REPLACE FUNCTION admin_delete_user(
  target_user_id uuid
)
RETURNS json AS $$
DECLARE
  admin_user_id uuid;
  user_name text;
  result json;
BEGIN
  -- Get current admin user
  admin_user_id := auth.uid();
  
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Prevent deleting other admins
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_user_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot delete administrator accounts'
    );
  END IF;
  
  -- Get user name before deletion
  SELECT full_name INTO user_name FROM public.profiles WHERE id = target_user_id;
  
  -- Delete user data in order (respecting foreign key constraints)
  DELETE FROM public.messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM public.reviews WHERE consumer_id = target_user_id;
  DELETE FROM public.bookings WHERE consumer_id = target_user_id;
  DELETE FROM public.availability WHERE business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = target_user_id
  );
  DELETE FROM public.businesses WHERE owner_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User and all associated data deleted permanently',
    'deleted_user', user_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change user role (callable from admin dashboard)
CREATE OR REPLACE FUNCTION admin_change_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS json AS $$
DECLARE
  admin_user_id uuid;
  result json;
BEGIN
  -- Get current admin user
  admin_user_id := auth.uid();
  
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Validate new role
  IF new_role NOT IN ('consumer', 'provider', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role. Must be consumer, provider, or admin'
    );
  END IF;
  
  -- Update user role
  UPDATE public.profiles 
  SET role = new_role
  WHERE id = target_user_id;
  
  -- Return success with user info
  SELECT json_build_object(
    'success', true,
    'message', 'User role updated successfully',
    'user', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'role', p.role
    )
  ) INTO result
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user details for admin dashboard
CREATE OR REPLACE FUNCTION admin_get_user_details(
  target_user_id uuid
)
RETURNS json AS $$
DECLARE
  admin_user_id uuid;
  result json;
BEGIN
  -- Get current admin user
  admin_user_id := auth.uid();
  
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Get user details
  SELECT json_build_object(
    'success', true,
    'user', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'role', p.role,
      'phone', p.phone,
      'avatar_url', p.avatar_url,
      'suspended', p.suspended,
      'suspended_at', p.suspended_at,
      'suspended_reason', p.suspended_reason,
      'suspended_by', p.suspended_by,
      'created_at', p.created_at,
      'business_count', COALESCE(business_stats.business_count, 0),
      'booking_count', COALESCE(booking_stats.booking_count, 0),
      'review_count', COALESCE(review_stats.review_count, 0)
    )
  ) INTO result
  FROM public.profiles p
  LEFT JOIN (
    SELECT owner_id, COUNT(*) as business_count
    FROM public.businesses
    WHERE owner_id = target_user_id
    GROUP BY owner_id
  ) business_stats ON p.id = business_stats.owner_id
  LEFT JOIN (
    SELECT consumer_id, COUNT(*) as booking_count
    FROM public.bookings
    WHERE consumer_id = target_user_id
    GROUP BY consumer_id
  ) booking_stats ON p.id = booking_stats.consumer_id
  LEFT JOIN (
    SELECT consumer_id, COUNT(*) as review_count
    FROM public.reviews
    WHERE consumer_id = target_user_id
    GROUP BY consumer_id
  ) review_stats ON p.id = review_stats.consumer_id
  WHERE p.id = target_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_suspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_change_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_details TO authenticated;
