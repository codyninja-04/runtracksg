import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { limitsFor } from './billing'
import { createClient } from './supabase/server'
import type { Plan } from './types'

async function planFor(supabase: SupabaseClient, userId: string): Promise<Plan> {
  // No billing row means free. Billing writes the row with the service role.
  const { data } = await supabase.from('billing').select('plan').eq('user_id', userId).maybeSingle()
  return data?.plan === 'pro' ? 'pro' : 'free'
}

export async function getViewer() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const plan: Plan = user ? await planFor(supabase, user.id) : 'free'
  return { supabase, user, plan, limits: limitsFor(plan) }
}

export async function requireUser(next = '/dashboard') {
  const viewer = await getViewer()
  if (!viewer.user) redirect(`/login?next=${encodeURIComponent(next)}`)
  return viewer as typeof viewer & { user: User }
}

// Route handler version: a 401 instead of a redirect.
export async function apiUser() {
  const viewer = await getViewer()
  if (!viewer.user) return { ...viewer, user: null, unauthorized: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) }
  return { ...viewer, user: viewer.user, unauthorized: null }
}

export function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
  const name = (meta?.full_name ?? meta?.name)?.trim()
  if (name) return name.split(/\s+/)[0]
  return user.email?.split('@')[0] ?? 'runner'
}

export function avatarUrl(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata as { avatar_url?: string; picture?: string } | undefined
  const url = meta?.avatar_url ?? meta?.picture
  return typeof url === 'string' && url.startsWith('https://') ? url : null
}
