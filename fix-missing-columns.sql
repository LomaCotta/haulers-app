-- Fix Missing Columns in Approval Function
-- This removes references to columns that don't exist in the businesses table

-- Step 1: Check what columns actually exist in the businesses table
SELECT 'Businesses Table Columns:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Drop and recreate the function without non-existent columns
DROP FUNCTION IF EXISTS apply_business_edit_request(UUID);

-- Step 3: Create the function with only existing columns
CREATE OR REPLACE FUNCTION apply_business_edit_request(edit_request_id UUID)
RETURNS TEXT AS $$
DECLARE
    edit_request RECORD;
    business_record RECORD;
BEGIN
    -- Get the edit request
    SELECT * INTO edit_request 
    FROM public.business_edit_requests 
    WHERE id = edit_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN 'ERROR: Edit request not found or not pending';
    END IF;
    
    -- Get the business record
    SELECT * INTO business_record 
    FROM public.businesses 
    WHERE id = edit_request.business_id;
    
    IF NOT FOUND THEN
        RETURN 'ERROR: Business not found';
    END IF;
    
    -- Apply changes directly using JSONB operations (only for existing columns)
    UPDATE public.businesses 
    SET 
        description = CASE 
            WHEN edit_request.proposed_changes ? 'description' 
            THEN (edit_request.proposed_changes->>'description')::TEXT 
            ELSE description 
        END,
        phone = CASE 
            WHEN edit_request.proposed_changes ? 'phone' 
            THEN (edit_request.proposed_changes->>'phone')::TEXT 
            ELSE phone 
        END,
        email = CASE 
            WHEN edit_request.proposed_changes ? 'email' 
            THEN (edit_request.proposed_changes->>'email')::TEXT 
            ELSE email 
        END,
        website = CASE 
            WHEN edit_request.proposed_changes ? 'website' 
            THEN (edit_request.proposed_changes->>'website')::TEXT 
            ELSE website 
        END,
        service_type = CASE 
            WHEN edit_request.proposed_changes ? 'service_type' 
            THEN (edit_request.proposed_changes->>'service_type')::TEXT 
            ELSE service_type 
        END,
        address = CASE 
            WHEN edit_request.proposed_changes ? 'address' 
            THEN (edit_request.proposed_changes->>'address')::TEXT 
            ELSE address 
        END,
        city = CASE 
            WHEN edit_request.proposed_changes ? 'city' 
            THEN (edit_request.proposed_changes->>'city')::TEXT 
            ELSE city 
        END,
        state = CASE 
            WHEN edit_request.proposed_changes ? 'state' 
            THEN (edit_request.proposed_changes->>'state')::TEXT 
            ELSE state 
        END,
        postal_code = CASE 
            WHEN edit_request.proposed_changes ? 'postal_code' 
            THEN (edit_request.proposed_changes->>'postal_code')::TEXT 
            ELSE postal_code 
        END,
        service_radius_km = CASE 
            WHEN edit_request.proposed_changes ? 'service_radius_km' 
            THEN (edit_request.proposed_changes->>'service_radius_km')::INTEGER 
            ELSE service_radius_km 
        END,
        base_rate_cents = CASE 
            WHEN edit_request.proposed_changes ? 'base_rate_cents' 
            THEN (edit_request.proposed_changes->>'base_rate_cents')::INTEGER 
            ELSE base_rate_cents 
        END,
        hourly_rate_cents = CASE 
            WHEN edit_request.proposed_changes ? 'hourly_rate_cents' 
            THEN (edit_request.proposed_changes->>'hourly_rate_cents')::INTEGER 
            ELSE hourly_rate_cents 
        END,
        services_offered = CASE 
            WHEN edit_request.proposed_changes ? 'services_offered' 
            THEN ARRAY(SELECT jsonb_array_elements_text(edit_request.proposed_changes->'services_offered'))
            ELSE services_offered 
        END,
        features = CASE 
            WHEN edit_request.proposed_changes ? 'features' 
            THEN ARRAY(SELECT jsonb_array_elements_text(edit_request.proposed_changes->'features'))
            ELSE features 
        END,
        years_experience = CASE 
            WHEN edit_request.proposed_changes ? 'years_experience' 
            THEN (edit_request.proposed_changes->>'years_experience')::INTEGER 
            ELSE years_experience 
        END,
        languages_spoken = CASE 
            WHEN edit_request.proposed_changes ? 'languages_spoken' 
            THEN ARRAY(SELECT jsonb_array_elements_text(edit_request.proposed_changes->'languages_spoken'))
            ELSE languages_spoken 
        END,
        certifications = CASE 
            WHEN edit_request.proposed_changes ? 'certifications' 
            THEN ARRAY(SELECT jsonb_array_elements_text(edit_request.proposed_changes->'certifications'))
            ELSE certifications 
        END,
        emergency_service = CASE 
            WHEN edit_request.proposed_changes ? 'emergency_service' 
            THEN (edit_request.proposed_changes->>'emergency_service')::BOOLEAN 
            ELSE emergency_service 
        END,
        same_day_service = CASE 
            WHEN edit_request.proposed_changes ? 'same_day_service' 
            THEN (edit_request.proposed_changes->>'same_day_service')::BOOLEAN 
            ELSE same_day_service 
        END,
        insurance_verified = CASE 
            WHEN edit_request.proposed_changes ? 'insurance_verified' 
            THEN (edit_request.proposed_changes->>'insurance_verified')::BOOLEAN 
            ELSE insurance_verified 
        END,
        licensed = CASE 
            WHEN edit_request.proposed_changes ? 'licensed' 
            THEN (edit_request.proposed_changes->>'licensed')::BOOLEAN 
            ELSE licensed 
        END,
        bonded = CASE 
            WHEN edit_request.proposed_changes ? 'bonded' 
            THEN (edit_request.proposed_changes->>'bonded')::BOOLEAN 
            ELSE bonded 
        END,
        response_time_hours = CASE 
            WHEN edit_request.proposed_changes ? 'response_time_hours' 
            THEN (edit_request.proposed_changes->>'response_time_hours')::INTEGER 
            ELSE response_time_hours 
        END,
        min_booking_notice_hours = CASE 
            WHEN edit_request.proposed_changes ? 'min_booking_notice_hours' 
            THEN (edit_request.proposed_changes->>'min_booking_notice_hours')::INTEGER 
            ELSE min_booking_notice_hours 
        END,
        availability_days = CASE 
            WHEN edit_request.proposed_changes ? 'availability_days' 
            THEN ARRAY(SELECT jsonb_array_elements_text(edit_request.proposed_changes->'availability_days'))
            ELSE availability_days 
        END,
        availability_hours = CASE 
            WHEN edit_request.proposed_changes ? 'availability_hours' 
            THEN (edit_request.proposed_changes->>'availability_hours')::JSONB 
            ELSE availability_hours 
        END,
        logo_url = CASE 
            WHEN edit_request.proposed_changes ? 'logo_url' 
            THEN (edit_request.proposed_changes->>'logo_url')::TEXT 
            ELSE logo_url 
        END,
        cover_photo_url = CASE 
            WHEN edit_request.proposed_changes ? 'cover_photo_url' 
            THEN (edit_request.proposed_changes->>'cover_photo_url')::TEXT 
            ELSE cover_photo_url 
        END,
        gallery_photos = CASE 
            WHEN edit_request.proposed_changes ? 'gallery_photos' 
            THEN ARRAY(SELECT jsonb_array_elements_text(edit_request.proposed_changes->'gallery_photos'))
            ELSE gallery_photos 
        END
    WHERE id = edit_request.business_id;
    
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
    
    RETURN 'SUCCESS: Edit request approved successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION apply_business_edit_request(UUID) TO authenticated;

-- Step 5: Test the function
SELECT 'Function updated successfully!' as status;

-- Show the function
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'apply_business_edit_request';
