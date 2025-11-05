-- Migration: Add review_requested_at and automatic review request triggers
-- This ensures review requests are sent automatically when payment is marked as paid

-- 1. Add review_requested_at column to bookings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'review_requested_at'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN review_requested_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Create or replace function to handle payment status changes and trigger review requests
CREATE OR REPLACE FUNCTION handle_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  business_record RECORD;
BEGIN
  -- When payment_status changes to 'paid' and booking is completed
  IF NEW.payment_status = 'paid' 
     AND OLD.payment_status != 'paid' 
     AND NEW.booking_status = 'completed'
     AND (NEW.review_requested_at IS NULL OR NEW.review_requested_at < NEW.updated_at)
  THEN
    -- Get business name
    SELECT name INTO business_record.name
    FROM public.businesses
    WHERE id = NEW.business_id;
    
    -- Create notification for review request
    INSERT INTO public.notifications (
      user_id,
      booking_id,
      notification_type,
      title,
      message,
      action_url,
      created_at
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      'review_request',
      'How was your service? ⭐',
      'Thank you for your payment! Please share your experience with ' || COALESCE(business_record.name, 'your service provider') || ' by leaving a review.',
      '/dashboard/reviews/' || NEW.id::text,
      NOW()
    );
    
    -- Mark that review was requested
    NEW.review_requested_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger for payment status changes
DROP TRIGGER IF EXISTS payment_status_change_trigger ON public.bookings;
CREATE TRIGGER payment_status_change_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION handle_payment_status_change();

-- 4. Create function to handle invoice payment status changes
CREATE OR REPLACE FUNCTION handle_invoice_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  business_record RECORD;
BEGIN
  -- When invoice status changes to 'paid' or 'partially_paid'
  IF (NEW.status = 'paid' OR NEW.status = 'partially_paid')
     AND (OLD.status != 'paid' AND OLD.status != 'partially_paid')
     AND NEW.booking_id IS NOT NULL
  THEN
    -- Get booking details
    SELECT * INTO booking_record
    FROM public.bookings
    WHERE id = NEW.booking_id;
    
    -- Only trigger if booking is completed and payment is fully paid
    IF booking_record.booking_status = 'completed' 
       AND NEW.status = 'paid'
       AND (booking_record.review_requested_at IS NULL OR booking_record.review_requested_at < NEW.paid_at)
    THEN
      -- Get business name
      SELECT name INTO business_record.name
      FROM public.businesses
      WHERE id = NEW.business_id;
      
      -- Create notification for review request
      INSERT INTO public.notifications (
        user_id,
        booking_id,
        notification_type,
        title,
        message,
        action_url,
        created_at
      ) VALUES (
        NEW.customer_id,
        NEW.booking_id,
        'review_request',
        'How was your service? ⭐',
        'Thank you for your payment! Please share your experience with ' || COALESCE(business_record.name, 'your service provider') || ' by leaving a review.',
        '/dashboard/reviews/' || NEW.booking_id::text,
        NOW()
      );
      
      -- Update booking to mark review as requested
      UPDATE public.bookings
      SET review_requested_at = NOW()
      WHERE id = NEW.booking_id;
      
      -- Update booking payment status if invoice is fully paid
      UPDATE public.bookings
      SET payment_status = 'paid'
      WHERE id = NEW.booking_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for invoice payment status changes
DROP TRIGGER IF EXISTS invoice_payment_status_change_trigger ON public.invoices;
CREATE TRIGGER invoice_payment_status_change_trigger
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_invoice_payment_status_change();

-- Success message
SELECT 'Review request automation system created successfully! ⭐' as status;

