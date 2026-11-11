'use client'

import { useMemo, useState } from 'react'
import { REGION_LABEL, ROUTE_TYPE_LABEL } from '@/lib/labels'
import { REGIONS, ROUTE_TYPES, type Region, type RouteType, type SgRoute } from '@/lib/types'
import { RouteCard, type RouteStats } from './RouteCard'
import { RouteMap } from './RouteMap'

type Length = 'any' | 'short' | 'mid' | 'long'
const LENGTHS: { key: Length; label: string; test: (km: number) => boolean }[] = [
  { key: 'any', label: 'Any length', test: () => true },
  { key: 'short', label: 'Under 5 km', test: (km) => km < 5 },
  { key: 'mid', label: '5 to 10 km', test: (km) => km >= 5 && km <= 10 },
  { key: 'long', label: 'Over 10 km', test: (km) => km > 10 },
]

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-muted hover:border-strong hover:text-ink'}`}
    >
      {children}
    </button>
  )
}

export function RoutesExplorer({ routes, stats }: { routes: SgRoute[]; stats: Record<string, RouteStats> }) {
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [type, setType] = useState<RouteType | 'all'>('all')
  const [length, setLength] = useState<Length>('any')
  const [shadeOnly, setShadeOnly] = useState(false)
  const [waterOnly, setWaterOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(routes[0]?.id ?? null)

  const lengthTest = LENGTHS.find((l) => l.key === length)!.test
  const filtered = useMemo(
    () =>
      routes.filter(
        (r) =>
          (region === 'all' || r.region === region) &&
          (type === 'all' || r.route_type === type) &&
          lengthTest(r.distance_km) &&
          (!shadeOnly || r.has_shade) &&
          (!waterOnly || r.has_water_points),
      ),
    [routes, region, type, lengthTest, shadeOnly, waterOnly],
  )

  const usedRegions = REGIONS.filter((r) => routes.some((x) => x.region === r))
  const usedTypes = ROUTE_TYPES.filter((t) => routes.some((x) => x.route_type === t))

  function select(id: string) {
    setSelectedId((cur) => (cur === id ? null : id))
  }

  function clear() {
    setRegion('all')
    setType('all')
    setLength('any')
    setShadeOnly(false)
    setWaterOnly(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="lg:sticky lg:top-24 lg:order-2 lg:self-start">
        <RouteMap routes={filtered} selectedId={selectedId} onSelect={select} className="h-[260px] sm:h-[340px] lg:h-[calc(100vh-8rem)]" />
      </div>

      <div className="min-w-0 lg:order-1">
        <div className="space-y-2.5">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Pill on={region === 'all'} onClick={() => setRegion('all')}>
              All areas
            </Pill>
            {usedRegions.map((r) => (
              <Pill key={r} on={region === r} onClick={() => setRegion(r)}>
                {REGION_LABEL[r]}
              </Pill>
            ))}
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Pill on={type === 'all'} onClick={() => setType('all')}>
              All types
            </Pill>
            {usedTypes.map((t) => (
              <Pill key={t} on={type === t} onClick={() => setType(t)}>
                {ROUTE_TYPE_LABEL[t]}
              </Pill>
            ))}
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {LENGTHS.map((l) => (
              <Pill key={l.key} on={length === l.key} onClick={() => setLength(l.key)}>
                {l.label}
              </Pill>
            ))}
            <Pill on={shadeOnly} onClick={() => setShadeOnly((v) => !v)}>
              Shaded
            </Pill>
            <Pill on={waterOnly} onClick={() => setWaterOnly((v) => !v)}>
              Water points
            </Pill>
          </div>
        </div>

        <p className="mt-5 text-sm text-faint" aria-live="polite">
          {filtered.length} of {routes.length} routes
        </p>

        <div className="mt-3 space-y-3">
          {filtered.map((r) => (
            <RouteCard key={r.id} route={r} stats={stats[r.id]} selected={r.id === selectedId} onSelect={() => select(r.id)} />
          ))}
          {filtered.length === 0 && (
            <div className="card p-8 text-center">
              <p className="font-medium text-ink">Nothing matches all of those.</p>
              <button type="button" onClick={clear} className="btn-ghost mt-4">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
