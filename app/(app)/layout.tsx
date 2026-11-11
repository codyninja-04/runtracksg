import { avatarUrl, displayName, requireUser } from '@/lib/auth'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import type { NavUser } from '@/components/layout/nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, plan } = await requireUser()
  const nav: NavUser = { name: displayName(user), email: user.email ?? null, avatar: avatarUrl(user), plan }

  return (
    <div className="min-h-screen">
      <Header user={nav} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 md:pb-16 lg:px-10 lg:pt-10">{children}</main>
      <BottomNav />
    </div>
  )
}
