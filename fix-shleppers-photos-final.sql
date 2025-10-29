-- Fix Shleppers Moving Photos - Final Version
-- Using actual project reference: fotqvibtxartspacclqf

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

-- Step 2: Update with correct URLs using your project reference
UPDATE public.businesses 
SET 
  logo_url = 'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
  cover_photo_url = 'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png',
  gallery_photos = ARRAY[
    'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
    'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png'
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
  'Cover: ' || cover_photo_url as cover_test,
  'Gallery 1: ' || gallery_photos[1] as gallery_1_test,
  'Gallery 2: ' || gallery_photos[2] as gallery_2_test
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 5: Success message
SELECT 'Photos updated successfully! Check your public profile page.' as success_message;
