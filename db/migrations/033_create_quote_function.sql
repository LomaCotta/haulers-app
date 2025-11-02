-- Function to create or update quote with security definer
-- This allows customers to create quotes during reservation while maintaining data integrity
-- CRITICAL: Now includes destination fee, double drive time, and trip distance info
CREATE OR REPLACE FUNCTION create_or_update_movers_quote(
  p_provider_id uuid,
  p_customer_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_pickup_address text,
  p_dropoff_address text,
  p_move_date date,
  p_crew_size int,
  p_price_total_cents int,
  p_status text DEFAULT 'confirmed',
  p_existing_quote_id uuid DEFAULT NULL,
  p_breakdown jsonb DEFAULT NULL,
  -- CRITICAL: New parameters for destination fee, double drive time, and trip distance
  p_destination_fee text DEFAULT NULL,
  p_destination_fee_cents int DEFAULT NULL,
  p_double_drive_time boolean DEFAULT NULL,
  p_trip_distance_miles numeric DEFAULT NULL,
  p_trip_distance_duration numeric DEFAULT NULL,
  p_trip_distances jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_quote_id uuid;
  v_breakdown jsonb;
  v_trip_distances jsonb;
  heavy_items_total numeric := 0;
  heavy_item jsonb;
  item_price numeric;
BEGIN
  -- Build comprehensive breakdown JSONB with destination fee, double drive time, and trip distance
  -- CRITICAL: Start with p_breakdown to preserve all original fields including heavy_items
  v_breakdown := COALESCE(p_breakdown, '{}'::jsonb);
  
  -- CRITICAL: Always ensure heavy_items_cost exists as a NUMBER (total cost in dollars) in breakdown
  -- This allows direct query: SELECT breakdown->>'heavy_items_cost' FROM movers_quotes WHERE breakdown->>'heavy_items_cost' IS NOT NULL
  -- Priority: heavy_items_cost (explicit) > heavy_items (number) > heavy_items (array - calculate)
  -- CRITICAL: Preserve original heavy_items field while also adding heavy_items_cost
  
  -- First, check if heavy_items_cost already exists (explicitly passed)
  IF v_breakdown ? 'heavy_items_cost' AND jsonb_typeof(v_breakdown->'heavy_items_cost') = 'number' THEN
    -- Already exists as a number, use it
    heavy_items_total := (v_breakdown->>'heavy_items_cost')::numeric;
  -- Check if heavy_items is a number (from quoteCalculator) - THIS IS THE KEY!
  ELSIF v_breakdown ? 'heavy_items' AND jsonb_typeof(v_breakdown->'heavy_items') = 'number' THEN
    -- heavy_items is already the total cost in dollars (from quoteCalculator)
    heavy_items_total := (v_breakdown->>'heavy_items')::numeric;
    -- CRITICAL: Save it as heavy_items_cost for consistent access, but PRESERVE original heavy_items
    v_breakdown := v_breakdown || jsonb_build_object('heavy_items_cost', heavy_items_total);
    -- Note: heavy_items is already in v_breakdown, so it's preserved
  -- Check if heavy_items is an array (calculate total from array)
  ELSIF v_breakdown ? 'heavy_items' AND jsonb_typeof(v_breakdown->'heavy_items') = 'array' THEN
    -- Calculate total cost from array of heavy items
    heavy_items_total := 0;
    FOR heavy_item IN SELECT * FROM jsonb_array_elements(v_breakdown->'heavy_items')
    LOOP
      -- Get price_cents or price from each item
      IF heavy_item ? 'price_cents' THEN
        -- price_cents is in cents, convert to dollars
        heavy_items_total := heavy_items_total + ((heavy_item->>'price_cents')::numeric / 100.0);
      ELSIF heavy_item ? 'price' THEN
        -- price might be in dollars or cents - if > 1000, it's cents, otherwise dollars
        item_price := (heavy_item->>'price')::numeric;
        IF item_price > 1000 THEN
          heavy_items_total := heavy_items_total + (item_price / 100.0);
        ELSE
          heavy_items_total := heavy_items_total + item_price;
        END IF;
      END IF;
    END LOOP;
    
    -- CRITICAL: Save heavy_items_cost as a NUMBER (total cost) for easy reading from database
    IF heavy_items_total > 0 THEN
      v_breakdown := v_breakdown || jsonb_build_object('heavy_items_cost', heavy_items_total);
    END IF;
  END IF;
  
  -- Merge destination fee into breakdown if provided
  IF p_destination_fee IS NOT NULL OR p_destination_fee_cents IS NOT NULL THEN
    v_breakdown := v_breakdown || jsonb_build_object(
      'destination_fee', COALESCE(p_destination_fee, NULL),
      'destination_fee_cents', COALESCE(p_destination_fee_cents, NULL)
    );
  END IF;
  
  -- Merge double drive time into breakdown if provided
  IF p_double_drive_time IS NOT NULL THEN
    v_breakdown := v_breakdown || jsonb_build_object('double_drive_time', p_double_drive_time);
  END IF;
  
  -- Build trip_distances object if any trip distance info is provided
  IF p_trip_distance_miles IS NOT NULL OR p_trip_distance_duration IS NOT NULL OR p_trip_distances IS NOT NULL THEN
    v_trip_distances := COALESCE(p_trip_distances, '{}'::jsonb);
    
    IF p_trip_distance_miles IS NOT NULL THEN
      v_trip_distances := v_trip_distances || jsonb_build_object('distance', p_trip_distance_miles);
    END IF;
    
    IF p_trip_distance_duration IS NOT NULL THEN
      v_trip_distances := v_trip_distances || jsonb_build_object('duration', p_trip_distance_duration);
    END IF;
    
    -- Merge trip_distances into breakdown
    v_breakdown := v_breakdown || jsonb_build_object('trip_distances', v_trip_distances);
    
    -- Also store as separate keys for easy retrieval
    IF p_trip_distance_miles IS NOT NULL THEN
      v_breakdown := v_breakdown || jsonb_build_object('trip_distance_miles', p_trip_distance_miles);
    END IF;
    
    IF p_trip_distance_duration IS NOT NULL THEN
      v_breakdown := v_breakdown || jsonb_build_object('trip_distance_duration', p_trip_distance_duration);
    END IF;
    
    -- Store mileage for easy access
    IF p_trip_distance_miles IS NOT NULL THEN
      v_breakdown := v_breakdown || jsonb_build_object('mileage', p_trip_distance_miles);
    END IF;
  END IF;
  
  -- If existing quote ID provided, update it
  IF p_existing_quote_id IS NOT NULL THEN
    UPDATE movers_quotes
    SET 
      customer_id = COALESCE(p_customer_id, customer_id),
      full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
      email = COALESCE(NULLIF(p_email, ''), email),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      pickup_address = COALESCE(NULLIF(p_pickup_address, ''), pickup_address),
      dropoff_address = COALESCE(NULLIF(p_dropoff_address, ''), dropoff_address),
      crew_size = COALESCE(p_crew_size, crew_size),
      price_total_cents = COALESCE(p_price_total_cents, price_total_cents),
      status = p_status,
      -- CRITICAL: Save distance_miles to the column for easy querying
      distance_miles = COALESCE(p_trip_distance_miles, distance_miles),
      -- CRITICAL: Save enriched breakdown with all trip info
      breakdown = v_breakdown,
      updated_at = NOW()
    WHERE id = p_existing_quote_id
    RETURNING id INTO v_quote_id;
    
    IF v_quote_id IS NOT NULL THEN
      RETURN v_quote_id;
    END IF;
  END IF;
  
  -- Otherwise, create new quote
  INSERT INTO movers_quotes (
    provider_id,
    customer_id,
    full_name,
    email,
    phone,
    pickup_address,
    dropoff_address,
    move_date,
    crew_size,
    price_total_cents,
    status,
    -- CRITICAL: Save distance_miles to the column for easy querying
    distance_miles,
    -- CRITICAL: Save enriched breakdown with all trip info
    breakdown
  ) VALUES (
    p_provider_id,
    p_customer_id,
    p_full_name,
    p_email,
    p_phone,
    p_pickup_address,
    p_dropoff_address,
    p_move_date,
    p_crew_size,
    p_price_total_cents,
    p_status,
    -- CRITICAL: Store trip distance in the distance_miles column
    p_trip_distance_miles,
    -- CRITICAL: Store enriched breakdown with destination fee, double drive time, trip distances
    v_breakdown
  )
  RETURNING id INTO v_quote_id;
  
  RETURN v_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (so customers can create quotes)
-- Updated to include breakdown and all trip/destination fee parameters
GRANT EXECUTE ON FUNCTION create_or_update_movers_quote(
  uuid, -- p_provider_id
  uuid, -- p_customer_id
  text, -- p_full_name
  text, -- p_email
  text, -- p_phone
  text, -- p_pickup_address
  text, -- p_dropoff_address
  date, -- p_move_date
  int, -- p_crew_size
  int, -- p_price_total_cents
  text, -- p_status
  uuid, -- p_existing_quote_id
  jsonb, -- p_breakdown
  text, -- p_destination_fee
  int, -- p_destination_fee_cents
  boolean, -- p_double_drive_time
  numeric, -- p_trip_distance_miles
  numeric, -- p_trip_distance_duration
  jsonb -- p_trip_distances
) TO authenticated;

