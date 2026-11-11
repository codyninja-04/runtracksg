import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { claudeAvailable } from '@/lib/claude/client'
import { addDays, todaySG } from '@/lib/dates'
import { loadActivePlan, loadProfile, loadRuns } from '@/lib/server/data'
import { LockIcon } from '@/components/icons'
import { PlanBuilder } from '@/components/plan/PlanBuilder'
import { TrainingPlanView } from '@/components/plan/TrainingPlanView'

export const metadata: Metadata = { title: 'Training plan' }

export default async function PlanPage() {
  const { supabase, user, limits } = await requireUser('/plan')
  const today = todaySG()

  if (!limits.aiPlans) {
    return (
      <div className="animate-rise-in">
        <h1 className="heading text-4xl sm:text-5xl">Training plan</h1>
        <section className="card mt-6 max-w-xl p-6">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <LockIcon className="h-4 w-4" />
            Plans are part of Pro
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">Pro builds a week by week plan around your goal and the Singapore weather, with sessions placed in the cool slots and paces that already account for the humidity.</p>
          <Link href="/settings" className="btn-primary mt-5">
            See Pro
          </Link>
        </section>
      </div>
    )
  }

  const [profile, plan, runs] = await Promise.all([loadProfile(supabase, user.id), loadActivePlan(supabase), loadRuns(supabase, limits, { since: addDays(today, -120) })])
  const ai = claudeAvailable()

  return (
    <div className="animate-rise-in space-y-6">
      <header>
        <p className="label">Training</p>
        <h1 className="heading mt-1 text-4xl sm:text-5xl">Your plan</h1>
      </header>

      {!ai && <p className="rounded-xl border border-warm/40 bg-warm-soft px-4 py-3 text-sm text-warm-ink">Plan generation needs an Anthropic API key on the server. You can still save your goal.</p>}

      <PlanBuilder profile={profile} today={today} hasPlan={!!plan} canGenerate={ai} />

      {plan ? (
        <TrainingPlanView plan={plan} today={today} runDates={runs.map((r) => r.run_date)} />
      ) : (
        <section className="card lane-lines p-8 text-center">
          <p className="heading text-2xl">No plan yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Set your goal above. The more runs you have logged, the better Claude can judge where to start you.</p>
        </section>
      )}
    </div>
  )
}
