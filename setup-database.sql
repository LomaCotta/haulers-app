-- Enable useful extensions
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- Auth-linked profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('consumer','provider','admin')) default 'consumer',
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz default now()
);

-- Providers (business owners can have multiple businesses; also store verification)
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique,
  description text,
  logo_url text,
  photos jsonb default '[]',
  base_rate_cents int,
  hourly_rate_cents int,
  verified boolean default false,
  license_number text,
  insurance_url text,
  service_types text[] default '{}',
  location geography(Point, 4326),
  service_radius_km numeric default 25,
  address text,
  city text,
  state text,
  postal_code text,
  country text default 'US',
  rating_avg numeric default 0,
  rating_count int default 0,
  created_at timestamptz default now()
);

-- Availability (simple calendar slots)
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  date date not null,
  is_available boolean default true
);

-- Quotes & bookings
create type booking_status as enum ('requested','quoted','accepted','scheduled','completed','canceled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references public.profiles(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  status booking_status default 'requested',
  move_date date not null,
  details jsonb, -- size, addresses, stairs, notes
  quote_cents int,
  deposit_cents int,
  stripe_payment_intent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages per booking
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

-- Reviews (job-verified)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  consumer_id uuid references public.profiles(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  rating int check (rating between 1 and 5),
  body text,
  photos jsonb default '[]',
  created_at timestamptz default now(),
  unique (booking_id) -- one review per completed job
);

-- Transparency ledger
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  period_month date not null, -- use first of month
  category text check (category in ('income_fees','donations','infra_costs','staff','grants','reserves','other')),
  amount_cents int not null,
  note text,
  created_at timestamptz default now()
);

-- Indexes
create index businesses_location_gix on public.businesses using gist (location);
create index businesses_search_idx on public.businesses using gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')));

-- RLS
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.ledger_entries enable row level security;

-- Policies
-- profiles: user can read all (public info), update self
create policy "read_profiles" on public.profiles for select using (true);
create policy "update_own_profile" on public.profiles for update using (auth.uid() = id);
create policy "insert_profile" on public.profiles for insert with check (auth.uid() = id);

-- businesses: public read; owner CRUD
create policy "read_businesses" on public.businesses for select using (true);
create policy "insert_business" on public.businesses for insert with check (owner_id = auth.uid());
create policy "update_own_business" on public.businesses for update using (owner_id = auth.uid());

-- availability: owner CRUD by business ownership
create policy "read_availability" on public.availability for select using (true);
create policy "manage_availability" on public.availability
for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- bookings: consumer sees own; business sees theirs; public no
create policy "select_booking" on public.bookings for select using (
  consumer_id = auth.uid() or
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);
create policy "insert_booking" on public.bookings for insert with check (consumer_id = auth.uid());
create policy "update_booking_business" on public.bookings for update using (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);

-- messages: visible to participants
create policy "select_messages" on public.messages for select using (
  exists (select 1 from public.bookings bk where bk.id = booking_id and (
    bk.consumer_id = auth.uid() or exists (select 1 from public.businesses b where b.id = bk.business_id and b.owner_id = auth.uid())
  ))
);
create policy "insert_messages" on public.messages for insert with check (
  exists (select 1 from public.bookings bk where bk.id = booking_id and (
    bk.consumer_id = auth.uid() or exists (select 1 from public.businesses b where b.id = bk.business_id and b.owner_id = auth.uid())
  ))
);

-- reviews: visible to all; only for completed bookings; inserted by booking consumer
create policy "read_reviews" on public.reviews for select using (true);
create policy "insert_reviews" on public.reviews for insert with check (
  consumer_id = auth.uid() and
  exists (select 1 from public.bookings bk where bk.id = booking_id and bk.status = 'completed' and bk.consumer_id = auth.uid())
);

-- ledger: public read; admin write
create policy "read_ledger" on public.ledger_entries for select using (true);
create policy "admin_write_ledger" on public.ledger_entries for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
