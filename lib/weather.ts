import 'server-only'
import { hourSG, nowTimeSG, todaySG } from './dates'
import { heatAdjustmentPct } from './heat'
import type { Conditions, HourlyPoint } from './types'

// Weather for a run. OpenWeather when a key is set (current conditions, and the
// One Call history endpoint if the account has it), with Open-Meteo as the
// free fallback so the feature still works without any key at all.

export const SG_CENTRE: [number, number] = [103.8198, 1.3521]

type LngLat = [number, number]

function validCoords(c?: LngLat | null): LngLat {
  if (c && c[0] > 103.5 && c[0] < 104.2 && c[1] > 1.1 && c[1] < 1.5) return c
  return SG_CENTRE
}

// Unix seconds for a Singapore local date + time (UTC+8, no DST).
export function sgToUnix(date: string, time: string): number {
  return Math.floor(Date.parse(`${date}T${time.slice(0, 5)}:00+08:00`) / 1000)
}

async function getJson(url: string, revalidate: number): Promise<unknown | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function openWeatherCurrent([lng, lat]: LngLat, key: string): Promise<Conditions | null> {
  const data = (await getJson(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${key}`, 600)) as {
    main?: { temp?: number; humidity?: number }
    dt?: number
  } | null
  if (typeof data?.main?.temp !== 'number' || typeof data.main.humidity !== 'number') return null
  return { temperature_c: round1(data.main.temp), humidity_percent: Math.round(data.main.humidity), source: 'openweather', observed_at: new Date((data.dt ?? Date.now() / 1000) * 1000).toISOString() }
}

async function openWeatherHistory([lng, lat]: LngLat, unix: number, key: string): Promise<Conditions | null> {
  const data = (await getJson(`https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lng}&dt=${unix}&units=metric&appid=${key}`, 86_400)) as {
    data?: { temp?: number; humidity?: number; dt?: number }[]
  } | null
  const point = data?.data?.[0]
  if (typeof point?.temp !== 'number' || typeof point.humidity !== 'number') return null
  return { temperature_c: round1(point.temp), humidity_percent: Math.round(point.humidity), source: 'openweather', observed_at: new Date((point.dt ?? unix) * 1000).toISOString() }
}

interface MeteoHourly {
  hourly?: { time?: string[]; temperature_2m?: (number | null)[]; relative_humidity_2m?: (number | null)[] }
}

async function openMeteoDay([lng, lat]: LngLat, date: string, today: string): Promise<HourlyPoint[] | null> {
  const ageDays = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000
  // The forecast API keeps about three months of recent history; older dates
  // come from the reanalysis archive.
  const host = ageDays > 80 ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast'
  const url = `${host}?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m&timezone=Asia%2FSingapore&start_date=${date}&end_date=${date}`
  const data = (await getJson(url, date === today ? 1800 : 86_400)) as MeteoHourly | null
  const h = data?.hourly
  if (!h?.time || !h.temperature_2m || !h.relative_humidity_2m) return null
  const out: HourlyPoint[] = []
  h.time.forEach((t, i) => {
    const temp = h.temperature_2m?.[i]
    const rh = h.relative_humidity_2m?.[i]
    if (typeof temp === 'number' && typeof rh === 'number') out.push({ hour: Number(t.slice(11, 13)), temperature_c: round1(temp), humidity_percent: Math.round(rh) })
  })
  return out.length ? out : null
}

export async function conditionsAt(date: string, time: string | null, coords?: LngLat | null): Promise<Conditions | null> {
  const where = validCoords(coords)
  const at = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '07:00'
  const unix = sgToUnix(date, at)
  const now = Date.now() / 1000
  const key = process.env.OPENWEATHER_API_KEY

  if (key) {
    if (Math.abs(now - unix) < 90 * 60) {
      const current = await openWeatherCurrent(where, key)
      if (current) return current
    } else if (unix < now) {
      const past = await openWeatherHistory(where, unix, key)
      if (past) return past
    }
  }

  const today = todaySG()
  const hours = await openMeteoDay(where, date, today)
  if (!hours) return null
  const target = Number(at.slice(0, 2)) + Number(at.slice(3, 5)) / 60
  const nearest = hours.reduce((best, p) => (Math.abs(p.hour - target) < Math.abs(best.hour - target) ? p : best))
  return { temperature_c: nearest.temperature_c, humidity_percent: nearest.humidity_percent, source: 'open-meteo', observed_at: `${date}T${nearest.hour.toString().padStart(2, '0')}:00:00+08:00` }
}

export interface Outlook {
  now: Conditions | null
  hours: HourlyPoint[]
  best: { start: number; end: number; avgTemp: number; adjustmentPct: number } | null
}

// Today's hourly temperatures from 5am to 10pm, plus the coolest two hour
// window still ahead of us.
export async function todayOutlook(): Promise<Outlook> {
  const today = todaySG()
  const [hoursRaw, now] = await Promise.all([openMeteoDay(SG_CENTRE, today, today), conditionsAt(today, nowTimeSG(), SG_CENTRE).catch(() => null)])
  const hours = (hoursRaw ?? []).filter((h) => h.hour >= 5 && h.hour <= 22)

  const currentHour = hourSG()
  let best: Outlook['best'] = null
  for (let i = 0; i < hours.length - 1; i++) {
    const a = hours[i]
    const b = hours[i + 1]
    if (a.hour < currentHour) continue
    const pct = (heatAdjustmentPct(a.temperature_c, a.humidity_percent) + heatAdjustmentPct(b.temperature_c, b.humidity_percent)) / 2
    if (!best || pct < best.adjustmentPct) best = { start: a.hour, end: b.hour + 1, avgTemp: round1((a.temperature_c + b.temperature_c) / 2), adjustmentPct: round1(pct) }
  }

  return { now, hours, best }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
