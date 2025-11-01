-- Create profile_contacts table for saving additional contacts
create table if not exists public.profile_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profile_contacts enable row level security;

-- RLS policies (with IF NOT EXISTS check)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profile_contacts' 
    and policyname = 'profile_contacts_rw_own'
  ) then
    create policy "profile_contacts_rw_own" on public.profile_contacts
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- Create notifications table if it doesn't exist
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('booking', 'reservation', 'message', 'system')),
  related_id uuid, -- Can reference bookings, reservations, etc.
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS for notifications
alter table public.notifications enable row level security;

-- RLS policies for notifications (with IF NOT EXISTS check)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'notifications' 
    and policyname = 'notifications_rw_own'
  ) then
    create policy "notifications_rw_own" on public.notifications
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- Indexes for performance
create index if not exists idx_profile_contacts_user on public.profile_contacts(user_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(is_read);
create unique index if not exists idx_profile_contacts_user_name on public.profile_contacts(user_id, name);

