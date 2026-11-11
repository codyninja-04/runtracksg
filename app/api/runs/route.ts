import { NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { DAILY_RUN_LIMIT } from '@/lib/billing'
import { todaySG } from '@/lib/dates'
import { fail, readJson } from '@/lib/server/http'
import { loadRuns } from '@/lib/server/data'
import { parseRunInput } from '@/lib/validation'

export async function GET(request: Request) {
  const { supabase, user, limits, unauthorized } = await apiUser()
  if (!user) return unauthorized
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 200, 1000)
  const runs = await loadRuns(supabase, limits, { limit })
  return NextResponse.json({ runs })
}

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await apiUser()
  if (!user) return unauthorized

  const parsed = parseRunInput(await readJson(request), todaySG())
  if (!parsed.ok) return fail(parsed.error)

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await supabase.from('run_logs').select('id', { count: 'exact', head: true }).gte('created_at', since)
  if ((count ?? 0) >= DAILY_RUN_LIMIT) return fail('That is a lot of runs for one day. Try again tomorrow.', 429)

  const { data, error } = await supabase
    .from('run_logs')
    .insert({ ...parsed.value, user_id: user.id })
    .select('id')
    .single()
  if (error) return fail(error.code === '23503' ? 'That route no longer exists.' : 'Could not save the run.', 500)

  return NextResponse.json({ id: data.id }, { status: 201 })
}
