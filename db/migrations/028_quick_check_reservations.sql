-- Quick check of what was created - no syntax issues

-- Check scheduled jobs and their quote links
SELECT 
  msj.id as scheduled_job_id,
  msj.quote_id,
  msj.scheduled_date,
  msj.time_slot,
  msj.status,
  msj.created_at
FROM movers_scheduled_jobs msj
ORDER BY msj.created_at DESC
LIMIT 10;

-- Check if quotes exist for these scheduled jobs
SELECT 
  msj.id as scheduled_job_id,
  msj.quote_id,
  mq.id as quote_exists,
  mq.full_name,
  mq.email,
  mq.phone,
  mq.pickup_address,
  mq.dropoff_address,
  mq.price_total_cents,
  CASE 
    WHEN msj.quote_id IS NULL THEN 'MISSING quote_id in scheduled_job'
    WHEN mq.id IS NULL THEN 'quote_id exists but quote record NOT FOUND'
    ELSE 'Quote found'
  END as quote_status
FROM movers_scheduled_jobs msj
LEFT JOIN movers_quotes mq ON msj.quote_id = mq.id
ORDER BY msj.created_at DESC
LIMIT 10;

-- Check if bookings were created for customers
SELECT 
  b.id as booking_id,
  b.customer_id,
  b.business_id,
  b.booking_status,
  b.requested_date,
  b.total_price_cents,
  b.service_details->>'quote_id' as quote_id_from_details,
  b.service_details->>'scheduled_job_id' as scheduled_job_id_from_details,
  b.created_at
FROM bookings b
WHERE b.service_details->>'source' = 'movers_reservation'
   OR b.service_details->>'scheduled_job_id' IS NOT NULL
ORDER BY b.created_at DESC
LIMIT 10;

-- Check all recent quotes
SELECT 
  id as quote_id,
  provider_id,
  customer_id,
  full_name,
  email,
  phone,
  status,
  created_at
FROM movers_quotes
ORDER BY created_at DESC
LIMIT 10;

