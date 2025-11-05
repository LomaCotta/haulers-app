-- Migration: Add RLS policies for invoices and enable review prompts when invoices are sent
-- This ensures invoices are properly secured and customers are prompted for reviews

-- 1. Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on invoice_items table
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Business owners can view their invoices
DROP POLICY IF EXISTS "Business owners can view their invoices" ON public.invoices;
CREATE POLICY "Business owners can view their invoices" ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = invoices.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- 4. RLS Policy: Customers can view their invoices
DROP POLICY IF EXISTS "Customers can view their invoices" ON public.invoices;
CREATE POLICY "Customers can view their invoices" ON public.invoices
  FOR SELECT
  USING (customer_id = auth.uid());

-- 5. RLS Policy: Business owners can create invoices
DROP POLICY IF EXISTS "Business owners can create invoices" ON public.invoices;
CREATE POLICY "Business owners can create invoices" ON public.invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = invoices.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- 6. RLS Policy: Business owners can update their invoices
DROP POLICY IF EXISTS "Business owners can update their invoices" ON public.invoices;
CREATE POLICY "Business owners can update their invoices" ON public.invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = invoices.business_id
      AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = invoices.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- 7. RLS Policy: Business owners can delete their invoices
DROP POLICY IF EXISTS "Business owners can delete their invoices" ON public.invoices;
CREATE POLICY "Business owners can delete their invoices" ON public.invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = invoices.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- 8. RLS Policy: Users can view invoice items for invoices they can access
DROP POLICY IF EXISTS "Users can view invoice items for accessible invoices" ON public.invoice_items;
CREATE POLICY "Users can view invoice items for accessible invoices" ON public.invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        invoices.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.businesses
          WHERE businesses.id = invoices.business_id
          AND businesses.owner_id = auth.uid()
        )
      )
    )
  );

-- 9. RLS Policy: Business owners can manage invoice items
DROP POLICY IF EXISTS "Business owners can manage invoice items" ON public.invoice_items;
CREATE POLICY "Business owners can manage invoice items" ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.businesses ON businesses.id = invoices.business_id
      WHERE invoices.id = invoice_items.invoice_id
      AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.businesses ON businesses.id = invoices.business_id
      WHERE invoices.id = invoice_items.invoice_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- 10. Ensure notifications table has required columns for review requests
DO $$ 
BEGIN
  -- Add notification_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'notification_type'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN notification_type TEXT;
  END IF;
  
  -- Add booking_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  -- Add action_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'action_url'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- 11. Create function to trigger review request when invoice is sent
CREATE OR REPLACE FUNCTION handle_invoice_sent_review_request()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  business_record RECORD;
BEGIN
  -- When invoice status changes to 'sent' and it's linked to a completed booking
  IF NEW.status = 'sent' 
     AND OLD.status != 'sent'
     AND NEW.booking_id IS NOT NULL
  THEN
    -- Get booking details
    SELECT * INTO booking_record
    FROM public.bookings
    WHERE id = NEW.booking_id;
    
    -- Only trigger if booking is completed and review hasn't been requested yet
    IF booking_record.booking_status = 'completed' 
       AND (booking_record.review_requested_at IS NULL OR booking_record.review_requested_at < NEW.email_sent_at)
    THEN
      -- Get business name
      SELECT name INTO business_record.name
      FROM public.businesses
      WHERE id = NEW.business_id;
      
      -- Create notification for review request (handle both old and new schema)
      BEGIN
        INSERT INTO public.notifications (
          user_id,
          booking_id,
          notification_type,
          title,
          message,
          action_url,
          type,
          related_id,
          created_at
        ) VALUES (
          NEW.customer_id,
          NEW.booking_id,
          'review_request',
          'How was your service? ⭐',
          'Thank you for your business! Please share your experience with ' || COALESCE(business_record.name, 'your service provider') || ' by leaving a review.',
          '/dashboard/reviews/' || NEW.booking_id::text,
          'system',
          NEW.booking_id,
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        -- Fallback: try without notification_type if column doesn't exist
        INSERT INTO public.notifications (
          user_id,
          booking_id,
          title,
          message,
          action_url,
          type,
          related_id,
          created_at
        ) VALUES (
          NEW.customer_id,
          NEW.booking_id,
          'How was your service? ⭐',
          'Thank you for your business! Please share your experience with ' || COALESCE(business_record.name, 'your service provider') || ' by leaving a review.',
          '/dashboard/reviews/' || NEW.booking_id::text,
          'system',
          NEW.booking_id,
          NOW()
        );
      END;
      
      -- Update booking to mark review as requested
      UPDATE public.bookings
      SET review_requested_at = NOW()
      WHERE id = NEW.booking_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for invoice sent status changes
DROP TRIGGER IF EXISTS invoice_sent_review_request_trigger ON public.invoices;
CREATE TRIGGER invoice_sent_review_request_trigger
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'sent')
  EXECUTE FUNCTION handle_invoice_sent_review_request();

-- Success message
SELECT 'Invoice RLS policies and review request triggers created successfully! 🧾⭐' as status;

