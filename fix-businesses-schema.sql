-- Fix businesses table schema - Add missing columns
-- This script adds the missing updated_at column and ensures all required columns exist

-- Check current businesses table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    -- Add updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added updated_at column to businesses table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in businesses table';
    END IF;

    -- Add donation_badge column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'donation_badge'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN donation_badge BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added donation_badge column to businesses table';
    ELSE
        RAISE NOTICE 'donation_badge column already exists in businesses table';
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'phone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN phone TEXT;
        
        RAISE NOTICE 'Added phone column to businesses table';
    ELSE
        RAISE NOTICE 'phone column already exists in businesses table';
    END IF;

    -- Add service_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'service_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN service_type TEXT;
        
        RAISE NOTICE 'Added service_type column to businesses table';
    ELSE
        RAISE NOTICE 'service_type column already exists in businesses table';
    END IF;
END $$;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;

-- Create trigger for updated_at
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the final table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test update permissions for admin user
-- Replace 'YOUR_ADMIN_USER_ID' with the actual admin user ID
DO $$
DECLARE
    admin_user_id UUID;
    test_business_id UUID;
BEGIN
    -- Get admin user ID (replace with actual admin user ID)
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'info@oneshotmove.com' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Admin user ID: %', admin_user_id;
        
        -- Get a test business ID
        SELECT id INTO test_business_id FROM public.businesses LIMIT 1;
        
        IF test_business_id IS NOT NULL THEN
            RAISE NOTICE 'Test business ID: %', test_business_id;
            
            -- Test update
            UPDATE public.businesses 
            SET updated_at = NOW()
            WHERE id = test_business_id;
            
            RAISE NOTICE 'Update test successful';
        ELSE
            RAISE NOTICE 'No businesses found for testing';
        END IF;
    ELSE
        RAISE NOTICE 'Admin user not found';
    END IF;
END $$;
