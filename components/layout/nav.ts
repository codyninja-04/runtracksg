import { CalendarIcon, ListIcon, PlusIcon, PulseIcon, RouteIcon } from '../icons'

export interface NavUser {
  name: string
  email: string | null
  avatar: string | null
  plan: 'free' | 'pro'
}

export const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: PulseIcon },
  { href: '/runs', label: 'Runs', Icon: ListIcon },
  { href: '/runs/new', label: 'Log', Icon: PlusIcon },
  { href: '/routes', label: 'Routes', Icon: RouteIcon },
  { href: '/plan', label: 'Plan', Icon: CalendarIcon },
]

export function isActive(path: string, href: string): boolean {
  if (href === '/runs') return path === '/runs' || (path.startsWith('/runs/') && !path.startsWith('/runs/new'))
  return path === href || path.startsWith(`${href}/`)
}
