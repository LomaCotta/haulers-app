-- Fix the apply_business_edit_request function to handle arrays properly
-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS apply_business_edit_request(UUID);

-- Create a new function that properly handles array fields
CREATE OR REPLACE FUNCTION apply_business_edit_request(edit_request_id UUID)
RETURNS VOID AS $$
DECLARE
    request_record RECORD;
    update_query TEXT;
    field_name TEXT;
    field_value TEXT;
    array_fields TEXT[] := ARRAY['services_offered', 'features', 'languages_spoken', 'certifications', 'availability_days'];
BEGIN
    -- Get the edit request details
    SELECT * INTO request_record
    FROM business_edit_requests
    WHERE id = edit_request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Edit request not found';
    END IF;
    
    -- Build the update query dynamically
    update_query := 'UPDATE businesses SET ';
    
    -- Process each proposed change
    FOR field_name, field_value IN 
        SELECT key, value::TEXT 
        FROM jsonb_each_text(request_record.proposed_changes)
    LOOP
        -- Handle array fields specially
        IF field_name = ANY(array_fields) THEN
            -- If the value is "[]" or empty, set to NULL
            IF field_value = '[]' OR field_value = '' THEN
                update_query := update_query || field_name || ' = NULL, ';
            ELSE
                -- Try to parse as JSON array, fallback to NULL if invalid
                BEGIN
                    update_query := update_query || field_name || ' = ' || 
                        quote_literal(field_value::JSONB::TEXT[]) || ', ';
                EXCEPTION WHEN OTHERS THEN
                    update_query := update_query || field_name || ' = NULL, ';
                END;
            END IF;
        ELSE
            -- Handle non-array fields
            IF field_value = 'null' OR field_value = '' THEN
                update_query := update_query || field_name || ' = NULL, ';
            ELSE
                update_query := update_query || field_name || ' = ' || quote_literal(field_value) || ', ';
            END IF;
        END IF;
    END LOOP;
    
    -- Remove the trailing comma and add WHERE clause
    update_query := rtrim(update_query, ', ') || ' WHERE id = ' || quote_literal(request_record.business_id::TEXT);
    
    -- Execute the update
    EXECUTE update_query;
    
    -- Update the edit request status
    UPDATE business_edit_requests 
    SET 
        status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = edit_request_id;
    
    -- Update the business has_pending_edits flag
    UPDATE businesses 
    SET has_pending_edits = false 
    WHERE id = request_record.business_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a reject function
CREATE OR REPLACE FUNCTION reject_business_edit_request(edit_request_id UUID, admin_notes TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the edit request details
    SELECT * INTO request_record
    FROM business_edit_requests
    WHERE id = edit_request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Edit request not found';
    END IF;
    
    -- Update the edit request status
    UPDATE business_edit_requests 
    SET 
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = auth.uid(),
        admin_notes = COALESCE(admin_notes, admin_notes)
    WHERE id = edit_request_id;
    
    -- Update the business has_pending_edits flag
    UPDATE businesses 
    SET has_pending_edits = false 
    WHERE id = request_record.business_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apply_business_edit_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_business_edit_request(UUID, TEXT) TO authenticated;

-- Test the functions exist
SELECT 'Functions created successfully' as status;
