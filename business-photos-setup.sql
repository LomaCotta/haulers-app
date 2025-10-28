-- Business Photos and Logos Storage Setup
-- This script sets up Supabase storage for business photos and logos

-- Add photo columns to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS cover_photo_url text,
ADD COLUMN IF NOT EXISTS gallery_photos text[] DEFAULT '{}';

-- Create storage bucket for business photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-photos',
  'business-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for business photos storage
-- Allow authenticated users to upload photos for their own businesses
CREATE POLICY "Users can upload photos for their own businesses" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Allow users to view business photos
CREATE POLICY "Anyone can view business photos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-photos');

-- Allow business owners to update their photos
CREATE POLICY "Users can update photos for their own businesses" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Allow business owners to delete their photos
CREATE POLICY "Users can delete photos for their own businesses" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-photos' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id::text = split_part(name, '/', 1)
    AND owner_id = auth.uid()
  )
);

-- Function to clean up old photos when business is deleted
CREATE OR REPLACE FUNCTION cleanup_business_photos()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete logo
  IF OLD.logo_url IS NOT NULL THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'business-photos' 
    AND name = OLD.logo_url;
  END IF;
  
  -- Delete cover photo
  IF OLD.cover_photo_url IS NOT NULL THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'business-photos' 
    AND name = OLD.cover_photo_url;
  END IF;
  
  -- Delete gallery photos
  IF OLD.gallery_photos IS NOT NULL AND array_length(OLD.gallery_photos, 1) > 0 THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'business-photos' 
    AND name = ANY(OLD.gallery_photos);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up photos when business is deleted
DROP TRIGGER IF EXISTS cleanup_business_photos_trigger ON public.businesses;
CREATE TRIGGER cleanup_business_photos_trigger
  BEFORE DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_business_photos();

-- Function to get business photo URLs
CREATE OR REPLACE FUNCTION get_business_photo_urls(business_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'logo_url', logo_url,
    'cover_photo_url', cover_photo_url,
    'gallery_photos', gallery_photos
  ) INTO result
  FROM public.businesses
  WHERE id = business_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_business_photo_urls(uuid) TO authenticated;

-- Update businesses table to include photo URLs in select queries
-- This will be handled by the application layer

COMMENT ON COLUMN public.businesses.logo_url IS 'URL of the business logo image';
COMMENT ON COLUMN public.businesses.cover_photo_url IS 'URL of the main cover photo for the business';
COMMENT ON COLUMN public.businesses.gallery_photos IS 'Array of URLs for additional business photos';
