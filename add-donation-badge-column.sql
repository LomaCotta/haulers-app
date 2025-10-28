-- Add donation_badge column to businesses table
-- This allows admins to mark businesses that are making donations

-- Add the donation_badge column
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS donation_badge boolean DEFAULT false;

-- Add an index for performance when filtering by donation badge
CREATE INDEX IF NOT EXISTS idx_businesses_donation_badge ON public.businesses(donation_badge);

-- Update RLS policies to allow admins to update donation badges
-- The existing policies should already cover this, but let's verify

-- Check current policies
SELECT '=== CURRENT BUSINESS POLICIES ===' as debug_info;
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'businesses';

-- Verify the column was added
SELECT '=== VERIFY DONATION_BADGE COLUMN ===' as debug_info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' AND column_name = 'donation_badge';

-- Show sample businesses with donation badge status
SELECT '=== SAMPLE BUSINESSES WITH DONATION BADGE STATUS ===' as debug_info;
SELECT id, name, verified, donation_badge, created_at 
FROM public.businesses 
ORDER BY created_at DESC 
LIMIT 5;
