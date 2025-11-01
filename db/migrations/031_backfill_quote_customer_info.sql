-- Backfill customer info in quotes from bookings if available
-- This attempts to populate missing customer info in quotes using booking records

-- First, check if there are bookings that might have customer info we can use
SELECT 
  'Bookings with customer info' as check_type,
  b.id as booking_id,
  b.customer_id,
  b.customer_email,
  b.customer_phone,
  b.service_details->>'quote_id' as quote_id_from_booking,
  b.service_details->>'scheduled_job_id' as scheduled_job_id_from_booking,
  b.created_at
FROM bookings b
WHERE b.service_details->>'source' = 'movers_reservation'
  AND (b.customer_email IS NOT NULL OR b.customer_phone IS NOT NULL)
ORDER BY b.created_at DESC
LIMIT 10;

-- Try to backfill quote customer info from bookings
UPDATE movers_quotes mq
SET 
  customer_id = COALESCE(mq.customer_id, b.customer_id),
  full_name = COALESCE(NULLIF(mq.full_name, ''), p.full_name),
  email = COALESCE(NULLIF(mq.email, ''), b.customer_email),
  phone = COALESCE(NULLIF(mq.phone, ''), b.customer_phone)
FROM bookings b
LEFT JOIN profiles p ON b.customer_id = p.id
WHERE b.service_details->>'quote_id' = mq.id::text
  AND (mq.full_name IS NULL OR mq.full_name = '')
  AND (b.customer_email IS NOT NULL OR b.customer_phone IS NOT NULL OR p.full_name IS NOT NULL);

-- Check results
SELECT 
  'After Backfill' as check_type,
  mq.id as quote_id,
  mq.full_name,
  mq.email,
  mq.phone,
  mq.customer_id,
  mq.status,
  CASE 
    WHEN mq.full_name IS NOT NULL AND mq.full_name != '' THEN '✅ Has customer info'
    WHEN mq.email IS NOT NULL AND mq.email != '' THEN '⚠️ Has email but no name'
    ELSE '❌ Still missing customer info'
  END as status
FROM movers_quotes mq
WHERE mq.status = 'confirmed'
  AND EXISTS (
    SELECT 1 FROM movers_scheduled_jobs msj WHERE msj.quote_id = mq.id
  )
ORDER BY mq.created_at DESC
LIMIT 10;

