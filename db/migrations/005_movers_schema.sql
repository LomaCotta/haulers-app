-- Movers provider core schema: settings, pricing, equipment, oversized, specialty, availability, quotes, jobs

-- Providers that can offer movers services map to existing profiles/businesses
create table if not exists movers_providers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_user_id uuid not null,
  title text not null default 'Movers',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- policies & service area
  refund_policy text default 'no_refund_for_unused_time',
  overbook_policy text default 'no_availability_beyond_prebooked',
  same_day boolean default false,
  next_day boolean default false,
  min_lead_minutes int default 0,
  base_zip text,
  service_radius_miles int default 25
);

create index if not exists idx_movers_providers_business on movers_providers(business_id);

-- Labor/Travel pricing tiers (crew sizes, base, hourly, travel)
create table if not exists movers_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  crew_size int not null check (crew_size >= 1 and crew_size <= 10),
  min_hours int not null default 2,
  base_rate_cents int not null,
  hourly_rate_cents int not null,
  per_mile_cents int default 0,
  between_locations_per_mile_cents int default 0,
  travel_policy text default 'charge_if_over_10_miles',
  active boolean not null default true,
  unique(provider_id, crew_size)
);

-- Equipment pricing toggles
create table if not exists movers_equipment (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  name text not null,
  active boolean not null default false,
  price_cents int default 0,
  unique(provider_id, name)
);

-- Oversized items
create table if not exists movers_oversized_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  name text not null,
  with_stairs boolean default false,
  price_cents int not null default 0,
  active boolean not null default false,
  unique(provider_id, name, with_stairs)
);

-- Specialty services (e.g., hoisting, packing)
create table if not exists movers_specialty_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null default 0,
  active boolean not null default false,
  unique(provider_id, name)
);

-- Weekly availability template (native, not Google Calendar)
create table if not exists movers_availability_rules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0=Sun
  start_time time not null,
  end_time time not null,
  max_concurrent_jobs int not null default 1,
  crew_capacity int not null default 2
);

-- Date overrides: blocks or extra windows
create table if not exists movers_availability_overrides (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('block','extra')),
  start_time time,
  end_time time,
  max_concurrent_jobs int,
  note text
);

-- Quotes and Reservations
create table if not exists movers_quotes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete set null,
  customer_id uuid,
  full_name text,
  email text,
  phone text,
  move_date date,
  arrival_window text,
  pickup_address text,
  dropoff_address text,
  distance_miles numeric,
  crew_size int,
  estimated_hours numeric,
  price_total_cents int,
  breakdown jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists movers_jobs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references movers_quotes(id) on delete set null,
  provider_id uuid references movers_providers(id) on delete set null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  crew_assigned int not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

-- Basic RLS (tighten later)
alter table movers_providers enable row level security;
alter table movers_pricing_tiers enable row level security;
alter table movers_equipment enable row level security;
alter table movers_oversized_items enable row level security;
alter table movers_specialty_services enable row level security;
alter table movers_availability_rules enable row level security;
alter table movers_availability_overrides enable row level security;
alter table movers_quotes enable row level security;
alter table movers_jobs enable row level security;

-- Public read of quotes for testing disabled; providers can manage their data
create policy "movers_provider_rw" on movers_providers
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "movers_child_rw_tiers" on movers_pricing_tiers
  for all using (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()))
  with check (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()));

create policy "movers_child_rw_equipment" on movers_equipment
  for all using (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()))
  with check (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()));

create policy "movers_child_rw_oversized" on movers_oversized_items
  for all using (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()))
  with check (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()));

create policy "movers_child_rw_specialty" on movers_specialty_services
  for all using (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()))
  with check (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()));

create policy "movers_child_rw_avail_rules" on movers_availability_rules
  for all using (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()))
  with check (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()));

create policy "movers_child_rw_avail_overrides" on movers_availability_overrides
  for all using (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()))
  with check (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()));

create policy "movers_quotes_rw" on movers_quotes
  for all using (
    provider_id is null or exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid())
  ) with check (
    provider_id is null or exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid())
  );

create policy "movers_jobs_rw" on movers_jobs
  for all using (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()))
  with check (exists(select 1 from movers_providers p where p.id = provider_id and p.owner_user_id = auth.uid()));


