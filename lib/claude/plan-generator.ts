import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import { GOAL_LABEL, PREFERRED_TIME_LABEL } from '../labels'
import { formatPace, riegel } from '../pace'
import type { PreferredTime, TrainingGoal, TrainingPlanContent } from '../types'
import { anthropic, CLAUDE_MODEL, toolInput } from './client'
import { normalizePlan } from './normalize'

const SYSTEM = `You create running training plans calibrated for Singapore's tropical climate.

Singapore-specific considerations:
- Heat and humidity significantly impact performance. Running 30 to 60 sec/km slower than the temperate climate equivalent effort is normal, and easy runs should be run by feel, not by pace.
- Best running times are before 8am or after 6:30pm. Never schedule quality sessions between 10am and 5pm.
- Build in hydration and electrolyte guidance, especially for anything over 60 minutes.
- Recovery matters more here. Heat adds cardiovascular stress beyond the run itself, so keep hard days apart and add a cutback week every third or fourth week.
- Use real Singapore routes where they fit: East Coast Park (flat, long, sea breeze), MacRitchie (shaded trail, hilly), Marina Bay loop (flat, exposed, scenic), Southern Ridges and Bukit Timah (hills), Bishan Stadium or any ActiveSG track (intervals), Bedok Reservoir (uninterrupted tempo), the Park Connector Network (long runs).
- Afternoon storms are common from November to January. Mention a backup for key sessions when it matters.

Rules for the plan:
- Exactly the number of running days the runner asked for each week. Do not list rest days.
- Increase weekly distance by no more than about 10 percent week to week.
- Target paces must be written as m:ss/km ranges and already include the heat adjustment for the suggested time of day.
- Keep every text field short and practical. Write like a coach texting an athlete, not a brochure. Do not use em dashes.

Return the plan by calling the save_training_plan tool.`

const sessionSchema = {
  type: 'object',
  properties: {
    day: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    kind: { type: 'string', enum: ['easy', 'long', 'tempo', 'intervals', 'hills', 'recovery', 'cross', 'race'] },
    title: { type: 'string', description: 'Short session name, e.g. "6 x 800m at 10K effort"' },
    distance_km: { type: 'number' },
    duration_minutes: { type: 'number' },
    target_pace: { type: 'string', description: 'Heat adjusted pace range like "6:20-6:45/km", or "by feel"' },
    time_window: { type: 'string', description: 'When to run it, e.g. "6:00-7:30am"' },
    route_suggestion: { type: 'string' },
    details: { type: 'string', description: 'One or two sentences: structure, warm up, what to watch for' },
  },
  required: ['day', 'kind', 'title', 'distance_km', 'target_pace', 'time_window', 'details'],
}

const TOOL: Anthropic.Messages.Tool = {
  name: 'save_training_plan',
  description: 'Save the finished training plan.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Two or three sentences on the shape of the block and why' },
      heat_strategy: { type: 'array', items: { type: 'string' }, description: '3 to 5 specific heat and hydration rules for this runner' },
      pace_guide: {
        type: 'array',
        items: {
          type: 'object',
          properties: { label: { type: 'string' }, pace: { type: 'string' }, note: { type: 'string' } },
          required: ['label', 'pace', 'note'],
        },
        description: 'Easy, long, tempo and interval paces for Singapore conditions',
      },
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            week: { type: 'integer' },
            focus: { type: 'string' },
            sessions: { type: 'array', items: sessionSchema },
          },
          required: ['week', 'focus', 'sessions'],
        },
      },
    },
    required: ['summary', 'heat_strategy', 'pace_guide', 'weeks'],
  },
}

export interface PlanRequest {
  current5kPace: number | null
  goal: TrainingGoal
  raceDate: string | null
  daysPerWeek: number
  preferredTime: PreferredTime
  weeks: number
  today: string
  recentRuns: { date: string; distance_km: number; pace: string; temperature_c: number | null; time: string | null; effort: number | null }[]
  heatNote: string | null
}

// Reference paces from the 5K, in cool conditions. Claude adds the heat on top.
export function referencePaces(fiveKPace: number | null): string {
  if (!fiveKPace) return 'No 5K pace given. Use the recent runs to judge fitness, and lean conservative.'
  const fiveKTime = fiveKPace * 5
  const tenK = riegel(fiveKTime, 5, 10) / 10
  const half = riegel(fiveKTime, 5, 21.0975) / 21.0975
  return [
    `5K race pace: ${formatPace(fiveKPace)}/km`,
    `10K race pace (projected): ${formatPace(tenK)}/km`,
    `Half marathon pace (projected): ${formatPace(half)}/km`,
    `Easy range: ${formatPace(fiveKPace * 1.25)} to ${formatPace(fiveKPace * 1.4)}/km`,
    `Tempo: ${formatPace(fiveKPace * 1.06)} to ${formatPace(fiveKPace * 1.1)}/km`,
  ].join('\n')
}

export function planWeeks(today: string, raceDate: string | null): number {
  if (!raceDate) return 4
  const days = (Date.parse(`${raceDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  return Math.min(12, Math.max(2, Math.ceil(days / 7)))
}

export async function generateTrainingPlan(req: PlanRequest): Promise<TrainingPlanContent> {
  const content = `Today: ${req.today}
Goal: ${GOAL_LABEL[req.goal]}${req.raceDate ? `, race on ${req.raceDate}` : ' (no race date, build a repeatable block)'}
Weeks to plan: ${req.weeks}${req.raceDate ? ' (the last week is race week, so taper into it)' : ''}
Running days per week: ${req.daysPerWeek}
Prefers to run: ${PREFERRED_TIME_LABEL[req.preferredTime]}

Reference paces, cool conditions:
${referencePaces(req.current5kPace)}
${req.heatNote ? `\nWhat their own logs say about heat: ${req.heatNote}\n` : ''}
Recent runs (newest first):
${req.recentRuns.length ? req.recentRuns.map((r) => `- ${r.date}${r.time ? ` ${r.time}` : ''}: ${r.distance_km} km at ${r.pace}/km${r.temperature_c != null ? `, ${r.temperature_c}°C` : ''}${r.effort ? `, effort ${r.effort}/10` : ''}`).join('\n') : 'None logged yet. Start gently.'}

Build my plan.`

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 12000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content }],
  })

  const plan = normalizePlan(toolInput(response.content, TOOL.name))
  if (!plan) throw new Error('Claude returned a plan we could not read.')
  return plan
}
