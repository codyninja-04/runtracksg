import { NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { DAILY_PLAN_LIMIT } from '@/lib/billing'
import { heatImpact } from '@/lib/analysis'
import { claudeAvailable } from '@/lib/claude/client'
import { generateTrainingPlan, planWeeks } from '@/lib/claude/plan-generator'
import { addDays, todaySG } from '@/lib/dates'
import { formatPace } from '@/lib/pace'
import { loadProfile, loadRuns } from '@/lib/server/data'
import { fail } from '@/lib/server/http'

export const maxDuration = 120

// POST builds a new plan from the saved profile and recent runs, then makes it
// the active one. Older plans are kept but marked inactive.
export async function POST() {
  const { supabase, user, limits, unauthorized } = await apiUser()
  if (!user) return unauthorized
  if (!limits.aiPlans) return fail('Training plans are part of Pro.', 402)
  if (!claudeAvailable()) return fail('Plan generation is not set up on this server yet (no Anthropic key).', 503)

  const profile = await loadProfile(supabase, user.id)
  if (!profile?.training_goal) return fail('Save a goal first so the plan has something to aim at.')

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await supabase.from('training_plans').select('id', { count: 'exact', head: true }).gte('created_at', since)
  if ((count ?? 0) >= DAILY_PLAN_LIMIT) return fail(`You can build ${DAILY_PLAN_LIMIT} plans a day. Try again tomorrow.`, 429)

  const today = todaySG()
  const runs = await loadRuns(supabase, limits, { since: addDays(today, -56), limit: 60 })
  const impact = heatImpact(runs)
  const heatNote =
    impact.diffSeconds !== null
      ? `On their own logs, runs at ${impact.threshold}°C and above are ${impact.diffSeconds} sec/km ${impact.diffSeconds >= 0 ? 'slower' : 'faster'} than cooler runs (${impact.hotRuns} hot vs ${impact.coolerRuns} cooler).`
      : null

  try {
    const plan = await generateTrainingPlan({
      current5kPace: profile.current_5k_pace_seconds,
      goal: profile.training_goal,
      raceDate: profile.goal_race_date,
      daysPerWeek: profile.days_per_week,
      preferredTime: profile.preferred_time,
      weeks: planWeeks(today, profile.goal_race_date),
      today,
      heatNote,
      recentRuns: runs.slice(0, 20).map((r) => ({
        date: r.run_date,
        time: r.run_time?.slice(0, 5) ?? null,
        distance_km: r.distance_km,
        pace: formatPace(r.avg_pace_seconds_per_km),
        temperature_c: r.temperature_c,
        effort: r.perceived_effort,
      })),
    })

    await supabase.from('training_plans').update({ is_active: false }).eq('is_active', true)
    const { data, error } = await supabase
      .from('training_plans')
      .insert({ user_id: user.id, goal: profile.training_goal, race_date: profile.goal_race_date, days_per_week: profile.days_per_week, plan, is_active: true })
      .select('id')
      .single()
    if (error) return fail('Built the plan but could not save it.', 500)
    return NextResponse.json({ id: data.id, plan })
  } catch (err) {
    console.error('plan generation failed', err)
    return fail('Claude could not build the plan just now. Try again in a minute.', 502)
  }
}
