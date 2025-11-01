-- Check what was created after making a reservation
-- Run this AFTER making a reservation to see all the records

-- 1. Check the scheduled job (what providers see)
SELECT 
  'SCHEDULED JOB (Provider View)' as record_type,
  msj.id as scheduled_job_id,
  msj.provider_id,
  msj.quote_id,
  msj.scheduled_date,
  msj.time_slot,
  msj.status,
  msj.crew_size,
  msj.created_at
FROM movers_scheduled_jobs msj
ORDER BY msj.created_at DESC
LIMIT 5;

-- 2. Check the quote (reference for both)
SELECT 
  'QUOTE' as record_type,
  mq.id as quote_id,
  mq.provider_id,
  mq.customer_id,
  mq.full_name,
  mq.email,
  mq.phone,
  mq.pickup_address,
  mq.dropoff_address,
  mq.move_date,
  mq.crew_size,
  mq.price_total_cents,
  mq.status,
  mq.created_at
FROM movers_quotes mq
ORDER BY mq.created_at DESC
LIMIT 5;

-- 3. Check the booking (what customers see)
SELECT 
  'BOOKING (Customer View)' as record_type,
  b.id as booking_id,
  b.customer_id,
  b.business_id,
  b.service_type,
  b.booking_status,
  b.requested_date,
  b.requested_time,
  b.total_price_cents,
  b.customer_email,
  b.customer_phone,
  b.service_details->>'quote_id' as linked_quote_id,
  b.service_details->>'scheduled_job_id' as linked_scheduled_job_id,
  b.created_at
FROM bookings b
WHERE b.service_details->>'source' = 'movers_reservation'
ORDER BY b.created_at DESC
LIMIT 5;

-- 4. Check if everything is linked correctly
SELECT 
  'LINKAGE CHECK' as check_type,
  msj.id as scheduled_job_id,
  msj.quote_id,
  mq.id as quote_exists,
  b.id as booking_exists,
  b.service_details->>'quote_id' as booking_quote_ref,
  b.service_details->>'scheduled_job_id' as booking_job_ref,
  CASE 
    WHEN msj.quote_id = mq.id AND b.service_details->>'quote_id' = mq.id::text THEN '✅ All linked'
    WHEN msj.quote_id IS NULL THEN '⚠️ Scheduled job missing quote_id'
    WHEN b.id IS NULL THEN '⚠️ Booking record missing'
    ELSE '⚠️ Linkage issue'
  END as status
FROM movers_scheduled_jobs msj
LEFT JOIN movers_quotes mq ON msj.quote_id = mq.id
LEFT JOIN bookings b ON b.service_details->>'scheduled_job_id' = msj.id::text
ORDER BY msj.created_at DESC
LIMIT 5;

-- 5. Get provider's view (what they should see)
SELECT 
  msj.id,
  msj.scheduled_date,
  msj.time_slot,
  msj.status,
  mq.full_name as customer_name,
  mq.email as customer_email,
  mq.phone as customer_phone,
  mq.pickup_address,
  mq.dropoff_address,
  mq.price_total_cents
FROM movers_scheduled_jobs msj
LEFT JOIN movers_quotes mq ON msj.quote_id = mq.id
ORDER BY msj.created_at DESC
LIMIT 5;

-- 6. Get customer's view (what they should see)
SELECT 
  b.id,
  b.requested_date,
  b.requested_time,
  b.booking_status,
  bus.name as business_name,
  b.total_price_cents,
  b.service_address,
  b.service_city,
  b.service_state,
  b.service_details->>'quote_id' as quote_id,
  b.service_details->>'scheduled_job_id' as scheduled_job_id
FROM bookings b
LEFT JOIN businesses bus ON b.business_id = bus.id
WHERE b.service_details->>'source' = 'movers_reservation'
ORDER BY b.created_at DESC
LIMIT 5;

