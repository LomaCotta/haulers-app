-- Check Photo URLs in Database
-- This will show us what URLs are actually stored

-- Step 1: Check the actual URLs stored in the database
SELECT 'Current Photo URLs in Database:' as info;
SELECT 
  id,
  name,
  logo_url,
  cover_photo_url,
  gallery_photos,
  array_length(gallery_photos, 1) as gallery_count
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 2: Check what's actually in storage
SELECT 'Storage Objects:' as info;
SELECT 
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'business-photos'
AND name LIKE 'f4527f20-6aa0-4efb-9dce-73a7751daf95/%'
ORDER BY created_at DESC;

-- Step 3: Generate the correct public URLs
SELECT 'Correct Public URLs:' as info;
SELECT 
  'Logo: https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/' || 
  (SELECT name FROM storage.objects WHERE bucket_id = 'business-photos' AND name LIKE 'f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_%' LIMIT 1) as logo_url,
  'Cover: https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/' || 
  (SELECT name FROM storage.objects WHERE bucket_id = 'business-photos' AND name LIKE 'f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_%' LIMIT 1) as cover_url,
  'Gallery: https://your-supabase-project.supabase.co/storage/v1/object/public/business-photos/' || 
  (SELECT name FROM storage.objects WHERE bucket_id = 'business-photos' AND name LIKE 'f4527f20-6aa0-4efb-9dce-73a7751daf95/gallery_%' LIMIT 1) as gallery_url;
