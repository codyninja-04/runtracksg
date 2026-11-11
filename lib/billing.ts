import type { Plan } from './types'

// Free keeps logging and the route library. Pro adds the Claude features and
// the full run history.
export const FREE_HISTORY_DAYS = 90
// Hard ceilings for everyone, only there to stop a runaway script.
export const DAILY_RUN_LIMIT = 20
export const DAILY_PLAN_LIMIT = 5

export interface Limits {
  plan: Plan
  aiPlans: boolean
  insights: boolean
  historyDays: number | null
}

// Until billing is live (ENFORCE_PRO unset), everyone gets the full product.
export function enforcePro(env: Record<string, string | undefined> = process.env): boolean {
  return env.ENFORCE_PRO === 'true'
}

export function limitsFor(plan: Plan, enforce = enforcePro()): Limits {
  if (plan === 'pro' || !enforce) return { plan, aiPlans: true, insights: true, historyDays: null }
  return { plan, aiPlans: false, insights: false, historyDays: FREE_HISTORY_DAYS }
}
