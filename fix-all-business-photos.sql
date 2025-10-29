-- Fix All Business Photos
-- This script will update all businesses with their uploaded photos

-- Step 1: Create a function to get the public URL for a storage object
CREATE OR REPLACE FUNCTION get_storage_public_url(bucket_name text, object_name text)
RETURNS text AS $$
BEGIN
  -- Replace 'your-supabase-project' with your actual Supabase project reference
  RETURN 'https://your-supabase-project.supabase.co/storage/v1/object/public/' || bucket_name || '/' || object_name;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update all businesses with their photos from storage
WITH business_photos AS (
  SELECT 
    split_part(name, '/', 1)::uuid as business_id,
    name,
    CASE 
      WHEN name LIKE '%/logo_%' THEN 'logo'
      WHEN name LIKE '%/cover_%' THEN 'cover'
      WHEN name LIKE '%/gallery_%' THEN 'gallery'
    END as photo_type
  FROM storage.objects 
  WHERE bucket_id = 'business-photos'
),
photo_aggregated AS (
  SELECT 
    business_id,
    MAX(CASE WHEN photo_type = 'logo' THEN get_storage_public_url('business-photos', name) END) as logo_url,
    MAX(CASE WHEN photo_type = 'cover' THEN get_storage_public_url('business-photos', name) END) as cover_photo_url,
    ARRAY_AGG(
      CASE WHEN photo_type = 'gallery' THEN get_storage_public_url('business-photos', name) END
    ) FILTER (WHERE photo_type = 'gallery') as gallery_photos
  FROM business_photos
  GROUP BY business_id
)
UPDATE public.businesses 
SET 
  logo_url = COALESCE(pa.logo_url, businesses.logo_url),
  cover_photo_url = COALESCE(pa.cover_photo_url, businesses.cover_photo_url),
  gallery_photos = COALESCE(pa.gallery_photos, businesses.gallery_photos)
FROM photo_aggregated pa
WHERE businesses.id = pa.business_id;

-- Step 3: Show businesses with photos
SELECT 'Businesses with Photos:' as info;
SELECT 
  id,
  name,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover,
  array_length(gallery_photos, 1) > 0 as has_gallery,
  array_length(gallery_photos, 1) as gallery_count
FROM public.businesses 
WHERE logo_url IS NOT NULL 
   OR cover_photo_url IS NOT NULL 
   OR array_length(gallery_photos, 1) > 0
ORDER BY updated_at DESC;

-- Step 4: Clean up the function
DROP FUNCTION get_storage_public_url(text, text);
