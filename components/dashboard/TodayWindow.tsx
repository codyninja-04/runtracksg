import { BAND_COLOR, heatAdvice, heatBand, heatIndexC } from '@/lib/heat'
import type { Outlook } from '@/lib/weather'
import { MoonIcon, SunIcon } from '../icons'

function hourLabel(h: number) {
  const suffix = h >= 12 ? 'p' : 'a'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${suffix}`
}

// Today in one card: what it is like out there now, and the coolest stretch
// still ahead. The strip is the whole day so you can see the 3pm wall.
export function TodayWindow({ outlook, currentHour, coolPace }: { outlook: Outlook; currentHour: number; coolPace: number | null }) {
  const { now, hours, best } = outlook
  if (!now && !hours.length) {
    return (
      <section className="card p-5">
        <h2 className="label">Today</h2>
        <p className="mt-3 text-sm text-muted">Weather is not reachable right now. Rule of thumb: before 8am or after 6:30pm.</p>
      </section>
    )
  }

  const band = heatBand(now?.temperature_c)
  const evening = best ? best.start >= 17 : currentHour >= 12

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="label">Right now in Singapore</h2>
          {now && (
            <>
              <div className="mt-2 flex items-end gap-3">
                <p className="stat text-5xl">{Math.round(now.temperature_c)}°</p>
                <p className="pb-1 text-sm leading-tight text-muted">
                  {now.humidity_percent}% humidity
                  <br />
                  feels like {Math.round(heatIndexC(now.temperature_c, now.humidity_percent))}°
                </p>
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: band ? BAND_COLOR[band] : '#9CB3A4' }} />
                {heatAdvice(now.temperature_c, now.humidity_percent, coolPace)}
              </p>
            </>
          )}
        </div>
        {best && (
          <div className="rounded-2xl bg-ink px-4 py-3 text-white">
            <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/60">
              {evening ? <MoonIcon className="h-3.5 w-3.5" /> : <SunIcon className="h-3.5 w-3.5" />}
              Coolest window left
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
              {hourLabel(best.start)}m to {hourLabel(best.end % 24)}m
            </p>
            <p className="text-xs text-white/70">
              around {best.avgTemp}°C, heat cost about {Math.round(best.adjustmentPct)}%
            </p>
          </div>
        )}
      </div>

      {hours.length > 0 && (
        <div className="overflow-x-auto border-t border-line px-3 pb-4 pt-3 sm:px-5">
          <ol className="grid min-w-[560px] auto-cols-fr grid-flow-col gap-1" aria-label="Hourly temperature today">
            {hours.map((h) => {
              const b = heatBand(h.temperature_c)
              const inBest = best && h.hour >= best.start && h.hour < best.end
              const past = h.hour < currentHour
              return (
                <li
                  key={h.hour}
                  className={`flex flex-col items-center rounded-lg py-1.5 ${inBest ? 'bg-primary-soft ring-1 ring-primary/40' : ''} ${past ? 'opacity-40' : ''}`}
                  title={`${hourLabel(h.hour)}m: ${h.temperature_c}°C, ${h.humidity_percent}% humidity`}
                >
                  <span className="h-6 w-1.5 rounded-full" style={{ background: b ? BAND_COLOR[b] : '#9CB3A4', opacity: 0.35 + Math.min(Math.max((h.temperature_c - 24) / 10, 0), 1) * 0.65 }} />
                  <span className="mt-1 text-[0.7rem] font-semibold tabular-nums text-ink">{Math.round(h.temperature_c)}°</span>
                  <span className="text-[0.6rem] text-faint">{h.hour % 3 === 0 ? hourLabel(h.hour) : ' '}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}
