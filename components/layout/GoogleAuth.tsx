'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from './Logo'

export function GoogleAuth({ mode }: { mode: 'login' | 'signup' }) {
  const params = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(params.get('error') ? "Sign in didn't finish. Give it another go." : null)

  async function signIn() {
    setLoading(true)
    setError(null)
    const raw = params.get('next')
    const next = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const signup = mode === 'signup'

  return (
    <div className="w-full max-w-sm animate-rise-in">
      <Logo />
      <h1 className="heading mt-12 text-[2.8rem] leading-[0.95]">{signup ? 'Start your log' : 'Welcome back'}</h1>
      <p className="mt-4 leading-relaxed text-muted">
        {signup
          ? 'Log runs in under a minute. Weather fills itself in, and over time you will see exactly what the heat costs you.'
          : 'Sign in to log a run, check today’s coolest window and pick up your plan.'}
      </p>

      <button onClick={signIn} disabled={loading} className="btn-ghost mt-8 w-full py-3 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.4 24 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10.1 0 12s.5 3.8 1.3 5.4l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
        </svg>
        {loading ? 'Opening Google…' : signup ? 'Sign up with Google' : 'Continue with Google'}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-hot-ink">
          {error}
        </p>
      )}

      <p className="mt-6 text-sm text-muted">
        {signup ? 'Already logging? ' : 'New here? '}
        <Link href={signup ? '/login' : '/signup'} className="font-semibold text-primary-ink hover:underline">
          {signup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>

      <p className="mt-12 text-xs leading-relaxed text-faint">No GPS tracking and no social feed. Keep using your watch or phone to record, and log the result here. Your runs are private to your account.</p>
    </div>
  )
}
