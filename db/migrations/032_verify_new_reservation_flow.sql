-- Verify new reservation flow is working correctly
-- Run this after making a NEW reservation

-- Check if new reservation created quote with customer info
SELECT 
  'NEW RESERVATION CHECK' as check_type,
  mq.id as quote_id,
  mq.status,
  mq.full_name,
  mq.email,
  mq.phone,
  mq.customer_id,
  mq.move_date,
  mq.pickup_address,
  mq.dropoff_address,
  mq.price_total_cents,
  mq.created_at,
  CASE 
    WHEN mq.status = 'confirmed' AND mq.full_name IS NOT NULL AND mq.full_name != '' THEN '✅ Complete quote'
    WHEN mq.status = 'confirmed' AND (mq.full_name IS NULL OR mq.full_name = '') THEN '⚠️ Confirmed but missing customer info'
    WHEN mq.status = 'draft' THEN '⚠️ Still draft'
    ELSE '❌ Issue'
  END as status
FROM movers_quotes mq
WHERE mq.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY mq.created_at DESC;

-- Check if scheduled job is linked to quote
SELECT 
  msj.id as scheduled_job_id,
  msj.quote_id,
  msj.scheduled_date,
  msj.time_slot,
  msj.status,
  mq.full_name,
  mq.email,
  mq.phone,
  CASE 
    WHEN msj.quote_id IS NOT NULL AND mq.id IS NOT NULL THEN '✅ Linked'
    WHEN msj.quote_id IS NULL THEN '❌ Missing quote_id'
    WHEN mq.id IS NULL THEN '❌ Quote not found'
    ELSE '⚠️ Issue'
  END as link_status
FROM movers_scheduled_jobs msj
LEFT JOIN movers_quotes mq ON msj.quote_id = mq.id
WHERE msj.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY msj.created_at DESC;

-- Check if booking was created for customer
SELECT 
  b.id as booking_id,
  b.customer_id,
  b.business_id,
  b.booking_status,
  b.requested_date,
  b.total_price_cents,
  b.customer_email,
  b.customer_phone,
  b.service_details->>'quote_id' as quote_id_ref,
  b.service_details->>'scheduled_job_id' as scheduled_job_id_ref,
  CASE 
    WHEN b.id IS NOT NULL THEN '✅ Booking created'
    ELSE '❌ No booking record'
  END as status
FROM bookings b
WHERE b.created_at >= NOW() - INTERVAL '1 hour'
  AND (b.service_details->>'source' = 'movers_reservation' OR b.service_details->>'scheduled_job_id' IS NOT NULL)
ORDER BY b.created_at DESC;

