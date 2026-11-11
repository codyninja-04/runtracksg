'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DangerZone() {
  const router = useRouter()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function wipe() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/account', { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Could not delete your data.')
      setBusy(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <section className="card border-hot/30 p-5 sm:p-6">
      <h2 className="font-semibold text-ink">Delete my data</h2>
      <p className="mt-1 text-sm text-muted">Removes every run, plan and insight on this account. Your Google sign in stays so you can start fresh. This cannot be undone.</p>
      <label htmlFor="confirm-delete" className="field-label mt-4">
        Type <span className="font-mono">delete</span> to confirm
      </label>
      <div className="flex flex-wrap gap-2">
        <input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} className="input max-w-[200px]" autoComplete="off" />
        <button type="button" onClick={wipe} disabled={typed.trim().toLowerCase() !== 'delete' || busy} className="btn-danger">
          {busy ? 'Deleting…' : 'Delete everything'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-hot-ink">
          {error}
        </p>
      )}
    </section>
  )
}
