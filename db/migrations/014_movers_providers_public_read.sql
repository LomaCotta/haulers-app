-- Allow public read access to movers_providers for booking
-- Users need to be able to read provider info (id, business_id) to make bookings
-- but only the owner can write/update

do $$ begin
  -- Add a SELECT policy that allows anyone to read provider info
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

