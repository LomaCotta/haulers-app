-- Fix Photo Upload System
-- This creates a function to automatically save photo URLs to the database

-- Step 1: Create a function to update business photos immediately after upload
CREATE OR REPLACE FUNCTION update_business_photos(
  business_id uuid,
  logo_url text DEFAULT NULL,
  cover_photo_url text DEFAULT NULL,
  gallery_photos text[] DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Update the business record with new photo URLs
  UPDATE public.businesses 
  SET 
    logo_url = COALESCE(update_business_photos.logo_url, businesses.logo_url),
    cover_photo_url = COALESCE(update_business_photos.cover_photo_url, businesses.cover_photo_url),
    gallery_photos = COALESCE(update_business_photos.gallery_photos, businesses.gallery_photos),
    updated_at = NOW()
  WHERE id = business_id;
  
  -- Check if the update was successful
  IF FOUND THEN
    -- Get the updated business data
    SELECT json_build_object(
      'success', true,
      'message', 'Photos updated successfully',
      'business_id', business_id,
      'logo_url', logo_url,
      'cover_photo_url', cover_photo_url,
      'gallery_photos', gallery_photos
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'success', false,
      'message', 'Business not found',
      'business_id', business_id
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION update_business_photos(uuid, text, text, text[]) TO authenticated;

-- Step 3: Create a function to sync all existing photos from storage
CREATE OR REPLACE FUNCTION sync_all_business_photos()
RETURNS json AS $$
DECLARE
  business_record RECORD;
  photo_record RECORD;
  logo_url text;
  cover_url text;
  gallery_urls text[];
  updated_count integer := 0;
BEGIN
  -- Loop through all businesses
  FOR business_record IN 
    SELECT id FROM public.businesses 
  LOOP
    -- Reset variables for each business
    logo_url := NULL;
    cover_url := NULL;
    gallery_urls := ARRAY[]::text[];
    
    -- Get photos for this business from storage
    FOR photo_record IN
      SELECT name FROM storage.objects 
      WHERE bucket_id = 'business-photos' 
      AND name LIKE business_record.id::text || '/%'
    LOOP
      -- Build the public URL
      DECLARE
        public_url text := 'https://fotqvibtxartspacclqf.supabase.co/storage/v1/object/public/business-photos/' || photo_record.name;
      BEGIN
        -- Categorize the photo
        IF photo_record.name LIKE '%/logo_%' THEN
          logo_url := public_url;
        ELSIF photo_record.name LIKE '%/cover_%' THEN
          cover_url := public_url;
        ELSIF photo_record.name LIKE '%/gallery_%' THEN
          gallery_urls := array_append(gallery_urls, public_url);
        END IF;
      END;
    END LOOP;
    
    -- Update the business if we found photos
    IF logo_url IS NOT NULL OR cover_url IS NOT NULL OR array_length(gallery_urls, 1) > 0 THEN
      PERFORM update_business_photos(
        business_record.id,
        logo_url,
        cover_url,
        gallery_urls
      );
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Photo sync completed',
    'businesses_updated', updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION sync_all_business_photos() TO authenticated;

-- Step 5: Test the functions
SELECT 'Functions created successfully!' as status;

-- Step 6: Sync all existing photos
SELECT 'Syncing all business photos...' as info;
SELECT sync_all_business_photos();

-- Step 7: Show businesses with photos
SELECT 'Businesses with Photos After Sync:' as info;
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
