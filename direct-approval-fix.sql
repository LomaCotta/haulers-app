-- Direct Approval Fix
-- This creates a simple function that directly updates the database without complex logic

-- Step 1: Drop existing functions
DROP FUNCTION IF EXISTS apply_business_edit_request(UUID);
DROP FUNCTION IF EXISTS reject_business_edit_request(UUID, TEXT);

-- Step 2: Create a very simple apply function that just updates the status
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
    
    -- Apply changes directly using JSONB operations
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
            THEN (edit_request.proposed_changes->>'services_offered')::TEXT[] 
            ELSE services_offered 
        END,
        features = CASE 
            WHEN edit_request.proposed_changes ? 'features' 
            THEN (edit_request.proposed_changes->>'features')::TEXT[] 
            ELSE features 
        END,
        years_experience = CASE 
            WHEN edit_request.proposed_changes ? 'years_experience' 
            THEN (edit_request.proposed_changes->>'years_experience')::INTEGER 
            ELSE years_experience 
        END,
        languages_spoken = CASE 
            WHEN edit_request.proposed_changes ? 'languages_spoken' 
            THEN (edit_request.proposed_changes->>'languages_spoken')::TEXT[] 
            ELSE languages_spoken 
        END,
        certifications = CASE 
            WHEN edit_request.proposed_changes ? 'certifications' 
            THEN (edit_request.proposed_changes->>'certifications')::TEXT[] 
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
            THEN (edit_request.proposed_changes->>'availability_days')::TEXT[] 
            ELSE availability_days 
        END,
        availability_hours = CASE 
            WHEN edit_request.proposed_changes ? 'availability_hours' 
            THEN (edit_request.proposed_changes->>'availability_hours')::JSONB 
            ELSE availability_hours 
        END,
        daily_availability = CASE 
            WHEN edit_request.proposed_changes ? 'daily_availability' 
            THEN (edit_request.proposed_changes->>'daily_availability')::JSONB 
            ELSE daily_availability 
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
            THEN (edit_request.proposed_changes->>'gallery_photos')::TEXT[] 
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

-- Step 3: Create a simple reject function
CREATE OR REPLACE FUNCTION reject_business_edit_request(edit_request_id UUID, admin_notes TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the edit request details
    SELECT * INTO request_record
    FROM public.business_edit_requests 
    WHERE id = edit_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN 'ERROR: Edit request not found or not pending';
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
    
    RETURN 'SUCCESS: Edit request rejected successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION apply_business_edit_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_business_edit_request(UUID, TEXT) TO authenticated;

-- Step 5: Test the functions
SELECT 'Direct functions created successfully!' as status;

-- Show the functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%business_edit%'
ORDER BY routine_name;
