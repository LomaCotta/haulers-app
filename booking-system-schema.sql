-- Comprehensive Booking System Schema
-- This creates a flexible, industry-agnostic booking system

-- Step 1: Create bookings table with industry flexibility
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Booking Details
  service_type TEXT NOT NULL,
  booking_status TEXT NOT NULL DEFAULT 'pending' CHECK (booking_status IN (
    'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Scheduling
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  estimated_duration_hours INTEGER DEFAULT 1,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Location
  service_address TEXT NOT NULL,
  service_city TEXT NOT NULL,
  service_state TEXT NOT NULL,
  service_postal_code TEXT NOT NULL,
  service_radius_km INTEGER DEFAULT 25,
  
  -- Pricing
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  hourly_rate_cents INTEGER DEFAULT 0,
  additional_fees_cents INTEGER DEFAULT 0,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'partial', 'paid', 'refunded', 'disputed'
  )),
  
  -- Service Details (JSONB for flexibility across industries)
  service_details JSONB DEFAULT '{}',
  special_requirements TEXT,
  customer_notes TEXT,
  business_notes TEXT,
  admin_notes TEXT,
  
  -- Communication
  customer_phone TEXT,
  customer_email TEXT,
  preferred_contact_method TEXT DEFAULT 'phone' CHECK (preferred_contact_method IN (
    'phone', 'email', 'sms', 'app'
  )),
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'mobile', 'admin', 'api')),
  referral_source TEXT,
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT
);

-- Step 2: Create booking items table for detailed service breakdown
CREATE TABLE IF NOT EXISTS public.booking_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Item Details
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_category TEXT NOT NULL, -- 'service', 'material', 'equipment', 'labor'
  item_type TEXT NOT NULL, -- Industry-specific types
  
  -- Pricing
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create booking status history for audit trail
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Status Change
  old_status TEXT,
  new_status TEXT NOT NULL,
  change_reason TEXT,
  notes TEXT,
  
  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Step 4: Create industry-specific service templates
CREATE TABLE IF NOT EXISTS public.service_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Template Details
  template_name TEXT NOT NULL,
  template_description TEXT,
  industry_category TEXT NOT NULL, -- 'moving', 'cleaning', 'landscaping', 'plumbing', etc.
  service_type TEXT NOT NULL,
  
  -- Pricing Template
  base_price_cents INTEGER DEFAULT 0,
  hourly_rate_cents INTEGER DEFAULT 0,
  estimated_duration_hours INTEGER DEFAULT 1,
  
  -- Service Configuration (JSONB for flexibility)
  service_config JSONB DEFAULT '{}',
  required_items JSONB DEFAULT '[]',
  optional_items JSONB DEFAULT '[]',
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Notification Details
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_completed',
    'payment_received', 'payment_failed', 'review_requested', 'message_received',
    'admin_alert', 'system_update'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  
  -- Delivery
  delivery_method TEXT DEFAULT 'in_app' CHECK (delivery_method IN (
    'in_app', 'email', 'sms', 'push'
  )),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(requested_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON public.booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Step 7: Create RLS policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (customer_id = auth.uid() OR business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Business owners can update their bookings" ON public.bookings
  FOR UPDATE USING (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Step 8: Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_items_updated_at
  BEFORE UPDATE ON public.booking_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_templates_updated_at
  BEFORE UPDATE ON public.service_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create booking status change trigger
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into status history
  INSERT INTO public.booking_status_history (
    booking_id, changed_by, old_status, new_status, change_reason
  ) VALUES (
    NEW.id, auth.uid(), OLD.booking_status, NEW.booking_status, 
    CASE 
      WHEN NEW.booking_status = 'confirmed' THEN 'Booking confirmed by business owner'
      WHEN NEW.booking_status = 'cancelled' THEN 'Booking cancelled'
      WHEN NEW.booking_status = 'completed' THEN 'Service completed'
      ELSE 'Status updated'
    END
  );
  
  -- Create notifications
  IF NEW.booking_status = 'confirmed' THEN
    INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
    VALUES (
      NEW.customer_id, NEW.id, 'booking_confirmed',
      'Booking Confirmed! 🎉',
      'Your booking with ' || (SELECT name FROM public.businesses WHERE id = NEW.business_id) || ' has been confirmed.',
      '/bookings/' || NEW.id
    );
  END IF;
  
  IF NEW.booking_status = 'completed' THEN
    INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
    VALUES (
      NEW.customer_id, NEW.id, 'booking_completed',
      'Service Completed! ⭐',
      'Your service with ' || (SELECT name FROM public.businesses WHERE id = NEW.business_id) || ' has been completed. Please leave a review!',
      '/bookings/' || NEW.id || '/review'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_status_change_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW 
  WHEN (OLD.booking_status IS DISTINCT FROM NEW.booking_status)
  EXECUTE FUNCTION handle_booking_status_change();

-- Step 10: Success message
SELECT 'Comprehensive booking system schema created successfully! 🚀' as status;
