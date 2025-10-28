-- Quick fix for business_edit_requests table
-- This script ensures the table exists and has proper structure

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'business_edit_requests'
) as table_exists;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.business_edit_requests (
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own edit requests" ON public.business_edit_requests;
DROP POLICY IF EXISTS "Users can create edit requests for their businesses" ON public.business_edit_requests;
DROP POLICY IF EXISTS "Admins can view all edit requests" ON public.business_edit_requests;
DROP POLICY IF EXISTS "Admins can update edit requests" ON public.business_edit_requests;

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
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_business_id ON public.business_edit_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_status ON public.business_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_requester_id ON public.business_edit_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_business_edit_requests_created_at ON public.business_edit_requests(created_at);

-- Add has_pending_edits column to businesses if it doesn't exist
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS has_pending_edits BOOLEAN DEFAULT FALSE;

-- Test the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'business_edit_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test a simple query
SELECT COUNT(*) as total_requests FROM public.business_edit_requests;
