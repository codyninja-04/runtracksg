import type { Metadata } from 'next'
import Link from 'next/link'
import { avatarUrl, displayName, requireUser } from '@/lib/auth'
import { enforcePro, FREE_HISTORY_DAYS } from '@/lib/billing'
import { GOAL_LABEL, PREFERRED_TIME_LABEL } from '@/lib/labels'
import { formatPace } from '@/lib/pace'
import { loadProfile } from '@/lib/server/data'
import { CheckIcon, DownloadIcon } from '@/components/icons'
import { DangerZone } from '@/components/settings/DangerZone'

export const metadata: Metadata = { title: 'Settings' }

const FREE = ['Unlimited run logging', 'Weather auto fill on every run', 'The full Singapore route library', `Last ${FREE_HISTORY_DAYS} days of history`]
const PRO = ['Claude training plans built for the heat', 'Pace vs weather insights', 'Unlimited history', 'Everything in Free']

export default async function SettingsPage() {
  const { supabase, user, plan, limits } = await requireUser('/settings')
  const profile = await loadProfile(supabase, user.id)
  const avatar = avatarUrl(user)
  const billingLive = enforcePro()

  return (
    <div className="mx-auto max-w-3xl animate-rise-in space-y-6">
      <header>
        <p className="label">Account</p>
        <h1 className="heading mt-1 text-4xl sm:text-5xl">Settings</h1>
      </header>

      <section className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
        {avatar ? (
          <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-xl font-semibold text-primary-ink">{displayName(user).charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{displayName(user)}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost">Sign out</button>
        </form>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Runner profile</h2>
          <Link href="/plan" className="text-sm font-semibold text-primary-ink hover:underline">
            Edit on plan page
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="label">Goal</dt>
            <dd className="mt-1 font-medium text-ink">{profile?.training_goal ? GOAL_LABEL[profile.training_goal] : 'Not set'}</dd>
          </div>
          <div>
            <dt className="label">5K pace</dt>
            <dd className="mt-1 font-medium text-ink">{profile?.current_5k_pace_seconds ? `${formatPace(profile.current_5k_pace_seconds)}/km` : 'Not set'}</dd>
          </div>
          <div>
            <dt className="label">Days a week</dt>
            <dd className="mt-1 font-medium text-ink">{profile?.days_per_week ?? 3}</dd>
          </div>
          <div>
            <dt className="label">Runs</dt>
            <dd className="mt-1 font-medium text-ink">{PREFERRED_TIME_LABEL[profile?.preferred_time ?? 'morning']}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Plan</h2>
          <span className={`chip ${plan === 'pro' ? 'border-primary/30 bg-primary-wash text-primary-ink' : ''}`}>{plan === 'pro' ? 'Pro' : 'Free'}</span>
        </div>
        {!billingLive && plan === 'free' && <p className="mt-2 text-sm text-muted">Billing is not switched on yet, so every account has the Pro features for now.</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { name: 'Free', price: '$0', items: FREE, current: plan === 'free' },
            { name: 'Pro', price: '$5/month', items: PRO, current: plan === 'pro' },
          ].map((tier) => (
            <div key={tier.name} className={`rounded-2xl border p-4 ${tier.name === 'Pro' ? 'border-primary/40 bg-primary-wash' : 'border-line'}`}>
              <p className="flex items-baseline justify-between">
                <span className="font-display text-xl font-semibold uppercase text-ink">{tier.name}</span>
                <span className="text-sm font-semibold text-ink">{tier.price}</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {tier.items.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {limits.historyDays !== null && <p className="mt-3 text-xs text-faint">Runs older than {limits.historyDays} days are kept safely and reappear when you upgrade.</p>}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold text-ink">Export</h2>
          <p className="mt-1 text-sm text-muted">Every run as a CSV, ready for a spreadsheet.</p>
        </div>
        <a href="/api/export" className="btn-ghost">
          <DownloadIcon className="h-4 w-4" />
          Download CSV
        </a>
      </section>

      <DangerZone />
    </div>
  )
}
