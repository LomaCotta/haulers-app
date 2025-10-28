-- Debug and fix business update issues
-- This script will identify and resolve the update problems

-- Step 1: Check if donation_badge column exists
SELECT '=== CHECKING DONATION_BADGE COLUMN ===' as debug_info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' AND column_name = 'donation_badge';

-- Step 2: Check RLS policies for businesses table
SELECT '=== CHECKING RLS POLICIES FOR BUSINESSES ===' as debug_info;
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'businesses';

-- Step 3: Check if categories table exists and has data
SELECT '=== CHECKING CATEGORIES TABLE ===' as debug_info;
SELECT COUNT(*) as category_count FROM public.categories;

-- Step 4: Check current businesses data
SELECT '=== CURRENT BUSINESSES DATA ===' as debug_info;
SELECT id, name, service_type, verified, donation_badge, created_at 
FROM public.businesses 
ORDER BY created_at DESC 
LIMIT 3;

-- Step 5: Add missing donation_badge column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'donation_badge'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN donation_badge boolean DEFAULT false;
        RAISE NOTICE 'Added donation_badge column to businesses table';
    ELSE
        RAISE NOTICE 'donation_badge column already exists';
    END IF;
END $$;

-- Step 6: Ensure proper RLS policies exist for businesses table
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON public.businesses;

-- Create comprehensive RLS policies
CREATE POLICY "businesses_select_policy" ON public.businesses
    FOR SELECT USING (
        -- Users can see their own businesses
        owner_id = auth.uid() OR
        -- Admins can see all businesses
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Verified businesses are public
        verified = true
    );

CREATE POLICY "businesses_insert_policy" ON public.businesses
    FOR INSERT WITH CHECK (
        -- Users can create businesses for themselves
        owner_id = auth.uid() OR
        -- Admins can create businesses for anyone
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "businesses_update_policy" ON public.businesses
    FOR UPDATE USING (
        -- Users can update their own businesses
        owner_id = auth.uid() OR
        -- Admins can update any business
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        -- Same conditions for the updated data
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "businesses_delete_policy" ON public.businesses
    FOR DELETE USING (
        -- Users can delete their own businesses
        owner_id = auth.uid() OR
        -- Admins can delete any business
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 7: Verify RLS is enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 8: Test update permissions
SELECT '=== TESTING UPDATE PERMISSIONS ===' as debug_info;
-- This will show if the current user can update businesses
SELECT 
    auth.uid() as current_user_id,
    p.role as user_role,
    CASE 
        WHEN p.role = 'admin' THEN 'Can update all businesses'
        ELSE 'Can only update own businesses'
    END as update_permission
FROM public.profiles p 
WHERE p.id = auth.uid();

-- Step 9: Show final verification
SELECT '=== FINAL VERIFICATION ===' as debug_info;
SELECT 
    'donation_badge column exists' as check_1,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'businesses' AND column_name = 'donation_badge'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as result_1;

SELECT 
    'RLS policies exist' as check_2,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'businesses'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as result_2;

SELECT 
    'Categories table exists' as check_3,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'categories'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as result_3;
