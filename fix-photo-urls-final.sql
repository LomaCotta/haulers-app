-- Fix Photo URLs - Final Version
-- This will update the business with the correct photo URLs

-- Step 1: Check current URLs
SELECT 'Current URLs in Database:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 2: Update with correct URLs
-- Replace 'YOUR-PROJECT-REF' with your actual Supabase project reference
-- You can find this in your Supabase dashboard URL
UPDATE public.businesses 
SET 
  logo_url = 'https://YOUR-PROJECT-REF.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
  cover_photo_url = 'https://YOUR-PROJECT-REF.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png',
  gallery_photos = ARRAY[
    'https://YOUR-PROJECT-REF.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
    'https://YOUR-PROJECT-REF.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png'
  ]
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 3: Verify the update
SELECT 'Updated URLs:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 4: Instructions
SELECT 'IMPORTANT: Replace YOUR-PROJECT-REF with your actual Supabase project reference before running this script!' as instructions;
SELECT 'You can find your project reference in your Supabase dashboard URL' as note;
