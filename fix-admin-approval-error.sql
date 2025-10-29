-- Fix Admin Approval Error
-- This fixes the error when trying to approve edit requests from admin console

-- Step 1: Check current state
SELECT 'Current State Check:' as info;
SELECT 
  'Checking if business_edit_requests table exists' as check_description,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_edit_requests' AND table_schema = 'public') 
    THEN '✅ Table exists'
    ELSE '❌ Table does not exist'
  END as table_status;

-- Step 2: Create the table if it doesn't exist
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

-- Step 3: Enable RLS on the table
ALTER TABLE public.business_edit_requests ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
DROP POLICY IF EXISTS "Users can view their own edit requests" ON public.business_edit_requests;
DROP POLICY IF EXISTS "Users can create edit requests for their businesses" ON public.business_edit_requests;
DROP POLICY IF EXISTS "Admins can view all edit requests" ON public.business_edit_requests;
DROP POLICY IF EXISTS "Admins can update edit requests" ON public.business_edit_requests;

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

-- Step 5: Drop and recreate the functions
DROP FUNCTION IF EXISTS apply_business_edit_request(UUID);
DROP FUNCTION IF EXISTS reject_business_edit_request(UUID, TEXT);

-- Create the apply function
CREATE OR REPLACE FUNCTION apply_business_edit_request(edit_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    edit_request RECORD;
    change_key TEXT;
    change_value TEXT;
    update_query TEXT;
    array_fields TEXT[] := ARRAY['services_offered', 'features', 'languages_spoken', 'certifications', 'availability_days', 'gallery_photos', 'daily_availability'];
BEGIN
    -- Get the edit request
    SELECT * INTO edit_request 
    FROM public.business_edit_requests 
    WHERE id = edit_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Edit request not found or not pending: %', edit_request_id;
    END IF;
    
    -- Start building the update query
    update_query := 'UPDATE public.businesses SET ';
    
    -- Apply each change to the business
    FOR change_key, change_value IN 
        SELECT key, value::TEXT 
        FROM jsonb_each_text(edit_request.proposed_changes)
    LOOP
        -- Handle array fields specially
        IF change_key = ANY(array_fields) THEN
            -- If the value is "[]" or empty, set to NULL
            IF change_value = '[]' OR change_value = '' THEN
                update_query := update_query || change_key || ' = NULL, ';
            ELSE
                -- Try to parse as JSON array, fallback to NULL if invalid
                BEGIN
                    update_query := update_query || change_key || ' = ' || 
                        quote_literal(change_value::JSONB::TEXT[]) || ', ';
                EXCEPTION WHEN OTHERS THEN
                    update_query := update_query || change_key || ' = NULL, ';
                END;
            END IF;
        ELSE
            -- Handle non-array fields
            IF change_value = 'null' OR change_value = '' THEN
                update_query := update_query || change_key || ' = NULL, ';
            ELSE
                update_query := update_query || change_key || ' = ' || quote_literal(change_value) || ', ';
            END IF;
        END IF;
    END LOOP;
    
    -- Remove the trailing comma and add WHERE clause
    update_query := rtrim(update_query, ', ') || ' WHERE id = ' || quote_literal(edit_request.business_id::TEXT);
    
    -- Execute the update
    EXECUTE update_query;
    
    -- Update the edit request status
    UPDATE public.business_edit_requests 
    SET 
        status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = edit_request_id;
    
    -- Update the business has_pending_edits flag
    UPDATE public.businesses 
    SET has_pending_edits = false 
    WHERE id = edit_request.business_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE EXCEPTION 'Error applying edit request %: %', edit_request_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the reject function
CREATE OR REPLACE FUNCTION reject_business_edit_request(edit_request_id UUID, admin_notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the edit request details
    SELECT * INTO request_record
    FROM public.business_edit_requests 
    WHERE id = edit_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Edit request not found or not pending: %', edit_request_id;
    END IF;
    
    -- Update the edit request status
    UPDATE public.business_edit_requests 
    SET 
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = auth.uid(),
        admin_notes = reject_business_edit_request.admin_notes
    WHERE id = edit_request_id;
    
    -- Update the business has_pending_edits flag
    UPDATE public.businesses 
    SET has_pending_edits = false 
    WHERE id = request_record.business_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE EXCEPTION 'Error rejecting edit request %: %', edit_request_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION apply_business_edit_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_business_edit_request(UUID, TEXT) TO authenticated;

-- Step 7: Verify everything is working
SELECT 'Fix Applied Successfully!' as status;

-- Show the functions
SELECT 
  'Functions created:' as info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%business_edit%'
ORDER BY routine_name;

-- Show pending requests
SELECT 
  'Pending requests:' as info,
  COUNT(*) as count
FROM public.business_edit_requests 
WHERE status = 'pending';
