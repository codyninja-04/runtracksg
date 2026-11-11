import { apiUser } from '@/lib/auth'
import { todaySG } from '@/lib/dates'
import { formatPace } from '@/lib/pace'
import { loadRuns } from '@/lib/server/data'

function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Quote anything with a comma, quote or newline, and defuse spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export async function GET() {
  const { supabase, user, limits, unauthorized } = await apiUser()
  if (!user) return unauthorized

  const runs = await loadRuns(supabase, limits)
  const header = ['date', 'time', 'distance_km', 'duration_minutes', 'pace_per_km', 'route', 'run_type', 'temperature_c', 'humidity_percent', 'effort', 'notes']
  const rows = runs.map((r) =>
    [r.run_date, r.run_time?.slice(0, 5), r.distance_km, r.duration_minutes, formatPace(r.avg_pace_seconds_per_km), r.route?.name ?? r.custom_route, r.run_type, r.temperature_c, r.humidity_percent, r.perceived_effort, r.notes]
      .map(cell)
      .join(','),
  )

  return new Response([header.join(','), ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="runtracksg-${todaySG()}.csv"`,
    },
  })
}
