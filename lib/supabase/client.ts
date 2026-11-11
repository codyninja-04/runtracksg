'use client'

import { createBrowserClient } from '@supabase/ssr'

// Browser side client. Only used for Google sign in, everything else goes
// through the API routes.
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
