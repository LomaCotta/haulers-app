// Simple database setup script
// Run this with: node scripts/setup-database.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupDatabase() {
  console.log('Setting up database tables...')
  
  try {
    // Create profiles table
    console.log('Creating profiles table...')
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesError && profilesError.code === 'PGRST205') {
      console.log('Profiles table does not exist, creating it...')
      
      // We'll need to run this SQL in the Supabase dashboard
      console.log(`
        Please run this SQL in your Supabase SQL Editor:
        
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

        -- Enable RLS
        alter table public.profiles enable row level security;

        -- Policies
        create policy "read_profiles" on public.profiles for select using (true);
        create policy "update_own_profile" on public.profiles for update using (auth.uid() = id);
        create policy "insert_profile" on public.profiles for insert with check (auth.uid() = id);
      `)
    } else {
      console.log('Profiles table already exists!')
    }
    
    console.log('Database setup completed!')
  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

setupDatabase()
