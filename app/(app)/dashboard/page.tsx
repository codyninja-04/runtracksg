import type { Metadata } from 'next'
import Link from 'next/link'
import { displayName, requireUser } from '@/lib/auth'
import { heatImpact, linearRegression, paceByTemperature, summarise, weeklyTotals } from '@/lib/analysis'
import { formatDate, hourSG, relativeDay, todaySG } from '@/lib/dates'
import { SESSION_LABEL } from '@/lib/labels'
import { formatKm, formatPace } from '@/lib/pace'
import { nextSession } from '@/lib/plan-schedule'
import { loadActivePlan, loadProfile, loadRuns } from '@/lib/server/data'
import { readInsights, type InsightState } from '@/lib/server/insights'
import { todayOutlook } from '@/lib/weather'
import { ArrowRightIcon, PlusIcon, RouteIcon } from '@/components/icons'
import { InsightsPanel } from '@/components/dashboard/InsightsPanel'
import { PaceTrendChart, type TrendPoint } from '@/components/dashboard/PaceTrendChart'
import { TodayWindow } from '@/components/dashboard/TodayWindow'
import { WeatherCorrelation, type ScatterPoint } from '@/components/dashboard/WeatherCorrelation'
import { RunCard } from '@/components/runs/RunCard'

export const metadata: Metadata = { title: 'Dashboard' }

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: React.ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="label">{label}</p>
      <p className="stat mt-2 text-4xl">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-faint">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function greeting(hour: number) {
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

