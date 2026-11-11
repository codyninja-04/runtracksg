'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TrashIcon } from '../icons'

export function DeleteRunButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/runs/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Could not delete it. Try again.')
      setBusy(false)
      return
    }
    router.push('/runs')
    router.refresh()
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn-quiet text-hot-ink hover:bg-hot-soft hover:text-hot-ink">
        <TrashIcon className="h-4 w-4" />
        Delete
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Confirm delete">
      <span className="text-sm text-muted">Delete this run?</span>
      <button type="button" onClick={remove} disabled={busy} className="btn-danger py-2">
        {busy ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="btn-quiet py-2">
        Keep
      </button>
      {error && <span className="text-sm text-hot-ink">{error}</span>}
    </div>
  )
}
