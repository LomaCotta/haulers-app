-- Add time_slot support to availability overrides for slot-specific blocking
-- This allows blocking morning, afternoon, or entire day separately

-- Add time_slot column to overrides table
ALTER TABLE movers_availability_overrides
  ADD COLUMN IF NOT EXISTS time_slot TEXT CHECK (time_slot IN ('morning', 'afternoon', 'full_day', NULL));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_movers_overrides_provider_date_slot 
  ON movers_availability_overrides(provider_id, date, time_slot);

-- Update existing full-day blocks to have time_slot = 'full_day'
UPDATE movers_availability_overrides
SET time_slot = 'full_day'
WHERE kind = 'block' AND time_slot IS NULL;

-- Update check function to handle slot-specific blocks
CREATE OR REPLACE FUNCTION check_movers_availability(
  p_provider_id uuid,
  p_date date,
  p_time_slot text
) RETURNS boolean AS $$
declare
  v_weekday int;
  v_rule_record record;
  v_current_bookings int;
  v_max_jobs int;
  v_override_record record;
begin
  -- Get weekday (0=Sunday, 6=Saturday)
  v_weekday := extract(dow from p_date);
  
  -- Check for date-specific override (block)
  -- Check for full-day block first
  select * into v_override_record
  from movers_availability_overrides
  where provider_id = p_provider_id
    and date = p_date
    and kind = 'block'
    and (time_slot = 'full_day' OR time_slot IS NULL)
  limit 1;
  
  -- If full day is blocked, not available
  if v_override_record is not null then
    return false;
  end if;
  
  -- Check for slot-specific block
  select * into v_override_record
  from movers_availability_overrides
  where provider_id = p_provider_id
    and date = p_date
    and kind = 'block'
    and time_slot = p_time_slot
  limit 1;
  
  -- If this specific slot is blocked, not available
  if v_override_record is not null then
    return false;
  end if;
  
  -- Get weekly rule for this weekday
  select * into v_rule_record
  from movers_availability_rules
  where provider_id = p_provider_id
    and weekday = v_weekday
  limit 1;
  
  -- If no rule, not available
  if v_rule_record is null then
    return false;
  end if;
  
  -- Check for extra window override
  select * into v_override_record
  from movers_availability_overrides
  where provider_id = p_provider_id
    and date = p_date
    and kind = 'extra'
    and (
      (p_time_slot = 'morning' and start_time >= v_rule_record.morning_start and end_time <= coalesce(v_rule_record.afternoon_start, v_rule_record.end_time))
      or (p_time_slot = 'afternoon' and start_time >= coalesce(v_rule_record.afternoon_start, v_rule_record.morning_start) and end_time <= v_rule_record.afternoon_end)
    )
  limit 1;
  
  -- Use override max_jobs if extra window exists
  if v_override_record is not null and v_override_record.max_concurrent_jobs is not null then
    v_max_jobs := v_override_record.max_concurrent_jobs;
  else
    -- Use rule-based max jobs for time slot
    if p_time_slot = 'morning' then
      v_max_jobs := v_rule_record.morning_jobs;
    elsif p_time_slot = 'afternoon' then
      v_max_jobs := v_rule_record.afternoon_jobs;
    else
      v_max_jobs := v_rule_record.max_concurrent_jobs;
    end if;
  end if;
  
  -- Count current bookings for this date/slot
  select count(*) into v_current_bookings
  from movers_scheduled_jobs
  where provider_id = p_provider_id
    and scheduled_date = p_date
    and (
      time_slot = p_time_slot
      or time_slot = 'full_day'
    );
  
  -- Available if current bookings < max jobs
  return v_current_bookings < v_max_jobs and v_max_jobs > 0;
end;
$$ language plpgsql;

SELECT 'Slot-specific blocking support added successfully! 🎯' as status;

