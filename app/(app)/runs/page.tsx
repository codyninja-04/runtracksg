import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { addDays, formatDate, todaySG, weekStart } from '@/lib/dates'
import { formatKm } from '@/lib/pace'
import { loadRuns } from '@/lib/server/data'
import type { RunWithRoute } from '@/lib/types'
import { DownloadIcon, PlusIcon } from '@/components/icons'
import { RunCard } from '@/components/runs/RunCard'

export const metadata: Metadata = { title: 'Runs' }

export default async function RunsPage() {
  const { supabase, limits } = await requireUser('/runs')
  const runs = await loadRuns(supabase, limits)
  const today = todaySG()
  const thisWeek = weekStart(today)

  const weeks = new Map<string, RunWithRoute[]>()
  for (const r of runs) {
    const w = weekStart(r.run_date)
    weeks.set(w, [...(weeks.get(w) ?? []), r])
  }

  return (
    <div className="animate-rise-in">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">History</p>
          <h1 className="heading mt-1 text-4xl sm:text-5xl">Your runs</h1>
        </div>
        <div className="flex gap-2">
          {runs.length > 0 && (
            <a href="/api/export" className="btn-ghost">
              <DownloadIcon className="h-4 w-4" />
              CSV
            </a>
          )}
          <Link href="/runs/new" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Log a run
          </Link>
        </div>
      </header>

      {limits.historyDays !== null && (
        <p className="mb-5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Free shows the last {limits.historyDays} days. Older runs are kept and come back with Pro.
        </p>
      )}

      {runs.length === 0 ? (
        <div className="card lane-lines p-10 text-center">
          <p className="heading text-2xl">Nothing logged yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Log your next run straight after you finish. It takes about thirty seconds and the weather fills itself in.</p>
          <Link href="/runs/new" className="btn-primary mt-6">
            <PlusIcon className="h-4 w-4" />
            Log your first run
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(weeks.entries()).map(([week, items]) => {
            const km = items.reduce((s, r) => s + r.distance_km, 0)
            const label = week === thisWeek ? 'This week' : week === addDays(thisWeek, -7) ? 'Last week' : `Week of ${formatDate(week, { year: week.slice(0, 4) !== today.slice(0, 4) })}`
            return (
              <section key={week}>
                <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
                  <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">{label}</h2>
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-ink">{formatKm(km)} km</span> · {items.length} run{items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {items.map((r) => (
                    <RunCard key={r.id} run={r} today={today} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
