import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { median } from '@/lib/analysis'
import { formatDate, formatTime, todaySG, weekStart } from '@/lib/dates'
import { BAND_COLOR, coolEquivalentPace, heatAdjustmentPct, heatBand, heatIndexC, heatRisk } from '@/lib/heat'
import { EFFORT_LABEL, RUN_TYPE_LABEL } from '@/lib/labels'
import { formatDuration, formatKm, formatPace } from '@/lib/pace'
import { loadRun, loadRuns } from '@/lib/server/data'
import type { SgRoute } from '@/lib/types'
import { isUuid } from '@/lib/validation'
import { ArrowLeftIcon, CheckIcon, EditIcon, MountainIcon, ThermoIcon } from '@/components/icons'
import { RouteFacts } from '@/components/routes/RouteCard'
import { RouteTrace } from '@/components/routes/RouteTrace'
import { DeleteRunButton } from '@/components/runs/DeleteRunButton'

export const metadata: Metadata = { title: 'Run' }

const RISK_TEXT = { low: 'Low heat stress', moderate: 'Moderate heat stress', high: 'High heat stress', extreme: 'Extreme heat stress' }

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="stat mt-2 text-4xl sm:text-5xl">
        {value}
        {unit && <span className="ml-1 text-lg font-medium text-faint">{unit}</span>}
      </p>
    </div>
  )
}

