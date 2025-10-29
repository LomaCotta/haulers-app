-- Complete Fix for Business Photos Upload Issue
-- This script fixes both storage RLS policies and ensures business owners can upload photos

-- Step 1: Ensure business-photos bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-photos',
  'business-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop all existing business photo policies to avoid conflicts
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

-- Step 3: Create comprehensive RLS policies for business photos
-- Allow public read access to business photos
CREATE POLICY "Public can view business photos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-photos');

-- Allow business owners to upload photos for their own businesses
-- The filename pattern is: {businessId}/{type}_{timestamp}.{ext}
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

-- Allow business owners to update photos for their own businesses
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

-- Allow business owners to delete photos for their own businesses
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

-- Allow admins to manage all business photos
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

-- Step 4: Ensure businesses table has proper RLS policies for photo updates
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "read_businesses" ON public.businesses;
DROP POLICY IF EXISTS "insert_business" ON public.businesses;
DROP POLICY IF EXISTS "update_own_business" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON public.businesses;

-- Create comprehensive businesses table policies
CREATE POLICY "businesses_select_policy" ON public.businesses
FOR SELECT USING (
  -- Users can see their own businesses
  owner_id = auth.uid() OR
  -- Admins can see all businesses
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR
  -- Verified businesses are public
  verified = true
);

CREATE POLICY "businesses_insert_policy" ON public.businesses
FOR INSERT WITH CHECK (
  -- Users can create businesses for themselves
  owner_id = auth.uid() OR
  -- Admins can create businesses for anyone
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "businesses_update_policy" ON public.businesses
FOR UPDATE USING (
  -- Users can update their own businesses
  owner_id = auth.uid() OR
  -- Admins can update any business
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
) WITH CHECK (
  -- Same conditions for the updated data
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "businesses_delete_policy" ON public.businesses
FOR DELETE USING (
  -- Users can delete their own businesses
  owner_id = auth.uid() OR
  -- Admins can delete any business
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Step 5: Enable RLS on businesses table if not already enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify everything is working
SELECT 'Business photos RLS policies fixed!' as status;

-- Show all business-related policies
SELECT 
  'Storage Policies:' as policy_type,
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%business%'

UNION ALL

SELECT 
  'Business Table Policies:' as policy_type,
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'businesses' 
AND schemaname = 'public';
