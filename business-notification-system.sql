-- Business Owner Notification System for Verification Feedback
-- Run this in Supabase SQL Editor

-- Create notifications table for business owners
CREATE TABLE IF NOT EXISTS public.business_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('verification_approved', 'verification_rejected', 'verification_resubmitted')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "business_owners_read_own_notifications" ON public.business_notifications 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "business_owners_update_own_notifications" ON public.business_notifications 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "admins_full_access_notifications" ON public.business_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Create function to send verification notification
CREATE OR REPLACE FUNCTION send_verification_notification(
  business_uuid uuid,
  notification_type text,
  notification_title text,
  notification_message text
)
RETURNS boolean AS $$
DECLARE
  business_owner_id uuid;
BEGIN
  -- Get business owner ID
  SELECT owner_id INTO business_owner_id 
  FROM public.businesses 
  WHERE id = business_uuid;
  
  IF business_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Insert notification
  INSERT INTO public.business_notifications (
    business_id, owner_id, type, title, message
  ) VALUES (
    business_uuid, business_owner_id, notification_type, notification_title, notification_message
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update approval function to send notification
CREATE OR REPLACE FUNCTION approve_business_verification(
  business_uuid uuid,
  admin_notes text DEFAULT NULL,
  approved_by_admin uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
DECLARE
  business_name text;
BEGIN
  -- Check if the person approving is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = approved_by_admin AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can approve business verification';
  END IF;
  
  -- Get business name for notification
  SELECT name INTO business_name FROM public.businesses WHERE id = business_uuid;
  
  -- Update business verification status
  UPDATE public.businesses 
  SET 
    verification_status = 'approved',
    verified = true,
    verification_notes = admin_notes,
    verified_by = approved_by_admin,
    verified_at = NOW(),
    rejection_reason = NULL
  WHERE id = business_uuid;
  
  -- Add to verification history
  INSERT INTO public.business_verification_history (
    business_id, action, notes, admin_id
  ) VALUES (
    business_uuid, 'approved', admin_notes, approved_by_admin
  );
  
  -- Send notification to business owner
  PERFORM send_verification_notification(
    business_uuid,
    'verification_approved',
    'Business Verification Approved! 🎉',
    'Congratulations! Your business "' || business_name || '" has been approved and is now live on the platform. You can start receiving bookings from customers.'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update rejection function to send notification
CREATE OR REPLACE FUNCTION reject_business_verification(
  business_uuid uuid,
  rejection_reason_text text,
  admin_notes text DEFAULT NULL,
  rejected_by_admin uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
DECLARE
  business_name text;
BEGIN
  -- Check if the person rejecting is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = rejected_by_admin AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can reject business verification';
  END IF;
  
  -- Get business name for notification
  SELECT name INTO business_name FROM public.businesses WHERE id = business_uuid;
  
  -- Update business verification status
  UPDATE public.businesses 
  SET 
    verification_status = 'rejected',
    verified = false,
    verification_notes = admin_notes,
    verified_by = rejected_by_admin,
    verified_at = NOW(),
    rejection_reason = rejection_reason_text
  WHERE id = business_uuid;
  
  -- Add to verification history
  INSERT INTO public.business_verification_history (
    business_id, action, notes, admin_id
  ) VALUES (
    business_uuid, 'rejected', 
    COALESCE(admin_notes, '') || CASE WHEN admin_notes IS NOT NULL THEN ' | ' ELSE '' END || 'Reason: ' || rejection_reason_text, 
    rejected_by_admin
  );
  
  -- Send notification to business owner
  PERFORM send_verification_notification(
    business_uuid,
    'verification_rejected',
    'Business Verification Needs Updates 📝',
    'Your business "' || business_name || '" verification was not approved. Reason: ' || rejection_reason_text || '. Please review and resubmit your business information.'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update resubmit function to send notification
CREATE OR REPLACE FUNCTION resubmit_business_verification(
  business_uuid uuid,
  resubmitted_by uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
DECLARE
  business_name text;
BEGIN
  -- Check if the person resubmitting owns the business
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_uuid AND owner_id = resubmitted_by
  ) THEN
    RAISE EXCEPTION 'Only business owners can resubmit for verification';
  END IF;
  
  -- Get business name for notification
  SELECT name INTO business_name FROM public.businesses WHERE id = business_uuid;
  
  -- Update business verification status
  UPDATE public.businesses 
  SET 
    verification_status = 'pending',
    verification_notes = NULL,
    verified_by = NULL,
    verified_at = NULL,
    rejection_reason = NULL
  WHERE id = business_uuid;
  
  -- Add to verification history
  INSERT INTO public.business_verification_history (
    business_id, action, notes, admin_id
  ) VALUES (
    business_uuid, 'resubmitted', 'Business resubmitted for verification', resubmitted_by
  );
  
  -- Send notification to business owner
  PERFORM send_verification_notification(
    business_uuid,
    'verification_resubmitted',
    'Business Resubmitted for Verification 🔄',
    'Your business "' || business_name || '" has been resubmitted for verification. Our team will review it shortly.'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_verification_notification TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_notifications_owner_id ON public.business_notifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_notifications_business_id ON public.business_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_business_notifications_is_read ON public.business_notifications(is_read);

-- Verify the setup
SELECT 'Business notification system created successfully!' as status;
SELECT COUNT(*) as notifications_table_exists FROM information_schema.tables WHERE table_name = 'business_notifications';
