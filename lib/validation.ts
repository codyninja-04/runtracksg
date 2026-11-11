import { PREFERRED_TIMES, RUN_TYPES, TRAINING_GOALS, type PreferredTime, type RunType, type TrainingGoal, type WeatherSource } from './types'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

export interface RunInput {
  run_date: string
  run_time: string | null
  distance_km: number
  duration_minutes: number
  route_id: string | null
  custom_route: string | null
  temperature_c: number | null
  humidity_percent: number | null
  weather_source: WeatherSource | null
  perceived_effort: number | null
  run_type: RunType | null
  notes: string | null
}

export function parseRunInput(body: unknown, today: string): Result<RunInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Send the run as JSON.' }
  const b = body as Record<string, unknown>

  const run_date = typeof b.run_date === 'string' && DATE_RE.test(b.run_date) ? b.run_date : null
  if (!run_date) return { ok: false, error: 'Pick the date of the run.' }
  if (run_date > today) return { ok: false, error: "That date hasn't happened yet." }
  if (run_date < '2000-01-01') return { ok: false, error: 'That date looks off.' }

  let run_time: string | null = null
  if (b.run_time !== undefined && b.run_time !== null && b.run_time !== '') {
    if (typeof b.run_time !== 'string' || !TIME_RE.test(b.run_time)) return { ok: false, error: 'Start time should look like 06:30.' }
    run_time = b.run_time.slice(0, 5)
  }

  const distance_km = num(b.distance_km)
  if (distance_km === null || distance_km <= 0) return { ok: false, error: 'Add how far you ran.' }
  if (distance_km > 250) return { ok: false, error: 'Distance is capped at 250 km.' }

  const duration_minutes = num(b.duration_minutes)
  if (duration_minutes === null || duration_minutes <= 0) return { ok: false, error: 'Add how long it took.' }
  if (duration_minutes > 2000) return { ok: false, error: 'That duration looks off.' }

  const pace = (duration_minutes * 60) / distance_km
  if (pace < 150) return { ok: false, error: "That's faster than 2:30/km. Check the distance and time." }
  if (pace > 1800) return { ok: false, error: "That's slower than 30:00/km. Check the distance and time." }

  let route_id: string | null = null
  if (b.route_id) {
    if (!isUuid(b.route_id)) return { ok: false, error: 'Unknown route.' }
    route_id = b.route_id
  }
  const custom_route = route_id ? null : text(b.custom_route, 120)

  const temperature_c = num(b.temperature_c)
  if (temperature_c !== null && (temperature_c < 10 || temperature_c > 45)) return { ok: false, error: 'Temperature should be between 10 and 45°C.' }
  const humidity_percent = num(b.humidity_percent)
  if (humidity_percent !== null && (humidity_percent < 0 || humidity_percent > 100)) return { ok: false, error: 'Humidity is a percentage, 0 to 100.' }

  let weather_source: WeatherSource | null = null
  if (temperature_c !== null || humidity_percent !== null) {
    weather_source = b.weather_source === 'openweather' || b.weather_source === 'open-meteo' ? b.weather_source : 'manual'
  }

  let perceived_effort: number | null = null
  if (b.perceived_effort !== undefined && b.perceived_effort !== null && b.perceived_effort !== '') {
    const e = num(b.perceived_effort)
    if (e === null || !Number.isInteger(e) || e < 1 || e > 10) return { ok: false, error: 'Effort is a whole number from 1 to 10.' }
    perceived_effort = e
  }

  let run_type: RunType | null = null
  if (b.run_type) {
    if (!RUN_TYPES.includes(b.run_type as RunType)) return { ok: false, error: 'Unknown run type.' }
    run_type = b.run_type as RunType
  }

  return {
    ok: true,
    value: {
      run_date,
      run_time,
      distance_km: Math.round(distance_km * 100) / 100,
      duration_minutes: Math.round(duration_minutes * 100) / 100,
      route_id,
      custom_route,
      temperature_c: temperature_c === null ? null : Math.round(temperature_c * 10) / 10,
      humidity_percent: humidity_percent === null ? null : Math.round(humidity_percent),
      weather_source,
      perceived_effort,
      run_type,
      notes: text(b.notes, 2000),
    },
  }
}

export interface ProfileInput {
  current_5k_pace_seconds: number | null
  training_goal: TrainingGoal | null
  goal_race_date: string | null
  days_per_week: number
  preferred_time: PreferredTime
}

export function parseProfileInput(body: unknown, today: string): Result<ProfileInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Send the profile as JSON.' }
  const b = body as Record<string, unknown>

  let current_5k_pace_seconds: number | null = null
  if (b.current_5k_pace_seconds !== null && b.current_5k_pace_seconds !== undefined && b.current_5k_pace_seconds !== '') {
    const p = num(b.current_5k_pace_seconds)
    if (p === null || p < 150 || p > 1200) return { ok: false, error: '5K pace should be between 2:30 and 20:00 per km.' }
    current_5k_pace_seconds = Math.round(p)
  }

  let training_goal: TrainingGoal | null = null
  if (b.training_goal) {
    if (!TRAINING_GOALS.includes(b.training_goal as TrainingGoal)) return { ok: false, error: 'Pick a goal from the list.' }
    training_goal = b.training_goal as TrainingGoal
  }

  let goal_race_date: string | null = null
  if (b.goal_race_date) {
    if (typeof b.goal_race_date !== 'string' || !DATE_RE.test(b.goal_race_date)) return { ok: false, error: 'Race date should be a date.' }
    if (b.goal_race_date < today) return { ok: false, error: 'The race date is in the past.' }
    goal_race_date = b.goal_race_date
  }

  const days = num(b.days_per_week) ?? 3
  if (!Number.isInteger(days) || days < 2 || days > 7) return { ok: false, error: 'Days per week should be 2 to 7.' }

  const preferred_time = PREFERRED_TIMES.includes(b.preferred_time as PreferredTime) ? (b.preferred_time as PreferredTime) : 'morning'

  return { ok: true, value: { current_5k_pace_seconds, training_goal, goal_race_date, days_per_week: days, preferred_time } }
}
