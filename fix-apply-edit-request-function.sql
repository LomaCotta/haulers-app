-- Fix Apply Business Edit Request Function
-- This fixes the function that's causing the admin approval error

-- Step 1: Check if the function exists
SELECT 'Checking existing functions:' as info;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%business_edit%'
ORDER BY routine_name;

-- Step 2: Drop existing functions if they exist
DROP FUNCTION IF EXISTS apply_business_edit_request(UUID);
DROP FUNCTION IF EXISTS reject_business_edit_request(UUID, TEXT);

-- Step 3: Create a robust apply function
CREATE OR REPLACE FUNCTION apply_business_edit_request(edit_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    edit_request RECORD;
    change_key TEXT;
    change_value TEXT;
    update_query TEXT;
    array_fields TEXT[] := ARRAY['services_offered', 'features', 'languages_spoken', 'certifications', 'availability_days', 'gallery_photos'];
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

-- Step 4: Create a robust reject function
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

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION apply_business_edit_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_business_edit_request(UUID, TEXT) TO authenticated;

-- Step 6: Test the functions
SELECT 'Functions created successfully!' as status;

-- Show the functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%business_edit%'
ORDER BY routine_name;