export default async function DashboardPage() {
  const { supabase, user, limits } = await requireUser('/dashboard')
  const today = todaySG()
  const hour = hourSG()

  const [runs, profile, plan, outlook] = await Promise.all([
    loadRuns(supabase, limits, { limit: 300 }),
    loadProfile(supabase, user.id),
    loadActivePlan(supabase),
    todayOutlook().catch(() => ({ now: null, hours: [], best: null })),
  ])

  const summary = summarise(runs, today)
  const weeks = weeklyTotals(runs, today, 8)
  const impact = heatImpact(runs)
  const buckets = paceByTemperature(runs)
  const coolPace = profile?.current_5k_pace_seconds ? Math.round(profile.current_5k_pace_seconds * 1.3) : summary.avgPace30d

  const trend: TrendPoint[] = runs
    .slice(0, 40)
    .reverse()
    .map((r) => ({ id: r.id, date: r.run_date, pace: r.avg_pace_seconds_per_km, km: r.distance_km, temp: r.temperature_c, humidity: r.humidity_percent, where: r.route?.name ?? r.custom_route }))

  const steady = runs.filter((r) => r.temperature_c != null && (r.run_type === null || ['easy', 'long', 'recovery'].includes(r.run_type)))
  const scatter: ScatterPoint[] = steady.map((r) => ({ temp: r.temperature_c as number, pace: r.avg_pace_seconds_per_km, date: r.run_date, km: r.distance_km }))
  const fit = steady.length >= 6 ? linearRegression(scatter.map((p) => p.temp), scatter.map((p) => p.pace)) : null

  const insightState: InsightState = limits.insights ? await readInsights(profile, runs.length) : { status: 'locked' }
  const next = plan ? nextSession(plan, today) : null
  const maxWeek = Math.max(...weeks.map((w) => w.km), 1)
  const weekDelta = Math.round((summary.thisWeekKm - summary.lastWeekKm) * 10) / 10

  return (
    <div className="animate-rise-in space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{formatDate(today, { weekday: true })}</p>
          <h1 className="heading mt-1 text-4xl sm:text-5xl">
            {greeting(hour)}, {displayName(user)}
          </h1>
        </div>
        <Link href="/runs/new" className="btn-primary hidden sm:inline-flex">
          <PlusIcon className="h-4 w-4" />
          Log a run
        </Link>
      </header>

      <TodayWindow outlook={outlook} currentHour={hour} coolPace={coolPace} />

      {runs.length === 0 ? (
        <section className="card lane-lines overflow-hidden p-6 sm:p-10">
          <p className="label">Getting started</p>
          <h2 className="heading mt-2 text-3xl sm:text-4xl">Your log starts with one run</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ['Run like normal', 'Keep using your watch or phone to record it. No GPS here.'],
              ['Log it after', 'Distance, time and how it felt. The weather fills itself in.'],
              ['Watch the pattern', 'After a few runs you will see exactly what the heat costs you.'],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-line bg-surface/80 p-4">
                <span className="font-display text-3xl font-semibold text-primary">{i + 1}</span>
                <p className="mt-1 font-semibold text-ink">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/runs/new" className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Log a run
            </Link>
            <Link href="/routes" className="btn-ghost">
              <RouteIcon className="h-4 w-4" />
              Browse routes
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="This week"
              value={formatKm(summary.thisWeekKm)}
              unit="km"
              sub={summary.lastWeekKm > 0 ? `${weekDelta >= 0 ? '+' : '−'}${formatKm(Math.abs(weekDelta))} km vs last week` : `${summary.thisWeekRuns} run${summary.thisWeekRuns === 1 ? '' : 's'} so far`}
            />
            <Tile label="Runs this week" value={String(summary.thisWeekRuns)} sub={profile ? `target ${profile.days_per_week} a week` : undefined} />
            <Tile label="30 day pace" value={formatPace(summary.avgPace30d)} unit="/km" sub="all runs, time weighted" />
            <Tile label="Longest run" value={formatKm(summary.longestKm)} unit="km" sub={`${formatKm(summary.totalKm)} km logged in total`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section className="card p-5 sm:p-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-semibold text-ink">Pace trend</h2>
                <span className="text-xs text-faint">last {trend.length} runs · dot colour is temperature</span>
              </div>
              <PaceTrendChart points={trend} />
            </section>

            <div className="space-y-6">
              <InsightsPanel initial={insightState} />

              {next && (
                <Link href="/plan" className="card group block p-5 transition hover:border-strong hover:shadow-lift">
                  <p className="label">Next on your plan · week {next.week}</p>
                  <p className="mt-2 text-lg font-semibold text-ink group-hover:text-primary-ink">{next.session.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {relativeDay(next.date, today) === 'Today' ? 'Today' : formatDate(next.date, { weekday: true })} · {SESSION_LABEL[next.session.kind]}
                    {next.session.time_window ? ` · ${next.session.time_window}` : ''}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-ink">
                    Open plan <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )}
            </div>
          </div>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 font-semibold text-ink">What the heat costs you</h2>
            <WeatherCorrelation impact={impact} buckets={buckets} points={scatter} fit={fit} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <section className="card p-5 sm:p-6">
              <h2 className="font-semibold text-ink">Weekly distance</h2>
              <ol className="mt-5 flex h-40 items-end gap-2" aria-label="Kilometres per week, last 8 weeks">
                {weeks.map((w, i) => {
                  const current = i === weeks.length - 1
                  return (
                    <li key={w.week} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`Week of ${formatDate(w.week)}: ${formatKm(w.km)} km, ${w.runs} runs`}>
                      <span className={`text-[0.68rem] font-semibold tabular-nums ${current ? 'text-ink' : 'text-faint opacity-0 group-hover:opacity-100'}`}>{formatKm(w.km)}</span>
                      <span
                        className={`w-full max-w-9 rounded-t-[4px] ${current ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/50'}`}
                        style={{ height: `${Math.max((w.km / maxWeek) * 100, w.km > 0 ? 4 : 1.5)}%` }}
                      />
                      <span className="text-[0.62rem] text-faint">{formatDate(w.week).split(' ')[0]}</span>
                    </li>
                  )
                })}
              </ol>
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold text-ink">Recent runs</h2>
                <Link href="/runs" className="text-sm font-semibold text-primary-ink hover:underline">
                  See all
                </Link>
              </div>
              <div className="space-y-2.5">
                {runs.slice(0, 4).map((r) => (
                  <RunCard key={r.id} run={r} today={today} />
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
