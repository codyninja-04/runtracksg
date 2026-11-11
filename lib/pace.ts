// Pace and duration helpers. Everything is stored in plain numbers (seconds per
// km, minutes) and only turned into "5:32" style strings at the edge.

export function formatPace(secondsPerKm: number | null | undefined, unit = false): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '–'
  const total = Math.round(secondsPerKm)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}${unit ? '/km' : ''}`
}

// Accepts "5:32", "5.32" (common typo), "5:32/km" or a bare number of seconds.
export function parsePace(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/\s*\/?\s*km$/, '')
  if (!raw) return null
  const match = raw.match(/^(\d{1,2})[:.](\d{1,2})$/)
  if (match) {
    const m = Number(match[1])
    const s = Number(match[2])
    if (s >= 60) return null
    const total = m * 60 + s
    return total > 0 ? total : null
  }
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    // A lone small number is minutes ("6" means 6:00/km), anything bigger is seconds.
    if (n > 0 && n < 20) return n * 60
    if (n >= 120 && n <= 1200) return n
  }
  return null
}

export function paceFrom(distanceKm: number, durationMinutes: number): number | null {
  if (!(distanceKm > 0) || !(durationMinutes > 0)) return null
  return Math.round((durationMinutes * 60) / distanceKm)
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '–'
  const total = Math.round(minutes * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function splitDuration(minutes: number): { h: number; m: number; s: number } {
  const total = Math.round(minutes * 60)
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

export function joinDuration(h: number, m: number, s: number): number {
  return (h * 3600 + m * 60 + s) / 60
}

export function formatKm(km: number | null | undefined, digits = 1): string {
  if (km == null || !Number.isFinite(km)) return '–'
  return String(Number(km.toFixed(digits)))
}

// Riegel's formula. Used to project a 5k time to other distances when building
// a pace guide. It is optimistic in the heat, which the heat adjustment covers.
export function riegel(timeSeconds: number, fromKm: number, toKm: number, exponent = 1.06): number {
  return timeSeconds * Math.pow(toKm / fromKm, exponent)
}
