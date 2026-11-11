import { describe, expect, it } from 'vitest'
import { heatImpact, linearRegression, median, paceByDayPart, paceByTemperature, summarise, weeklyTotals } from './analysis'
import type { RunType } from './types'

function run(date: string, km: number, pace: number, temp: number | null, opts: { time?: string; type?: RunType | null } = {}) {
  return {
    run_date: date,
    run_time: opts.time ?? null,
    distance_km: km,
    duration_minutes: (km * pace) / 60,
    avg_pace_seconds_per_km: pace,
    temperature_c: temp,
    humidity_percent: temp === null ? null : 75,
    run_type: opts.type === undefined ? ('easy' as RunType) : opts.type,
  }
}

describe('median and regression', () => {
  it('median handles odd, even and empty', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBeNull()
  })

  it('fits a straight line', () => {
    const fit = linearRegression([1, 2, 3, 4], [2, 4, 6, 8])!
    expect(fit.slope).toBeCloseTo(2)
    expect(fit.intercept).toBeCloseTo(0)
    expect(fit.r).toBeCloseTo(1)
    expect(linearRegression([1, 1], [2, 3])).toBeNull()
  })
})

describe('heatImpact', () => {
  const runs = [
    run('2026-11-01', 5, 330, 27),
    run('2026-11-02', 5, 335, 28),
    run('2026-11-03', 5, 370, 31),
    run('2026-11-04', 5, 375, 32),
    run('2026-11-05', 5, 340, 28.5),
    run('2026-11-06', 5, 380, 33),
    // A fast session in the heat should not muddy the comparison.
    run('2026-11-07', 5, 270, 32, { type: 'intervals' }),
    run('2026-11-08', 5, 300, null),
  ]

  it('compares hot and cooler steady runs', () => {
    const impact = heatImpact(runs)
    expect(impact.hotRuns).toBe(3)
    expect(impact.coolerRuns).toBe(3)
    expect(impact.diffSeconds).toBe(40)
    expect(impact.enoughData).toBe(true)
    expect(impact.secondsPerDegree).toBeGreaterThan(5)
  })

  it('waits for enough data', () => {
    const impact = heatImpact(runs.slice(0, 3))
    expect(impact.diffSeconds).toBeNull()
    expect(impact.secondsPerDegree).toBeNull()
  })

  it('buckets by temperature', () => {
    const buckets = paceByTemperature(runs)
    expect(buckets.map((b) => b.runs)).toEqual([0, 3, 0, 3])
  })
})

describe('time of day and totals', () => {
  it('groups by day part', () => {
    const parts = paceByDayPart([run('2026-11-01', 5, 330, 27, { time: '06:10' }), run('2026-11-02', 5, 360, 32, { time: '15:00' })])
    expect(parts.map((p) => p.part)).toEqual(['early', 'midday'])
  })

  it('totals weeks starting Monday', () => {
    // 2026-11-11 is a Wednesday, so its week starts Monday 2026-11-09.
    const weeks = weeklyTotals([run('2026-11-09', 5, 330, 27), run('2026-11-11', 8, 330, 27), run('2026-11-08', 10, 330, 27)], '2026-11-11', 2)
    expect(weeks).toEqual([
      { week: '2026-11-02', km: 10, runs: 1 },
      { week: '2026-11-09', km: 13, runs: 2 },
    ])
  })

  it('summarises the log', () => {
    const s = summarise([run('2026-11-10', 5, 300, 27), run('2026-11-03', 10, 360, 30)], '2026-11-11')
    expect(s.thisWeekKm).toBe(5)
    expect(s.lastWeekKm).toBe(10)
    expect(s.longestKm).toBe(10)
    expect(s.fastest5kPace).toBe(300)
    expect(s.avgPace30d).toBe(340)
  })
})
