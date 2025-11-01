-- Fix bookings RLS policies to use customer_id instead of consumer_id
-- This migration updates the existing RLS policies to work with the actual schema

-- Drop existing policies that use consumer_id
DROP POLICY IF EXISTS "select_booking" ON public.bookings;
DROP POLICY IF EXISTS "insert_booking" ON public.bookings;
DROP POLICY IF EXISTS "update_booking_business" ON public.bookings;

-- Check which column actually exists and create appropriate policies
DO $$
DECLARE
  has_consumer_id BOOLEAN;
  has_customer_id BOOLEAN;
BEGIN
  -- Check if consumer_id column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'consumer_id'
  ) INTO has_consumer_id;
  
  -- Check if customer_id column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'customer_id'
  ) INTO has_customer_id;
  
  -- Create policies based on which column exists
  IF has_consumer_id AND NOT has_customer_id THEN
    -- Use consumer_id
    EXECUTE '
    CREATE POLICY "select_booking" ON public.bookings FOR SELECT USING (
      consumer_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.businesses b 
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    );
    
    CREATE POLICY "insert_booking" ON public.bookings FOR INSERT WITH CHECK (
      consumer_id = auth.uid()
    );
    
    CREATE POLICY "update_booking_business" ON public.bookings FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.businesses b 
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    );
    ';
  ELSIF has_customer_id THEN
    -- Use customer_id (correct for current schema)
    EXECUTE '
    CREATE POLICY "select_booking" ON public.bookings FOR SELECT USING (
      customer_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.businesses b 
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    );
    
    CREATE POLICY "insert_booking" ON public.bookings FOR INSERT WITH CHECK (
      customer_id = auth.uid()
    );
    
    CREATE POLICY "update_booking_business" ON public.bookings FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.businesses b 
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    );
    ';
  ELSE
    RAISE EXCEPTION 'Neither consumer_id nor customer_id column found in bookings table';
  END IF;
END $$;

