-- Enhanced availability system for morning/afternoon slots and job counts
-- This migration adds time slot support to existing availability rules

-- Add time slot columns to availability rules
alter table movers_availability_rules
  add column if not exists morning_jobs int not null default 0,
  add column if not exists afternoon_jobs int not null default 0,
  add column if not exists morning_start time,
  add column if not exists afternoon_start time,
  add column if not exists afternoon_end time;

-- Update existing records to split day into morning/afternoon if end_time exists
update movers_availability_rules
set 
  morning_start = start_time,
  afternoon_start = case 
    when end_time > start_time + interval '6 hours' then start_time + interval '6 hours'
    else end_time
  end,
  afternoon_end = end_time,
  morning_jobs = max_concurrent_jobs,
  afternoon_jobs = max_concurrent_jobs
where morning_start is null;

-- Create table for scheduled jobs to track bookings
create table if not exists movers_scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references movers_providers(id) on delete cascade,
  quote_id uuid references movers_quotes(id) on delete set null,
  scheduled_date date not null,
  time_slot text not null check (time_slot in ('morning', 'afternoon', 'full_day')),
  scheduled_start_time time not null,
  scheduled_end_time time not null,
  crew_size int not null default 2,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_movers_scheduled_jobs_provider_date on movers_scheduled_jobs(provider_id, scheduled_date);
create index if not exists idx_movers_scheduled_jobs_quote on movers_scheduled_jobs(quote_id);
create index if not exists idx_movers_scheduled_jobs_date_slot on movers_scheduled_jobs(scheduled_date, time_slot);

-- RLS for scheduled jobs
alter table movers_scheduled_jobs enable row level security;

create policy "movers_scheduled_jobs_rw" on movers_scheduled_jobs
  for all using (
    exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid())
  ) with check (
    exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid())
  );

-- Function to check availability for a given date/time slot
create or replace function check_movers_availability(
  p_provider_id uuid,
  p_date date,
  p_time_slot text
) returns boolean as $$
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
  select * into v_override_record
  from movers_availability_overrides
  where provider_id = p_provider_id
    and date = p_date
    and kind = 'block'
  limit 1;
  
  -- If blocked, not available
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
    and time_slot = p_time_slot
    and status in ('scheduled', 'in_progress');
  
  -- Available if under max jobs
  return v_current_bookings < v_max_jobs;
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users
grant execute on function check_movers_availability(uuid, date, text) to authenticated;

