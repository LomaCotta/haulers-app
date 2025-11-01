-- Debug query to check bookings and business relationships
-- Run this to see what bookings exist and if they match the provider's business

-- First, check what column exists (consumer_id or customer_id)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
  AND column_name IN ('consumer_id', 'customer_id');

-- Check all bookings and their business relationships
-- This query dynamically handles consumer_id vs customer_id
DO $$
DECLARE
  has_consumer_id BOOLEAN;
  has_customer_id BOOLEAN;
BEGIN
  -- Check which column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'consumer_id'
  ) INTO has_consumer_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'customer_id'
  ) INTO has_customer_id;
  
  -- Check if status column exists
  DECLARE
    has_status BOOLEAN;
    has_booking_status BOOLEAN;
    status_column TEXT;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'status'
    ) INTO has_status;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booking_status'
    ) INTO has_booking_status;
    
    -- Determine which status column to use
    IF has_booking_status THEN
      status_column := 'booking_status';
    ELSIF has_status THEN
      status_column := 'status';
    ELSE
      status_column := NULL;
    END IF;
    
    -- Execute query based on which columns exist
    -- Use requested_date (actual schema) instead of move_date
    IF has_customer_id AND status_column IS NOT NULL THEN
      EXECUTE format('
      SELECT 
        b.id as booking_id,
        b.business_id,
        bus.name as business_name,
        bus.owner_id as business_owner_id,
        b.customer_id,
        b.%I as status,
        b.requested_date,
        b.requested_time,
        b.total_price_cents,
        b.service_address,
        b.service_city,
        b.service_state,
        b.created_at,
        p_owner.full_name as owner_name,
        p_customer.full_name as customer_name
      FROM public.bookings b
      LEFT JOIN public.businesses bus ON b.business_id = bus.id
      LEFT JOIN public.profiles p_owner ON bus.owner_id = p_owner.id
      LEFT JOIN public.profiles p_customer ON b.customer_id = p_customer.id
      ORDER BY b.created_at DESC
      LIMIT 20;
      ', status_column);
    ELSIF has_customer_id THEN
      -- status column doesn't exist, skip it
      EXECUTE '
      SELECT 
        b.id as booking_id,
        b.business_id,
        bus.name as business_name,
        bus.owner_id as business_owner_id,
        b.customer_id,
        b.requested_date,
        b.requested_time,
        b.total_price_cents,
        b.service_address,
        b.service_city,
        b.service_state,
        b.created_at,
        p_owner.full_name as owner_name,
        p_customer.full_name as customer_name
      FROM public.bookings b
      LEFT JOIN public.businesses bus ON b.business_id = bus.id
      LEFT JOIN public.profiles p_owner ON bus.owner_id = p_owner.id
      LEFT JOIN public.profiles p_customer ON b.customer_id = p_customer.id
      ORDER BY b.created_at DESC
      LIMIT 20;
      ';
    ELSIF has_consumer_id AND status_column IS NOT NULL THEN
      EXECUTE format('
      SELECT 
        b.id as booking_id,
        b.business_id,
        bus.name as business_name,
        bus.owner_id as business_owner_id,
        b.consumer_id,
        b.%I as status,
        b.requested_date,
        b.requested_time,
        b.total_price_cents,
        b.service_address,
        b.service_city,
        b.service_state,
        b.created_at,
        p_owner.full_name as owner_name,
        p_customer.full_name as customer_name
      FROM public.bookings b
      LEFT JOIN public.businesses bus ON b.business_id = bus.id
      LEFT JOIN public.profiles p_owner ON bus.owner_id = p_owner.id
      LEFT JOIN public.profiles p_customer ON b.consumer_id = p_customer.id
      ORDER BY b.created_at DESC
      LIMIT 20;
      ', status_column);
    ELSIF has_consumer_id THEN
      -- status column doesn't exist, skip it
      EXECUTE '
      SELECT 
        b.id as booking_id,
        b.business_id,
        bus.name as business_name,
        bus.owner_id as business_owner_id,
        b.consumer_id,
        b.requested_date,
        b.requested_time,
        b.total_price_cents,
        b.service_address,
        b.service_city,
        b.service_state,
        b.created_at,
        p_owner.full_name as owner_name,
        p_customer.full_name as customer_name
      FROM public.bookings b
      LEFT JOIN public.businesses bus ON b.business_id = bus.id
      LEFT JOIN public.profiles p_owner ON bus.owner_id = p_owner.id
      LEFT JOIN public.profiles p_customer ON b.consumer_id = p_customer.id
      ORDER BY b.created_at DESC
      LIMIT 20;
      ';
    END IF;
  END;
END $$;

-- Count bookings by business
SELECT 
  bus.name as business_name,
  bus.id as business_id,
  bus.owner_id,
  COUNT(b.id) as booking_count
FROM public.businesses bus
LEFT JOIN public.bookings b ON b.business_id = bus.id
GROUP BY bus.id, bus.name, bus.owner_id
ORDER BY booking_count DESC;

-- Check RLS policies
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'bookings';

