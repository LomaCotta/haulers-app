-- Industry-Specific Service Templates
-- This creates flexible service templates for different industries

-- Step 1: Create service templates for different industries
INSERT INTO public.service_templates (business_id, template_name, template_description, industry_category, service_type, base_price_cents, hourly_rate_cents, estimated_duration_hours, service_config, required_items, optional_items) VALUES

-- Moving Services
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'Local Move - 1-2 Bedroom', 'Complete local moving service for 1-2 bedroom homes', 'moving', 'residential_move', 80000, 6000, 4, 
'{"truck_included": true, "movers_count": 2, "packing_materials": true, "insurance_coverage": "basic", "distance_limit_km": 50}',
'[{"name": "Moving Truck", "description": "Professional moving truck", "unit_price_cents": 20000}, {"name": "2 Movers", "description": "Professional moving team", "unit_price_cents": 30000, "quantity": 2}]',
'[{"name": "Packing Service", "description": "Professional packing of belongings", "unit_price_cents": 15000}, {"name": "Furniture Disassembly", "description": "Disassemble and reassemble furniture", "unit_price_cents": 5000}]'),

('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'Local Move - 3-4 Bedroom', 'Complete local moving service for 3-4 bedroom homes', 'moving', 'residential_move', 120000, 6000, 6,
'{"truck_included": true, "movers_count": 3, "packing_materials": true, "insurance_coverage": "premium", "distance_limit_km": 50}',
'[{"name": "Moving Truck", "description": "Large professional moving truck", "unit_price_cents": 30000}, {"name": "3 Movers", "description": "Professional moving team", "unit_price_cents": 30000, "quantity": 3}]',
'[{"name": "Packing Service", "description": "Complete packing service", "unit_price_cents": 25000}, {"name": "Furniture Disassembly", "description": "Disassemble and reassemble furniture", "unit_price_cents": 8000}]'),

('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'Piano Moving', 'Specialized piano moving service', 'moving', 'piano_move', 30000, 8000, 2,
'{"specialized_equipment": true, "insurance_coverage": "premium", "requires_quotes": true}',
'[{"name": "Piano Moving Equipment", "description": "Specialized piano moving equipment", "unit_price_cents": 15000}, {"name": "Piano Mover", "description": "Certified piano mover", "unit_price_cents": 15000}]',
'[{"name": "Tuning Service", "description": "Post-move piano tuning", "unit_price_cents": 10000}]'),

-- Cleaning Services (Example for different business)
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'Deep House Cleaning', 'Comprehensive deep cleaning service', 'cleaning', 'residential_cleaning', 15000, 5000, 3,
'{"cleaning_supplies_included": true, "team_size": 2, "eco_friendly": true}',
'[{"name": "Cleaning Supplies", "description": "Professional cleaning supplies", "unit_price_cents": 5000}, {"name": "2 Cleaners", "description": "Professional cleaning team", "unit_price_cents": 5000, "quantity": 2}]',
'[{"name": "Window Cleaning", "description": "Interior and exterior window cleaning", "unit_price_cents": 3000}, {"name": "Appliance Cleaning", "description": "Deep clean appliances", "unit_price_cents": 2000}]'),

-- Landscaping Services (Example)
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'Lawn Maintenance', 'Regular lawn care and maintenance', 'landscaping', 'lawn_care', 8000, 4000, 2,
'{"equipment_included": true, "fertilizer_included": true, "frequency": "weekly"}',
'[{"name": "Lawn Mowing", "description": "Professional lawn mowing", "unit_price_cents": 4000}, {"name": "Trimming", "description": "Edge trimming and cleanup", "unit_price_cents": 2000}]',
'[{"name": "Fertilizing", "description": "Lawn fertilization", "unit_price_cents": 1500}, {"name": "Weed Control", "description": "Weed treatment and prevention", "unit_price_cents": 1000}]');

-- Step 2: Create industry-specific booking validation functions
CREATE OR REPLACE FUNCTION validate_booking_for_industry(
  p_business_id UUID,
  p_service_type TEXT,
  p_service_details JSONB
)
RETURNS JSONB AS $$
DECLARE
  business_record RECORD;
  template_record RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  error_msg TEXT;
