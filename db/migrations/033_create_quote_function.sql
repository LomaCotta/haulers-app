-- Function to create or update quote with security definer
-- This allows customers to create quotes during reservation while maintaining data integrity
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
  p_existing_quote_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_quote_id uuid;
BEGIN
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
    status
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
    p_status
  )
  RETURNING id INTO v_quote_id;
  
  RETURN v_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (so customers can create quotes)
GRANT EXECUTE ON FUNCTION create_or_update_movers_quote(uuid, uuid, text, text, text, text, text, date, int, int, text, uuid) TO authenticated;

