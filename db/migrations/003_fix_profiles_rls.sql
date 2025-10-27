-- Fix RLS policies for profiles table
-- Add INSERT policy for profiles (users can create their own profile)
create policy "insert_own_profile" on public.profiles for insert with check (auth.uid() = id);
