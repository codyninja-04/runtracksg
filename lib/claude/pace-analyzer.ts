import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import type { HeatImpact, Summary, TempBucket } from '../analysis'
import { formatPace } from '../pace'
import type { InsightSet } from '../types'
import { anthropic, CLAUDE_MODEL, toolInput } from './client'
import { normalizeInsights } from './normalize'

const SYSTEM = `You are a running coach in Singapore looking at one runner's own log.
You get numbers that have already been calculated. Do not recalculate them and do not invent any figure that is not in the data.

Write like a coach who knows the runner: direct, specific, warm, no hype. Use sec/km and °C. Refer to Singapore conditions (humidity, the 3pm sun, morning vs evening) where it helps. Do not use em dashes.

If the data is thin, say what is missing and what to log next instead of guessing.

Return the result by calling the write_insights tool.`

const TOOL: Anthropic.Messages.Tool = {
  name: 'write_insights',
  description: 'Save the pace and weather insights for this runner.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'One sentence, the single most useful finding, with a number in it if there is one' },
      points: { type: 'array', items: { type: 'string' }, description: '2 to 4 short observations backed by the data' },
      suggestion: { type: 'string', description: 'One concrete thing to do in the next week' },
    },
    required: ['headline', 'points', 'suggestion'],
  },
}

export interface AnalyzerInput {
  impact: HeatImpact
  buckets: TempBucket[]
  dayParts: { part: string; runs: number; medianPace: number | null; medianTemp: number | null }[]
  summary: Summary
  recent: { date: string; time: string | null; km: number; pace: number; temp: number | null; humidity: number | null; effort: number | null; type: string | null }[]
}

export function describeData(input: AnalyzerInput): string {
  const { impact, buckets, dayParts, summary, recent } = input
  const lines = [
    `Totals: ${summary.totalRuns} runs, ${summary.totalKm} km. This week ${summary.thisWeekKm} km over ${summary.thisWeekRuns} runs, last week ${summary.lastWeekKm} km.`,
    `30 day average pace: ${formatPace(summary.avgPace30d)}/km. Longest run: ${summary.longestKm} km.`,
    '',
    `Heat comparison (steady runs only, threshold ${impact.threshold}°C): ${impact.steadyRuns} runs with weather, ${impact.hotRuns} hot, ${impact.coolerRuns} cooler.`,
    impact.diffSeconds !== null
      ? `Median pace hot ${formatPace(impact.hotMedianPace)}/km vs cooler ${formatPace(impact.coolerMedianPace)}/km. Difference: ${impact.diffSeconds} sec/km.`
      : 'Not enough hot and cooler runs to compare yet (need at least 2 of each).',
    impact.secondsPerDegree !== null ? `Line fit: ${impact.secondsPerDegree} sec/km per extra °C (r = ${impact.correlation}).` : 'Line fit needs at least 6 steady runs with weather.',
    '',
    'Median pace by temperature band:',
    ...buckets.map((b) => `- ${b.label}: ${b.runs} runs${b.medianPace ? `, ${formatPace(b.medianPace)}/km` : ''}`),
    '',
    'By time of day:',
    ...(dayParts.length ? dayParts.map((d) => `- ${d.part}: ${d.runs} runs, ${formatPace(d.medianPace)}/km${d.medianTemp != null ? `, typically ${d.medianTemp}°C` : ''}`) : ['- no start times logged']),
    '',
    'Most recent runs:',
    ...recent.map((r) => `- ${r.date}${r.time ? ` ${r.time}` : ''} ${r.type ?? 'run'}: ${r.km} km at ${formatPace(r.pace)}/km${r.temp != null ? `, ${r.temp}°C` : ''}${r.humidity != null ? ` ${r.humidity}% RH` : ''}${r.effort ? `, effort ${r.effort}/10` : ''}`),
  ]
  return lines.join('\n')
}

export async function analyzePace(input: AnalyzerInput): Promise<InsightSet> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 900,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: describeData(input) }],
  })

  const insights = normalizeInsights(toolInput(response.content, TOOL.name))
  if (!insights) throw new Error('Claude returned insights we could not read.')
  return insights
}
