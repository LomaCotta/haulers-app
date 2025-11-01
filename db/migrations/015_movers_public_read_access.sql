-- Comprehensive migration to allow public read access for booking
-- Anyone should be able to book a provider, so pricing/config must be publicly readable
-- This migration ensures all movers-related tables allow public SELECT access

-- 1. Allow public read access to movers_providers (needed to resolve businessId to providerId)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_providers' 
    and policyname = 'movers_provider_select_public'
  ) then
    create policy "movers_provider_select_public" on public.movers_providers
      for select
      using (true);  -- Allow anyone to read provider info (needed for booking)
  end if;
end $$;

-- 2. Allow public read access to movers_provider_config (pricing tiers, heavy items, packing)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_provider_config' 
    and policyname = 'mpc_select_public'
  ) then
    create policy "mpc_select_public" on public.movers_provider_config
      for select
      using (true);  -- Allow anyone to read provider config (public pricing info)
  end if;
end $$;

-- 3. Allow public read access to movers_pricing_tiers (fallback if consolidated table empty)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_pricing_tiers' 
    and policyname = 'movers_pricing_tiers_select_public'
  ) then
    create policy "movers_pricing_tiers_select_public" on public.movers_pricing_tiers
      for select
      using (true);  -- Allow anyone to read pricing tiers
  end if;
end $$;

-- 4. Allow public read access to movers_heavy_item_tiers (fallback if consolidated table empty)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_heavy_item_tiers' 
    and policyname = 'movers_heavy_item_tiers_select_public'
  ) then
    create policy "movers_heavy_item_tiers_select_public" on public.movers_heavy_item_tiers
      for select
      using (true);  -- Allow anyone to read heavy item tiers
  end if;
end $$;

-- 5. Allow public read access to movers_packing_policies (fallback if consolidated table empty)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_packing_policies' 
    and policyname = 'movers_packing_policies_select_public'
  ) then
    create policy "movers_packing_policies_select_public" on public.movers_packing_policies
      for select
      using (true);  -- Allow anyone to read packing policies
  end if;
end $$;

-- 6. Allow public read access to movers_packing_materials (fallback if consolidated table empty)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_packing_materials' 
    and policyname = 'movers_packing_materials_select_public'
  ) then
    create policy "movers_packing_materials_select_public" on public.movers_packing_materials
      for select
      using (true);  -- Allow anyone to read packing materials
  end if;
end $$;

-- 7. Allow public read access to movers_stairs_policies (fallback if consolidated table empty)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_stairs_policies' 
    and policyname = 'movers_stairs_policies_select_public'
  ) then
    create policy "movers_stairs_policies_select_public" on public.movers_stairs_policies
      for select
      using (true);  -- Allow anyone to read stairs policies
  end if;
end $$;

-- 8. Allow public read access to businesses (needed to show provider name/info)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'businesses' 
    and policyname = 'businesses_select_public'
  ) then
    create policy "businesses_select_public" on public.businesses
      for select
      using (true);  -- Allow anyone to read business info (needed for booking)
  end if;
end $$;

-- Note: Write access (INSERT, UPDATE, DELETE) remains restricted to owners via existing policies

