-- Update Business Photos
-- This manually updates the business record with the correct photo URLs

-- Step 1: Check current business photos
SELECT 'Current Business Photos:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 2: Update with the correct photo URLs
-- Replace 'your-supabase-project' with your actual Supabase project reference
UPDATE public.businesses 
SET 
  logo_url = 'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
  cover_photo_url = 'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png',
  gallery_photos = ARRAY[
    'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
    'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png'
  ]
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 3: Verify the update
SELECT 'Updated Business Photos:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos,
  array_length(gallery_photos, 1) as gallery_count
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 4: Test the public URLs (optional)
-- You can test these URLs in your browser to make sure they work
SELECT 'Photo URLs to Test:' as info;
SELECT 
  'Logo URL: ' || logo_url as logo_test,
  'Cover URL: ' || cover_photo_url as cover_test,
  'Gallery URLs: ' || array_to_string(gallery_photos, ', ') as gallery_test
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';
