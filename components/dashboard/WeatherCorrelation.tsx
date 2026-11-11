'use client'

import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'
import type { HeatImpact, TempBucket } from '@/lib/analysis'
import { formatDate } from '@/lib/dates'
import { BAND_COLOR, heatBand } from '@/lib/heat'
import { formatPace } from '@/lib/pace'

export interface ScatterPoint {
  temp: number
  pace: number
  date: string
  km: number
}

function ScatterTip({ active, payload }: TooltipProps<number, string>) {
  const p = active && (payload?.[0]?.payload as ScatterPoint | undefined)
  if (!p) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lift">
      <p className="text-xs text-faint">{formatDate(p.date, { weekday: true })}</p>
      <p className="font-display text-lg font-semibold tabular-nums text-ink">{formatPace(p.pace)}/km</p>
      <p className="text-muted">
        {p.temp}°C · {p.km} km
      </p>
    </div>
  )
}

export function WeatherCorrelation({
  impact,
  buckets,
  points,
  fit,
}: {
  impact: HeatImpact
  buckets: TempBucket[]
  points: ScatterPoint[]
  fit: { slope: number; intercept: number } | null
}) {
  const temps = points.map((p) => p.temp)
  const tMin = temps.length ? Math.floor(Math.min(...temps) - 0.5) : 24
  const tMax = temps.length ? Math.ceil(Math.max(...temps) + 0.5) : 34
  const paces = points.map((p) => p.pace)
  const pLo = paces.length ? Math.floor((Math.min(...paces) - 15) / 15) * 15 : 240
  const pHi = paces.length ? Math.ceil((Math.max(...paces) + 15) / 15) * 15 : 480

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        {impact.diffSeconds !== null ? (
          <p className="text-lg leading-snug text-ink">
            Your steady runs are{' '}
            <span className="font-display text-3xl font-semibold tabular-nums">
              {Math.abs(impact.diffSeconds)} sec/km {impact.diffSeconds >= 0 ? 'slower' : 'faster'}
            </span>{' '}
            when it&apos;s {impact.threshold}°C or hotter.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Log at least two steady runs on each side of {impact.threshold}°C to measure what the heat costs you. So far: {impact.hotRuns} hot, {impact.coolerRuns} cooler.
          </p>
        )}
        {impact.secondsPerDegree !== null && (
          <p className="mt-1 text-sm text-muted">
            Roughly {Math.abs(impact.secondsPerDegree)} sec/km per °C across {impact.steadyRuns} runs.
          </p>
        )}

        {points.length >= 3 && (
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="#D3E6D9" strokeDasharray="3 4" />
                <XAxis
                  type="number"
                  dataKey="temp"
                  domain={[tMin, tMax]}
                  tickFormatter={(v: number) => `${v}°`}
                  tick={{ fontSize: 11, fill: '#587361' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis type="number" dataKey="pace" reversed domain={[pLo, pHi]} tickFormatter={(v: number) => formatPace(v)} tick={{ fontSize: 11, fill: '#587361' }} axisLine={false} tickLine={false} width={48} />
                <ReferenceLine x={impact.threshold} stroke="#DC2626" strokeOpacity={0.35} strokeDasharray="4 4" />
                {fit && (
                  <ReferenceLine
                    segment={[
                      { x: tMin, y: fit.intercept + fit.slope * tMin },
                      { x: tMax, y: fit.intercept + fit.slope * tMax },
                    ]}
                    stroke="#0B1F14"
                    strokeOpacity={0.5}
                    strokeWidth={2}
                    ifOverflow="hidden"
                  />
                )}
                <Tooltip content={<ScatterTip />} cursor={false} />
                <Scatter
                  data={points}
                  isAnimationActive={false}
                  shape={(props: { cx?: number; cy?: number; payload?: ScatterPoint }) => {
                    const band = heatBand(props.payload?.temp)
                    return <circle cx={props.cx} cy={props.cy} r={5.5} fill={band ? BAND_COLOR[band] : '#9CB3A4'} stroke="#fff" strokeWidth={2} />
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        {points.length >= 3 && <p className="mt-1 text-xs text-faint">Each dot is a steady run. Higher is faster. The dark line is your trend, the dashed red line marks {impact.threshold}°C.</p>}
      </div>

      <table className="w-full self-start text-sm">
        <caption className="label mb-2 text-left">Median pace by temperature</caption>
        <thead className="sr-only">
          <tr>
            <th>Temperature</th>
            <th>Runs</th>
            <th>Median pace</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b, i) => {
            const color = [BAND_COLOR.cool, BAND_COLOR.warm, BAND_COLOR.hot, BAND_COLOR.hot][i]
            return (
              <tr key={b.label} className="border-b border-line last:border-0">
                <td className="py-2.5">
                  <span className="flex items-center gap-2 text-ink">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {b.label}
                  </span>
                </td>
                <td className="py-2.5 text-right text-faint">{b.runs} runs</td>
                <td className="py-2.5 text-right font-display text-lg font-semibold tabular-nums text-ink">{b.medianPace ? formatPace(b.medianPace) : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
