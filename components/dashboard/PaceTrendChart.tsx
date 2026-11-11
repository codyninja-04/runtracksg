'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'
import { formatDate } from '@/lib/dates'
import { BAND_COLOR, heatBand, type HeatBand } from '@/lib/heat'
import { formatKm, formatPace } from '@/lib/pace'

export interface TrendPoint {
  id: string
  date: string
  pace: number
  km: number
  temp: number | null
  humidity: number | null
  where: string | null
}

const NO_WEATHER = '#9CB3A4'

const LEGEND: { key: HeatBand | 'none'; label: string; color: string }[] = [
  { key: 'cool', label: '27°C or cooler', color: BAND_COLOR.cool },
  { key: 'warm', label: '27 to 30°C', color: BAND_COLOR.warm },
  { key: 'hot', label: '30°C and up', color: BAND_COLOR.hot },
  { key: 'none', label: 'No weather', color: NO_WEATHER },
]

function dotColor(temp: number | null) {
  const band = heatBand(temp)
  return band ? BAND_COLOR[band] : NO_WEATHER
}

function TrendTooltip({ active, payload }: TooltipProps<number, string>) {
  const p = active && payload?.[0]?.payload as TrendPoint | undefined
  if (!p) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lift">
      <p className="text-xs text-faint">{formatDate(p.date, { weekday: true })}</p>
      <p className="font-semibold text-ink">{p.where ?? 'Run'}</p>
      <p className="mt-1 tabular-nums text-ink">
        <span className="font-display text-lg font-semibold">{formatPace(p.pace)}/km</span>
        <span className="text-muted"> · {formatKm(p.km, 2)} km</span>
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-muted">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor(p.temp) }} />
        {p.temp != null ? `${p.temp}°C${p.humidity != null ? `, ${p.humidity}% humidity` : ''}` : 'No weather logged'}
      </p>
    </div>
  )
}

// Pace over time on a single axis, with each run's dot coloured by the
// temperature it was run in. Faster is higher, which is how runners think.
export function PaceTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return <p className="grid h-56 place-items-center text-center text-sm text-faint">Log two or more runs to see your pace trend.</p>
  }

  const paces = points.map((p) => p.pace)
  const lo = Math.floor((Math.min(...paces) - 15) / 15) * 15
  const hi = Math.ceil((Math.max(...paces) + 15) / 15) * 15

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Dot colour shows temperature">
        {LEGEND.map((l) => (
          <li key={l.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </li>
        ))}
      </ul>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="#D3E6D9" strokeDasharray="3 4" />
            <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fontSize: 11, fill: '#587361' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis
              reversed
              domain={[lo, hi]}
              tickFormatter={(v: number) => formatPace(v)}
              tick={{ fontSize: 11, fill: '#587361' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#B3D0BC', strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="pace"
              stroke="#3D5747"
              strokeOpacity={0.55}
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: TrendPoint; index?: number }) => (
                <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill={dotColor(props.payload?.temp ?? null)} stroke="#fff" strokeWidth={2} />
              )}
              activeDot={(props: { cx?: number; cy?: number; payload?: TrendPoint }) => (
                <circle cx={props.cx} cy={props.cy} r={7} fill={dotColor(props.payload?.temp ?? null)} stroke="#fff" strokeWidth={2} />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
