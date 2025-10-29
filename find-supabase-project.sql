-- Find Supabase Project Reference
-- This will help you identify your Supabase project details

-- Step 1: Check current database connection info
SELECT 'Database Connection Info:' as info;
SELECT 
  current_database() as database_name,
  current_user as current_user,
  version() as postgres_version;

-- Step 2: Check if there are any existing photo URLs to get the pattern
SELECT 'Existing Photo URLs Pattern:' as info;
SELECT 
  id,
  name,
  logo_url,
  CASE 
    WHEN logo_url LIKE '%supabase.co%' THEN 'Has Supabase URL'
    WHEN logo_url LIKE '%YOUR-PROJECT-REF%' THEN 'Has Placeholder URL'
    WHEN logo_url IS NULL THEN 'No Logo URL'
    ELSE 'Other URL Format'
  END as url_status
FROM public.businesses 
WHERE logo_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- Step 3: Check storage bucket configuration
SELECT 'Storage Bucket Info:' as info;
SELECT 
  id as bucket_id,
  name as bucket_name,
  public as is_public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'business-photos';

-- Step 4: Instructions for finding your project reference
SELECT 'How to find your Supabase project reference:' as instructions;
SELECT '1. Go to your Supabase dashboard' as step1;
SELECT '2. Look at the URL - it will be like: https://your-project-ref.supabase.co' as step2;
SELECT '3. Copy the "your-project-ref" part' as step3;
SELECT '4. Replace YOUR-PROJECT-REF in the fix script with your actual project reference' as step4;
