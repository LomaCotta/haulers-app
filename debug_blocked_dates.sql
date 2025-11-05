-- Step 2: Check what's in the cache table for blocked dates
SELECT 
  mpa.date,
  mpa.morning_status,
  mpa.afternoon_status,
  mpa.provider_id,
  mpa.calendar_id
FROM movers_public_availability mpa
WHERE EXISTS (
  SELECT 1 FROM movers_availability_overrides mao
  WHERE mao.provider_id = mpa.provider_id
    AND mao.date = mpa.date
    AND mao.kind = 'block'
)
ORDER BY mpa.date DESC
LIMIT 20;

-- Step 3: Test the calculate function for the blocked dates
SELECT 
  '2025-11-20'::date as test_date,
  calculate_availability_status('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-20'::date, 'morning') as morning_status,
  calculate_availability_status('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-20'::date, 'afternoon') as afternoon_status
UNION ALL
SELECT 
  '2025-11-08'::date as test_date,
  calculate_availability_status('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-08'::date, 'morning') as morning_status,
  calculate_availability_status('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-08'::date, 'afternoon') as afternoon_status;

-- Step 4: Force refresh these specific blocked dates
SELECT update_public_availability('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-20'::date);
SELECT update_public_availability('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-13'::date);
SELECT update_public_availability('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-08'::date);
SELECT update_public_availability('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-07'::date);
SELECT update_public_availability('24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid, '2025-11-05'::date);

-- Step 5: Verify cache was updated
SELECT 
  mpa.date,
  mpa.morning_status,
  mpa.afternoon_status,
  mpa.provider_id,
  mpa.calendar_id
FROM movers_public_availability mpa
WHERE mpa.provider_id = '24a86bb3-357f-41eb-85e9-9d9ee4bee8a5'::uuid
  AND mpa.date IN ('2025-11-20', '2025-11-13', '2025-11-08', '2025-11-07', '2025-11-05')
ORDER BY mpa.date DESC;
