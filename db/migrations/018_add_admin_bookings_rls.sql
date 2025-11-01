-- Add admin RLS policy for bookings
-- This allows admins to view and manage all bookings
-- This migration checks which column exists (consumer_id or customer_id) and creates the appropriate policy

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;

-- First, check which column exists and create appropriate policy
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
  
  -- Create policy based on which column exists
  IF has_consumer_id THEN
    EXECUTE '
    CREATE POLICY "admin_full_access_bookings" ON public.bookings
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = ''admin''
      )
      OR
      consumer_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = ''admin''
      )
      OR
      consumer_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    )';
  ELSIF has_customer_id THEN
    EXECUTE '
    CREATE POLICY "admin_full_access_bookings" ON public.bookings
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = ''admin''
      )
      OR
      customer_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = ''admin''
      )
      OR
      customer_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    )';
  ELSE
    RAISE EXCEPTION 'Neither consumer_id nor customer_id column found in bookings table';
  END IF;
END $$;
