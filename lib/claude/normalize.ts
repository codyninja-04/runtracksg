import type { InsightSet, PlanSession, PlanWeek, SessionKind, TrainingPlanContent } from '../types'

// Claude's tool output is checked and trimmed here before anything is saved or
// rendered. Kept free of SDK imports so it can be unit tested.

const DAYS: PlanSession['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const KINDS: SessionKind[] = ['easy', 'long', 'tempo', 'intervals', 'hills', 'recovery', 'rest', 'cross', 'race']

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : null
}

function posNum(v: unknown, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(Math.round(n * 10) / 10, max)
}

function normalizeSession(raw: unknown): PlanSession | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const day = DAYS.find((d) => typeof s.day === 'string' && s.day.toLowerCase().startsWith(d.toLowerCase()))
  const kind = KINDS.includes(s.kind as SessionKind) ? (s.kind as SessionKind) : null
  const title = str(s.title, 80)
  if (!day || !kind || !title) return null
  return {
    day,
    kind,
    title,
    distance_km: posNum(s.distance_km, 60),
    duration_minutes: posNum(s.duration_minutes, 400),
    target_pace: str(s.target_pace, 40),
    time_window: str(s.time_window, 60),
    route_suggestion: str(s.route_suggestion, 80),
    details: str(s.details, 400) ?? '',
  }
}

export function normalizePlan(raw: unknown): TrainingPlanContent | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const summary = str(p.summary, 800)
  if (!summary || !Array.isArray(p.weeks)) return null

  const weeks: PlanWeek[] = []
  for (const w of p.weeks.slice(0, 16)) {
    if (!w || typeof w !== 'object') continue
    const wk = w as Record<string, unknown>
    const sessions = (Array.isArray(wk.sessions) ? wk.sessions : []).map(normalizeSession).filter((s): s is PlanSession => s !== null)
    sessions.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))
    if (!sessions.length) continue
    const computedKm = Math.round(sessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0) * 10) / 10
    weeks.push({
      week: weeks.length + 1,
      focus: str(wk.focus, 120) ?? 'Base building',
      total_km: computedKm,
      sessions,
    })
  }
  if (!weeks.length) return null

  const heat_strategy = (Array.isArray(p.heat_strategy) ? p.heat_strategy : [])
    .map((x) => str(x, 240))
    .filter((x): x is string => !!x)
    .slice(0, 6)

  const pace_guide = (Array.isArray(p.pace_guide) ? p.pace_guide : [])
    .map((g) => {
      if (!g || typeof g !== 'object') return null
      const r = g as Record<string, unknown>
      const label = str(r.label, 40)
      const pace = str(r.pace, 40)
      return label && pace ? { label, pace, note: str(r.note, 160) ?? '' } : null
    })
    .filter((x): x is { label: string; pace: string; note: string } => x !== null)
    .slice(0, 6)

  return { summary, heat_strategy, pace_guide, weeks }
}

export function normalizeInsights(raw: unknown): InsightSet | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const headline = str(r.headline, 200)
  const points = (Array.isArray(r.points) ? r.points : [])
    .map((p) => str(p, 280))
    .filter((p): p is string => !!p)
    .slice(0, 4)
  const suggestion = str(r.suggestion, 280)
  if (!headline || !points.length || !suggestion) return null
  return { headline, points, suggestion }
}
