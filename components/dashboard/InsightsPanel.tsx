'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { InsightState } from '@/lib/server/insights'
import { LockIcon, RefreshIcon, SparkIcon } from '../icons'

function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function InsightsPanel({ initial }: { initial: InsightState }) {
  const [state, setState] = useState<InsightState>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/insights', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not refresh.')
      setState(body as InsightState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card relative overflow-hidden p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <SparkIcon className="h-4 w-4 text-primary" />
          Coach&apos;s read
        </h2>
        {(state.status === 'ready' || state.status === 'error') && (
          <button type="button" onClick={refresh} disabled={busy} className="btn-quiet -mr-2 px-2.5 py-1.5 text-xs">
            <RefreshIcon className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Thinking…' : state.status === 'ready' ? 'Refresh' : 'Write it'}
          </button>
        )}
      </div>

      {busy && state.status !== 'ready' && (
        <div className="mt-4 space-y-2.5">
          <div className="skeleton h-5 w-4/5" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      )}

      {state.status === 'ready' && (
        <div className={`mt-4 transition ${busy ? 'opacity-50' : ''}`}>
          <p className="text-lg font-semibold leading-snug text-ink">{state.insights.headline}</p>
          <ul className="mt-3 space-y-2">
            {state.insights.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-primary-wash px-3.5 py-3 text-sm leading-relaxed text-primary-ink">
            <span className="font-semibold">This week: </span>
            {state.insights.suggestion}
          </p>
          <p className="mt-3 text-xs text-faint">
            Written {ago(state.generatedAt)}
            {state.stale ? ' · you have logged runs since, refresh for an updated read' : ''}
          </p>
        </div>
      )}

      {state.status === 'not_enough' && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Log {state.need} more run{state.need === 1 ? '' : 's'} with the weather filled in and Claude will look for patterns in how heat and time of day change your pace.
        </p>
      )}

      {state.status === 'error' && !busy && <p className="mt-3 text-sm text-muted">Ready when you are. Claude will read your log and the weather on each run.</p>}

      {state.status === 'unavailable' && <p className="mt-3 text-sm text-muted">AI insights are not switched on for this server yet. The numbers on this page still work without them.</p>}

      {state.status === 'locked' && (
        <div className="mt-3 text-sm text-muted">
          <p className="flex items-center gap-2">
            <LockIcon className="h-4 w-4" />
            Weather insights are part of Pro.
          </p>
          <Link href="/settings" className="mt-3 inline-block font-semibold text-primary-ink hover:underline">
            See what Pro adds
          </Link>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-hot-ink">
          {error}
        </p>
      )}
    </section>
  )
}
