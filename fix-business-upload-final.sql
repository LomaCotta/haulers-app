-- Final Fix for Business Photo Upload Issue
-- This addresses the specific RLS policy violation

-- Step 1: Ensure business-photos bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-photos',
  'business-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop ALL existing business photo policies to start fresh
DROP POLICY IF EXISTS "Users can upload photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos for their own businesses" ON storage.objects;
DROP POLICY IF EXISTS "Public can view business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update business photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete business photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all business photos" ON storage.objects;

-- Step 3: Create comprehensive policies
-- Public read access
CREATE POLICY "Public can view business photos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-photos');

-- Business owners can upload photos (with proper filename pattern check)
CREATE POLICY "Business owners can upload photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Business owners can update photos
CREATE POLICY "Business owners can update photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Business owners can delete photos
CREATE POLICY "Business owners can delete photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Admins can manage all business photos
CREATE POLICY "Admins can manage all business photos" ON storage.objects
FOR ALL USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 4: Verify policies were created
SELECT 'Policies Created Successfully!' as status;

-- Show all business photo policies
SELECT 
  'Storage Policies:' as policy_type,
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as has_with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'
ORDER BY policyname;

-- Step 5: Test the policy logic
SELECT 'Policy Logic Test:' as test;
SELECT 
  'Testing filename pattern: business-id/logo_123.jpg' as test_case,
  split_part('business-id/logo_123.jpg', '/', 1) as extracted_business_id,
  'This should match a business ID in the database' as explanation;
