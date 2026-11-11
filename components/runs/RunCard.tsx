import Link from 'next/link'
import { formatTime, relativeDay } from '@/lib/dates'
import { BAND_COLOR, heatBand } from '@/lib/heat'
import { RUN_TYPE_LABEL } from '@/lib/labels'
import { formatDuration, formatKm, formatPace } from '@/lib/pace'
import type { RunWithRoute } from '@/lib/types'

export function TempChip({ temp, humidity }: { temp: number | null; humidity?: number | null }) {
  const band = heatBand(temp)
  if (!band || temp == null) return <span className="chip text-faint">No weather</span>
  // Colour carries the band on the dot and tint, the text stays in ink so it
  // is readable for every band.
  const color = BAND_COLOR[band]
  return (
    <span className="chip font-semibold text-ink" style={{ borderColor: `${color}55`, background: `${color}14` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {temp}°C{humidity != null ? ` · ${humidity}%` : ''}
    </span>
  )
}

export function RunCard({ run, today }: { run: RunWithRoute; today: string }) {
  const where = run.route?.name ?? run.custom_route
  return (
    <Link href={`/runs/${run.id}`} className="card group flex items-center gap-4 p-4 transition hover:border-strong hover:shadow-lift sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-faint">
          {relativeDay(run.run_date, today)}
          {run.run_time ? ` · ${formatTime(run.run_time)}` : ''}
          {run.run_type ? ` · ${RUN_TYPE_LABEL[run.run_type]}` : ''}
        </p>
        <p className="mt-0.5 truncate font-semibold text-ink group-hover:text-primary-ink">{where ?? 'Run'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TempChip temp={run.temperature_c} humidity={run.humidity_percent} />
          {run.perceived_effort && <span className="chip">Effort {run.perceived_effort}/10</span>}
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-x-5 text-right sm:grid-cols-3">
        <div>
          <p className="stat text-2xl">{formatKm(run.distance_km, 2)}</p>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">km</p>
        </div>
        <div className="hidden sm:block">
          <p className="stat text-2xl">{formatDuration(run.duration_minutes)}</p>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">time</p>
        </div>
        <div>
          <p className="stat text-2xl">{formatPace(run.avg_pace_seconds_per_km)}</p>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-faint">/km</p>
        </div>
      </div>
    </Link>
  )
}
