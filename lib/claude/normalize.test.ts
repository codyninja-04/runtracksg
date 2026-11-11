import { describe, expect, it } from 'vitest'
import { normalizeInsights, normalizePlan } from './normalize'

describe('normalizePlan', () => {
  it('keeps valid sessions, sorts them and recomputes weekly km', () => {
    const plan = normalizePlan({
      summary: 'Four weeks of base.',
      heat_strategy: ['Run before 7:30am', ''],
      pace_guide: [{ label: 'Easy', pace: '6:30-7:00/km', note: 'by feel' }, { label: 'broken' }],
      weeks: [
        {
          week: 7,
          focus: 'Base',
          total_km: 999,
          sessions: [
            { day: 'Sat', kind: 'long', title: 'Long run', distance_km: 12, details: 'East Coast' },
            { day: 'Tuesday', kind: 'easy', title: 'Easy', distance_km: '6', details: '' },
            { day: 'Funday', kind: 'easy', title: 'Nope' },
            { day: 'Thu', kind: 'sprint', title: 'Nope' },
          ],
        },
        { week: 8, focus: 'Empty', sessions: [] },
      ],
    })
    expect(plan).not.toBeNull()
    expect(plan!.weeks).toHaveLength(1)
    expect(plan!.weeks[0].week).toBe(1)
    expect(plan!.weeks[0].total_km).toBe(18)
    expect(plan!.weeks[0].sessions.map((s) => s.day)).toEqual(['Tue', 'Sat'])
    expect(plan!.heat_strategy).toEqual(['Run before 7:30am'])
    expect(plan!.pace_guide).toHaveLength(1)
  })

  it('returns null for junk', () => {
    expect(normalizePlan(null)).toBeNull()
    expect(normalizePlan({ summary: 'x', weeks: [] })).toBeNull()
    expect(normalizePlan({ weeks: [{ sessions: [{ day: 'Mon', kind: 'easy', title: 'a' }] }] })).toBeNull()
  })
})

describe('normalizeInsights', () => {
  it('needs a headline, points and a suggestion', () => {
    expect(normalizeInsights({ headline: 'Hot runs cost you 40s/km', points: ['a', 'b', 'c', 'd', 'e'], suggestion: 'Move Thursday to 6am' })?.points).toHaveLength(4)
    expect(normalizeInsights({ headline: 'x', points: [], suggestion: 'y' })).toBeNull()
  })
})
