-- Enhanced Business Schema for Comprehensive Business Management
-- This script adds fields for services, availability, pricing, and other business customization

-- Add comprehensive business fields
DO $$ 
BEGIN
    -- Add pricing fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'base_rate_cents'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN base_rate_cents INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added base_rate_cents column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'hourly_rate_cents'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN hourly_rate_cents INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added hourly_rate_cents column to businesses table';
    END IF;

    -- Add availability fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'availability_days'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN availability_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        RAISE NOTICE 'Added availability_days column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'availability_hours'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN availability_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}';
        
        RAISE NOTICE 'Added availability_hours column to businesses table';
    END IF;

    -- Add services offered
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'services_offered'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN services_offered TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        RAISE NOTICE 'Added services_offered column to businesses table';
    END IF;

    -- Add business features
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'features'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN features TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        RAISE NOTICE 'Added features column to businesses table';
    END IF;

    -- Add business details
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'years_experience'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN years_experience INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added years_experience column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'languages_spoken'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN languages_spoken TEXT[] DEFAULT ARRAY['English']::TEXT[];
        
        RAISE NOTICE 'Added languages_spoken column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'certifications'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN certifications TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        RAISE NOTICE 'Added certifications column to businesses table';
    END IF;

    -- Add contact preferences
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN email TEXT;
        
        RAISE NOTICE 'Added email column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'website'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN website TEXT;
        
        RAISE NOTICE 'Added website column to businesses table';
    END IF;

    -- Add emergency/urgent service flags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'emergency_service'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN emergency_service BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added emergency_service column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'same_day_service'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN same_day_service BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added same_day_service column to businesses table';
    END IF;

    -- Add insurance and licensing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'insurance_verified'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN insurance_verified BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added insurance_verified column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'licensed'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN licensed BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added licensed column to businesses table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'bonded'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN bonded BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added bonded column to businesses table';
    END IF;

    -- Add response time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'response_time_hours'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN response_time_hours INTEGER DEFAULT 24;
        
        RAISE NOTICE 'Added response_time_hours column to businesses table';
    END IF;

    -- Add minimum booking notice
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'min_booking_notice_hours'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.businesses 
        ADD COLUMN min_booking_notice_hours INTEGER DEFAULT 24;
        
        RAISE NOTICE 'Added min_booking_notice_hours column to businesses table';
    END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON public.businesses(verified);
CREATE INDEX IF NOT EXISTS idx_businesses_service_type ON public.businesses(service_type);
CREATE INDEX IF NOT EXISTS idx_businesses_city_state ON public.businesses(city, state);
CREATE INDEX IF NOT EXISTS idx_businesses_emergency_service ON public.businesses(emergency_service);
CREATE INDEX IF NOT EXISTS idx_businesses_same_day_service ON public.businesses(same_day_service);

-- Verify the enhanced table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND table_schema = 'public'
ORDER BY ordinal_position;
