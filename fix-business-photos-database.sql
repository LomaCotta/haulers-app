-- Fix Business Photos Database
-- This will update the business record with the photo URLs from storage

-- Step 1: Get the business ID from the storage objects
WITH business_photos AS (
  SELECT 
    split_part(name, '/', 1) as business_id,
    name,
    CASE 
      WHEN name LIKE '%/logo_%' THEN 'logo'
      WHEN name LIKE '%/cover_%' THEN 'cover'
      WHEN name LIKE '%/gallery_%' THEN 'gallery'
    END as photo_type
  FROM storage.objects 
  WHERE bucket_id = 'business-photos'
  AND name LIKE 'f4527f20-6aa0-4efb-9dce-73a7751daf95/%'
),
photo_urls AS (
  SELECT 
    business_id,
    MAX(CASE WHEN photo_type = 'logo' THEN name END) as logo_url,
    MAX(CASE WHEN photo_type = 'cover' THEN name END) as cover_url,
    ARRAY_AGG(CASE WHEN photo_type = 'gallery' THEN name END) FILTER (WHERE photo_type = 'gallery') as gallery_urls
  FROM business_photos
  GROUP BY business_id
)
-- Step 2: Update the business record with photo URLs
UPDATE public.businesses 
SET 
  logo_url = CASE 
    WHEN pu.logo_url IS NOT NULL THEN 
      'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/' || pu.logo_url
    ELSE logo_url 
  END,
  cover_photo_url = CASE 
    WHEN pu.cover_url IS NOT NULL THEN 
      'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/' || pu.cover_url
    ELSE cover_photo_url 
  END,
  gallery_photos = CASE 
    WHEN array_length(pu.gallery_urls, 1) > 0 THEN 
      ARRAY(
        SELECT 'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/' || unnest(pu.gallery_urls)
      )
    ELSE gallery_photos 
  END
FROM photo_urls pu
WHERE businesses.id::text = pu.business_id;

-- Step 3: Check the updated business record
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

-- Step 4: Alternative approach - Get the actual public URLs from Supabase
-- This is a simpler approach that just gets the public URLs
SELECT 'Storage Objects with Public URLs:' as info;
SELECT 
  name,
  'https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/' || name as public_url
FROM storage.objects 
WHERE bucket_id = 'business-photos'
AND name LIKE 'f4527f20-6aa0-4efb-9dce-73a7751daf95/%'
ORDER BY created_at DESC;
