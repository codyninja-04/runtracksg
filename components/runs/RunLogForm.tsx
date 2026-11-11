'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { heatAdjustmentPct, heatBand, heatIndexC, BAND_COLOR, coolEquivalentPace } from '@/lib/heat'
import { EFFORT_LABEL, REGION_LABEL, RUN_TYPE_LABEL } from '@/lib/labels'
import { formatKm, formatPace, joinDuration, paceFrom, splitDuration } from '@/lib/pace'
import { REGIONS, RUN_TYPES, type RunLog, type RunType, type SgRoute, type WeatherSource } from '@/lib/types'
import { RefreshIcon, ThermoIcon } from '../icons'

type RouteOption = Pick<SgRoute, 'id' | 'name' | 'region' | 'distance_km' | 'is_loop'>

type WeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; source: Exclude<WeatherSource, 'manual'> }
  | { status: 'error'; message: string }

const CUSTOM = '__custom'

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
  step = 'any',
  inputMode = 'decimal',
  className = '',
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  placeholder?: string
  step?: string
  inputMode?: 'decimal' | 'numeric'
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          min={0}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-10 text-lg font-semibold tabular-nums"
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">{suffix}</span>}
      </div>
    </div>
  )
}

export function RunLogForm({
  routes,
  today,
  nowTime,
  initial,
  defaultRouteId,
}: {
  routes: RouteOption[]
  today: string
  nowTime: string
  initial?: RunLog
  defaultRouteId?: string | null
}) {
  const router = useRouter()
  const editing = !!initial
  const startDur = initial ? splitDuration(initial.duration_minutes) : null

  const [date, setDate] = useState(initial?.run_date ?? today)
  const [time, setTime] = useState(initial?.run_time?.slice(0, 5) ?? nowTime)
  const [distance, setDistance] = useState(initial ? String(initial.distance_km) : '')
  const [h, setH] = useState(startDur ? String(startDur.h) : '')
  const [m, setM] = useState(startDur ? String(startDur.m) : '')
  const [s, setS] = useState(startDur ? String(startDur.s) : '')
  const [runType, setRunType] = useState<RunType>(initial?.run_type ?? 'easy')
  const [routeId, setRouteId] = useState<string>(initial ? (initial.route_id ?? (initial.custom_route ? CUSTOM : '')) : (defaultRouteId ?? ''))
  const [customRoute, setCustomRoute] = useState(initial?.custom_route ?? '')
  const [temp, setTemp] = useState(initial?.temperature_c != null ? String(initial.temperature_c) : '')
  const [humidity, setHumidity] = useState(initial?.humidity_percent != null ? String(initial.humidity_percent) : '')
  const [manualWeather, setManualWeather] = useState(editing && initial?.temperature_c != null)
  const [weather, setWeather] = useState<WeatherState>(initial?.weather_source && initial.weather_source !== 'manual' ? { status: 'ok', source: initial.weather_source } : { status: 'idle' })
  const [effort, setEffort] = useState(initial?.perceived_effort ?? 5)
  const [effortSet, setEffortSet] = useState(initial?.perceived_effort != null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedFor = useRef<string | null>(editing ? `${initial?.run_date}|${initial?.run_time?.slice(0, 5)}|${initial?.route_id ?? ''}` : null)

  const km = Number(distance)
  const minutes = joinDuration(Number(h) || 0, Number(m) || 0, Number(s) || 0)
  const pace = paceFrom(km, minutes)
  const tempN = temp === '' ? null : Number(temp)
  const humN = humidity === '' ? null : Number(humidity)
  const hasWeather = tempN !== null && humN !== null && Number.isFinite(tempN) && Number.isFinite(humN)
  const band = heatBand(tempN)
  const coolPace = pace && hasWeather ? coolEquivalentPace(pace, tempN!, humN!) : null
  const selectedRoute = routes.find((r) => r.id === routeId) ?? null

  const grouped = useMemo(() => {
    const byRegion = REGIONS.map((reg) => ({ region: reg, items: routes.filter((r) => r.region === reg) })).filter((g) => g.items.length)
    const other = routes.filter((r) => !r.region)
    return other.length ? [...byRegion, { region: null, items: other }] : byRegion
  }, [routes])

  // Pull the weather for the date, time and route, unless the runner typed it in.
  useEffect(() => {
    if (manualWeather || !date || date > today) return
    const realRoute = routeId && routeId !== CUSTOM ? routeId : ''
    const key = `${date}|${time}|${realRoute}`
    if (fetchedFor.current === key) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setWeather({ status: 'loading' })
      try {
        const qs = new URLSearchParams({ date })
        if (time) qs.set('time', time)
        if (realRoute) qs.set('route_id', realRoute)
        const res = await fetch(`/api/weather?${qs}`, { signal: controller.signal })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Weather lookup failed.')
        fetchedFor.current = key
        setTemp(String(body.conditions.temperature_c))
        setHumidity(String(body.conditions.humidity_percent))
        setWeather({ status: 'ok', source: body.conditions.source })
      } catch (err) {
        if (controller.signal.aborted) return
        setWeather({ status: 'error', message: err instanceof Error ? err.message : 'Weather lookup failed.' })
      }
    }, 450)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [date, time, routeId, manualWeather, today])

  function chooseRoute(id: string) {
    setRouteId(id)
    const r = routes.find((x) => x.id === id)
    if (r && !distance) setDistance(String(r.distance_km))
  }

  function refetchWeather() {
    fetchedFor.current = null
    setManualWeather(false)
    // Flipping manual off re-runs the lookup effect, and the cleared key makes
    // sure it actually fetches.
    setWeather({ status: 'idle' })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!(km > 0)) return setError('Add how far you ran.')
    if (!(minutes > 0)) return setError('Add how long it took.')
    if (routeId === CUSTOM && !customRoute.trim()) return setError('Name the route, or pick one from the list.')

    setSaving(true)
    const payload = {
      run_date: date,
      run_time: time || null,
      distance_km: km,
      duration_minutes: minutes,
      route_id: routeId && routeId !== CUSTOM ? routeId : null,
      custom_route: routeId === CUSTOM ? customRoute : null,
      temperature_c: hasWeather ? tempN : null,
      humidity_percent: hasWeather ? humN : null,
      weather_source: hasWeather ? (manualWeather || weather.status !== 'ok' ? 'manual' : weather.source) : null,
      perceived_effort: effortSet ? effort : null,
      run_type: runType,
      notes,
    }
    try {
      const res = await fetch(editing ? `/api/runs/${initial!.id}` : '/api/runs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not save the run.')
      router.push(`/runs/${body.id}${editing ? '' : '?logged=1'}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the run.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="space-y-6">
        {/* Distance + time */}
        <section className="card p-5 sm:p-6">
          <h2 className="label">The run</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="field-label">Distance</span>
              <NumberField id="distance" label="Distance in kilometres" value={distance} onChange={setDistance} suffix="km" placeholder="5.0" step="0.01" />
              {selectedRoute && Number(distance) !== selectedRoute.distance_km && (
                <button type="button" className="mt-1.5 text-xs font-medium text-primary-ink hover:underline" onClick={() => setDistance(String(selectedRoute.distance_km))}>
                  Use route distance ({formatKm(selectedRoute.distance_km)} km)
                </button>
              )}
            </div>
            <div>
              <span className="field-label">Time</span>
              <div className="grid grid-cols-3 gap-2">
                <NumberField id="dur-h" label="Hours" value={h} onChange={setH} suffix="h" placeholder="0" step="1" inputMode="numeric" />
                <NumberField id="dur-m" label="Minutes" value={m} onChange={setM} suffix="m" placeholder="28" step="1" inputMode="numeric" />
                <NumberField id="dur-s" label="Seconds" value={s} onChange={setS} suffix="s" placeholder="30" step="1" inputMode="numeric" />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <span className="field-label">Type</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Run type">
              {RUN_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={runType === t}
                  onClick={() => setRunType(t)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${runType === t ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:border-strong hover:text-ink'}`}
                >
                  {RUN_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* When + where */}
        <section className="card p-5 sm:p-6">
          <h2 className="label">When and where</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="field-label">
                Date
              </label>
              <input id="date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
            </div>
            <div>
              <label htmlFor="time" className="field-label">
                Start time
              </label>
              <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="route" className="field-label">
              Route
            </label>
            <select id="route" value={routeId} onChange={(e) => chooseRoute(e.target.value)} className="input">
              <option value="">Not saying</option>
              {grouped.map((g) => (
                <optgroup key={g.region ?? 'other'} label={g.region ? REGION_LABEL[g.region] : 'Other'}>
                  {g.items.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {formatKm(r.distance_km)} km
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={CUSTOM}>Somewhere else…</option>
            </select>
            {routeId === CUSTOM && (
              <input
                aria-label="Custom route name"
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value)}
                maxLength={120}
                placeholder="e.g. Tampines PCN to Pasir Ris"
                className="input mt-2"
                autoFocus
              />
            )}
          </div>
        </section>

        {/* Weather */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="label">Conditions</h2>
            {!manualWeather ? (
              <button type="button" onClick={() => setManualWeather(true)} className="text-xs font-semibold text-primary-ink hover:underline">
                Enter by hand
              </button>
            ) : (
              <button type="button" onClick={refetchWeather} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink hover:underline">
                <RefreshIcon className="h-3.5 w-3.5" />
                Look it up instead
              </button>
            )}
          </div>

          {!manualWeather && (
            <div className="mt-4" aria-live="polite">
              {weather.status === 'loading' && <div className="skeleton h-16 w-full rounded-xl" />}
              {weather.status === 'ok' && hasWeather && (
                <div className="flex items-center gap-4 rounded-xl p-3" style={{ background: band ? `${BAND_COLOR[band]}12` : undefined }}>
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface shadow-card" style={{ color: band ? BAND_COLOR[band] : undefined }}>
                    <ThermoIcon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="stat text-2xl">
                      {tempN}°C <span className="text-lg font-medium text-muted">· {humN}% humidity</span>
                    </p>
                    <p className="text-xs text-faint">
                      Feels like {Math.round(heatIndexC(tempN!, humN!))}°C · via {weather.source === 'openweather' ? 'OpenWeather' : 'Open-Meteo'}
                    </p>
                  </div>
                </div>
              )}
              {weather.status === 'error' && (
                <p className="rounded-xl bg-warm-soft p-3 text-sm text-warm-ink">
                  {weather.message}{' '}
                  <button type="button" className="font-semibold underline" onClick={() => setManualWeather(true)}>
                    Enter it by hand
                  </button>
                </p>
              )}
              {weather.status === 'idle' && <p className="text-sm text-faint">Weather fills in once the date is set.</p>}
            </div>
          )}

          {manualWeather && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="temp" className="field-label">
                  Temperature
                </label>
                <div className="relative">
                  <input id="temp" type="number" inputMode="decimal" step="0.1" min={10} max={45} value={temp} onChange={(e) => setTemp(e.target.value)} className="input pr-10" placeholder="30" />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">°C</span>
                </div>
              </div>
              <div>
                <label htmlFor="humidity" className="field-label">
                  Humidity
                </label>
                <div className="relative">
                  <input id="humidity" type="number" inputMode="numeric" step="1" min={0} max={100} value={humidity} onChange={(e) => setHumidity(e.target.value)} className="input pr-10" placeholder="75" />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">%</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Effort + notes */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <label htmlFor="effort" className="label">
              How hard did it feel
            </label>
            <span className="text-sm font-semibold text-ink">{effortSet ? `${effort} · ${EFFORT_LABEL[effort]}` : 'Slide to rate'}</span>
          </div>
          <input
            id="effort"
            type="range"
            min={1}
            max={10}
            step={1}
            value={effort}
            onChange={(e) => {
              setEffort(Number(e.target.value))
              setEffortSet(true)
            }}
            className="effort mt-5"
            aria-valuetext={`${effort}, ${EFFORT_LABEL[effort]}`}
          />
          <div className="mt-2 flex justify-between text-[0.7rem] text-faint">
            <span>Easy chat</span>
            <span>All out</span>
          </div>

          <label htmlFor="notes" className="field-label mt-6">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Legs felt heavy after the first 3k, stopped for water at Bedok Jetty…"
            className="input resize-y"
          />
        </section>
      </div>

      {/* Live summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="bg-ink p-6 text-white">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/60">Average pace</p>
            <p className="mt-2 font-display text-6xl font-semibold tabular-nums leading-none">
              {formatPace(pace)}
              <span className="ml-1 text-xl font-medium text-white/50">/km</span>
            </p>
            <p className="mt-3 text-sm text-white/70">
              {km > 0 ? `${formatKm(km, 2)} km` : '– km'} in {minutes > 0 ? `${Number(h) ? `${Number(h)}h ` : ''}${Number(m) || 0}m ${Number(s) || 0}s` : '–'}
            </p>
          </div>
          <div className="space-y-3 p-5 text-sm">
            {coolPace && hasWeather ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Cool day equivalent</span>
                  <span className="font-display text-xl font-semibold tabular-nums text-cool-ink">{formatPace(coolPace)}/km</span>
                </div>
                <p className="text-xs leading-relaxed text-faint">
                  At {tempN}°C and {humN}% humidity the heat costs about {Math.round(heatAdjustmentPct(tempN!, humN!))}%, so this effort is worth roughly {formatPace(coolPace)}/km on a cool morning.
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-faint">Add distance, time and weather to see what this run is worth on a cool day.</p>
            )}
          </div>
          <div className="border-t border-line p-5">
            {error && (
              <p role="alert" className="mb-3 rounded-lg bg-hot-soft px-3 py-2 text-sm text-hot-ink">
                {error}
              </p>
            )}
            <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Log run'}
            </button>
            {editing && (
              <button type="button" onClick={() => router.back()} className="btn-quiet mt-2 w-full">
                Cancel
              </button>
            )}
          </div>
        </div>
      </aside>
    </form>
  )
}
