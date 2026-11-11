import { describe, expect, it } from 'vitest'
import { nextSession, planWeekIndex, sessionDate } from './plan-schedule'
import type { TrainingPlan } from './types'

const session = (day: 'Tue' | 'Sat', title: string) => ({ day, kind: 'easy' as const, title, distance_km: 5, duration_minutes: null, target_pace: null, time_window: null, route_suggestion: null, details: '' })

const plan: TrainingPlan = {
  id: 'p',
  user_id: 'u',
  // 11pm UTC Sunday 8 Nov is 7am Monday 9 Nov in Singapore, so week 1 starts 9 Nov.
  created_at: '2026-11-08T23:00:00Z',
  goal: '10k',
  race_date: null,
  days_per_week: 2,
  is_active: true,
  plan: {
    summary: 's',
    heat_strategy: [],
    pace_guide: [],
    weeks: [
      { week: 1, focus: 'a', total_km: 10, sessions: [session('Tue', 'w1 tue'), session('Sat', 'w1 sat')] },
      { week: 2, focus: 'b', total_km: 10, sessions: [session('Tue', 'w2 tue'), session('Sat', 'w2 sat')] },
    ],
  },
}

describe('plan schedule', () => {
  it('anchors week 1 to the Singapore calendar week of creation', () => {
    expect(planWeekIndex(plan, '2026-11-11')).toBe(0)
    expect(planWeekIndex(plan, '2026-11-16')).toBe(1)
    expect(sessionDate(plan, 0, 'Tue')).toBe('2026-11-10')
    expect(sessionDate(plan, 1, 'Sat')).toBe('2026-11-21')
  })

  it('finds the next session on or after today', () => {
    expect(nextSession(plan, '2026-11-11')?.session.title).toBe('w1 sat')
    expect(nextSession(plan, '2026-11-14')?.session.title).toBe('w1 sat')
    expect(nextSession(plan, '2026-11-15')?.session.title).toBe('w2 tue')
    expect(nextSession(plan, '2026-11-22')).toBeNull()
  })
})