export default async function RunPage({ params, searchParams }: { params: { id: string }; searchParams: { logged?: string } }) {
  const { supabase, limits } = await requireUser(`/runs/${params.id}`)
  if (!isUuid(params.id)) notFound()
  const run = await loadRun(supabase, params.id)
  if (!run) notFound()

  const today = todaySG()
  const [route, others] = await Promise.all([
    run.route_id ? supabase.from('sg_routes').select('*').eq('id', run.route_id).maybeSingle().then((r) => r.data as SgRoute | null) : Promise.resolve(null),
    loadRuns(supabase, limits, { limit: 300 }),
  ])

  const hasWeather = run.temperature_c != null && run.humidity_percent != null
  const band = heatBand(run.temperature_c)
  const color = band ? BAND_COLOR[band] : '#587361'
  const coolPace = hasWeather ? coolEquivalentPace(run.avg_pace_seconds_per_km, run.temperature_c!, run.humidity_percent!) : null
  const pct = hasWeather ? heatAdjustmentPct(run.temperature_c!, run.humidity_percent!) : null

  // Same kind of run in similar weather, so the comparison is fair.
  const similar = hasWeather
    ? others.filter((o) => o.id !== run.id && o.temperature_c != null && Math.abs(o.temperature_c - run.temperature_c!) <= 1.5 && (o.run_type ?? 'easy') === (run.run_type ?? 'easy'))
    : []
  const similarMedian = similar.length >= 2 ? median(similar.map((o) => o.avg_pace_seconds_per_km)) : null
  const vsSimilar = similarMedian != null ? Math.round(run.avg_pace_seconds_per_km - similarMedian) : null

  const week = weekStart(run.run_date)
  const weekRuns = others.filter((o) => weekStart(o.run_date) === week)
  const weekKm = Math.round(weekRuns.reduce((s, o) => s + o.distance_km, 0) * 10) / 10
  const where = run.route?.name ?? run.custom_route

  return (
    <div className="animate-rise-in">
      <Link href="/runs" className="btn-quiet -ml-3 mb-3">
        <ArrowLeftIcon className="h-4 w-4" />
        All runs
      </Link>

      {searchParams.logged && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-wash px-4 py-3 text-sm text-primary-ink">
          <CheckIcon className="h-5 w-5 shrink-0" />
          <p>
            Logged. That makes <strong>{formatKm(weekKm)} km</strong> across {weekRuns.length} run{weekRuns.length === 1 ? '' : 's'} this week.
          </p>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label">
            {formatDate(run.run_date, { weekday: true, year: true })}
            {run.run_time ? ` · ${formatTime(run.run_time)}` : ''}
            {run.run_type ? ` · ${RUN_TYPE_LABEL[run.run_type]}` : ''}
          </p>
          <h1 className="heading mt-1 text-4xl sm:text-5xl">{where ?? 'Run'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/runs/${run.id}/edit`} className="btn-quiet">
            <EditIcon className="h-4 w-4" />
            Edit
          </Link>
          <DeleteRunButton id={run.id} />
        </div>
      </header>

      <section className="card mt-6 grid grid-cols-2 gap-6 p-6 sm:grid-cols-3 sm:p-8">
        <Stat label="Distance" value={formatKm(run.distance_km, 2)} unit="km" />
        <Stat label="Time" value={formatDuration(run.duration_minutes)} />
        <Stat label="Pace" value={formatPace(run.avg_pace_seconds_per_km)} unit="/km" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line p-5" style={{ background: `${color}0d` }}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface shadow-card" style={{ color }}>
              <ThermoIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-ink">Heat</h2>
              <p className="text-sm text-muted">{hasWeather ? RISK_TEXT[heatRisk(run.temperature_c!, run.humidity_percent!)] : 'No weather logged for this run'}</p>
            </div>
          </div>
          {hasWeather ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:p-6">
              <div>
                <dt className="label">Conditions</dt>
                <dd className="stat mt-1.5 flex items-center gap-2 text-3xl">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                  {run.temperature_c}°C
                </dd>
                <dd className="mt-1 text-sm text-muted">{run.humidity_percent}% humidity</dd>
              </div>
              <div>
                <dt className="label">Feels like</dt>
                <dd className="stat mt-1.5 text-3xl">{Math.round(heatIndexC(run.temperature_c!, run.humidity_percent!))}°C</dd>
                <dd className="mt-1 text-sm text-muted">heat index</dd>
              </div>
              <div>
                <dt className="label">Cool day equivalent</dt>
                <dd className="stat mt-1.5 text-3xl text-cool-ink">{formatPace(coolPace)}/km</dd>
                <dd className="mt-1 text-sm text-muted">heat cost about {Math.round(pct!)}%</dd>
              </div>
              <div>
                <dt className="label">Vs similar runs</dt>
                {vsSimilar !== null ? (
                  <>
                    <dd className={`stat mt-1.5 text-3xl ${vsSimilar <= 0 ? 'text-primary-ink' : 'text-hot-ink'}`}>
                      {vsSimilar === 0 ? 'Even' : `${vsSimilar < 0 ? '−' : '+'}${Math.abs(vsSimilar)}s`}
                    </dd>
                    <dd className="mt-1 text-sm text-muted">
                      vs {similar.length} {run.run_type ? RUN_TYPE_LABEL[run.run_type].toLowerCase() : ''} runs at similar temps
                    </dd>
                  </>
                ) : (
                  <dd className="mt-1.5 text-sm leading-relaxed text-faint">Log a couple more runs like this one to compare.</dd>
                )}
              </div>
            </dl>
          ) : (
            <p className="p-6 text-sm text-muted">
              <Link href={`/runs/${run.id}/edit`} className="font-semibold text-primary-ink hover:underline">
                Add the weather
              </Link>{' '}
              to see the heat adjusted pace and include this run in your heat insights.
            </p>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="label">Route</h2>
          {route ? (
            <div className="mt-3">
              <div className="flex gap-4">
                <div className="min-w-0 flex-1">
                  <Link href="/routes" className="text-lg font-semibold text-ink hover:text-primary-ink">
                    {route.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-3 text-sm text-muted">
                    {formatKm(Number(route.distance_km))} km {route.is_loop ? 'loop' : 'one way'}
                    <span className="flex items-center gap-1">
                      <MountainIcon className="h-4 w-4" />
                      {route.elevation_gain_m} m
                    </span>
                  </p>
                </div>
                <RouteTrace path={route.path} isLoop={route.is_loop} className="h-24 w-32 shrink-0" animate />
              </div>
              <div className="mt-4">
                <RouteFacts route={route} />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">{run.custom_route ?? 'No route saved for this one.'}</p>
          )}

          {(run.perceived_effort || run.notes) && (
            <div className="mt-6 space-y-3 border-t border-line pt-5">
              {run.perceived_effort && (
                <p className="text-sm text-muted">
                  <span className="font-semibold text-ink">Effort {run.perceived_effort}/10</span> · {EFFORT_LABEL[run.perceived_effort]}
                </p>
              )}
              {run.notes && <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{run.notes}</p>}
            </div>
          )}
        </section>
      </div>
      <p className="mt-6 text-xs text-faint">Logged {formatDate(run.created_at.slice(0, 10), { year: run.created_at.slice(0, 4) !== today.slice(0, 4) })}</p>
    </div>
  )
}
