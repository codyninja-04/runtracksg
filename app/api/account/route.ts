import { NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { fail } from '@/lib/server/http'

// Wipes the runner's data: runs, plans and profile. The Google sign in itself
// stays, so they can start fresh without re-registering.
export async function DELETE() {
  const { supabase, user, unauthorized } = await apiUser()
  if (!user) return unauthorized

  const results = await Promise.all([
    supabase.from('run_logs').delete().eq('user_id', user.id),
    supabase.from('training_plans').delete().eq('user_id', user.id),
    supabase.from('user_profiles').delete().eq('user_id', user.id),
  ])
  if (results.some((r) => r.error)) return fail('Some data could not be deleted. Try again.', 500)
  return NextResponse.json({ ok: true })
}
