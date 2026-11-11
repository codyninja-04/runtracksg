import Link from 'next/link'
import { REGION_LABEL, ROUTE_TYPE_LABEL, SURFACE_LABEL } from '@/lib/labels'
import { formatKm, formatPace } from '@/lib/pace'
import type { SgRoute } from '@/lib/types'
import { DropIcon, MountainIcon, PlusIcon, TrainIcon, TreeIcon } from '../icons'
import { RouteTrace } from './RouteTrace'

export interface RouteStats {
  runs: number
  bestPace: number | null
}

export function RouteFacts({ route }: { route: SgRoute }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {route.route_type && <span className="chip">{ROUTE_TYPE_LABEL[route.route_type]}</span>}
      {route.surface && <span className="chip">{SURFACE_LABEL[route.surface]}</span>}
      <span className={`chip ${route.has_shade ? 'border-primary/30 bg-primary-wash text-primary-ink' : ''}`}>
        <TreeIcon className="h-3.5 w-3.5" />
        {route.has_shade ? 'Shaded' : 'Exposed'}
      </span>
      {route.has_water_points && (
        <span className="chip border-cool/30 bg-cool-soft text-cool-ink">
          <DropIcon className="h-3.5 w-3.5" />
          Water
        </span>
      )}
      {route.has_toilets && <span className="chip">Toilets</span>}
    </div>
  )
}

export function RouteCard({ route, stats, selected, onSelect }: { route: SgRoute; stats?: RouteStats; selected?: boolean; onSelect?: () => void }) {
  return (
    <article
      className={`card group relative p-5 transition ${selected ? 'border-primary ring-4 ring-primary/10' : 'hover:border-strong hover:shadow-lift'}`}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <p className="label">
            {route.region ? REGION_LABEL[route.region] : 'Singapore'}
            {route.area ? ` · ${route.area}` : ''}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-ink">
            {onSelect ? (
              <button type="button" onClick={onSelect} className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
                {route.name}
              </button>
            ) : (
              route.name
            )}
          </h3>
          <div className="mt-3 flex items-baseline gap-5">
            <span className="stat text-3xl">
              {formatKm(route.distance_km)}
              <span className="ml-1 text-base font-medium text-faint">km</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap text-sm text-muted">
              <MountainIcon className="h-4 w-4" />
              {route.elevation_gain_m} m
            </span>
            <span className="whitespace-nowrap text-sm text-muted">{route.is_loop ? 'Loop' : 'Point to point'}</span>
          </div>
        </div>
        <RouteTrace path={route.path} isLoop={route.is_loop} className="h-20 w-28 shrink-0" />
      </div>

      <div className="mt-4">
        <RouteFacts route={route} />
      </div>

      {selected && (
        <div className="relative mt-4 animate-fade-in space-y-3 border-t border-line pt-4 text-sm leading-relaxed text-muted">
          {route.description && <p>{route.description}</p>}
          {route.shade_note && (
            <p className="flex gap-2">
              <TreeIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {route.shade_note}
            </p>
          )}
          {route.nearest_mrt && (
            <p className="flex gap-2">
              <TrainIcon className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
              {route.start_point ? `${route.start_point}. ` : ''}Nearest MRT: {route.nearest_mrt}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-faint">
              {stats && stats.runs > 0 ? `You've logged ${stats.runs} run${stats.runs === 1 ? '' : 's'} here${stats.bestPace ? `, best ${formatPace(stats.bestPace)}/km` : ''}.` : "You haven't logged a run here yet."}
            </p>
            <Link href={`/runs/new?route=${route.id}`} className="btn-primary py-2">
              <PlusIcon className="h-4 w-4" />
              Log a run here
            </Link>
          </div>
        </div>
      )}

      {!selected && stats && stats.runs > 0 && (
        <p className="mt-3 text-xs font-medium text-primary-ink">
          Run {stats.runs}× {stats.bestPace ? `· best ${formatPace(stats.bestPace)}/km` : ''}
        </p>
      )}
    </article>
  )
}
