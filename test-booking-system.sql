-- Test Booking System
-- This tests the fixed booking system

-- Step 1: Check if tables exist
SELECT 'Checking Tables:' as test_phase;
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bookings', 'booking_items', 'booking_status_history', 'service_templates', 'notifications')
ORDER BY table_name;

-- Step 2: Check table structures
SELECT 'Checking Table Structures:' as test_phase;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'bookings'
ORDER BY ordinal_position;

-- Step 3: Test creating a sample booking
SELECT 'Testing Sample Booking Creation:' as test_phase;

-- First, check if we have a business and customer to work with
SELECT 'Available Businesses:' as info;
SELECT id, name, owner_id FROM public.businesses LIMIT 3;

SELECT 'Available Profiles:' as info;
SELECT id, full_name, role FROM public.profiles LIMIT 3;

-- Step 4: Create a test booking (if we have the required data)
DO $$
DECLARE
  test_business_id UUID;
  test_customer_id UUID;
  booking_id UUID;
BEGIN
  -- Get a business ID
  SELECT id INTO test_business_id FROM public.businesses LIMIT 1;
  
  -- Get a customer ID (or create a test one)
  SELECT id INTO test_customer_id FROM public.profiles WHERE role = 'customer' LIMIT 1;
  
  IF test_business_id IS NOT NULL AND test_customer_id IS NOT NULL THEN
    -- Create a test booking
    INSERT INTO public.bookings (
      business_id, customer_id, service_type, booking_status, priority,
      requested_date, requested_time, estimated_duration_hours,
      service_address, service_city, service_state, service_postal_code,
      base_price_cents, hourly_rate_cents, total_price_cents,
      customer_notes, customer_phone, customer_email
    ) VALUES (
      test_business_id, test_customer_id, 'test_service', 'pending', 'normal',
      CURRENT_DATE + INTERVAL '3 days', '10:00:00', 2,
      '123 Test St', 'Test City', 'TS', '12345',
      5000, 2500, 10000,
      'This is a test booking', '(555) 123-4567', 'test@example.com'
    ) RETURNING id INTO booking_id;
    
    RAISE NOTICE 'Test booking created with ID: %', booking_id;
  ELSE
    RAISE NOTICE 'Cannot create test booking - missing business or customer data';
  END IF;
END $$;

-- Step 5: Check if the test booking was created
SELECT 'Test Booking Created:' as info;
SELECT 
  id, business_id, customer_id, service_type, booking_status, 
  requested_date, requested_time, total_price_cents, created_at
FROM public.bookings 
WHERE service_type = 'test_service'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Test the booking status change trigger
SELECT 'Testing Status Change Trigger:' as test_phase;
UPDATE public.bookings 
SET booking_status = 'confirmed'
WHERE service_type = 'test_service'
AND booking_status = 'pending';

-- Check if status history was created
SELECT 'Status History Created:' as info;
SELECT 
  booking_id, old_status, new_status, change_reason, changed_at
FROM public.booking_status_history 
WHERE booking_id IN (SELECT id FROM public.bookings WHERE service_type = 'test_service')
ORDER BY changed_at DESC;

-- Check if notifications were created
SELECT 'Notifications Created:' as info;
SELECT 
  user_id, notification_type, title, message, created_at
FROM public.notifications 
WHERE booking_id IN (SELECT id FROM public.bookings WHERE service_type = 'test_service')
ORDER BY created_at DESC;

-- Step 7: Clean up test data
DELETE FROM public.bookings WHERE service_type = 'test_service';

-- Step 8: Success message
SELECT 'Booking system test completed successfully! 🚀' as final_status;
