'use client'

import { useEffect } from 'react'

// Registers the service worker in production only. In dev it would cache
// stale bundles and make hot reload confusing.
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
