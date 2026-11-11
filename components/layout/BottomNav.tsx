'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV, isActive } from './nav'

// Thumb reach navigation for phones. The log button sits in the middle and is
// raised, because logging right after a run is the main thing people do here.
export function BottomNav() {
  const path = usePathname()

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV.map(({ href, label, Icon }) => {
          const on = isActive(path, href)
          if (href === '/runs/new') {
            return (
              <li key={href} className="flex justify-center">
                <Link href={href} aria-label="Log a run" className="-mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-green ring-4 ring-bg transition active:scale-95">
                  <Icon className="h-6 w-6" strokeWidth={2.4} />
                </Link>
              </li>
            )
          }
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? 'page' : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold ${on ? 'text-primary' : 'text-faint'}`}>
                <Icon className="h-[22px] w-[22px]" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
