-- Consolidated provider configuration for Movers

create table if not exists movers_provider_config (
  provider_id uuid primary key references movers_providers(id) on delete cascade,
  policies jsonb not null default '{}',
  tiers jsonb not null default '[]',
  heavy_item_tiers jsonb not null default '[]',
  packing jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table movers_provider_config enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'movers_provider_config' AND policyname = 'movers_provider_config_rw'
  ) THEN
    CREATE POLICY "movers_provider_config_rw" ON movers_provider_config
      FOR ALL USING (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()))
      WITH CHECK (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()));
  END IF;
END $$;

-- Backfill from existing tables; idempotent upsert
insert into movers_provider_config (provider_id, policies, tiers, heavy_item_tiers, packing, updated_at)
select
  p.id as provider_id,
  jsonb_build_object(
    'base_zip', coalesce(p.base_zip, null),
    'service_radius_miles', coalesce(p.service_radius_miles, null),
    'min_lead_minutes', coalesce(p.min_lead_minutes, null),
    'stairs', (
      select jsonb_build_object(
        'included', coalesce(sp.included, true),
        'per_flight_cents', coalesce(sp.per_flight_cents, 0)
      ) from movers_stairs_policies sp where sp.provider_id = p.id
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
    from movers_pricing_tiers t where t.provider_id = p.id
  ), '[]'::jsonb) as tiers,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'min_weight_lbs', h.min_weight_lbs,
      'max_weight_lbs', h.max_weight_lbs,
      'price_cents', h.price_cents
    ) order by h.min_weight_lbs)
    from movers_heavy_item_tiers h where h.provider_id = p.id
  ), '[]'::jsonb) as heavy_item_tiers,
  coalesce((
    select jsonb_build_object(
      'enabled', coalesce(pp.packing_enabled, false),
      'per_room_cents', coalesce(pp.per_room_cents, 0),
      'materials_included', coalesce(pp.materials_included, false),
      'materials', coalesce((
        select jsonb_agg(jsonb_build_object('name', m.name, 'price_cents', m.price_cents, 'included', m.included) order by m.name)
        from movers_packing_materials m where m.provider_id = p.id
      ), '[]'::jsonb)
    )
    from movers_packing_policies pp where pp.provider_id = p.id
  ), '{}') as packing,
  now()
from movers_providers p
on conflict (provider_id) do update set
  policies = excluded.policies,
  tiers = excluded.tiers,
  heavy_item_tiers = excluded.heavy_item_tiers,
  packing = excluded.packing,
  updated_at = now();

