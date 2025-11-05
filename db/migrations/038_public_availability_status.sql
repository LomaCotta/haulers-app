-- Public Availability Status System
-- This migration creates a robust, scalable system for tracking public availability
-- without exposing internal booking counts or sensitive data

-- Create public availability status table
CREATE TABLE IF NOT EXISTS movers_public_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES movers_providers(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES movers_providers(calendar_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  morning_status TEXT NOT NULL CHECK (morning_status IN ('available', 'busy', 'unavailable')),
  afternoon_status TEXT NOT NULL CHECK (afternoon_status IN ('available', 'busy', 'unavailable')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, date),
  UNIQUE(calendar_id, date)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_public_availability_provider_date ON movers_public_availability(provider_id, date);
CREATE INDEX IF NOT EXISTS idx_public_availability_calendar_date ON movers_public_availability(calendar_id, date);
CREATE INDEX IF NOT EXISTS idx_public_availability_date ON movers_public_availability(date);

-- Function to calculate availability status for a date/slot
CREATE OR REPLACE FUNCTION calculate_availability_status(
  p_provider_id UUID,
  p_date DATE,
  p_time_slot TEXT
) RETURNS TEXT AS $$
DECLARE
  v_max_jobs INT;
  v_current_bookings INT;
  v_is_blocked BOOLEAN;
  v_available BOOLEAN;
BEGIN
  -- Check if slot is blocked
  SELECT EXISTS (
    SELECT 1 FROM movers_availability_overrides
    WHERE provider_id = p_provider_id
      AND date = p_date
      AND kind = 'block'
      AND (
        time_slot = p_time_slot 
        OR time_slot = 'full_day' 
        OR time_slot IS NULL
      )
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN 'unavailable';
  END IF;
  
  -- Get weekday and rule
  DECLARE
    v_weekday INT := EXTRACT(DOW FROM p_date);
    v_rule RECORD;
  BEGIN
    SELECT * INTO v_rule
    FROM movers_availability_rules
    WHERE provider_id = p_provider_id
      AND weekday = v_weekday
    LIMIT 1;
    
    IF v_rule IS NULL THEN
      -- No rule configured - default to available (provider hasn't configured yet)
      -- This allows dates to be bookable until rules are set up
      RETURN 'available';
    END IF;
    
    -- Get max jobs for this slot
    IF p_time_slot = 'morning' THEN
      v_max_jobs := COALESCE(v_rule.morning_jobs, 0);
    ELSIF p_time_slot = 'afternoon' THEN
      v_max_jobs := COALESCE(v_rule.afternoon_jobs, 0);
    ELSE
      v_max_jobs := COALESCE(v_rule.max_concurrent_jobs, 0);
    END IF;
    
    IF v_max_jobs = 0 THEN
      -- Zero capacity means unavailable (explicitly configured as 0)
      -- But if no rule exists, we already returned 'available' above
      RETURN 'unavailable';
    END IF;
    
    -- Count current bookings
    SELECT COUNT(*) INTO v_current_bookings
    FROM movers_scheduled_jobs
    WHERE provider_id = p_provider_id
      AND scheduled_date = p_date
      AND time_slot IN (p_time_slot, 'full_day')
      AND status IN ('scheduled', 'in_progress');
    
    -- Also count bookings from bookings table
    DECLARE
      v_business_id UUID;
      v_bookings_count INT;
    BEGIN
      SELECT business_id INTO v_business_id
      FROM movers_providers
      WHERE id = p_provider_id;
      
      IF v_business_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_bookings_count
        FROM bookings
        WHERE business_id = v_business_id
          AND requested_date::date = p_date
          AND booking_status IN ('confirmed', 'pending', 'in_progress')
          AND (
            (service_details->>'time_slot')::text = p_time_slot
            OR (service_details->>'time_slot')::text = 'full_day'
            OR (
              (service_details->>'time_slot')::text IS NULL
              AND (service_details->>'requested_time')::text IS NOT NULL
              AND (
                (p_time_slot = 'morning' AND (service_details->>'requested_time')::text < '12:00:00')
                OR (p_time_slot = 'afternoon' AND (service_details->>'requested_time')::text >= '12:00:00')
              )
            )
          );
        
        v_current_bookings := v_current_bookings + v_bookings_count;
      END IF;
    END;
    
    -- Determine status
    IF v_current_bookings >= v_max_jobs THEN
      RETURN 'busy';
    ELSIF v_current_bookings > 0 THEN
      RETURN 'busy'; -- Show busy if any bookings exist
    ELSE
      RETURN 'available';
    END IF;
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update public availability for a date
CREATE OR REPLACE FUNCTION update_public_availability(
  p_provider_id UUID,
  p_date DATE
) RETURNS VOID AS $$
DECLARE
  v_calendar_id UUID;
  v_morning_status TEXT;
  v_afternoon_status TEXT;
BEGIN
  -- Get calendar_id
  SELECT calendar_id INTO v_calendar_id
  FROM movers_providers
  WHERE id = p_provider_id;
  
  -- Calculate statuses
  v_morning_status := calculate_availability_status(p_provider_id, p_date, 'morning');
  v_afternoon_status := calculate_availability_status(p_provider_id, p_date, 'afternoon');
  
  -- Upsert public availability
  INSERT INTO movers_public_availability (
    provider_id,
    calendar_id,
    date,
    morning_status,
    afternoon_status,
    updated_at
  ) VALUES (
    p_provider_id,
    v_calendar_id,
    p_date,
    v_morning_status,
    v_afternoon_status,
    NOW()
  )
  ON CONFLICT (provider_id, date)
  DO UPDATE SET
    morning_status = EXCLUDED.morning_status,
    afternoon_status = EXCLUDED.afternoon_status,
    calendar_id = EXCLUDED.calendar_id,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update public availability when bookings change
CREATE OR REPLACE FUNCTION trigger_update_public_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Update availability for the affected date
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_public_availability(NEW.provider_id, NEW.scheduled_date::date);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_public_availability(OLD.provider_id, OLD.scheduled_date::date);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on movers_scheduled_jobs
DROP TRIGGER IF EXISTS trg_update_public_availability_jobs ON movers_scheduled_jobs;
CREATE TRIGGER trg_update_public_availability_jobs
  AFTER INSERT OR UPDATE OR DELETE ON movers_scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_public_availability();

-- Trigger function for bookings table
CREATE OR REPLACE FUNCTION trigger_update_public_availability_from_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_date DATE;
BEGIN
  -- Get the date from NEW or OLD depending on operation
  IF TG_OP = 'DELETE' THEN
    v_date := OLD.requested_date::date;
  ELSE
    v_date := NEW.requested_date::date;
  END IF;
  
  -- Skip if no date
  IF v_date IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Skip if status is not relevant
  IF TG_OP = 'DELETE' THEN
    IF OLD.booking_status NOT IN ('confirmed', 'pending', 'in_progress', 'scheduled') THEN
      RETURN OLD;
    END IF;
  ELSE
    IF NEW.booking_status NOT IN ('confirmed', 'pending', 'in_progress', 'scheduled') THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Get provider_id from business_id
  SELECT id INTO v_provider_id
  FROM movers_providers
  WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
  LIMIT 1;
  
  IF v_provider_id IS NOT NULL THEN
    PERFORM update_public_availability(v_provider_id, v_date);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on bookings table
DROP TRIGGER IF EXISTS trg_update_public_availability_bookings ON bookings;
CREATE TRIGGER trg_update_public_availability_bookings
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_public_availability_from_booking();

-- Trigger function for availability overrides (blocks)
CREATE OR REPLACE FUNCTION trigger_update_public_availability_from_override()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process 'block' kind overrides
  IF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'block' THEN
      PERFORM update_public_availability(OLD.provider_id, OLD.date);
    END IF;
  ELSE
    IF NEW.kind = 'block' THEN
      PERFORM update_public_availability(NEW.provider_id, NEW.date);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on movers_availability_overrides
DROP TRIGGER IF EXISTS trg_update_public_availability_overrides ON movers_availability_overrides;
CREATE TRIGGER trg_update_public_availability_overrides
  AFTER INSERT OR UPDATE OR DELETE ON movers_availability_overrides
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_public_availability_from_override();

-- Grant public read access (for calendar API)
GRANT SELECT ON movers_public_availability TO authenticated, anon;

-- Comment explaining the system
COMMENT ON TABLE movers_public_availability IS 'Public availability status cache. Updated automatically when bookings or blocks change. Provides simple status (available/busy/unavailable) without exposing booking counts.';

COMMENT ON FUNCTION calculate_availability_status IS 'Calculates availability status for a date/slot: available (open), busy (has bookings), or unavailable (blocked or no capacity).';

COMMENT ON FUNCTION update_public_availability IS 'Updates or creates public availability record for a specific date. Called automatically by triggers.';

-- Function to refresh public availability for a date range (useful for fixing stale data)
CREATE OR REPLACE FUNCTION refresh_public_availability_range(
  p_provider_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS VOID AS $$
DECLARE
  v_current_date DATE;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    PERFORM update_public_availability(p_provider_id, v_current_date);
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_public_availability_range IS 'Refreshes public availability cache for a date range. Useful for fixing stale data or after rule changes.';

-- Helper function to refresh availability for all providers with blocked dates
-- This will refresh the cache for all dates that have blocks
CREATE OR REPLACE FUNCTION refresh_all_blocked_dates()
RETURNS VOID AS $$
DECLARE
  v_block RECORD;
BEGIN
  -- Refresh cache for all dates that have blocks
  FOR v_block IN 
    SELECT DISTINCT provider_id, date
    FROM movers_availability_overrides
    WHERE kind = 'block'
  LOOP
    PERFORM update_public_availability(v_block.provider_id, v_block.date);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_blocked_dates IS 'Refreshes public availability cache for all dates that have blocks. Useful for fixing stale data after migration.';

