import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { nowTimeSG, todaySG } from '@/lib/dates'
import { loadRoutes } from '@/lib/server/data'
import { isUuid } from '@/lib/validation'
import { RunLogForm } from '@/components/runs/RunLogForm'

export const metadata: Metadata = { title: 'Log a run' }

export default async function NewRunPage({ searchParams }: { searchParams: { route?: string } }) {
  const { supabase } = await requireUser('/runs/new')
  const routes = await loadRoutes(supabase)
  const defaultRouteId = isUuid(searchParams.route) && routes.some((r) => r.id === searchParams.route) ? searchParams.route : null

  return (
    <div className="animate-rise-in">
      <header className="mb-6">
        <p className="label">Post run</p>
        <h1 className="heading mt-1 text-4xl sm:text-5xl">Log a run</h1>
        <p className="mt-2 text-muted">Copy the numbers off your watch. We&apos;ll pull the weather for when and where you ran.</p>
      </header>
      <RunLogForm
        routes={routes.map(({ id, name, region, distance_km, is_loop }) => ({ id, name, region, distance_km, is_loop }))}
        today={todaySG()}
        nowTime={nowTimeSG()}
        defaultRouteId={defaultRouteId}
      />
    </div>
  )
}
