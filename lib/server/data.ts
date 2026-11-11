import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Limits } from '../billing'
import { addDays, todaySG } from '../dates'
import type { RunWithRoute, SgRoute, TrainingPlan, UserProfile } from '../types'

const RUN_SELECT = '*, route:sg_routes(id, name, slug, area)'

// Postgres numerics arrive as numbers through PostgREST, but be defensive so a
// string never sneaks into the maths.
function cleanRun(r: RunWithRoute): RunWithRoute {
  return {
    ...r,
    distance_km: Number(r.distance_km),
    duration_minutes: Number(r.duration_minutes),
    avg_pace_seconds_per_km: Number(r.avg_pace_seconds_per_km),
    temperature_c: r.temperature_c == null ? null : Number(r.temperature_c),
    humidity_percent: r.humidity_percent == null ? null : Number(r.humidity_percent),
  }
}

export function historyFloor(limits: Limits, today = todaySG()): string | null {
  return limits.historyDays === null ? null : addDays(today, -limits.historyDays)
}

export async function loadRuns(supabase: SupabaseClient, limits: Limits, opts: { limit?: number; since?: string } = {}): Promise<RunWithRoute[]> {
  let query = supabase.from('run_logs').select(RUN_SELECT).order('run_date', { ascending: false }).order('run_time', { ascending: false, nullsFirst: false })
  const floor = historyFloor(limits)
  const since = [floor, opts.since].filter((d): d is string => !!d).sort().pop()
  if (since) query = query.gte('run_date', since)
  if (opts.limit) query = query.limit(opts.limit)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data ?? []) as RunWithRoute[]).map(cleanRun)
}

export async function loadRun(supabase: SupabaseClient, id: string): Promise<RunWithRoute | null> {
  const { data } = await supabase.from('run_logs').select(RUN_SELECT).eq('id', id).maybeSingle()
  return data ? cleanRun(data as RunWithRoute) : null
}

export async function loadRoutes(supabase: SupabaseClient): Promise<SgRoute[]> {
  const { data, error } = await supabase.from('sg_routes').select('*').order('sort_order').order('name')
  if (error) throw new Error(error.message)
  return ((data ?? []) as SgRoute[]).map((r) => ({ ...r, distance_km: Number(r.distance_km), path: Array.isArray(r.path) ? r.path : [] }))
}

export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<UserProfile | null> {
  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle()
  return (data as UserProfile | null) ?? null
}

export async function loadActivePlan(supabase: SupabaseClient): Promise<TrainingPlan | null> {
  const { data } = await supabase.from('training_plans').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as TrainingPlan | null) ?? null
}
