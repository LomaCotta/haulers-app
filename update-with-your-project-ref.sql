-- Update Photos with Your Project Reference
-- Replace 'YOUR-PROJECT-REF' with your actual Supabase project reference

-- Step 1: Check current URLs
SELECT 'Current URLs:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 2: Update with your project reference
-- IMPORTANT: Replace 'YOUR-PROJECT-REF' with your actual project reference from your Supabase dashboard URL
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

-- Step 4: Test URLs (copy these to your browser to test)
SELECT 'Test these URLs in your browser:' as info;
SELECT 
  'Logo: ' || logo_url as logo_test,
  'Cover: ' || cover_photo_url as cover_test
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';
