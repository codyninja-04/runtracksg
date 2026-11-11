import { NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { todaySG } from '@/lib/dates'
import { fail, readJson } from '@/lib/server/http'
import { parseProfileInput } from '@/lib/validation'

export async function PUT(request: Request) {
  const { supabase, user, unauthorized } = await apiUser()
  if (!user) return unauthorized

  const parsed = parseProfileInput(await readJson(request), todaySG())
  if (!parsed.ok) return fail(parsed.error)

  const { error } = await supabase.from('user_profiles').upsert({ user_id: user.id, ...parsed.value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return fail('Could not save your profile.', 500)
  return NextResponse.json({ ok: true })
}
