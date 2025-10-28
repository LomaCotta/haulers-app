-- Test Business Rejection System
-- Run this in Supabase SQL Editor to test the rejection functionality

-- First, let's check if the functions exist
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('reject_business_verification', 'approve_business_verification', 'resubmit_business_verification');

-- Check if the enhanced fields exist on businesses table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND column_name IN ('verification_status', 'rejection_reason', 'verification_notes');

-- Check current business verification statuses
SELECT 
  id,
  name,
  verified,
  verification_status,
  rejection_reason,
  verification_notes
FROM public.businesses 
ORDER BY created_at DESC 
LIMIT 5;

-- Test rejection function (replace with actual business ID)
-- SELECT reject_business_verification(
--   'your-business-id-here'::uuid,
--   'Test rejection reason: Please provide better business description',
--   'Admin test notes'
-- );

-- Check if notifications table exists
SELECT COUNT(*) as notification_count FROM public.business_notifications;

-- Check verification history
SELECT 
  b.name,
  h.action,
  h.notes,
  h.created_at
FROM public.business_verification_history h
JOIN public.businesses b ON h.business_id = b.id
ORDER BY h.created_at DESC
LIMIT 5;
