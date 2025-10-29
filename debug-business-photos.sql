-- Debug Business Photos Issue
-- This will help us understand why photos aren't showing on public profiles

-- Step 1: Check if businesses have photos
SELECT 'Businesses with Photos:' as info;
SELECT 
  id,
  name,
  verified,
  logo_url,
  cover_photo_url,
  gallery_photos,
  array_length(gallery_photos, 1) as gallery_count
FROM public.businesses 
WHERE (logo_url IS NOT NULL OR cover_photo_url IS NOT NULL OR array_length(gallery_photos, 1) > 0)
ORDER BY updated_at DESC
LIMIT 5;

-- Step 2: Check all businesses and their verification status
SELECT 'All Businesses Status:' as info;
SELECT 
  id,
  name,
  verified,
  has_pending_edits,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover,
  array_length(gallery_photos, 1) > 0 as has_gallery
FROM public.businesses 
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check if there are any businesses with photos but not verified
SELECT 'Unverified Businesses with Photos:' as info;
SELECT 
  id,
  name,
  verified,
  logo_url,
  cover_photo_url,
  gallery_photos
FROM public.businesses 
WHERE verified = false 
AND (logo_url IS NOT NULL OR cover_photo_url IS NOT NULL OR array_length(gallery_photos, 1) > 0)
ORDER BY updated_at DESC;

-- Step 4: Check storage bucket contents
SELECT 'Storage Bucket Contents:' as info;
SELECT 
  name,
  bucket_id,
  created_at,
  updated_at
FROM storage.objects 
WHERE bucket_id = 'business-photos'
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Test a specific business (replace with actual business ID)
-- SELECT 'Specific Business Photos:' as info;
-- SELECT 
--   id,
--   name,
--   verified,
--   logo_url,
--   cover_photo_url,
--   gallery_photos
-- FROM public.businesses 
-- WHERE id = 'YOUR_BUSINESS_ID_HERE';
