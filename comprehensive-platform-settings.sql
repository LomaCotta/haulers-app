-- Comprehensive Admin Settings System for Platform Success
-- Run this in Supabase SQL Editor

-- Create platform configuration table
CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform analytics table
CREATE TABLE IF NOT EXISTS public.platform_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_type text NOT NULL DEFAULT 'counter', -- counter, gauge, histogram
  tags jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);

-- Create platform alerts table
CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- error, warning, info, success
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status text NOT NULL DEFAULT 'active', -- active, acknowledged, resolved
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id),
  acknowledged_by uuid REFERENCES public.profiles(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create platform maintenance table
CREATE TABLE IF NOT EXISTS public.platform_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  maintenance_type text NOT NULL, -- scheduled, emergency, update
  status text NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  affected_services text[] DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform notifications table
CREATE TABLE IF NOT EXISTS public.platform_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL, -- email, sms, push, in_app
  title text NOT NULL,
  message text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all', -- all, consumers, providers, admins
  status text NOT NULL DEFAULT 'draft', -- draft, scheduled, sent, failed
  scheduled_at timestamptz,
  sent_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_config
CREATE POLICY "admin_full_access_config" ON public.platform_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "public_read_config" ON public.platform_config 
FOR SELECT 
USING (is_public = true);

-- RLS Policies for platform_analytics
CREATE POLICY "admin_full_access_analytics" ON public.platform_analytics 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- RLS Policies for platform_alerts
CREATE POLICY "admin_full_access_alerts" ON public.platform_alerts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- RLS Policies for platform_maintenance
CREATE POLICY "admin_full_access_maintenance" ON public.platform_maintenance 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- RLS Policies for platform_notifications
CREATE POLICY "admin_full_access_notifications" ON public.platform_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Insert default platform configuration
INSERT INTO public.platform_config (key, value, description, category, is_public) VALUES
-- Platform Economics
('platform_fee_percent', '"2.5"', 'Default platform fee percentage', 'economics', true),
('max_platform_fee_percent', '"3.0"', 'Maximum allowed platform fee percentage', 'economics', true),
('donation_suggested_percent', '"1.0"', 'Suggested donation percentage', 'economics', true),
('min_quote_cents', '5000', 'Minimum quote amount in cents ($50)', 'economics', true),
('min_deposit_cents', '1000', 'Minimum deposit amount in cents ($10)', 'economics', true),
('max_deposit_percent', '50', 'Maximum deposit percentage of quote', 'economics', true),

-- Platform Features
('registration_enabled', 'true', 'Allow new user registrations', 'features', true),
('business_verification_required', 'true', 'Require business verification', 'features', true),
('reviews_enabled', 'true', 'Enable review system', 'features', true),
('messaging_enabled', 'true', 'Enable messaging system', 'features', true),
('transparency_ledger_public', 'true', 'Make financial ledger public', 'features', true),

-- Platform Limits
('max_businesses_per_user', '5', 'Maximum businesses per provider', 'limits', false),
('max_bookings_per_day', '100', 'Maximum bookings per day', 'limits', false),
('max_messages_per_hour', '50', 'Maximum messages per user per hour', 'limits', false),
('max_reviews_per_user', '100', 'Maximum reviews per user', 'limits', false),

-- Platform Security
('password_min_length', '8', 'Minimum password length', 'security', false),
('session_timeout_hours', '24', 'Session timeout in hours', 'security', false),
('max_login_attempts', '5', 'Maximum login attempts before lockout', 'security', false),
('two_factor_required', 'false', 'Require two-factor authentication', 'security', false),

-- Platform Monitoring
('error_reporting_enabled', 'true', 'Enable error reporting', 'monitoring', false),
('analytics_enabled', 'true', 'Enable analytics tracking', 'monitoring', false),
('performance_monitoring', 'true', 'Enable performance monitoring', 'monitoring', false),
('uptime_monitoring', 'true', 'Enable uptime monitoring', 'monitoring', false),

-- Platform Communication
('email_notifications_enabled', 'true', 'Enable email notifications', 'communication', false),
('sms_notifications_enabled', 'false', 'Enable SMS notifications', 'communication', false),
('push_notifications_enabled', 'true', 'Enable push notifications', 'communication', false),
('maintenance_mode', 'false', 'Enable maintenance mode', 'communication', true),

-- Platform Content
('terms_of_service_version', '"1.0"', 'Terms of service version', 'content', true),
('privacy_policy_version', '"1.0"', 'Privacy policy version', 'content', true),
('support_email', '"support@haulers.app"', 'Support email address', 'content', true),
('contact_phone', '"+1-555-HAULERS"', 'Contact phone number', 'content', true),

-- Platform Integration
('stripe_enabled', 'true', 'Enable Stripe payments', 'integration', false),
('mapbox_enabled', 'true', 'Enable Mapbox integration', 'integration', false),
('resend_enabled', 'true', 'Enable Resend email service', 'integration', false),
('captcha_enabled', 'true', 'Enable CAPTCHA verification', 'integration', false),

-- Platform Appearance
('site_name', '"Haulers.app"', 'Site name', 'appearance', true),
('site_description', '"Transparent marketplace for local moving and hauling services"', 'Site description', 'appearance', true),
('primary_color', '"#f97316"', 'Primary brand color', 'appearance', true),
('logo_url', '"/logo.png"', 'Logo URL', 'appearance', true),
('favicon_url', '"/favicon.ico"', 'Favicon URL', 'appearance', true),

-- Platform Performance
('cache_enabled', 'true', 'Enable caching', 'performance', false),
('cdn_enabled', 'true', 'Enable CDN', 'performance', false),
('image_optimization', 'true', 'Enable image optimization', 'performance', false),
('database_optimization', 'true', 'Enable database optimization', 'performance', false);

-- Create indexes for performance
CREATE INDEX idx_platform_config_category ON public.platform_config(category);
CREATE INDEX idx_platform_config_public ON public.platform_config(is_public);
CREATE INDEX idx_platform_analytics_metric ON public.platform_analytics(metric_name);
CREATE INDEX idx_platform_analytics_recorded_at ON public.platform_analytics(recorded_at);
CREATE INDEX idx_platform_alerts_status ON public.platform_alerts(status);
CREATE INDEX idx_platform_alerts_severity ON public.platform_alerts(severity);
CREATE INDEX idx_platform_maintenance_status ON public.platform_maintenance(status);
CREATE INDEX idx_platform_notifications_status ON public.platform_notifications(status);

-- Create functions for platform management
CREATE OR REPLACE FUNCTION get_platform_config(config_key text)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT value 
    FROM public.platform_config 
    WHERE key = config_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_platform_config(
  config_key text,
  config_value jsonb,
  config_description text DEFAULT NULL,
  config_category text DEFAULT 'general',
  is_public_config boolean DEFAULT false,
  updated_by_user uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = updated_by_user AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can modify platform configuration';
  END IF;
  
  -- Insert or update configuration
  INSERT INTO public.platform_config (key, value, description, category, is_public, updated_by)
  VALUES (config_key, config_value, config_description, config_category, is_public_config, updated_by_user)
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = config_value,
    description = COALESCE(config_description, platform_config.description),
    category = config_category,
    is_public = is_public_config,
    updated_by = updated_by_user,
    updated_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_platform_metric(
  metric_name text,
  metric_value numeric,
  metric_type text DEFAULT 'counter',
  metric_tags jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
BEGIN
  INSERT INTO public.platform_analytics (metric_name, metric_value, metric_type, tags)
  VALUES (metric_name, metric_value, metric_type, metric_tags);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_platform_alert(
  alert_type text,
  alert_title text,
  alert_message text,
  alert_severity text DEFAULT 'medium',
  alert_metadata jsonb DEFAULT '{}',
  created_by_user uuid DEFAULT auth.uid()
)
RETURNS uuid AS $$
DECLARE
  alert_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = created_by_user AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can create platform alerts';
  END IF;
  
  INSERT INTO public.platform_alerts (
    alert_type, title, message, severity, metadata, created_by
  )
  VALUES (
    alert_type, alert_title, alert_message, alert_severity, alert_metadata, created_by_user
  )
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_platform_config TO authenticated;
GRANT EXECUTE ON FUNCTION set_platform_config TO authenticated;
GRANT EXECUTE ON FUNCTION record_platform_metric TO authenticated;
GRANT EXECUTE ON FUNCTION create_platform_alert TO authenticated;

-- Insert some initial analytics data
INSERT INTO public.platform_analytics (metric_name, metric_value, metric_type, tags) VALUES
('total_users', 0, 'gauge', '{"source": "database"}'),
('total_businesses', 0, 'gauge', '{"source": "database"}'),
('total_bookings', 0, 'gauge', '{"source": "database"}'),
('platform_revenue_cents', 0, 'gauge', '{"source": "ledger"}'),
('average_booking_value_cents', 0, 'gauge', '{"source": "bookings"}'),
('user_registration_rate', 0, 'counter', '{"period": "daily"}'),
('booking_completion_rate', 0, 'gauge', '{"period": "monthly"}'),
('customer_satisfaction_score', 0, 'gauge', '{"source": "reviews"}');

-- Verify the setup
SELECT 'Platform configuration system created successfully!' as status;
SELECT COUNT(*) as config_entries FROM public.platform_config;
SELECT COUNT(*) as analytics_metrics FROM public.platform_analytics;
