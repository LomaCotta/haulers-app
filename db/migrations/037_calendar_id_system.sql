-- Calendar ID System for Isolated Availability Access
-- This migration creates a calendar ID system that prevents information leakage
-- Each provider gets a unique calendar_id that can be used publicly without exposing provider/business IDs

-- Add calendar_id to movers_providers table
ALTER TABLE movers_providers
  ADD COLUMN IF NOT EXISTS calendar_id UUID UNIQUE DEFAULT gen_random_uuid();

-- Create index for fast calendar_id lookups
CREATE INDEX IF NOT EXISTS idx_movers_providers_calendar_id ON movers_providers(calendar_id);

-- Generate calendar_ids for existing providers that don't have one
UPDATE movers_providers
SET calendar_id = gen_random_uuid()
WHERE calendar_id IS NULL;

-- Create a function to get provider_id from calendar_id (for internal use only)
CREATE OR REPLACE FUNCTION get_provider_from_calendar(p_calendar_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  SELECT id INTO v_provider_id
  FROM movers_providers
  WHERE calendar_id = p_calendar_id;
  
  RETURN v_provider_id;
END;
$$;

-- Add comment explaining the security model
COMMENT ON FUNCTION get_provider_from_calendar IS 'Internal function to resolve provider_id from calendar_id. Should only be used server-side.';

-- Create a view for public calendar availability (read-only, no sensitive data)
CREATE OR REPLACE VIEW public_calendar_availability AS
SELECT 
  mp.calendar_id,
  mar.weekday,
  mar.morning_jobs,
  mar.afternoon_jobs,
  mar.morning_start,
  mar.afternoon_start,
  mar.afternoon_end
FROM movers_providers mp
INNER JOIN movers_availability_rules mar ON mar.provider_id = mp.id;

-- Grant public read access to the view
GRANT SELECT ON public_calendar_availability TO authenticated, anon;

COMMENT ON VIEW public_calendar_availability IS 'Public view for calendar availability. Only exposes calendar_id and availability rules, no provider/business IDs.';

