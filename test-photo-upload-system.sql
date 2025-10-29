-- Test Photo Upload System
-- This tests the complete photo upload flow for business owners

-- Step 1: Test the update_business_photos function
SELECT 'Testing update_business_photos function:' as info;

-- Test with Shleppers Moving
SELECT update_business_photos(
  'f4527f20-6aa0-4efb-9dce-73a7751daf95'::uuid,
  'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
  'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png',
  ARRAY[
    'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
    'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png'
  ]
) as test_result;

-- Step 2: Check if the function worked
SELECT 'Business photos after function call:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos,
  array_length(gallery_photos, 1) as gallery_count
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 3: Test with a different business (if exists)
SELECT 'Testing with other businesses:' as info;
SELECT 
  id,
  name,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover,
  array_length(gallery_photos, 1) > 0 as has_gallery
FROM public.businesses 
WHERE id != 'f4527f20-6aa0-4efb-9dce-73a7751daf95'
ORDER BY created_at DESC
LIMIT 3;

-- Step 4: Test the sync function
SELECT 'Testing sync_all_business_photos function:' as info;
SELECT sync_all_business_photos() as sync_result;

-- Step 5: Check all businesses with photos after sync
SELECT 'All businesses with photos after sync:' as info;
SELECT 
  id,
  name,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover,
  array_length(gallery_photos, 1) > 0 as has_gallery,
  array_length(gallery_photos, 1) as gallery_count,
  updated_at
FROM public.businesses 
WHERE logo_url IS NOT NULL 
   OR cover_photo_url IS NOT NULL 
   OR array_length(gallery_photos, 1) > 0
ORDER BY updated_at DESC;

-- Step 6: Test URL validation
SELECT 'URL Validation Test:' as info;
SELECT 
  id,
  name,
  CASE 
    WHEN logo_url LIKE 'https://fotqvibtxartspacclqf.supabase.co%' THEN 'Valid URL'
    WHEN logo_url LIKE 'https://YOUR-PROJECT-REF%' THEN 'Placeholder URL - NEEDS FIX'
    WHEN logo_url IS NULL THEN 'No Logo'
    ELSE 'Other URL Format'
  END as logo_url_status,
  CASE 
    WHEN cover_photo_url LIKE 'https://fotqvibtxartspacclqf.supabase.co%' THEN 'Valid URL'
    WHEN cover_photo_url LIKE 'https://YOUR-PROJECT-REF%' THEN 'Placeholder URL - NEEDS FIX'
    WHEN cover_photo_url IS NULL THEN 'No Cover'
    ELSE 'Other URL Format'
  END as cover_url_status
FROM public.businesses 
WHERE logo_url IS NOT NULL OR cover_photo_url IS NOT NULL
ORDER BY updated_at DESC;
