-- Fix RLS policy for movers_quotes to allow customers to view their own quotes
-- The current policy only allows providers to see quotes, but customers should also be able to view their quotes

-- Drop existing policy
DROP POLICY IF EXISTS "movers_quotes_rw" ON movers_quotes;

-- Create new policy that allows:
-- 1. Customers to view their own quotes (customer_id = auth.uid())
-- 2. Providers to view quotes for their providers (owner check)
-- 3. Anyone to view quotes where provider_id is null (public quotes)
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
    -- Public quotes (provider_id is null)
    provider_id IS NULL
  )
  WITH CHECK (
    -- Customers can create/update their own quotes
    customer_id = auth.uid()
    OR
    -- Providers can create/update quotes for their providers
    (provider_id IS NOT NULL AND EXISTS(
      SELECT 1 FROM movers_providers p 
      WHERE p.id = provider_id AND p.owner_user_id = auth.uid()
    ))
    OR
    -- Public quotes (provider_id is null)
    provider_id IS NULL
  );

