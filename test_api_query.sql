-- Test: Verify the API query would find these entries
-- This simulates what the API does
SELECT 
  date,
  morning_status,
  afternoon_status,
  calendar_id
FROM movers_public_availability
WHERE calendar_id = 'f747abe1-754d-4e82-8398-ff405f893123'::uuid
  AND date >= '2025-11-01'::date
  AND date <= '2025-11-30'::date
ORDER BY date ASC;

