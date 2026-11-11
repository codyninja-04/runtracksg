import Link from 'next/link'
import { LogoMark } from '@/components/layout/Logo'

export default function NotFound() {
  return (
    <div className="lane-lines grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="heading mt-6 text-4xl">Wrong turn</h1>
        <p className="mt-2 text-muted">This page is not on any route we know. Happens to everyone at the Southern Ridges.</p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Back to the dashboard
        </Link>
      </div>
    </div>
  )
}
