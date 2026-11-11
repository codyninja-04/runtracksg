import { NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { loadRuns } from '@/lib/server/data'
import { fail } from '@/lib/server/http'
import { refreshInsights } from '@/lib/server/insights'

export const maxDuration = 60

// POST regenerates the Claude read on pace vs weather from the runner's log.
export async function POST() {
  const { supabase, user, limits, unauthorized } = await apiUser()
  if (!user) return unauthorized
  if (!limits.insights) return fail('Weather insights are part of Pro.', 402)

  try {
    const runs = await loadRuns(supabase, limits, { limit: 300 })
    const state = await refreshInsights(supabase, user.id, runs)
    return NextResponse.json(state)
  } catch (err) {
    console.error('insights failed', err)
    return fail('Claude could not write the insights just now. Try again in a minute.', 502)
  }
}
