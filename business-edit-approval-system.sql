-- Business Edit Approval System
-- This script creates a system for business owners to submit edits that require admin approval

-- Create business_edit_requests table
CREATE TABLE IF NOT EXISTS public.business_edit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Store the proposed changes as JSONB
    proposed_changes JSONB NOT NULL,
    
    -- Admin review fields
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_edit_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_edit_requests
CREATE POLICY "Users can view their own edit requests" ON public.business_edit_requests
    FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Users can create edit requests for their businesses" ON public.business_edit_requests
    FOR INSERT WITH CHECK (
        requester_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.businesses 
            WHERE id = business_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all edit requests" ON public.business_edit_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update edit requests" ON public.business_edit_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_business_id ON public.business_edit_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_status ON public.business_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_requester_id ON public.business_edit_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_created_at ON public.business_edit_requests(created_at);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_business_edit_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_edit_requests_updated_at
    BEFORE UPDATE ON public.business_edit_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_business_edit_requests_updated_at();

-- Add a field to businesses to track if there are pending edits
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS has_pending_edits BOOLEAN DEFAULT FALSE;

-- Create function to check for pending edits
CREATE OR REPLACE FUNCTION check_business_pending_edits()
RETURNS TRIGGER AS $$
BEGIN
    -- Update has_pending_edits flag when edit requests are created/updated/deleted
    UPDATE public.businesses 
    SET has_pending_edits = EXISTS (
        SELECT 1 FROM public.business_edit_requests 
        WHERE business_id = COALESCE(NEW.business_id, OLD.business_id) 
        AND status = 'pending'
    )
    WHERE id = COALESCE(NEW.business_id, OLD.business_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for business_edit_requests
CREATE TRIGGER update_business_pending_edits_on_insert
    AFTER INSERT ON public.business_edit_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_business_pending_edits();

CREATE TRIGGER update_business_pending_edits_on_update
    AFTER UPDATE ON public.business_edit_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_business_pending_edits();

CREATE TRIGGER update_business_pending_edits_on_delete
    AFTER DELETE ON public.business_edit_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_business_pending_edits();

-- Create function to apply approved edits
CREATE OR REPLACE FUNCTION apply_business_edit_request(edit_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    edit_request RECORD;
    change_key TEXT;
    change_value TEXT;
BEGIN
    -- Get the edit request
    SELECT * INTO edit_request 
    FROM public.business_edit_requests 
    WHERE id = edit_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Apply each change to the business
    FOR change_key, change_value IN 
        SELECT key, value::TEXT 
        FROM jsonb_each_text(edit_request.proposed_changes)
    LOOP
        -- Build and execute dynamic SQL to update the business
        EXECUTE format('UPDATE public.businesses SET %I = %L WHERE id = %L', 
                      change_key, change_value, edit_request.business_id);
    END LOOP;
    
    -- Mark the edit request as approved
    UPDATE public.business_edit_requests 
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = edit_request_id;
    
    RETURN TRUE;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create function to reject edit request
CREATE OR REPLACE FUNCTION reject_business_edit_request(edit_request_id UUID, admin_notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.business_edit_requests 
    SET status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        admin_notes = reject_business_edit_request.admin_notes
    WHERE id = edit_request_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Verify the setup
SELECT 'Business edit approval system created successfully!' as status;

-- Show the new table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'business_edit_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;
