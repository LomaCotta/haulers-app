-- Movers: Heavy item tiering and packing materials/pricing

-- Heavy item tiers: price by weight band per provider
create table if not exists movers_heavy_item_tiers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  min_weight_lbs int not null,
  max_weight_lbs int not null,
  price_cents int not null default 0,
  active boolean not null default true,
  unique(provider_id, min_weight_lbs, max_weight_lbs)
);

-- Packing configuration: per-room labor add-on and whether materials are included by default
create table if not exists movers_packing_policies (
  provider_id uuid primary key references movers_providers(id) on delete cascade,
  packing_enabled boolean not null default false,
  per_room_cents int not null default 0,
  materials_included boolean not null default false
);

-- Packing materials catalog with price and whether included
create table if not exists movers_packing_materials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references movers_providers(id) on delete cascade,
  name text not null,
  price_cents int not null default 0,
  included boolean not null default false,
  unique(provider_id, name)
);

-- RLS
alter table movers_heavy_item_tiers enable row level security;
alter table movers_packing_policies enable row level security;
alter table movers_packing_materials enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'movers_heavy_item_tiers' AND policyname = 'movers_child_rw_heavy'
  ) THEN
    CREATE POLICY "movers_child_rw_heavy" ON movers_heavy_item_tiers
      FOR ALL USING (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()))
      WITH CHECK (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'movers_packing_policies' AND policyname = 'movers_child_rw_pack_pol'
  ) THEN
    CREATE POLICY "movers_child_rw_pack_pol" ON movers_packing_policies
      FOR ALL USING (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()))
      WITH CHECK (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'movers_packing_materials' AND policyname = 'movers_child_rw_pack_mat'
  ) THEN
    CREATE POLICY "movers_child_rw_pack_mat" ON movers_packing_materials
      FOR ALL USING (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()))
      WITH CHECK (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()));
  END IF;
END $$;

-- Stairs policy: whether included or priced per flight
create table if not exists movers_stairs_policies (
  provider_id uuid primary key references movers_providers(id) on delete cascade,
  included boolean not null default true,
  per_flight_cents int not null default 0
);

alter table movers_stairs_policies enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'movers_stairs_policies' AND policyname = 'movers_child_rw_stairs'
  ) THEN
    CREATE POLICY "movers_child_rw_stairs" ON movers_stairs_policies
      FOR ALL USING (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()))
      WITH CHECK (provider_id IN (SELECT id FROM movers_providers WHERE owner_user_id = auth.uid()));
  END IF;
END $$;

