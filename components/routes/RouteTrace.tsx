// A route's shape drawn as an SVG line, scaled to fit its own box. Used on
// cards and as the map fallback when there is no Mapbox token.

export function tracePath(points: [number, number][], width: number, height: number, pad = 6): string {
  if (points.length < 2) return ''
  const lngs = points.map((p) => p[0])
  const lats = points.map((p) => p[1])
  const minX = Math.min(...lngs)
  const maxX = Math.max(...lngs)
  const minY = Math.min(...lats)
  const maxY = Math.max(...lats)
  const spanX = maxX - minX || 1e-6
  const spanY = maxY - minY || 1e-6
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)
  const offX = (width - spanX * scale) / 2
  const offY = (height - spanY * scale) / 2
  return points
    .map(([x, y], i) => `${i ? 'L' : 'M'}${(offX + (x - minX) * scale).toFixed(1)} ${(offY + (maxY - y) * scale).toFixed(1)}`)
    .join(' ')
}

export function RouteTrace({
  path,
  isLoop,
  className = 'h-16 w-24',
  color = '#16A34A',
  animate = false,
}: {
  path: [number, number][]
  isLoop: boolean
  className?: string
  color?: string
  animate?: boolean
}) {
  const W = 120
  const H = 80
  const d = tracePath(path, W, H, 10)
  if (!d) return <div className={className} />
  const start = d.match(/^M([\d.]+) ([\d.]+)/)
  const end = d.match(/L([\d.]+) ([\d.]+)$/)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeOpacity={0.14} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={animate ? 1 : undefined}
        className={animate ? 'animate-trace' : undefined}
      />
      {start && <circle cx={start[1]} cy={start[2]} r={3.6} fill="#fff" stroke={color} strokeWidth={2} />}
      {!isLoop && end && <circle cx={end[1]} cy={end[2]} r={3.6} fill={color} />}
    </svg>
  )
}