BEGIN
  -- Get business info
  SELECT * INTO business_record FROM public.businesses WHERE id = p_business_id;
  
  -- Get service template
  SELECT * INTO template_record FROM public.service_templates 
  WHERE business_id = p_business_id AND service_type = p_service_type;
  
  -- Industry-specific validations
  CASE business_record.service_type
    WHEN 'moving' THEN
      -- Moving-specific validations
      IF NOT (p_service_details ? 'pickup_address' AND p_service_details ? 'delivery_address') THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
          validation_result->'errors' || '["Pickup and delivery addresses are required for moving services"]');
      END IF;
      
      IF (p_service_details->>'distance_km')::numeric > 100 THEN
        validation_result := jsonb_set(validation_result, '{warnings}', 
          validation_result->'warnings' || '["Distance exceeds 100km - additional charges may apply"]');
      END IF;
      
    WHEN 'cleaning' THEN
      -- Cleaning-specific validations
      IF NOT (p_service_details ? 'property_size' AND p_service_details ? 'cleaning_type') THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
          validation_result->'errors' || '["Property size and cleaning type are required"]');
      END IF;
      
    WHEN 'landscaping' THEN
      -- Landscaping-specific validations
      IF NOT (p_service_details ? 'property_size' AND p_service_details ? 'service_area') THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
          validation_result->'errors' || '["Property size and service area are required"]');
      END IF;
      
    ELSE
      -- Generic validation
      IF NOT (p_service_details ? 'service_description') THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
          validation_result->'errors' || '["Service description is required"]');
      END IF;
  END CASE;
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create booking creation function with industry support
CREATE OR REPLACE FUNCTION create_booking_with_validation(
  p_business_id UUID,
  p_customer_id UUID,
  p_service_type TEXT,
  p_requested_date DATE,
  p_requested_time TIME,
  p_service_address TEXT,
  p_service_city TEXT,
  p_service_state TEXT,
  p_service_postal_code TEXT,
  p_service_details JSONB,
  p_customer_notes TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  booking_id UUID;
  business_record RECORD;
  template_record RECORD;
  validation_result JSONB;
  total_price INTEGER := 0;
  base_price INTEGER := 0;
  hourly_rate INTEGER := 0;
  estimated_duration INTEGER := 1;
BEGIN
  -- Validate the booking
  validation_result := validate_booking_for_industry(p_business_id, p_service_type, p_service_details);
  
  IF NOT (validation_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Validation failed',
      'details', validation_result
    );
  END IF;
  
  -- Get business and template info
  SELECT * INTO business_record FROM public.businesses WHERE id = p_business_id;
  SELECT * INTO template_record FROM public.service_templates 
  WHERE business_id = p_business_id AND service_type = p_service_type;
  
  -- Calculate pricing
  IF template_record.id IS NOT NULL THEN
    base_price := COALESCE(template_record.base_price_cents, 0);
    hourly_rate := COALESCE(template_record.hourly_rate_cents, 0);
    estimated_duration := COALESCE(template_record.estimated_duration_hours, 1);
  ELSE
    base_price := COALESCE(business_record.base_rate_cents, 0);
    hourly_rate := COALESCE(business_record.hourly_rate_cents, 0);
  END IF;
  
  total_price := base_price + (hourly_rate * estimated_duration);
  
  -- Create the booking
  INSERT INTO public.bookings (
    business_id, customer_id, service_type, requested_date, requested_time,
    service_address, service_city, service_state, service_postal_code,
    service_details, customer_notes, customer_phone, customer_email,
    base_price_cents, hourly_rate_cents, total_price_cents, estimated_duration_hours
  ) VALUES (
    p_business_id, p_customer_id, p_service_type, p_requested_date, p_requested_time,
    p_service_address, p_service_city, p_service_state, p_service_postal_code,
    p_service_details, p_customer_notes, p_customer_phone, p_customer_email,
    base_price, hourly_rate, total_price, estimated_duration
  ) RETURNING id INTO booking_id;
  
  -- Create booking items from template
  IF template_record.id IS NOT NULL THEN
    INSERT INTO public.booking_items (booking_id, item_name, item_description, item_category, item_type, unit_price_cents, quantity, total_price_cents)
    SELECT 
      booking_id,
      item->>'name',
      item->>'description',
      'service',
      p_service_type,
      (item->>'unit_price_cents')::integer,
      COALESCE((item->>'quantity')::integer, 1),
      (item->>'unit_price_cents')::integer * COALESCE((item->>'quantity')::integer, 1)
    FROM jsonb_array_elements(template_record.required_items) AS item;
  END IF;
  
  -- Create notifications
  INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
  VALUES 
    (p_customer_id, booking_id, 'booking_created', 'Booking Created! 🎉', 
     'Your booking with ' || business_record.name || ' has been created and is pending confirmation.', 
     '/bookings/' || booking_id),
    (business_record.owner_id, booking_id, 'booking_created', 'New Booking Request! 📋', 
     'You have a new booking request from a customer. Please review and confirm.', 
     '/dashboard/bookings/' || booking_id);
  
  -- Create admin notification
  INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
  SELECT id, booking_id, 'admin_alert', 'New Booking - Admin Review', 
         'New booking created: ' || business_record.name || ' - ' || p_service_type,
         '/admin/bookings/' || booking_id
  FROM public.profiles WHERE role = 'admin' LIMIT 1;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', booking_id,
    'total_price_cents', total_price,
    'estimated_duration_hours', estimated_duration,
    'warnings', validation_result->'warnings'
  );
END;
$$ LANGUAGE plpgsql;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION create_booking_with_validation TO authenticated;
GRANT EXECUTE ON FUNCTION validate_booking_for_industry TO authenticated;

-- Step 5: Success message
SELECT 'Industry-specific service templates and booking system created! 🚀' as status;
