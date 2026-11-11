import { describe, expect, it } from 'vitest'
import { parseProfileInput, parseRunInput } from './validation'

const TODAY = '2026-11-11'
const base = { run_date: '2026-11-10', run_time: '06:30', distance_km: 10, duration_minutes: 55 }

describe('parseRunInput', () => {
  it('accepts a normal run', () => {
    const r = parseRunInput({ ...base, temperature_c: 27.4, humidity_percent: 84, weather_source: 'open-meteo', perceived_effort: 4, run_type: 'easy' }, TODAY)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.weather_source).toBe('open-meteo')
      expect(r.value.perceived_effort).toBe(4)
    }
  })

  it('rejects future dates and impossible paces', () => {
    expect(parseRunInput({ ...base, run_date: '2026-11-12' }, TODAY).ok).toBe(false)
    expect(parseRunInput({ ...base, duration_minutes: 10 }, TODAY).ok).toBe(false)
    expect(parseRunInput({ ...base, distance_km: 0 }, TODAY).ok).toBe(false)
  })

  it('validates weather and effort ranges', () => {
    expect(parseRunInput({ ...base, temperature_c: 60 }, TODAY).ok).toBe(false)
    expect(parseRunInput({ ...base, humidity_percent: 120 }, TODAY).ok).toBe(false)
    expect(parseRunInput({ ...base, perceived_effort: 11 }, TODAY).ok).toBe(false)
    expect(parseRunInput({ ...base, perceived_effort: 4.5 }, TODAY).ok).toBe(false)
  })

  it('marks unknown weather sources as manual and drops custom route when a route is set', () => {
    const r = parseRunInput({ ...base, temperature_c: 30, weather_source: 'mystery', route_id: '6f1c2c5e-1b2a-4d3c-9e8f-1a2b3c4d5e6f', custom_route: 'ignored' }, TODAY)
    expect(r.ok && r.value.weather_source).toBe('manual')
    expect(r.ok && r.value.custom_route).toBeNull()
  })

  it('rejects bad route ids, run types and times', () => {
    expect(parseRunInput({ ...base, route_id: 'not-a-uuid' }, TODAY).ok).toBe(false)
    expect(parseRunInput({ ...base, run_type: 'sprint' }, TODAY).ok).toBe(false)
    expect(parseRunInput({ ...base, run_time: '25:00' }, TODAY).ok).toBe(false)
  })
})

describe('parseProfileInput', () => {
  it('accepts a full profile', () => {
    const r = parseProfileInput({ current_5k_pace_seconds: 330, training_goal: 'half_marathon', goal_race_date: '2026-12-07', days_per_week: 4, preferred_time: 'evening' }, TODAY)
    expect(r).toEqual({ ok: true, value: { current_5k_pace_seconds: 330, training_goal: 'half_marathon', goal_race_date: '2026-12-07', days_per_week: 4, preferred_time: 'evening' } })
  })

  it('rejects past race dates, silly day counts and unknown goals', () => {
    expect(parseProfileInput({ goal_race_date: '2026-01-01' }, TODAY).ok).toBe(false)
    expect(parseProfileInput({ days_per_week: 9 }, TODAY).ok).toBe(false)
    expect(parseProfileInput({ training_goal: 'ultra' }, TODAY).ok).toBe(false)
  })
})
