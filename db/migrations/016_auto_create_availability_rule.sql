-- Function to auto-create default availability rule if missing
-- This uses security definer so it can create rules even when called by customers
create or replace function auto_create_availability_rule(
  p_provider_id uuid,
  p_weekday int
) returns uuid as $$
declare
  v_rule_id uuid;
begin
  -- Check if rule already exists
  select id into v_rule_id
  from movers_availability_rules
  where provider_id = p_provider_id
    and weekday = p_weekday
  limit 1;
  
  -- If rule exists, return its ID
  if v_rule_id is not null then
    return v_rule_id;
  end if;
  
  -- Create default rule
  insert into movers_availability_rules (
    provider_id,
    weekday,
    start_time,
    end_time,
    morning_start,
    afternoon_start,
    afternoon_end,
    morning_jobs,
    afternoon_jobs,
    max_concurrent_jobs,
    crew_capacity
  ) values (
    p_provider_id,
    p_weekday,
    '08:00:00',
    '17:00:00',
    '08:00:00',
    '12:00:00',
    '17:00:00',
    3, -- morning_jobs
    2, -- afternoon_jobs
    3, -- max_concurrent_jobs
    2  -- crew_capacity
  )
  returning id into v_rule_id;
  
  return v_rule_id;
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users (so customers can trigger rule creation)
grant execute on function auto_create_availability_rule(uuid, int) to authenticated;

