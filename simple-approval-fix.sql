-- Simple Approval Fix
-- This creates a very simple and robust approval function

-- Step 1: Drop existing functions
DROP FUNCTION IF EXISTS apply_business_edit_request(UUID);
DROP FUNCTION IF EXISTS reject_business_edit_request(UUID, TEXT);

-- Step 2: Create a very simple apply function
CREATE OR REPLACE FUNCTION apply_business_edit_request(edit_request_id UUID)
RETURNS JSON AS $$
DECLARE
    edit_request RECORD;
    result JSON;
BEGIN
    -- Get the edit request
    SELECT * INTO edit_request 
    FROM public.business_edit_requests 
    WHERE id = edit_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Edit request not found or not pending',
            'request_id', edit_request_id
        );
    END IF;
    
    -- Apply the changes directly to the business
    UPDATE public.businesses 
    SET 
        description = COALESCE((edit_request.proposed_changes->>'description')::TEXT, description),
        phone = COALESCE((edit_request.proposed_changes->>'phone')::TEXT, phone),
        email = COALESCE((edit_request.proposed_changes->>'email')::TEXT, email),
        website = COALESCE((edit_request.proposed_changes->>'website')::TEXT, website),
        service_type = COALESCE((edit_request.proposed_changes->>'service_type')::TEXT, service_type),
        address = COALESCE((edit_request.proposed_changes->>'address')::TEXT, address),
        city = COALESCE((edit_request.proposed_changes->>'city')::TEXT, city),
        state = COALESCE((edit_request.proposed_changes->>'state')::TEXT, state),
        postal_code = COALESCE((edit_request.proposed_changes->>'postal_code')::TEXT, postal_code),
        service_radius_km = COALESCE((edit_request.proposed_changes->>'service_radius_km')::INTEGER, service_radius_km),
        base_rate_cents = COALESCE((edit_request.proposed_changes->>'base_rate_cents')::INTEGER, base_rate_cents),
        hourly_rate_cents = COALESCE((edit_request.proposed_changes->>'hourly_rate_cents')::INTEGER, hourly_rate_cents),
        services_offered = COALESCE((edit_request.proposed_changes->>'services_offered')::TEXT[], services_offered),
        features = COALESCE((edit_request.proposed_changes->>'features')::TEXT[], features),
        years_experience = COALESCE((edit_request.proposed_changes->>'years_experience')::INTEGER, years_experience),
        languages_spoken = COALESCE((edit_request.proposed_changes->>'languages_spoken')::TEXT[], languages_spoken),
        certifications = COALESCE((edit_request.proposed_changes->>'certifications')::TEXT[], certifications),
        emergency_service = COALESCE((edit_request.proposed_changes->>'emergency_service')::BOOLEAN, emergency_service),
        same_day_service = COALESCE((edit_request.proposed_changes->>'same_day_service')::BOOLEAN, same_day_service),
        insurance_verified = COALESCE((edit_request.proposed_changes->>'insurance_verified')::BOOLEAN, insurance_verified),
        licensed = COALESCE((edit_request.proposed_changes->>'licensed')::BOOLEAN, licensed),
        bonded = COALESCE((edit_request.proposed_changes->>'bonded')::BOOLEAN, bonded),
        response_time_hours = COALESCE((edit_request.proposed_changes->>'response_time_hours')::INTEGER, response_time_hours),
        min_booking_notice_hours = COALESCE((edit_request.proposed_changes->>'min_booking_notice_hours')::INTEGER, min_booking_notice_hours),
        availability_days = COALESCE((edit_request.proposed_changes->>'availability_days')::TEXT[], availability_days),
        availability_hours = COALESCE((edit_request.proposed_changes->>'availability_hours')::JSONB, availability_hours),
        daily_availability = COALESCE((edit_request.proposed_changes->>'daily_availability')::JSONB, daily_availability),
        logo_url = COALESCE((edit_request.proposed_changes->>'logo_url')::TEXT, logo_url),
        cover_photo_url = COALESCE((edit_request.proposed_changes->>'cover_photo_url')::TEXT, cover_photo_url),
        gallery_photos = COALESCE((edit_request.proposed_changes->>'gallery_photos')::TEXT[], gallery_photos)
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
    
    RETURN json_build_object(
        'success', true,
        'message', 'Edit request approved successfully',
        'request_id', edit_request_id,
        'business_id', edit_request.business_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'request_id', edit_request_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a simple reject function
CREATE OR REPLACE FUNCTION reject_business_edit_request(edit_request_id UUID, admin_notes TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the edit request details
    SELECT * INTO request_record
    FROM public.business_edit_requests 
    WHERE id = edit_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Edit request not found or not pending',
            'request_id', edit_request_id
        );
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
    
    RETURN json_build_object(
        'success', true,
        'message', 'Edit request rejected successfully',
        'request_id', edit_request_id,
        'business_id', request_record.business_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'request_id', edit_request_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION apply_business_edit_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_business_edit_request(UUID, TEXT) TO authenticated;

-- Step 5: Test the functions
SELECT 'Simple functions created successfully!' as status;

-- Show the functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%business_edit%'
ORDER BY routine_name;
