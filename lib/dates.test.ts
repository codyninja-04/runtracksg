import { describe, expect, it } from 'vitest'
import { addDays, dayPart, daysBetween, formatTime, hourSG, relativeDay, todaySG, weekStart } from './dates'

describe('dates', () => {
  it('uses Singapore time for today', () => {
    // 17:30 UTC is 1:30am the next day in Singapore.
    const d = new Date('2026-11-10T17:30:00Z')
    expect(todaySG(d)).toBe('2026-11-11')
    expect(hourSG(d)).toBe(1)
  })

  it('does calendar arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-11-01', '2026-11-11')).toBe(10)
    expect(weekStart('2026-11-15')).toBe('2026-11-09')
    expect(weekStart('2026-11-09')).toBe('2026-11-09')
  })

  it('formats times and relative days', () => {
    expect(formatTime('06:05:00')).toBe('6:05am')
    expect(formatTime('18:30')).toBe('6:30pm')
    expect(relativeDay('2026-11-11', '2026-11-11')).toBe('Today')
    expect(relativeDay('2026-11-10', '2026-11-11')).toBe('Yesterday')
    expect(dayPart('06:10')).toBe('early')
    expect(dayPart('19:00')).toBe('evening')
  })
})
