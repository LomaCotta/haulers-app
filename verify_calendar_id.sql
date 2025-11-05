-- Check what calendar_id is being used in the public booking page
-- Run this to see if the calendar_id matches what's in the cache

-- First, verify the calendar_id for this provider
SELECT 
  id as provider_id,
  calendar_id,
  business_id
FROM movers_providers
WHERE id = '24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid;

-- Then check if the API query would find these cache entries
-- Replace 'CALENDAR_ID_FROM_URL' with the actual calendar_id from the public booking URL
SELECT 
  date,
  morning_status,
  afternoon_status,
  calendar_id
FROM movers_public_availability
WHERE calendar_id = 'f747abe1-754d-4e82-8398-ff405f893123'::uuid
  AND date IN ('2025-11-20', '2025-11-13', '2025-11-08', '2025-11-07', '2025-11-05')
ORDER BY date DESC;

