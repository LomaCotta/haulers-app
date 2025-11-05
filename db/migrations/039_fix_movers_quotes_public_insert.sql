-- Fix RLS policy for movers_quotes to require authentication
-- Users must be logged in to create quotes - this enforces that requirement

-- Drop existing policy
DROP POLICY IF EXISTS "movers_quotes_rw" ON movers_quotes;

-- Create new policy that allows:
-- 1. Customers to view/update their own quotes (customer_id = auth.uid())
-- 2. Providers to view/update quotes for their providers (owner check)
-- 3. Authenticated users to create quotes with their own customer_id
-- 4. Anyone to view quotes where provider_id is null (public quotes)
CREATE POLICY "movers_quotes_rw" ON movers_quotes
  FOR ALL 
  USING (
    -- Customers can see their own quotes
    customer_id = auth.uid()
    OR
    -- Providers can see quotes for their providers
    (provider_id IS NOT NULL AND EXISTS(
      SELECT 1 FROM movers_providers p 
      WHERE p.id = provider_id AND p.owner_user_id = auth.uid()
    ))
    OR
    -- Public quotes (provider_id is null) - anyone can view
    provider_id IS NULL
  )
  WITH CHECK (
    -- Require authentication for INSERT/UPDATE
    auth.uid() IS NOT NULL
    AND (
      -- Customers can create/update their own quotes
      customer_id = auth.uid()
      OR
      -- Providers can create/update quotes for their providers
      (provider_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM movers_providers p 
        WHERE p.id = provider_id AND p.owner_user_id = auth.uid()
      ))
    )
  );

