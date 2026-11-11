import { describe, expect, it } from 'vitest'
import { formatDuration, formatKm, formatPace, joinDuration, paceFrom, parsePace, riegel, splitDuration } from './pace'

describe('pace helpers', () => {
  it('formats seconds per km', () => {
    expect(formatPace(332)).toBe('5:32')
    expect(formatPace(300, true)).toBe('5:00/km')
    expect(formatPace(null)).toBe('–')
    expect(formatPace(0)).toBe('–')
  })

  it('parses the ways people type a pace', () => {
    expect(parsePace('5:32')).toBe(332)
    expect(parsePace('5.32')).toBe(332)
    expect(parsePace('5:32/km')).toBe(332)
    expect(parsePace('6')).toBe(360)
    expect(parsePace('330')).toBe(330)
    expect(parsePace('5:75')).toBeNull()
    expect(parsePace('fast')).toBeNull()
  })

  it('computes pace from distance and duration', () => {
    expect(paceFrom(10, 55)).toBe(330)
    expect(paceFrom(0, 30)).toBeNull()
  })

  it('round trips durations', () => {
    const minutes = joinDuration(1, 2, 15)
    expect(formatDuration(minutes)).toBe('1:02:15')
    expect(splitDuration(minutes)).toEqual({ h: 1, m: 2, s: 15 })
    expect(formatDuration(28.5)).toBe('28:30')
  })

  it('trims trailing zero on km', () => {
    expect(formatKm(10)).toBe('10')
    expect(formatKm(4.34)).toBe('4.3')
    expect(formatKm(4.346, 2)).toBe('4.35')
    expect(formatKm(4, 2)).toBe('4')
  })

  it('riegel projects longer races slower per km', () => {
    const fiveK = 25 * 60
    expect(riegel(fiveK, 5, 10) / 10).toBeGreaterThan(fiveK / 5)
  })
})
