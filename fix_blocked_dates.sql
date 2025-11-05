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

-- Now refresh all blocked dates
SELECT refresh_all_blocked_dates();

