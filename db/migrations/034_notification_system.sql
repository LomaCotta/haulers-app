-- Notification System
-- Handles user preferences and notification queue

-- Step 1: Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Email preferences
  email_enabled boolean DEFAULT true,
  email_booking_requests boolean DEFAULT true,
  email_booking_updates boolean DEFAULT true,
  email_booking_reminders boolean DEFAULT true,
  email_invoices boolean DEFAULT true,
  email_messages boolean DEFAULT true,
  email_jobs boolean DEFAULT true,
  email_quotes boolean DEFAULT true,
  
  -- SMS preferences (for future)
  sms_enabled boolean DEFAULT false,
  sms_booking_requests boolean DEFAULT false,
  sms_booking_reminders boolean DEFAULT false,
  
  -- Push notification preferences (for future)
  push_enabled boolean DEFAULT true,
  push_booking_requests boolean DEFAULT true,
  push_messages boolean DEFAULT true,
  
  -- Frequency preferences
  digest_enabled boolean DEFAULT false, -- Group notifications into digest
  digest_frequency text CHECK (digest_frequency IN ('hourly', 'daily', 'weekly')) DEFAULT 'daily',
  
  -- Quiet hours (don't send notifications during these times)
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Step 2: Create notification queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification type
  notification_type text NOT NULL CHECK (notification_type IN (
    'booking_request',
    'booking_confirmed',
    'booking_updated',
    'booking_reminder',
    'booking_cancelled',
    'invoice_created',
    'invoice_paid',
    'invoice_overdue',
    'message_received',
    'job_created',
    'job_updated',
    'quote_sent',
    'quote_accepted',
    'quote_rejected'
  )),
  
  -- Channel
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')) DEFAULT 'email',
  
  -- Related entities
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  job_id uuid, -- References movers_scheduled_jobs or similar
  quote_id uuid, -- References movers_quotes or similar
  
  -- Content
  subject text,
  body_html text,
  body_text text,
  metadata jsonb DEFAULT '{}',
  
  -- Status
  status text CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
  scheduled_for timestamptz DEFAULT now(),
  sent_at timestamptz,
  
  -- Delivery tracking
  provider text DEFAULT 'resend',
  provider_message_id text,
  error_message text,
  
  -- Retry logic
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create notification history table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL,
  
  -- Related entities
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  job_id uuid,
  quote_id uuid,
  
  -- Content snapshot
  subject text,
  metadata jsonb DEFAULT '{}',
  
  -- Delivery info
  status text NOT NULL,
  provider text,
  provider_message_id text,
  error_message text,
  
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON public.notification_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON public.notification_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_retry ON public.notification_queue(next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_history_user ON public.notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON public.notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON public.notification_history(sent_at DESC);

-- Step 5: Create function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id uuid)
RETURNS TABLE (
  email_enabled boolean,
  email_booking_requests boolean,
  email_booking_updates boolean,
  email_booking_reminders boolean,
  email_invoices boolean,
  email_messages boolean,
  email_jobs boolean,
  email_quotes boolean,
  quiet_hours_enabled boolean,
  quiet_hours_start time,
  quiet_hours_end time
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(np.email_enabled, true) as email_enabled,
    COALESCE(np.email_booking_requests, true) as email_booking_requests,
    COALESCE(np.email_booking_updates, true) as email_booking_updates,
    COALESCE(np.email_booking_reminders, true) as email_booking_reminders,
    COALESCE(np.email_invoices, true) as email_invoices,
    COALESCE(np.email_messages, true) as email_messages,
    COALESCE(np.email_jobs, true) as email_jobs,
    COALESCE(np.email_quotes, true) as email_quotes,
    COALESCE(np.quiet_hours_enabled, false) as quiet_hours_enabled,
    COALESCE(np.quiet_hours_start, '22:00:00'::time) as quiet_hours_start,
    COALESCE(np.quiet_hours_end, '08:00:00'::time) as quiet_hours_end
  FROM public.notification_preferences np
  WHERE np.user_id = p_user_id
  UNION ALL
  SELECT true, true, true, true, true, true, true, true, false, '22:00:00'::time, '08:00:00'::time
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_preferences WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to queue notification
CREATE OR REPLACE FUNCTION queue_notification(
  p_user_id uuid,
  p_notification_type text,
  p_channel text DEFAULT 'email',
  p_subject text DEFAULT NULL,
  p_body_html text DEFAULT NULL,
  p_body_text text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_booking_id uuid DEFAULT NULL,
  p_invoice_id uuid DEFAULT NULL,
  p_message_id uuid DEFAULT NULL,
  p_job_id uuid DEFAULT NULL,
  p_quote_id uuid DEFAULT NULL,
  p_scheduled_for timestamptz DEFAULT now()
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
  v_prefs RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs FROM get_user_notification_preferences(p_user_id);
  
  -- Check if user has this notification type enabled
  IF p_channel = 'email' THEN
    IF NOT v_prefs.email_enabled THEN
      RETURN NULL; -- User disabled all emails
    END IF;
    
    -- Check specific notification type preference
    CASE p_notification_type
      WHEN 'booking_request' THEN
        IF NOT v_prefs.email_booking_requests THEN RETURN NULL; END IF;
      WHEN 'booking_confirmed', 'booking_updated', 'booking_cancelled' THEN
        IF NOT v_prefs.email_booking_updates THEN RETURN NULL; END IF;
      WHEN 'booking_reminder' THEN
        IF NOT v_prefs.email_booking_reminders THEN RETURN NULL; END IF;
      WHEN 'invoice_created', 'invoice_paid', 'invoice_overdue' THEN
        IF NOT v_prefs.email_invoices THEN RETURN NULL; END IF;
      WHEN 'message_received' THEN
        IF NOT v_prefs.email_messages THEN RETURN NULL; END IF;
      WHEN 'job_created', 'job_updated' THEN
        IF NOT v_prefs.email_jobs THEN RETURN NULL; END IF;
      WHEN 'quote_sent', 'quote_accepted', 'quote_rejected' THEN
        IF NOT v_prefs.email_quotes THEN RETURN NULL; END IF;
    END CASE;
  END IF;
  
  -- Check quiet hours
  IF v_prefs.quiet_hours_enabled THEN
    IF p_scheduled_for::time BETWEEN v_prefs.quiet_hours_start AND v_prefs.quiet_hours_end THEN
      -- Schedule for after quiet hours
      p_scheduled_for := (p_scheduled_for::date + 1)::date + v_prefs.quiet_hours_end;
    END IF;
  END IF;
  
  -- Insert notification into queue
  INSERT INTO public.notification_queue (
    user_id,
    notification_type,
    channel,
    subject,
    body_html,
    body_text,
    metadata,
    booking_id,
    invoice_id,
    message_id,
    job_id,
    quote_id,
    scheduled_for,
    status
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_channel,
    p_subject,
    p_body_html,
    p_body_text,
    p_metadata,
    p_booking_id,
    p_invoice_id,
    p_message_id,
    p_job_id,
    p_quote_id,
    p_scheduled_for,
    'pending'
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_id uuid,
  p_provider_message_id text DEFAULT NULL,
  p_status text DEFAULT 'sent'
)
RETURNS void AS $$
BEGIN
  UPDATE public.notification_queue
  SET 
    status = p_status,
    sent_at = now(),
    provider_message_id = p_provider_message_id,
    updated_at = now()
  WHERE id = p_notification_id;
  
  -- Copy to history
  INSERT INTO public.notification_history (
    user_id,
    notification_type,
    channel,
    booking_id,
    invoice_id,
    message_id,
    job_id,
    quote_id,
    subject,
    metadata,
    status,
    provider,
    provider_message_id,
    sent_at
  )
  SELECT 
    user_id,
    notification_type,
    channel,
    booking_id,
    invoice_id,
    message_id,
    job_id,
    quote_id,
    subject,
    metadata,
    p_status,
    provider,
    p_provider_message_id,
    now()
  FROM public.notification_queue
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to mark notification as failed
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_notification_id uuid,
  p_error_message text,
  p_retry boolean DEFAULT true
)
RETURNS void AS $$
DECLARE
  v_retry_count integer;
  v_max_retries integer;
BEGIN
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM public.notification_queue
  WHERE id = p_notification_id;
  
  IF p_retry AND v_retry_count < v_max_retries THEN
    -- Schedule retry (exponential backoff: 1min, 5min, 15min)
    UPDATE public.notification_queue
    SET 
      status = 'pending',
      retry_count = v_retry_count + 1,
      error_message = p_error_message,
      next_retry_at = now() + (
        CASE v_retry_count
          WHEN 0 THEN '1 minute'::interval
          WHEN 1 THEN '5 minutes'::interval
          ELSE '15 minutes'::interval
        END
      ),
      updated_at = now()
    WHERE id = p_notification_id;
  ELSE
    -- Mark as failed permanently
    UPDATE public.notification_queue
    SET 
      status = 'failed',
      error_message = p_error_message,
      updated_at = now()
    WHERE id = p_notification_id;
    
    -- Copy to history
    INSERT INTO public.notification_history (
      user_id,
      notification_type,
      channel,
      booking_id,
      invoice_id,
      message_id,
      job_id,
      quote_id,
      subject,
      metadata,
      status,
      provider,
      error_message,
      sent_at
    )
    SELECT 
      user_id,
      notification_type,
      channel,
      booking_id,
      invoice_id,
      message_id,
      job_id,
      quote_id,
      subject,
      metadata,
      'failed',
      provider,
      p_error_message,
      now()
    FROM public.notification_queue
    WHERE id = p_notification_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can create their own notification preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for notification_queue (users can only see their own notifications)
DROP POLICY IF EXISTS "Users can view their own notification queue" ON public.notification_queue;
CREATE POLICY "Users can view their own notification queue" ON public.notification_queue
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for notification_history
DROP POLICY IF EXISTS "Users can view their own notification history" ON public.notification_history;
CREATE POLICY "Users can view their own notification history" ON public.notification_history
  FOR SELECT USING (user_id = auth.uid());

-- Step 10: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION queue_notification(uuid, text, text, text, text, text, jsonb, uuid, uuid, uuid, uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_sent(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_failed(uuid, text, boolean) TO authenticated;

-- Step 11: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

CREATE OR REPLACE FUNCTION update_notification_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_queue_updated_at ON public.notification_queue;
CREATE TRIGGER trigger_update_notification_queue_updated_at
  BEFORE UPDATE ON public.notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_queue_updated_at();

SELECT 'Notification system schema created successfully!' as status;

