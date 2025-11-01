-- Allow public read access to provider config for booking
-- Provider config (pricing, tiers, etc.) should be publicly readable
-- but only the owner can write/update it

do $$ begin
  -- Add a SELECT policy that allows anyone to read provider config
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'movers_provider_config' 
    and policyname = 'mpc_select_public'
  ) then
    create policy "mpc_select_public" on public.movers_provider_config
      for select
      using (true);  -- Allow anyone to read provider config (it's public pricing info)
  end if;
end $$;

