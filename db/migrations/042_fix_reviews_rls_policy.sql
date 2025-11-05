-- Migration: Fix reviews RLS policy to allow reviews for completed bookings and paid invoices
-- The existing policy checks for booking.status = 'completed', but the table uses booking_status
-- Also need to allow reviews for paid invoices, not just completed bookings

-- Drop the old policy
DROP POLICY IF EXISTS "insert_reviews" ON public.reviews;

-- Create updated policy that:
-- 1. Allows consumers to insert reviews for their bookings
-- 2. Checks for completed bookings OR paid invoices
-- 3. Uses the correct column names (booking_status, customer_id)
-- Note: Bookings table uses customer_id, not consumer_id
CREATE POLICY "insert_reviews" ON public.reviews
  FOR INSERT
  WITH CHECK (
    consumer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings bk
      WHERE bk.id = booking_id
      AND bk.customer_id = auth.uid()
      AND (
        -- Allow if booking is completed
        bk.booking_status = 'completed'
        OR
        -- OR if there's a paid invoice for this booking
        EXISTS (
          SELECT 1 FROM public.invoices inv
          WHERE inv.booking_id = bk.id
          AND inv.status = 'paid'
          AND inv.paid_cents >= inv.total_cents
        )
      )
    )
  );

-- Also ensure the policy allows reading reviews
DROP POLICY IF EXISTS "read_reviews" ON public.reviews;
CREATE POLICY "read_reviews" ON public.reviews
  FOR SELECT
  USING (true);



