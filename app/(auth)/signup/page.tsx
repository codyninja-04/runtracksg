import type { Metadata } from 'next'
import { AuthShell } from '@/components/layout/AuthShell'

export const metadata: Metadata = { title: 'Create an account' }

export default function SignupPage() {
  return <AuthShell mode="signup" />
}
