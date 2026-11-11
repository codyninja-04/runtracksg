import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { heatImpact, paceByDayPart, paceByTemperature, summarise } from '../analysis'
import { analyzePace, type AnalyzerInput } from '../claude/pace-analyzer'
import { claudeAvailable } from '../claude/client'
import { todaySG } from '../dates'
import type { InsightSet, RunLog, UserProfile } from '../types'

export const MIN_RUNS_FOR_INSIGHTS = 4

export function analyzerInput(runs: RunLog[]): AnalyzerInput {
  const today = todaySG()
  return {
    impact: heatImpact(runs),
    buckets: paceByTemperature(runs),
    dayParts: paceByDayPart(runs),
    summary: summarise(runs, today),
    recent: runs.slice(0, 15).map((r) => ({
      date: r.run_date,
      time: r.run_time?.slice(0, 5) ?? null,
      km: Number(r.distance_km),
      pace: r.avg_pace_seconds_per_km,
      temp: r.temperature_c,
      humidity: r.humidity_percent,
      effort: r.perceived_effort,
      type: r.run_type,
    })),
  }
}

export type InsightState =
  | { status: 'ready'; insights: InsightSet; generatedAt: string; stale: boolean }
  | { status: 'not_enough'; need: number }
  | { status: 'unavailable' }
  | { status: 'locked' }
  | { status: 'error'; message: string }

// Cached on the profile and only regenerated when asked, or when the stored
// read was written against a different number of runs.
export async function readInsights(profile: UserProfile | null, runCount: number): Promise<InsightState> {
  if (runCount < MIN_RUNS_FOR_INSIGHTS) return { status: 'not_enough', need: MIN_RUNS_FOR_INSIGHTS - runCount }
  if (profile?.insights && profile.insights_generated_at) {
    return { status: 'ready', insights: profile.insights, generatedAt: profile.insights_generated_at, stale: profile.insights_run_count !== runCount }
  }
  if (!claudeAvailable()) return { status: 'unavailable' }
  return { status: 'error', message: 'No read yet.' }
}

export async function refreshInsights(supabase: SupabaseClient, userId: string, runs: RunLog[]): Promise<InsightState> {
  if (runs.length < MIN_RUNS_FOR_INSIGHTS) return { status: 'not_enough', need: MIN_RUNS_FOR_INSIGHTS - runs.length }
  if (!claudeAvailable()) return { status: 'unavailable' }

  const insights = await analyzePace(analyzerInput(runs))
  const generatedAt = new Date().toISOString()
  await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, insights, insights_generated_at: generatedAt, insights_run_count: runs.length }, { onConflict: 'user_id' })
  return { status: 'ready', insights, generatedAt, stale: false }
}
