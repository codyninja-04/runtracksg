'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusIcon } from '../icons'
import { NAV, isActive, type NavUser } from './nav'
import { Logo } from './Logo'

function Avatar({ user }: { user: NavUser }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-ink">{user.name.charAt(0).toUpperCase()}</span>
  )
}

export function Header({ user }: { user: NavUser }) {
  const path = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Logo href="/dashboard" />

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.filter((n) => n.href !== '/runs/new').map(({ href, label }) => {
            const on = isActive(path, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${on ? 'bg-primary-soft text-primary-ink' : 'text-muted hover:bg-sunk hover:text-ink'}`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/runs/new" className="btn-primary hidden md:inline-flex">
            <PlusIcon className="h-4 w-4" />
            Log a run
          </Link>
          {user.plan === 'pro' && <span className="chip hidden border-primary/30 bg-primary-wash text-primary-ink sm:inline-flex">Pro</span>}
          <Link href="/settings" aria-label="Settings" className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-line">
            <Avatar user={user} />
          </Link>
        </div>
      </div>
    </header>
  )
}
