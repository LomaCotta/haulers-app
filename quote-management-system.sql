-- Quote Management System
-- This creates a comprehensive quote system with notifications and messaging

-- Step 1: Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Quote Details
  quote_amount_cents INTEGER NOT NULL DEFAULT 0,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  hourly_rate_cents INTEGER DEFAULT 0,
  additional_fees_cents INTEGER DEFAULT 0,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Quote Status
  quote_status TEXT NOT NULL DEFAULT 'pending' CHECK (quote_status IN (
    'pending', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'negotiating'
  )),
  
  -- Quote Content
  quote_message TEXT NOT NULL,
  quote_notes TEXT,
  terms_and_conditions TEXT,
  valid_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Response Tracking
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Step 2: Create quote messages table for communication
CREATE TABLE IF NOT EXISTS public.quote_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Message Details
  message_type TEXT NOT NULL CHECK (message_type IN (
    'quote_sent', 'quote_question', 'quote_response', 'quote_negotiation', 
    'quote_accepted', 'quote_rejected', 'quote_expired', 'system_notification'
  )),
  message_text TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  
  -- Tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_quotes_booking_id ON public.quotes(booking_id);
CREATE INDEX IF NOT EXISTS idx_quotes_business_id ON public.quotes(business_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(quote_status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at);

CREATE INDEX IF NOT EXISTS idx_quote_messages_quote_id ON public.quote_messages(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_messages_sender_id ON public.quote_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_quote_messages_unread ON public.quote_messages(quote_id, is_read) WHERE is_read = false;

-- Step 4: Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Business owners can view their quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can view their quotes" ON public.quotes;
DROP POLICY IF EXISTS "Business owners can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Business owners can update their quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can update quote status" ON public.quotes;
DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view messages for their quotes" ON public.quote_messages;
DROP POLICY IF EXISTS "Quote participants can create messages" ON public.quote_messages;
DROP POLICY IF EXISTS "Users can update their message read status" ON public.quote_messages;

-- Quotes policies
CREATE POLICY "Business owners can view their quotes" ON public.quotes
  FOR SELECT USING (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Customers can view their quotes" ON public.quotes
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Business owners can create quotes" ON public.quotes
  FOR INSERT WITH CHECK (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can update their quotes" ON public.quotes
  FOR UPDATE USING (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Customers can update quote status" ON public.quotes
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage all quotes" ON public.quotes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Quote messages policies
CREATE POLICY "Users can view messages for their quotes" ON public.quote_messages
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM public.quotes 
      WHERE customer_id = auth.uid() OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Quote participants can create messages" ON public.quote_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND quote_id IN (
      SELECT id FROM public.quotes 
      WHERE customer_id = auth.uid() OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their message read status" ON public.quote_messages
  FOR UPDATE USING (sender_id != auth.uid());

-- Step 6: Create function to send quote
CREATE OR REPLACE FUNCTION public.send_quote(
  p_booking_id UUID,
  p_quote_amount_cents INTEGER,
  p_quote_message TEXT,
  p_quote_notes TEXT DEFAULT NULL,
  p_valid_until_days INTEGER DEFAULT 7
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking RECORD;
  v_quote_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN 'ERROR: Booking not found';
  END IF;
  
  -- Check if business owner is sending
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = v_booking.business_id AND owner_id = auth.uid()
  ) THEN
    RETURN 'ERROR: Unauthorized - not the business owner';
  END IF;
  
  -- Check if quote already exists
  IF EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE booking_id = p_booking_id 
    AND quote_status IN ('sent', 'pending', 'negotiating')
  ) THEN
    RETURN 'ERROR: Active quote already exists for this booking';
  END IF;
  
  -- Calculate expiration date
  v_expires_at := NOW() + (p_valid_until_days || ' days')::INTERVAL;
  
  -- Create quote
  INSERT INTO public.quotes (
    booking_id,
    business_id,
    customer_id,
    quote_amount_cents,
    total_price_cents,
    quote_message,
    quote_notes,
    quote_status,
    valid_until,
    expires_at,
    sent_at,
    created_by
  ) VALUES (
    p_booking_id,
    v_booking.business_id,
    v_booking.customer_id,
    p_quote_amount_cents,
    p_quote_amount_cents,
    p_quote_message,
    p_quote_notes,
    'sent',
    v_expires_at,
    v_expires_at,
    NOW(),
    auth.uid()
  ) RETURNING id INTO v_quote_id;
  
  -- Create initial quote message
  INSERT INTO public.quote_messages (
    quote_id,
    sender_id,
    message_type,
    message_text
  ) VALUES (
    v_quote_id,
    auth.uid(),
    'quote_sent',
    p_quote_message
  );
  
  -- Update booking status
  UPDATE public.bookings
  SET 
    booking_status = 'confirmed',
    total_price_cents = p_quote_amount_cents,
    confirmed_at = NOW(),
    business_notes = COALESCE(business_notes || E'\n', '') || 'Quote sent: ' || p_quote_message
  WHERE id = p_booking_id;
  
  -- Create notification for customer
  INSERT INTO public.notifications (
    user_id,
    booking_id,
    notification_type,
    title,
    message,
    action_url,
    is_urgent
  ) VALUES (
    v_booking.customer_id,
    p_booking_id,
    'review_requested',
    'New Quote Received! 💰',
    'You have received a quote for your booking request. Click to view and respond.',
    '/dashboard/bookings/' || p_booking_id || '/quote',
    true
  );
  
  RETURN 'SUCCESS: Quote sent successfully. Quote ID: ' || v_quote_id;
END;
$$;

-- Step 7: Create function to accept/reject quote
CREATE OR REPLACE FUNCTION public.respond_to_quote(
  p_quote_id UUID,
  p_response TEXT, -- 'accepted' or 'rejected'
  p_response_message TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quote RECORD;
  v_booking RECORD;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM public.quotes
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN 'ERROR: Quote not found';
  END IF;
  
  -- Check if customer is responding
  IF v_quote.customer_id != auth.uid() THEN
    RETURN 'ERROR: Unauthorized - only the customer can respond';
  END IF;
  
  -- Check if quote is still valid
  IF v_quote.expires_at < NOW() AND v_quote.quote_status != 'expired' THEN
    UPDATE public.quotes
    SET quote_status = 'expired'
    WHERE id = p_quote_id;
    RETURN 'ERROR: Quote has expired';
  END IF;
  
  -- Update quote status
  IF p_response = 'accepted' THEN
    UPDATE public.quotes
    SET 
      quote_status = 'accepted',
      accepted_at = NOW(),
      responded_at = NOW()
    WHERE id = p_quote_id;
    
    -- Create message
    INSERT INTO public.quote_messages (
      quote_id,
      sender_id,
      message_type,
      message_text
    ) VALUES (
      p_quote_id,
      auth.uid(),
      'quote_accepted',
      COALESCE(p_response_message, 'Quote accepted')
    );
    
    -- Get booking details
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = v_quote.booking_id;
    
    -- Create notification for business owner
    INSERT INTO public.notifications (
      user_id,
      booking_id,
      notification_type,
      title,
      message,
      action_url,
      is_urgent
    ) VALUES (
      (SELECT owner_id FROM public.businesses WHERE id = v_booking.business_id),
      v_quote.booking_id,
      'booking_confirmed',
      'Quote Accepted! 🎉',
      'Your quote has been accepted by the customer.',
      '/dashboard/businesses/' || v_booking.business_id || '/bookings',
      true
    );
    
    RETURN 'SUCCESS: Quote accepted';
    
  ELSIF p_response = 'rejected' THEN
    UPDATE public.quotes
    SET 
      quote_status = 'rejected',
      rejected_at = NOW(),
      responded_at = NOW(),
      rejection_reason = p_rejection_reason
    WHERE id = p_quote_id;
    
    -- Create message
    INSERT INTO public.quote_messages (
      quote_id,
      sender_id,
      message_type,
      message_text
    ) VALUES (
      p_quote_id,
      auth.uid(),
      'quote_rejected',
      COALESCE(p_response_message, 'Quote rejected')
    );
    
    RETURN 'SUCCESS: Quote rejected';
  ELSE
    RETURN 'ERROR: Invalid response type';
  END IF;
END;
$$;

-- Step 8: Create trigger for quote expiration
-- Drop trigger first if it exists (with CASCADE to handle dependencies)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'quote_expiration_check' 
    AND tgrelid = 'public.quotes'::regclass
  ) THEN
    DROP TRIGGER quote_expiration_check ON public.quotes CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_quote_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at < NOW() AND NEW.quote_status IN ('sent', 'pending', 'negotiating') THEN
    NEW.quote_status := 'expired';
    
    -- Create expired notification
    INSERT INTO public.notifications (
      user_id,
      booking_id,
      notification_type,
      title,
      message,
      action_url
    )
    SELECT 
      customer_id,
      booking_id,
      'system_update',
      'Quote Expired ⏰',
      'Your quote has expired. Please contact the business for a new quote.',
      '/dashboard/bookings/' || booking_id
    FROM public.quotes
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quote_expiration_check
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_quote_expiration();

-- Step 9: Create trigger for updated_at (ensure function exists first)
-- Drop trigger first if it exists (with CASCADE to handle dependencies)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quotes_updated_at' 
    AND tgrelid = 'public.quotes'::regclass
  ) THEN
    DROP TRIGGER update_quotes_updated_at ON public.quotes CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Success message
SELECT 'Quote management system created successfully! 🚀' as status;
