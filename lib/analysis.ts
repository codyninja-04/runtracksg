import { addDays, dayPart, weekStart, type DayPart } from './dates'
import { HOT_THRESHOLD_C } from './heat'
import type { RunLog, RunType } from './types'

// All the numbers on the dashboard come from here. Claude only gets these
// figures to write about; it never does the maths itself.

type RunLike = Pick<RunLog, 'run_date' | 'run_time' | 'distance_km' | 'duration_minutes' | 'avg_pace_seconds_per_km' | 'temperature_c' | 'humidity_percent' | 'run_type'>

// Fast sessions would drag the "hot vs cool" comparison around, so the heat
// analysis only looks at steady running.
const STEADY: (RunType | null)[] = ['easy', 'long', 'recovery', null]

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r: number } | null {
  const n = xs.length
  if (n < 2 || n !== ys.length) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy)
  return { slope, intercept: my - slope * mx, r }
}

export interface HeatImpact {
  steadyRuns: number
  hotRuns: number
  coolerRuns: number
  hotMedianPace: number | null
  coolerMedianPace: number | null
  // Positive means slower in the heat.
  diffSeconds: number | null
  // Extra sec/km per extra °C, from a straight line fit. Null until 6 runs.
  secondsPerDegree: number | null
  correlation: number | null
  threshold: number
  enoughData: boolean
}

export function heatImpact(runs: RunLike[], threshold = HOT_THRESHOLD_C): HeatImpact {
  const steady = runs.filter((r) => r.temperature_c != null && STEADY.includes(r.run_type) && r.avg_pace_seconds_per_km > 0)
  const hot = steady.filter((r) => (r.temperature_c as number) >= threshold).map((r) => r.avg_pace_seconds_per_km)
  const cooler = steady.filter((r) => (r.temperature_c as number) < threshold).map((r) => r.avg_pace_seconds_per_km)
  const hotMedian = median(hot)
  const coolMedian = median(cooler)
  const fit = steady.length >= 6 ? linearRegression(steady.map((r) => r.temperature_c as number), steady.map((r) => r.avg_pace_seconds_per_km)) : null

  const enough = hot.length >= 2 && cooler.length >= 2
  return {
    steadyRuns: steady.length,
    hotRuns: hot.length,
    coolerRuns: cooler.length,
    hotMedianPace: hotMedian,
    coolerMedianPace: coolMedian,
    diffSeconds: enough && hotMedian != null && coolMedian != null ? Math.round(hotMedian - coolMedian) : null,
    secondsPerDegree: fit ? Math.round(fit.slope * 10) / 10 : null,
    correlation: fit ? Math.round(fit.r * 100) / 100 : null,
    threshold,
    enoughData: enough,
  }
}

export interface TempBucket {
  label: string
  min: number
  max: number
  runs: number
  medianPace: number | null
}

export function paceByTemperature(runs: RunLike[]): TempBucket[] {
  const buckets: Omit<TempBucket, 'runs' | 'medianPace'>[] = [
    { label: 'Under 27°', min: -Infinity, max: 27 },
    { label: '27 to 29°', min: 27, max: 29 },
    { label: '29 to 31°', min: 29, max: 31 },
    { label: '31° and up', min: 31, max: Infinity },
  ]
  const steady = runs.filter((r) => r.temperature_c != null && STEADY.includes(r.run_type))
  return buckets.map((b) => {
    const paces = steady.filter((r) => (r.temperature_c as number) >= b.min && (r.temperature_c as number) < b.max).map((r) => r.avg_pace_seconds_per_km)
    return { ...b, runs: paces.length, medianPace: median(paces) }
  })
}

export function paceByDayPart(runs: RunLike[]): { part: DayPart; runs: number; medianPace: number | null; medianTemp: number | null }[] {
  const order: DayPart[] = ['early', 'morning', 'midday', 'evening', 'night']
  const steady = runs.filter((r) => STEADY.includes(r.run_type))
  return order
    .map((part) => {
      const these = steady.filter((r) => dayPart(r.run_time) === part)
      return {
        part,
        runs: these.length,
        medianPace: median(these.map((r) => r.avg_pace_seconds_per_km)),
        medianTemp: median(these.filter((r) => r.temperature_c != null).map((r) => r.temperature_c as number)),
      }
    })
    .filter((p) => p.runs > 0)
}

export interface WeekTotal {
  week: string
  km: number
  runs: number
}

export function weeklyTotals(runs: RunLike[], today: string, weeks = 8): WeekTotal[] {
  const current = weekStart(today)
  const out: WeekTotal[] = []
  for (let i = weeks - 1; i >= 0; i--) out.push({ week: addDays(current, -7 * i), km: 0, runs: 0 })
  const index = new Map(out.map((w, i) => [w.week, i]))
  for (const r of runs) {
    const i = index.get(weekStart(r.run_date))
    if (i === undefined) continue
    out[i].km = Math.round((out[i].km + Number(r.distance_km)) * 10) / 10
    out[i].runs += 1
  }
  return out
}

export interface Summary {
  totalRuns: number
  totalKm: number
  thisWeekKm: number
  thisWeekRuns: number
  lastWeekKm: number
  avgPace30d: number | null
  longestKm: number
  fastest5kPace: number | null
}

export function summarise(runs: RunLike[], today: string): Summary {
  const thisWeek = weekStart(today)
  const lastWeek = addDays(thisWeek, -7)
  const since30 = addDays(today, -30)
  let totalKm = 0
  let thisWeekKm = 0
  let thisWeekRuns = 0
  let lastWeekKm = 0
  let longest = 0
  let fastest: number | null = null
  let minutes30 = 0
  let km30 = 0

  for (const r of runs) {
    const km = Number(r.distance_km)
    totalKm += km
    longest = Math.max(longest, km)
    const ws = weekStart(r.run_date)
    if (ws === thisWeek) {
      thisWeekKm += km
      thisWeekRuns += 1
    } else if (ws === lastWeek) lastWeekKm += km
    if (r.run_date >= since30) {
      minutes30 += Number(r.duration_minutes)
      km30 += km
    }
    if (km >= 4.9 && (fastest === null || r.avg_pace_seconds_per_km < fastest)) fastest = r.avg_pace_seconds_per_km
  }

  const round = (n: number) => Math.round(n * 10) / 10
  return {
    totalRuns: runs.length,
    totalKm: round(totalKm),
    thisWeekKm: round(thisWeekKm),
    thisWeekRuns,
    lastWeekKm: round(lastWeekKm),
    avgPace30d: km30 > 0 ? Math.round((minutes30 * 60) / km30) : null,
    longestKm: round(longest),
    fastest5kPace: fastest,
  }
}
