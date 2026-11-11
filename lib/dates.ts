// Date helpers pinned to Singapore time. Run dates are plain YYYY-MM-DD strings
// so there is no timezone drift once a run is saved.

export const SG_TZ = 'Asia/Singapore'

function parts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SG_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  return { date: `${map.year}-${map.month}-${map.day}`, hour: Number(map.hour) % 24, minute: Number(map.minute) }
}

export function todaySG(now = new Date()): string {
  return parts(now).date
}

export function nowTimeSG(now = new Date()): string {
  const { hour, minute } = parts(now)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export function hourSG(now = new Date()): number {
  return parts(now).hour
}

// Pure date arithmetic on YYYY-MM-DD strings, done in UTC so DST never matters.
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

// Monday of the week containing the date.
export function weekStart(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return addDays(iso, -((day + 6) % 7))
}

export function formatDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-SG', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    weekday: opts.weekday ? 'short' : undefined,
    year: opts.year ? 'numeric' : undefined,
  })
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h)) return ''
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${(m || 0).toString().padStart(2, '0')}${suffix}`
}

export function relativeDay(iso: string, today = todaySG()): string {
  const diff = daysBetween(iso, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  return formatDate(iso, { year: iso.slice(0, 4) !== today.slice(0, 4) })
}

export type DayPart = 'early' | 'morning' | 'midday' | 'evening' | 'night'

export function dayPart(time: string | null | undefined): DayPart | null {
  if (!time) return null
  const h = Number(time.split(':')[0])
  if (!Number.isFinite(h)) return null
  if (h < 7) return 'early'
  if (h < 10) return 'morning'
  if (h < 17) return 'midday'
  if (h < 20) return 'evening'
  return 'night'
}
