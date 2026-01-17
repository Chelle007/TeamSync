import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with the service role key.
 * This bypasses Row Level Security (RLS) and should only be used
 * for server-side operations like webhooks that don't have a user session.
 * 
 * IMPORTANT: Never expose this client to the browser!
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

