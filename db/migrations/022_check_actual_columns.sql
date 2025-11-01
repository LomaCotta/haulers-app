-- Check what columns actually exist in the bookings table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
ORDER BY ordinal_position;

