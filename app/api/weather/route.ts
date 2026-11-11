import { NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { todaySG } from '@/lib/dates'
import { heatAdjustmentPct, heatIndexC } from '@/lib/heat'
import { fail } from '@/lib/server/http'
import { isUuid } from '@/lib/validation'
import { conditionsAt } from '@/lib/weather'

// Weather for a logged run: ?date=YYYY-MM-DD&time=HH:MM&route_id=uuid
// The route's first waypoint is used as the location, so a MacRitchie run gets
// MacRitchie weather rather than a city average.
export async function GET(request: Request) {
  const { supabase, user, unauthorized } = await apiUser()
  if (!user) return unauthorized

  const params = new URL(request.url).searchParams
  const date = params.get('date') ?? todaySG()
  const time = params.get('time')
  const routeId = params.get('route_id')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todaySG()) return fail('Pick a date up to today.')
  if (time && !/^\d{2}:\d{2}$/.test(time)) return fail('Time should look like 06:30.')

  let coords: [number, number] | null = null
  if (routeId && isUuid(routeId)) {
    const { data } = await supabase.from('sg_routes').select('path').eq('id', routeId).maybeSingle()
    const first = Array.isArray(data?.path) ? data.path[0] : null
    if (Array.isArray(first) && first.length === 2) coords = [Number(first[0]), Number(first[1])]
  }

  const conditions = await conditionsAt(date, time, coords)
  if (!conditions) return fail("Couldn't reach the weather service. Enter it by hand.", 502)

  return NextResponse.json({
    conditions,
    heat_index_c: heatIndexC(conditions.temperature_c, conditions.humidity_percent),
    adjustment_pct: heatAdjustmentPct(conditions.temperature_c, conditions.humidity_percent),
  })
}
