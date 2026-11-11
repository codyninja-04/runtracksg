'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { SgRoute } from '@/lib/types'

type MapRoute = Pick<SgRoute, 'id' | 'name' | 'path' | 'is_loop'>

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
// Mainland Singapore, used for the fallback projection and the initial view.
const BOUNDS: [[number, number], [number, number]] = [
  [103.6, 1.22],
  [104.05, 1.47],
]

function geojson(routes: MapRoute[]) {
  return {
    type: 'FeatureCollection' as const,
    features: routes
      .filter((r) => r.path.length > 1)
      .map((r) => ({
        type: 'Feature' as const,
        id: r.id,
        properties: { id: r.id, name: r.name },
        geometry: { type: 'LineString' as const, coordinates: r.path },
      })),
  }
}

function boundsOf(path: [number, number][]): [[number, number], [number, number]] {
  const lngs = path.map((p) => p[0])
  const lats = path.map((p) => p[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

export function RouteMap({
  routes,
  selectedId,
  onSelect,
  className = 'h-[420px]',
}: {
  routes: MapRoute[]
  selectedId: string | null
  onSelect?: (id: string) => void
  className?: string
}) {
  if (!TOKEN) return <FallbackMap routes={routes} selectedId={selectedId} onSelect={onSelect} className={className} />
  return <MapboxRouteMap routes={routes} selectedId={selectedId} onSelect={onSelect} className={className} />
}

function MapboxRouteMap({ routes, selectedId, onSelect, className }: { routes: MapRoute[]; selectedId: string | null; onSelect?: (id: string) => void; className: string }) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default
        if (cancelled || !container.current) return
        mapboxgl.accessToken = TOKEN as string
        const m = new mapboxgl.Map({
          container: container.current,
          style: 'mapbox://styles/mapbox/outdoors-v12',
          bounds: BOUNDS,
          fitBoundsOptions: { padding: 24 },
          attributionControl: true,
          cooperativeGestures: true,
        })
        m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
        m.on('load', () => {
          m.addSource('routes', { type: 'geojson', data: geojson(routes), promoteId: 'id' })
          m.addLayer({
            id: 'routes-casing',
            type: 'line',
            source: 'routes',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#ffffff', 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 9, 6] },
          })
          m.addLayer({
            id: 'routes-line',
            type: 'line',
            source: 'routes',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#16A34A', '#587361'],
              'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 5, 3],
              'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0.7],
            },
          })
          m.on('click', 'routes-line', (e) => {
            const feature = e.features?.[0] as { properties?: { id?: unknown } } | undefined
            const id = feature?.properties?.id
            if (typeof id === 'string') selectRef.current?.(id)
          })
          m.on('mouseenter', 'routes-line', () => (m.getCanvas().style.cursor = 'pointer'))
          m.on('mouseleave', 'routes-line', () => (m.getCanvas().style.cursor = ''))
          setReady(true)
        })
        map.current = m
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
    // The map is built once. Route and selection changes are pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    const source = m.getSource('routes')
    if (source && 'setData' in source) (source as unknown as { setData: (d: unknown) => void }).setData(geojson(routes))
  }, [ready, routes])

  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    for (const r of routes) m.setFeatureState({ source: 'routes', id: r.id }, { selected: r.id === selectedId })
    const chosen = routes.find((r) => r.id === selectedId)
    if (chosen && chosen.path.length > 1) m.fitBounds(boundsOf(chosen.path), { padding: 60, maxZoom: 15.5, duration: 900 })
  }, [ready, routes, selectedId])

  if (failed) return <FallbackMap routes={routes} selectedId={selectedId} onSelect={onSelect} className={className} />

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-sunk ${className}`}>
      <div ref={container} className="absolute inset-0" />
      {!ready && <div className="skeleton absolute inset-0" />}
    </div>
  )
}

// No token: draw every route on a plain projected grid of Singapore. Still
// useful for seeing where things are relative to each other.
function FallbackMap({ routes, selectedId, onSelect, className }: { routes: MapRoute[]; selectedId: string | null; onSelect?: (id: string) => void; className: string }) {
  const W = 900
  const H = 500
  const [[x0, y0], [x1, y1]] = BOUNDS
  const sx = W / (x1 - x0)
  const sy = H / (y1 - y0)
  const s = Math.min(sx, sy)
  const ox = (W - (x1 - x0) * s) / 2
  const oy = (H - (y1 - y0) * s) / 2
  const project = ([lng, lat]: [number, number]) => [ox + (lng - x0) * s, oy + (y1 - lat) * s] as const
  const ordered = [...routes].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))

  return (
    <div className={`lane-lines relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-primary-wash to-sunk ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Route positions across Singapore">
        {ordered.map((r) => {
          if (r.path.length < 2) return null
          const d = r.path.map((p, i) => `${i ? 'L' : 'M'}${project(p).join(' ')}`).join(' ')
          const on = r.id === selectedId
          const [cx, cy] = project(r.path[0])
          return (
            <g key={r.id} onClick={() => onSelect?.(r.id)} className={onSelect ? 'cursor-pointer' : undefined}>
              <title>{r.name}</title>
              <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
              <path d={d} fill="none" stroke={on ? '#16A34A' : '#587361'} strokeOpacity={on ? 1 : 0.55} strokeWidth={on ? 5 : 3} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={cx} cy={cy} r={on ? 6 : 4} fill="#fff" stroke={on ? '#16A34A' : '#587361'} strokeWidth={2} />
              {on && (
                <text x={cx + 10} y={cy - 10} className="fill-ink text-[18px] font-semibold">
                  {r.name}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <p className="absolute bottom-2 right-3 text-[0.68rem] text-faint">Add a Mapbox token for the full map</p>
    </div>
  )
}
