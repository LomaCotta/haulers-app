-- Enhanced Business Verification System with Rejection Feedback
-- Run this in Supabase SQL Editor

-- Add rejection feedback fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_notes text,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create business verification history table
CREATE TABLE IF NOT EXISTS public.business_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted')),
  notes text,
  admin_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_verification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification history
CREATE POLICY "admin_full_access_verification_history" ON public.business_verification_history 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "business_owner_read_verification_history" ON public.business_verification_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);

-- Create function to approve business verification
CREATE OR REPLACE FUNCTION approve_business_verification(
  business_uuid uuid,
  admin_notes text DEFAULT NULL,
  approved_by_admin uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
  -- Check if the person approving is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = approved_by_admin AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can approve business verification';
  END IF;
  
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
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject business verification
CREATE OR REPLACE FUNCTION reject_business_verification(
  business_uuid uuid,
  rejection_reason_text text,
  admin_notes text DEFAULT NULL,
  rejected_by_admin uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
  -- Check if the person rejecting is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = rejected_by_admin AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can reject business verification';
  END IF;
  
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
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resubmit business for verification
CREATE OR REPLACE FUNCTION resubmit_business_verification(
  business_uuid uuid,
  resubmitted_by uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
  -- Check if the person resubmitting owns the business
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_uuid AND owner_id = resubmitted_by
  ) THEN
    RAISE EXCEPTION 'Only business owners can resubmit for verification';
  END IF;
  
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
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_business_verification TO authenticated;
GRANT EXECUTE ON FUNCTION reject_business_verification TO authenticated;
GRANT EXECUTE ON FUNCTION resubmit_business_verification TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_verification_status ON public.businesses(verification_status);
CREATE INDEX IF NOT EXISTS idx_business_verification_history_business_id ON public.business_verification_history(business_id);
CREATE INDEX IF NOT EXISTS idx_business_verification_history_action ON public.business_verification_history(action);

-- Update existing businesses to have proper verification status
UPDATE public.businesses 
SET verification_status = CASE 
  WHEN verified = true THEN 'approved'
  ELSE 'pending'
END
WHERE verification_status IS NULL;

-- Verify the setup
SELECT 'Enhanced business verification system created successfully!' as status;
SELECT COUNT(*) as businesses_with_status FROM public.businesses WHERE verification_status IS NOT NULL;
