-- Fix Find Page Logos
-- This ensures all businesses have proper logo URLs for the find page

-- Step 1: Check current logo URLs in database
SELECT 'Current Logo URLs:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  CASE 
    WHEN logo_url LIKE 'https://fotqvibtxartspacclqf.supabase.co%' THEN 'Valid URL'
    WHEN logo_url LIKE 'https://YOUR-PROJECT-REF%' THEN 'Placeholder URL - NEEDS FIX'
    WHEN logo_url IS NULL THEN 'No Logo'
    ELSE 'Other URL Format'
  END as logo_status
FROM public.businesses 
WHERE verified = true
ORDER BY updated_at DESC;

-- Step 2: Update Shleppers Moving with correct logo URL
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
SELECT 'Updated Shleppers Moving:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  array_length(gallery_photos, 1) as gallery_count
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 4: Test the find page query
SELECT 'Find Page Query Test:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  CASE 
    WHEN logo_url IS NOT NULL THEN 'Has Logo'
    WHEN cover_photo_url IS NOT NULL THEN 'Has Cover Photo'
    ELSE 'No Photos'
  END as photo_status
FROM public.businesses 
WHERE verified = true
ORDER BY created_at DESC;

-- Step 5: Check if there are any other businesses with placeholder URLs
SELECT 'Businesses with Placeholder URLs:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url
FROM public.businesses 
WHERE logo_url LIKE 'https://YOUR-PROJECT-REF%' 
   OR cover_photo_url LIKE 'https://YOUR-PROJECT-REF%'
   OR logo_url LIKE 'https://YOUR-PROJECT-REF%'
   OR cover_photo_url LIKE 'https://YOUR-PROJECT-REF%';

-- Step 6: Success message
SELECT 'Logo fix completed! Check the find page now.' as success_message;
