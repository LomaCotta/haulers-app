-- Deduplicate movers_providers by business_id, reassigning children, then add unique index

begin;

-- Build mapping once into a temp table to reuse across statements
create temporary table if not exists _movers_provider_mapping as
with ranked as (
  select id, business_id, created_at,
         row_number() over (partition by business_id order by created_at desc, id desc) as rn
  from movers_providers
)
select d.id as dup_id, k.id as keep_id
from ranked d
join ranked k on d.business_id = k.business_id and k.rn = 1
where d.rn > 1;
-- Prevent unique collisions by removing destination duplicates before reassignment
-- Move tiers via insert-on-conflict, then remove from dup
insert into movers_pricing_tiers (provider_id, crew_size, min_hours, base_rate_cents, hourly_rate_cents, per_mile_cents, between_locations_per_mile_cents, travel_policy, active)
select m.keep_id,
       t.crew_size, t.min_hours, t.base_rate_cents, t.hourly_rate_cents, t.per_mile_cents, t.between_locations_per_mile_cents, t.travel_policy, t.active
from movers_pricing_tiers t
join _movers_provider_mapping m on t.provider_id = m.dup_id
on conflict on constraint movers_pricing_tiers_provider_id_crew_size_key do nothing;
delete from movers_pricing_tiers t using _movers_provider_mapping m where t.provider_id = m.dup_id;
update movers_heavy_item_tiers t set provider_id = m.keep_id from _movers_provider_mapping m where t.provider_id = m.dup_id;
update movers_equipment t set provider_id = m.keep_id from _movers_provider_mapping m where t.provider_id = m.dup_id;
update movers_specialty_services t set provider_id = m.keep_id from _movers_provider_mapping m where t.provider_id = m.dup_id;
update movers_availability_rules t set provider_id = m.keep_id from _movers_provider_mapping m where t.provider_id = m.dup_id;
update movers_availability_overrides t set provider_id = m.keep_id from _movers_provider_mapping m where t.provider_id = m.dup_id;
update movers_quotes t set provider_id = m.keep_id from _movers_provider_mapping m where t.provider_id = m.dup_id;
update movers_jobs t set provider_id = m.keep_id from _movers_provider_mapping m where t.provider_id = m.dup_id;
insert into movers_packing_policies (provider_id, packing_enabled, per_room_cents, materials_included)
select m.keep_id, t.packing_enabled, t.per_room_cents, t.materials_included
from movers_packing_policies t
join _movers_provider_mapping m on t.provider_id = m.dup_id
on conflict (provider_id) do nothing;
delete from movers_packing_policies t using _movers_provider_mapping m where t.provider_id = m.dup_id;

insert into movers_packing_materials (provider_id, name, price_cents, included)
select m.keep_id, t.name, t.price_cents, t.included
from movers_packing_materials t
join _movers_provider_mapping m on t.provider_id = m.dup_id
on conflict on constraint movers_packing_materials_provider_id_name_key do nothing;
delete from movers_packing_materials t using _movers_provider_mapping m where t.provider_id = m.dup_id;

-- Stairs policy: PK on provider_id
insert into movers_stairs_policies (provider_id, included, per_flight_cents)
select m.keep_id, t.included, t.per_flight_cents
from movers_stairs_policies t
join _movers_provider_mapping m on t.provider_id = m.dup_id
on conflict (provider_id) do nothing;
delete from movers_stairs_policies t using _movers_provider_mapping m where t.provider_id = m.dup_id;

insert into movers_provider_config (provider_id, policies, tiers, heavy_item_tiers, packing, updated_at)
select m.keep_id, t.policies, t.tiers, t.heavy_item_tiers, t.packing, coalesce(t.updated_at, now())
from movers_provider_config t
join _movers_provider_mapping m on t.provider_id = m.dup_id
on conflict (provider_id) do nothing;
delete from movers_provider_config t using _movers_provider_mapping m where t.provider_id = m.dup_id;

-- Delete duplicate provider rows
delete from movers_providers p using _movers_provider_mapping m where p.id = m.dup_id;

drop table if exists _movers_provider_mapping;

commit;

-- Now enforce uniqueness
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_movers_providers_business'
  ) THEN
    CREATE UNIQUE INDEX uniq_movers_providers_business ON movers_providers(business_id);
  END IF;
END $$;


