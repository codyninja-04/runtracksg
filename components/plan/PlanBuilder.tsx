'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GOAL_LABEL, PREFERRED_TIME_LABEL } from '@/lib/labels'
import { formatPace, parsePace } from '@/lib/pace'
import { PREFERRED_TIMES, TRAINING_GOALS, type PreferredTime, type TrainingGoal, type UserProfile } from '@/lib/types'
import { SparkIcon } from '../icons'

const STEPS = ['Reading your recent runs', 'Working out your paces for the heat', 'Laying out the weeks', 'Picking routes and time slots']

export function PlanBuilder({ profile, today, hasPlan, canGenerate }: { profile: UserProfile | null; today: string; hasPlan: boolean; canGenerate: boolean }) {
  const router = useRouter()
  const [goal, setGoal] = useState<TrainingGoal>(profile?.training_goal ?? '10k')
  const [raceDate, setRaceDate] = useState(profile?.goal_race_date ?? '')
  const [pace, setPace] = useState(profile?.current_5k_pace_seconds ? formatPace(profile.current_5k_pace_seconds) : '')
  const [days, setDays] = useState(profile?.days_per_week ?? 3)
  const [time, setTime] = useState<PreferredTime>(profile?.preferred_time ?? 'morning')
  const [busy, setBusy] = useState<'save' | 'build' | null>(null)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(!hasPlan)

  useEffect(() => {
    if (busy !== 'build') return
    setStep(0)
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4500)
    return () => clearInterval(t)
  }, [busy])

  async function save(build: boolean) {
    setError(null)
    const paceSeconds = pace.trim() ? parsePace(pace) : null
    if (pace.trim() && paceSeconds === null) return setError('Write your 5K pace like 5:30.')

    setBusy(build ? 'build' : 'save')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training_goal: goal, goal_race_date: raceDate || null, current_5k_pace_seconds: paceSeconds, days_per_week: days, preferred_time: time }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not save.')

      if (build) {
        const gen = await fetch('/api/plan/generate', { method: 'POST' })
        const genBody = await gen.json().catch(() => ({}))
        if (!gen.ok) throw new Error(genBody.error || 'Could not build the plan.')
        setOpen(false)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <p className="text-sm text-muted">
          Aiming for <span className="font-semibold text-ink">{GOAL_LABEL[goal]}</span>
          {raceDate ? ` on ${raceDate}` : ''} · {days} days a week · {time === 'evening' ? 'evenings' : time === 'morning' ? 'mornings' : 'coolest slot'}
        </p>
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost py-2">
          Change goal or rebuild
        </button>
      </div>
    )
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold text-ink">{hasPlan ? 'Rebuild your plan' : 'Tell us what you are training for'}</h2>
      <p className="mt-1 text-sm text-muted">The plan is built around Singapore weather: hard sessions in the cool slots, extra recovery, and paces that already account for the humidity.</p>

      <div className="mt-5">
        <span className="field-label">Goal</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Training goal">
          {TRAINING_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={goal === g}
              onClick={() => setGoal(g)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${goal === g ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:border-strong hover:text-ink'}`}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="race-date" className="field-label">
            Race date <span className="font-normal text-faint">(optional)</span>
          </label>
          <input id="race-date" type="date" min={today} value={raceDate} onChange={(e) => setRaceDate(e.target.value)} className="input" />
          <p className="hint">Without one you get a repeatable 4 week block.</p>
        </div>
        <div>
          <label htmlFor="pace" className="field-label">
            Current 5K pace
          </label>
          <div className="relative">
            <input id="pace" inputMode="numeric" value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:45" className="input pr-12" />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">/km</span>
          </div>
          <p className="hint">Your recent best effort, even in the heat.</p>
        </div>
        <div>
          <label htmlFor="days" className="field-label">
            Days a week
          </label>
          <div className="flex items-center gap-3">
            <input id="days" type="range" min={2} max={7} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-primary" />
            <span className="stat w-6 text-2xl">{days}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <span className="field-label">When you usually run</span>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Preferred time">
          {PREFERRED_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={time === t}
              onClick={() => setTime(t)}
              className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${time === t ? 'border-primary bg-primary-wash font-semibold text-primary-ink' : 'border-line bg-surface text-muted hover:border-strong'}`}
            >
              {PREFERRED_TIME_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-hot-soft px-3 py-2 text-sm text-hot-ink">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => save(true)} disabled={!!busy || !canGenerate} className="btn-primary px-5 py-3">
          <SparkIcon className="h-4 w-4" />
          {busy === 'build' ? 'Building…' : hasPlan ? 'Build a new plan' : 'Build my plan'}
        </button>
        <button type="button" onClick={() => save(false)} disabled={!!busy} className="btn-ghost py-3">
          {busy === 'save' ? 'Saving…' : 'Just save the goal'}
        </button>
        {hasPlan && !busy && (
          <button type="button" onClick={() => setOpen(false)} className="btn-quiet">
            Cancel
          </button>
        )}
      </div>

      {busy === 'build' && (
        <ol className="mt-5 space-y-1.5 text-sm" aria-live="polite">
          {STEPS.map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${i < step ? 'text-primary-ink' : i === step ? 'font-medium text-ink' : 'text-faint'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-line'} ${i === step ? 'animate-pulse' : ''}`} />
              {s}
            </li>
          ))}
          <li className="pt-1 text-xs text-faint">Usually takes 20 to 40 seconds.</li>
        </ol>
      )}
    </section>
  )
}
