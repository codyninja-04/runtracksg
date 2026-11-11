'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatDate } from '@/lib/dates'
import { SESSION_LABEL } from '@/lib/labels'
import { formatKm } from '@/lib/pace'
import { planWeekIndex, sessionDate } from '@/lib/plan-schedule'
import type { PlanSession, SessionKind, TrainingPlan } from '@/lib/types'
import { CheckIcon, ClockIcon, DropIcon, PlusIcon, RouteIcon } from '../icons'

// Session kinds use weight, not hue. Red and blue mean heat everywhere else in
// the app, so they stay out of here.
const KIND_STYLE: Record<SessionKind, string> = {
  easy: 'bg-primary-soft text-primary-ink',
  recovery: 'bg-primary-soft text-primary-ink',
  long: 'bg-primary text-white',
  tempo: 'bg-ink text-white',
  intervals: 'bg-ink text-white',
  hills: 'bg-ink text-white',
  race: 'bg-ink text-white ring-2 ring-primary ring-offset-1',
  cross: 'bg-sunk text-muted',
  rest: 'bg-sunk text-muted',
}

function SessionRow({ s, date, done, isToday }: { s: PlanSession; date: string; done: boolean; isToday: boolean }) {
  return (
    <li className={`grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)_auto] ${isToday ? '-mx-3 rounded-xl bg-primary-wash px-3' : ''}`}>
      <div>
        <p className="font-display text-lg font-semibold uppercase leading-none text-ink">{s.day}</p>
        <p className="mt-1 text-xs text-faint">{formatDate(date)}</p>
        {isToday && <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wider text-primary-ink">Today</p>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${KIND_STYLE[s.kind]}`}>{SESSION_LABEL[s.kind]}</span>
          <p className="font-semibold text-ink">{s.title}</p>
          {done && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink">
              <CheckIcon className="h-3.5 w-3.5" />
              Logged
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.details}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
          {s.time_window && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {s.time_window}
            </span>
          )}
          {s.route_suggestion && (
            <span className="inline-flex items-center gap-1">
              <RouteIcon className="h-3.5 w-3.5" />
              {s.route_suggestion}
            </span>
          )}
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-4 pl-[4.0rem] text-sm sm:col-span-1 sm:block sm:pl-0 sm:text-right">
        {s.distance_km != null && (
          <p className="stat text-2xl">
            {formatKm(s.distance_km)}
            <span className="ml-0.5 text-sm font-medium text-faint">km</span>
          </p>
        )}
        {s.target_pace && <p className="text-xs font-medium text-muted sm:mt-1">{s.target_pace}</p>}
      </div>
    </li>
  )
}

export function TrainingPlanView({ plan, today, runDates }: { plan: TrainingPlan; today: string; runDates: string[] }) {
  const current = planWeekIndex(plan, today)
  const weeks = plan.plan.weeks
  const [openWeek, setOpenWeek] = useState(Math.min(Math.max(current, 0), weeks.length - 1))
  const logged = new Set(runDates)
  const finished = current >= weeks.length

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-ink p-6 text-white sm:p-8">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/60">
            {weeks.length} week plan · built {formatDate(plan.created_at.slice(0, 10))}
            {plan.race_date ? ` · race day ${formatDate(plan.race_date, { weekday: true })}` : ''}
          </p>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-white/90">{plan.plan.summary}</p>
        </div>
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
          {plan.plan.heat_strategy.length > 0 && (
            <div>
              <h3 className="label flex items-center gap-1.5">
                <DropIcon className="h-3.5 w-3.5" />
                Heat rules for this block
              </h3>
              <ul className="mt-3 space-y-2">
                {plan.plan.heat_strategy.map((h) => (
                  <li key={h} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.plan.pace_guide.length > 0 && (
            <div>
              <h3 className="label">Your paces, Singapore adjusted</h3>
              <dl className="mt-3 divide-y divide-line">
                {plan.plan.pace_guide.map((g) => (
                  <div key={g.label} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-sm">
                      <span className="font-semibold text-ink">{g.label}</span>
                      {g.note && <span className="block text-xs text-faint">{g.note}</span>}
                    </dt>
                    <dd className="whitespace-nowrap font-display text-lg font-semibold tabular-nums text-ink">{g.pace}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>

      {finished && (
        <p className="rounded-2xl border border-primary/30 bg-primary-wash px-4 py-3 text-sm text-primary-ink">This block is done. Rebuild above and the next one will take your latest runs into account.</p>
      )}

      <div className="space-y-3">
        {weeks.map((w, i) => {
          const isOpen = openWeek === i
          const isCurrent = i === current
          const done = w.sessions.filter((s) => logged.has(sessionDate(plan, i, s.day))).length
          return (
            <section key={w.week} className={`card overflow-hidden ${isCurrent ? 'border-primary/50' : ''}`}>
              <button type="button" onClick={() => setOpenWeek(isOpen ? -1 : i)} aria-expanded={isOpen} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-xl font-semibold ${isCurrent ? 'bg-primary text-white' : 'bg-sunk text-ink'}`}>{w.week}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {w.focus}
                    {isCurrent && <span className="ml-2 align-middle text-[0.68rem] font-bold uppercase tracking-wider text-primary-ink">This week</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {w.sessions.length} runs · {formatKm(w.total_km)} km{i <= current ? ` · ${done} of ${w.sessions.length} logged` : ''}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-faint transition ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isOpen && (
                <div className="border-t border-line px-4 sm:px-5">
                  <ul className="divide-y divide-line">
                    {w.sessions.map((s) => {
                      const date = sessionDate(plan, i, s.day)
                      return <SessionRow key={`${s.day}-${s.title}`} s={s} date={date} done={logged.has(date)} isToday={date === today} />
                    })}
                  </ul>
                  {isCurrent && (
                    <div className="pb-4">
                      <Link href="/runs/new" className="btn-ghost w-full">
                        <PlusIcon className="h-4 w-4" />
                        Log today&apos;s run
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
