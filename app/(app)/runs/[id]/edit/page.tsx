import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { nowTimeSG, todaySG } from '@/lib/dates'
import { loadRoutes, loadRun } from '@/lib/server/data'
import { isUuid } from '@/lib/validation'
import { ArrowLeftIcon } from '@/components/icons'
import { RunLogForm } from '@/components/runs/RunLogForm'

export const metadata: Metadata = { title: 'Edit run' }

export default async function EditRunPage({ params }: { params: { id: string } }) {
  const { supabase } = await requireUser(`/runs/${params.id}/edit`)
  if (!isUuid(params.id)) notFound()
  const [run, routes] = await Promise.all([loadRun(supabase, params.id), loadRoutes(supabase)])
  if (!run) notFound()

  return (
    <div className="animate-rise-in">
      <Link href={`/runs/${run.id}`} className="btn-quiet -ml-3 mb-3">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to run
      </Link>
      <h1 className="heading mb-6 text-4xl">Edit run</h1>
      <RunLogForm
        routes={routes.map(({ id, name, region, distance_km, is_loop }) => ({ id, name, region, distance_km, is_loop }))}
        today={todaySG()}
        nowTime={nowTimeSG()}
        initial={run}
      />
    </div>
  )
}
