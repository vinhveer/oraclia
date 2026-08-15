import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type Db = SupabaseClient

/**
 * A client that acts *as the caller*. Every query it runs is filtered by the
 * same RLS policies the browser gets, so a bug in the runtime cannot leak one
 * user's readings into another's conversation.
 */
/**
 * Bypasses RLS. Reserved for the face-down deck, which no browser role is
 * allowed to read — every call site must verify ownership with `userClient`
 * first and only then touch `readings.shuffled`.
 */
export function serviceClient(): Db {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export function userClient(authorization: string): Db {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
