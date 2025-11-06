import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service role key
 * This bypasses RLS and should only be used server-side for admin operations
 * or public operations that are validated server-side
 */
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

