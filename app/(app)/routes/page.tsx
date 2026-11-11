import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { loadRoutes, loadRuns } from '@/lib/server/data'
import type { RouteStats } from '@/components/routes/RouteCard'
import { RoutesExplorer } from '@/components/routes/RoutesExplorer'

export const metadata: Metadata = { title: 'Routes' }

export default async function RoutesPage() {
  const { supabase, limits } = await requireUser('/routes')
  const [routes, runs] = await Promise.all([loadRoutes(supabase), loadRuns(supabase, limits)])

  const stats: Record<string, RouteStats> = {}
  for (const r of runs) {
    if (!r.route_id) continue
    const s = (stats[r.route_id] ??= { runs: 0, bestPace: null })
    s.runs += 1
    if (r.distance_km >= 1 && (s.bestPace === null || r.avg_pace_seconds_per_km < s.bestPace)) s.bestPace = r.avg_pace_seconds_per_km
  }

  return (
    <div className="animate-rise-in">
      <header className="mb-6">
        <p className="label">Route library</p>
        <h1 className="heading mt-1 text-4xl sm:text-5xl">Where to run</h1>
        <p className="mt-2 max-w-2xl text-muted">Singapore&apos;s go to loops and connectors, with how much shade and water you can actually count on. Tap a route to see it on the map.</p>
      </header>

      {routes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold text-ink">The route library is empty.</p>
          <p className="mt-1 text-sm text-muted">
            Run <code className="rounded bg-sunk px-1.5 py-0.5 text-xs">supabase/migrations/002_seed_routes.sql</code> to load the Singapore routes.
          </p>
        </div>
      ) : (
        <RoutesExplorer routes={routes} stats={stats} />
      )}
    </div>
  )
}
