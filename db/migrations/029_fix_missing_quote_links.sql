-- Fix existing scheduled jobs that are missing quote_id links
-- This backfills quotes for scheduled jobs that were created without them

-- First, check what scheduled jobs are missing quotes
SELECT 
  msj.id as scheduled_job_id,
  msj.quote_id,
  msj.scheduled_date,
  msj.time_slot,
  msj.created_at,
  CASE 
    WHEN msj.quote_id IS NULL THEN 'MISSING quote_id'
    ELSE 'Has quote_id'
  END as status
FROM movers_scheduled_jobs msj
WHERE msj.quote_id IS NULL
ORDER BY msj.created_at DESC;

-- Check if there are any quotes that could be linked (by date/provider)
SELECT 
  msj.id as scheduled_job_id,
  msj.provider_id,
  msj.scheduled_date,
  mq.id as potential_quote_id,
  mq.move_date,
  mq.status as quote_status,
  CASE 
    WHEN msj.scheduled_date = mq.move_date AND msj.provider_id = mq.provider_id THEN 'MATCH - can be linked'
    ELSE 'No match'
  END as match_status
FROM movers_scheduled_jobs msj
LEFT JOIN movers_quotes mq ON msj.provider_id = mq.provider_id 
  AND msj.scheduled_date = mq.move_date
WHERE msj.quote_id IS NULL
ORDER BY msj.created_at DESC
LIMIT 10;

