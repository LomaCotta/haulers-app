-- Fix foreign key relationships for business_edit_requests
-- This script drops and recreates the table with correct relationships

-- Drop the table if it exists (this will also drop all data)
DROP TABLE IF EXISTS public.business_edit_requests CASCADE;

-- Recreate the table with correct foreign key relationships
CREATE TABLE public.business_edit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    proposed_changes JSONB NOT NULL,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_edit_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
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

-- Create indexes
CREATE INDEX idx_business_edit_requests_business_id ON public.business_edit_requests(business_id);
CREATE INDEX idx_business_edit_requests_status ON public.business_edit_requests(status);
CREATE INDEX idx_business_edit_requests_requester_id ON public.business_edit_requests(requester_id);
CREATE INDEX idx_business_edit_requests_created_at ON public.business_edit_requests(created_at);

-- Add has_pending_edits column to businesses if it doesn't exist
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS has_pending_edits BOOLEAN DEFAULT FALSE;

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
SELECT 'Business edit requests table recreated with correct foreign keys!' as status;

-- Show the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'business_edit_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test a simple query
SELECT COUNT(*) as total_requests FROM public.business_edit_requests;
