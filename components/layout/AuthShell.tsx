import { Suspense } from 'react'
import { GoogleAuth } from './GoogleAuth'

const SAMPLE = [
  { time: '6:40am', place: 'East Coast Park', km: '10.2', pace: '5:41', temp: 27, color: '#3B82F6' },
  { time: '7:15pm', place: 'Marina Bay loop', km: '7.0', pace: '5:52', temp: 29, color: '#F59E0B' },
  { time: '2:50pm', place: 'Kallang PCN', km: '8.1', pace: '6:24', temp: 33, color: '#DC2626' },
]

// Split screen: sign in on the left, three example runs on the right that make
// the point of the app without a paragraph of copy.
export function AuthShell({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <Suspense>
          <GoogleAuth mode={mode} />
        </Suspense>
      </div>
      <div className="lane-lines relative hidden overflow-hidden border-l border-line bg-gradient-to-br from-primary-wash via-bg to-sunk lg:flex lg:items-center lg:justify-center" aria-hidden>
        <div className="w-full max-w-md space-y-3 px-10">
          {SAMPLE.map((r, i) => (
            <div key={r.place} className="card flex animate-rise-in items-center gap-4 p-4" style={{ animationDelay: `${150 + i * 120}ms` }}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-semibold" style={{ color: '#0B1F14', background: `${r.color}24`, boxShadow: `inset 0 -3px 0 ${r.color}` }}>
                {r.temp}°
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{r.place}</p>
                <p className="text-sm text-muted">
                  {r.time} · {r.km} km
                </p>
              </div>
              <span className="stat text-2xl">
                {r.pace}
                <span className="ml-0.5 text-sm font-medium text-faint">/km</span>
              </span>
            </div>
          ))}
          <p className="heading pt-8 text-3xl leading-tight">Same legs. Same effort. 43 seconds a kilometre apart.</p>
          <p className="text-sm text-muted">That gap is the weather, not your fitness. RunTrackSG shows you how big it is for you.</p>
        </div>
      </div>
    </div>
  )
}
