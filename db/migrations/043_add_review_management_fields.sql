-- Migration: Add review management fields for admin and business owners
-- Add fields for hiding reviews and owner responses

-- Add is_hidden field (defaults to false - all reviews visible by default)
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

-- Add owner_response field for business owner responses to reviews
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS owner_response TEXT;

-- Add owner_response_at timestamp
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS owner_response_at TIMESTAMPTZ;

-- Add index for filtering hidden reviews
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON public.reviews(is_hidden);

-- Add index for business_id to speed up owner queries
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);

-- Update RLS policies to allow business owners to update their reviews
-- Allow business owners to add responses to reviews for their businesses
DROP POLICY IF EXISTS "update_reviews_owner_response" ON public.reviews;
CREATE POLICY "update_reviews_owner_response" ON public.reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = reviews.business_id
      AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = reviews.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- Allow admins to update any review (hide/show, delete, etc.)
DROP POLICY IF EXISTS "admin_update_reviews" ON public.reviews;
CREATE POLICY "admin_update_reviews" ON public.reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Allow admins to delete any review
DROP POLICY IF EXISTS "admin_delete_reviews" ON public.reviews;
CREATE POLICY "admin_delete_reviews" ON public.reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Update read policy to hide reviews marked as hidden (except for admins and business owners)
DROP POLICY IF EXISTS "read_reviews" ON public.reviews;
CREATE POLICY "read_reviews" ON public.reviews
  FOR SELECT
  USING (
    -- Admins can see all reviews
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    OR
    -- Business owners can see all reviews for their businesses (including hidden ones)
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = reviews.business_id
      AND b.owner_id = auth.uid()
    )
    OR
    -- Consumers can see their own reviews
    (reviews.consumer_id = auth.uid())
    OR
    -- Everyone else sees only non-hidden reviews
    (is_hidden = FALSE)
  );

