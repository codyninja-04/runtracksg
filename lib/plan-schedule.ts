import { addDays, daysBetween, todaySG, weekStart } from './dates'
import type { PlanSession, TrainingPlan } from './types'

const DAY_INDEX: Record<PlanSession['day'], number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

// Created_at is a UTC timestamp, so convert it to the Singapore calendar day.
function createdDay(plan: Pick<TrainingPlan, 'created_at'>): string {
  return todaySG(new Date(plan.created_at))
}

// Week 1 of a plan is the calendar week (Mon to Sun) it was created in.
export function planWeekIndex(plan: Pick<TrainingPlan, 'created_at'>, today: string): number {
  return Math.floor(daysBetween(weekStart(createdDay(plan)), weekStart(today)) / 7)
}

export function sessionDate(plan: Pick<TrainingPlan, 'created_at'>, weekIdx: number, day: PlanSession['day']): string {
  return addDays(weekStart(createdDay(plan)), weekIdx * 7 + DAY_INDEX[day])
}

// The next session on or after today, or null once the plan has run out.
export function nextSession(plan: TrainingPlan, today: string): { session: PlanSession; date: string; week: number } | null {
  const start = Math.max(0, planWeekIndex(plan, today))
  for (let w = start; w < plan.plan.weeks.length; w++) {
    for (const s of plan.plan.weeks[w].sessions) {
      const date = sessionDate(plan, w, s.day)
      if (date >= today) return { session: s, date, week: w + 1 }
    }
  }
  return null
}
