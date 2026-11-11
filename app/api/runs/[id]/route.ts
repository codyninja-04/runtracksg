import { NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { todaySG } from '@/lib/dates'
import { loadRun } from '@/lib/server/data'
import { fail, readJson } from '@/lib/server/http'
import { isUuid, parseRunInput } from '@/lib/validation'

type Ctx = { params: { id: string } }

export async function GET(_request: Request, { params }: Ctx) {
  const { supabase, user, unauthorized } = await apiUser()
  if (!user) return unauthorized
  if (!isUuid(params.id)) return fail('Run not found.', 404)
  const run = await loadRun(supabase, params.id)
  return run ? NextResponse.json({ run }) : fail('Run not found.', 404)
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { supabase, user, unauthorized } = await apiUser()
  if (!user) return unauthorized
  if (!isUuid(params.id)) return fail('Run not found.', 404)

  const parsed = parseRunInput(await readJson(request), todaySG())
  if (!parsed.ok) return fail(parsed.error)

  const { data, error } = await supabase.from('run_logs').update(parsed.value).eq('id', params.id).select('id').maybeSingle()
  if (error) return fail('Could not update the run.', 500)
  if (!data) return fail('Run not found.', 404)
  return NextResponse.json({ id: data.id })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { supabase, user, unauthorized } = await apiUser()
  if (!user) return unauthorized
  if (!isUuid(params.id)) return fail('Run not found.', 404)

  const { error } = await supabase.from('run_logs').delete().eq('id', params.id)
  if (error) return fail('Could not delete the run.', 500)
  return NextResponse.json({ ok: true })
}
