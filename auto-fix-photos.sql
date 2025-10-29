-- Auto Fix Photos with Dynamic URL Generation
-- This script will automatically generate the correct URLs

-- Step 1: Create a function to get the current Supabase project URL
-- This uses the current database connection to determine the project
CREATE OR REPLACE FUNCTION get_supabase_url()
RETURNS text AS $$
DECLARE
  project_url text;
BEGIN
  -- Try to get the project URL from the current connection
  -- This is a fallback method - you may need to manually set this
  SELECT current_setting('app.settings.supabase_url', true) INTO project_url;
  
  -- If not found, use a placeholder that you can replace
  IF project_url IS NULL OR project_url = '' THEN
    project_url := 'https://YOUR-PROJECT-REF.supabase.co';
  END IF;
  
  RETURN project_url;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update the business with dynamically generated URLs
WITH photo_urls AS (
  SELECT 
    'f4527f20-6aa0-4efb-9dce-73a7751daf95'::uuid as business_id,
    get_supabase_url() || '/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png' as logo_url,
    get_supabase_url() || '/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png' as cover_url,
    ARRAY[
      get_supabase_url() || '/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png',
      get_supabase_url() || '/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png'
    ] as gallery_urls
)
UPDATE public.businesses 
SET 
  logo_url = pu.logo_url,
  cover_photo_url = pu.cover_url,
  gallery_photos = pu.gallery_urls
FROM photo_urls pu
WHERE businesses.id = pu.business_id;

-- Step 3: Show the updated URLs
SELECT 'Updated Business Photos:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 4: Clean up
DROP FUNCTION get_supabase_url();

-- Step 5: Instructions for manual fix if needed
SELECT 'If URLs still don''t work, manually replace YOUR-PROJECT-REF with your actual Supabase project reference' as instructions;
