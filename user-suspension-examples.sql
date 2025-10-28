-- Example usage of user suspension functions
-- Run these commands in Supabase SQL Editor

-- 1. SUSPEND a user (makes their content invisible to others)
-- Replace 'user-uuid-here' with the actual user ID
SELECT suspend_user(
  'user-uuid-here'::uuid,
  'Violation of terms of service',
  auth.uid() -- Current admin user
);

-- 2. UNSUSPEND a user (restores their content visibility)
SELECT unsuspend_user(
  'user-uuid-here'::uuid,
  auth.uid() -- Current admin user
);

-- 3. PERMANENTLY DELETE a user and all their data
-- WARNING: This is irreversible!
SELECT delete_user_permanently(
  'user-uuid-here'::uuid,
  auth.uid() -- Current admin user
);

-- 4. Check suspended users
SELECT 
  id,
  full_name,
  role,
  suspended,
  suspended_at,
  suspended_reason,
  suspended_by
FROM public.profiles 
WHERE suspended = true
ORDER BY suspended_at DESC;

-- 5. Check all users with suspension status
SELECT 
  id,
  full_name,
  role,
  suspended,
  suspended_at,
  suspended_reason,
  created_at
FROM public.profiles 
ORDER BY created_at DESC;

-- 6. Find users who might need suspension (example queries)
-- Users with no activity in 90 days
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.created_at,
  'No recent activity' as reason
FROM public.profiles p
LEFT JOIN public.bookings b ON p.id = b.consumer_id
LEFT JOIN public.businesses bus ON p.id = bus.owner_id
WHERE p.created_at < NOW() - INTERVAL '90 days'
  AND (b.id IS NULL OR b.created_at < NOW() - INTERVAL '90 days')
  AND (bus.id IS NULL OR bus.created_at < NOW() - INTERVAL '90 days')
  AND p.suspended = false;

-- Users with multiple cancelled bookings
SELECT 
  p.id,
  p.full_name,
  p.role,
  COUNT(b.id) as cancelled_bookings,
  'Multiple cancellations' as reason
FROM public.profiles p
JOIN public.bookings b ON p.id = b.consumer_id
WHERE b.status = 'canceled'
  AND p.suspended = false
GROUP BY p.id, p.full_name, p.role
HAVING COUNT(b.id) >= 3
ORDER BY cancelled_bookings DESC;
