-- Consolidated provider configuration to support reliable reads/writes
-- This migration is idempotent and safe to run multiple times

-- 1) Consolidated table
create table if not exists public.movers_provider_config (
  provider_id uuid primary key references public.movers_providers(id) on delete cascade,
  policies jsonb not null default '{}'::jsonb,
  tiers jsonb not null default '[]'::jsonb,
  heavy_item_tiers jsonb not null default '[]'::jsonb,
  packing jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) RLS policies
alter table public.movers_provider_config enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'movers_provider_config' and policyname = 'mpc_rw_owner'
  ) then
    create policy "mpc_rw_owner" on public.movers_provider_config
      for all
      using (provider_id in (select id from public.movers_providers where owner_user_id = auth.uid()))
      with check (provider_id in (select id from public.movers_providers where owner_user_id = auth.uid()));
  end if;
end $$;

-- 3) Helpful indexes
create index if not exists idx_mpc_updated_at on public.movers_provider_config(updated_at desc);

-- 4) View with business_id for lookup by business
drop view if exists public.v_movers_provider_config cascade;
create view public.v_movers_provider_config as
select
  p.id as provider_id,
  p.business_id,
  coalesce(c.policies, '{}'::jsonb) as policies,
  coalesce(c.tiers, '[]'::jsonb) as tiers,
  coalesce(c.heavy_item_tiers, '[]'::jsonb) as heavy_item_tiers,
  coalesce(c.packing, '{}'::jsonb) as packing,
  c.updated_at
from public.movers_providers p
left join public.movers_provider_config c on c.provider_id = p.id;

-- 5) Backfill from legacy tables when consolidated row missing
insert into public.movers_provider_config (provider_id, policies, tiers, heavy_item_tiers, packing, updated_at)
select
  p.id,
  jsonb_build_object(
    'base_zip', coalesce(p.base_zip, null),
    'service_radius_miles', coalesce(p.service_radius_miles, null),
    'min_lead_minutes', coalesce(p.min_lead_minutes, null),
    'stairs', (
      select jsonb_build_object(
        'included', coalesce(sp.included, true),
        'per_flight_cents', coalesce(sp.per_flight_cents, 0)
      ) from public.movers_stairs_policies sp where sp.provider_id = p.id
    )
  ) as policies,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'crew_size', t.crew_size,
      'min_hours', t.min_hours,
      'base_rate_cents', t.base_rate_cents,
      'hourly_rate_cents', t.hourly_rate_cents,
      'per_mile_cents', t.per_mile_cents
    ) order by t.crew_size)
    from public.movers_pricing_tiers t where t.provider_id = p.id
  ), '[]'::jsonb) as tiers,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'min_weight_lbs', h.min_weight_lbs,
      'max_weight_lbs', h.max_weight_lbs,
      'price_cents', h.price_cents
    ) order by h.min_weight_lbs)
    from public.movers_heavy_item_tiers h where h.provider_id = p.id
  ), '[]'::jsonb) as heavy_item_tiers,
  coalesce((
    select jsonb_build_object(
      'enabled', coalesce(pp.packing_enabled, false),
      'per_room_cents', coalesce(pp.per_room_cents, 0),
      'materials_included', coalesce(pp.materials_included, false),
      'materials', coalesce((
        select jsonb_agg(jsonb_build_object('name', m.name, 'price_cents', m.price_cents, 'included', m.included) order by m.name)
        from public.movers_packing_materials m where m.provider_id = p.id
      ), '[]'::jsonb)
    )
    from public.movers_packing_policies pp where pp.provider_id = p.id
  ), '{}'::jsonb) as packing,
  now()
from public.movers_providers p
on conflict (provider_id) do update
  set policies = excluded.policies,
      tiers = excluded.tiers,
      heavy_item_tiers = excluded.heavy_item_tiers,
      packing = excluded.packing,
      updated_at = now();


