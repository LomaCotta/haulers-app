-- Safe query that checks columns first, then queries bookings
-- This avoids errors from missing columns

-- Step 1: Check what columns exist
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
ORDER BY ordinal_position;

-- Step 2: Simple query with only columns we know exist (id, business_id, created_at)
SELECT 
  b.id,
  b.business_id,
  b.created_at,
  bus.name as business_name,
  bus.owner_id
FROM public.bookings b
LEFT JOIN public.businesses bus ON b.business_id = bus.id
ORDER BY b.created_at DESC
LIMIT 20;

