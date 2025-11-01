-- Function to create scheduled job with security definer
-- This allows customers to book while maintaining data integrity
create or replace function create_movers_scheduled_job(
  p_provider_id uuid,
  p_quote_id uuid,
  p_scheduled_date date,
  p_time_slot text,
  p_scheduled_start_time time,
  p_scheduled_end_time time,
  p_crew_size int,
  p_status text default 'scheduled'
) returns uuid as $$
declare
  v_job_id uuid;
begin
  -- Validate inputs
  if p_time_slot not in ('morning', 'afternoon', 'full_day') then
    raise exception 'Invalid time_slot: %', p_time_slot;
  end if;
  
  if p_status not in ('scheduled', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Invalid status: %', p_status;
  end if;
  
  -- Insert the scheduled job
  insert into movers_scheduled_jobs (
    provider_id,
    quote_id,
    scheduled_date,
    time_slot,
    scheduled_start_time,
    scheduled_end_time,
    crew_size,
    status
  ) values (
    p_provider_id,
    p_quote_id,
    p_scheduled_date,
    p_time_slot,
    p_scheduled_start_time,
    p_scheduled_end_time,
    p_crew_size,
    p_status
  )
  returning id into v_job_id;
  
  return v_job_id;
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users (so customers can book)
grant execute on function create_movers_scheduled_job(uuid, uuid, date, text, time, time, int, text) to authenticated;

