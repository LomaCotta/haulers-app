-- Link scheduled jobs to quotes and clean up orphaned records
-- This fixes existing reservations that weren't properly linked

-- Step 1: Find scheduled jobs missing quote_id and link them to the most recent matching quote
UPDATE movers_scheduled_jobs msj
SET quote_id = (
  SELECT mq.id
  FROM movers_quotes mq
  WHERE mq.provider_id = msj.provider_id
    AND mq.move_date = msj.scheduled_date
    AND mq.status = 'confirmed'  -- Prefer confirmed quotes
  ORDER BY mq.created_at DESC
  LIMIT 1
)
WHERE msj.quote_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM movers_quotes mq 
    WHERE mq.provider_id = msj.provider_id 
      AND mq.move_date = msj.scheduled_date
  );

-- If no confirmed quotes, try draft quotes
UPDATE movers_scheduled_jobs msj
SET quote_id = (
  SELECT mq.id
  FROM movers_quotes mq
  WHERE mq.provider_id = msj.provider_id
    AND mq.move_date = msj.scheduled_date
  ORDER BY mq.created_at DESC
  LIMIT 1
)
WHERE msj.quote_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM movers_quotes mq 
    WHERE mq.provider_id = msj.provider_id 
      AND mq.move_date = msj.scheduled_date
  );

-- Step 2: Update draft quotes to confirmed if they're linked to a scheduled job
UPDATE movers_quotes mq
SET status = 'confirmed'
WHERE mq.status = 'draft'
  AND EXISTS (
    SELECT 1 
    FROM movers_scheduled_jobs msj 
    WHERE msj.quote_id = mq.id
  );

-- Step 3: Check the results
SELECT 
  'After Linking' as check_type,
  msj.id as scheduled_job_id,
  msj.quote_id,
  mq.status as quote_status,
  mq.full_name,
  mq.email,
  CASE 
    WHEN msj.quote_id IS NOT NULL AND mq.id IS NOT NULL THEN '✅ Linked'
    WHEN msj.quote_id IS NOT NULL AND mq.id IS NULL THEN '⚠️ quote_id exists but quote not found'
    ELSE '❌ Still missing quote_id'
  END as link_status
FROM movers_scheduled_jobs msj
LEFT JOIN movers_quotes mq ON msj.quote_id = mq.id
WHERE msj.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY msj.created_at DESC;

