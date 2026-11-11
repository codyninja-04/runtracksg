import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { ArrowRightIcon, CalendarIcon, RouteIcon, ThermoIcon } from '@/components/icons'

// A typical clear day in Singapore, 5am to 10pm. Used to draw the hero curve.
const DAY = [25.6, 25.4, 25.6, 26.4, 27.8, 29.2, 30.6, 31.6, 32.3, 32.6, 32.4, 31.8, 30.9, 29.8, 28.7, 27.9, 27.3, 26.9]
const START_HOUR = 5

function DayCurve() {
  const W = 560
  const H = 220
  const pad = { l: 8, r: 8, t: 24, b: 30 }
  const min = 24.5
  const max = 33.5
  const x = (i: number) => pad.l + (i / (DAY.length - 1)) * (W - pad.l - pad.r)
  const y = (t: number) => pad.t + (1 - (t - min) / (max - min)) * (H - pad.t - pad.b)
  const line = DAY.map((t, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(t).toFixed(1)}`).join(' ')
  const area = `${line} L${x(DAY.length - 1)} ${H - pad.b} L${x(0)} ${H - pad.b} Z`
  const hx = (hour: number) => x(hour - START_HOUR)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Temperature through a typical Singapore day, coolest before 8am and after 6:30pm">
      <defs>
        <linearGradient id="heat" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.3" stopColor="#F59E0B" />
          <stop offset="0.5" stopColor="#DC2626" />
          <stop offset="0.72" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="heatFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#DC2626" stopOpacity="0.12" />
          <stop offset="1" stopColor="#DC2626" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={hx(5)} y={pad.t - 14} width={hx(8) - hx(5)} height={H - pad.t - pad.b + 14} rx="10" fill="#16A34A" fillOpacity="0.1" />
      <rect x={hx(18.5)} y={pad.t - 14} width={hx(22) - hx(18.5)} height={H - pad.t - pad.b + 14} rx="10" fill="#16A34A" fillOpacity="0.1" />
      <text x={hx(6.5)} y={pad.t} textAnchor="middle" className="fill-primary-ink text-[11px] font-semibold uppercase tracking-wider">
        Run here
      </text>
      <text x={hx(20.25)} y={pad.t} textAnchor="middle" className="fill-primary-ink text-[11px] font-semibold uppercase tracking-wider">
        Or here
      </text>
      <path d={area} fill="url(#heatFill)" />
      <path d={line} fill="none" stroke="url(#heat)" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray={1} className="animate-trace" />
      <text x={hx(14)} y={y(32.6) - 12} textAnchor="middle" className="fill-ink text-[13px] font-semibold">
        32.6°C at 2pm
      </text>
      {[6, 9, 12, 15, 18, 21].map((h) => (
        <text key={h} x={hx(h)} y={H - 8} textAnchor="middle" className="fill-faint text-[11px]">
          {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
        </text>
      ))}
    </svg>
  )
}

const FEATURES = [
  {
    Icon: ThermoIcon,
    title: 'Heat adjusted pace',
    body: 'Every run gets the weather for when and where you ran it, plus what that pace is worth on a cool morning. Stop judging a 3pm run against a 6am one.',
  },
  {
    Icon: RouteIcon,
    title: 'Real Singapore routes',
    body: 'East Coast, MacRitchie, Marina Bay, the Southern Ridges and the park connectors, with distance, climb, shade and where the water points are.',
  },
  {
    Icon: CalendarIcon,
    title: 'Plans that respect the weather',
    body: 'Claude builds your week around the cool slots, adds the recovery the heat demands, and gives you target paces that already account for the humidity.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-quiet">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <main>
        <section className="lane-lines border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-10">
            <div className="animate-rise-in">
              <p className="label">Running log for Singapore</p>
              <h1 className="heading mt-3 text-[3.2rem] leading-[0.92] sm:text-7xl">
                Run Singapore.
                <br />
                <span className="text-primary">Not against it.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
                A 3pm run and a 7am run are different sports here. RunTrackSG logs your runs with the weather they were run in, shows you what the heat actually costs you, and plans your training around it.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="btn-primary px-5 py-3 text-base">
                  Start logging free
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/login" className="btn-ghost px-5 py-3 text-base">
                  I have an account
                </Link>
              </div>
              <p className="mt-4 text-sm text-faint">Free for logging and routes. Sign in with Google.</p>
            </div>

            <div className="card animate-rise-in p-5 sm:p-6" style={{ animationDelay: '120ms' }}>
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-ink">A normal day out there</p>
                <p className="text-xs text-faint">air temperature, °C</p>
              </div>
              <div className="mt-3">
                <DayCurve />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
                <div>
                  <p className="label">7am easy run</p>
                  <p className="stat mt-1 text-3xl">6:05/km</p>
                </div>
                <div>
                  <p className="label">Same effort at 2pm</p>
                  <p className="stat mt-1 text-3xl">
                    6:40/km
                    <span className="ml-2 text-sm font-medium text-hot-ink">+35s</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <article key={title} className="card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="heading mt-4 text-2xl">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-10">
            <p className="label">In the route library</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {['East Coast Park', 'MacRitchie TreeTop loop', 'Marina Bay loop', 'Southern Ridges', 'Bishan-AMK Park', 'Kallang PCN', 'Bedok Reservoir', 'Punggol Waterway', 'Pasir Ris Park', 'Jurong Lake Gardens', 'Rail Corridor', 'Bukit Timah Hill', 'Bishan Stadium track'].map((r) => (
                <li key={r} className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm font-medium text-ink">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-10">
          <h2 className="heading text-4xl sm:text-5xl">Log the next one.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">No GPS tracking, no leaderboards. Keep your watch, use this for the part your watch is bad at.</p>
          <Link href="/signup" className="btn-primary mt-6 px-5 py-3 text-base">
            Create a free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-faint sm:px-6 lg:px-10">
          <p>RunTrackSG · made for running in 30 degrees</p>
          <p>Weather from OpenWeather and Open-Meteo</p>
        </div>
      </footer>
    </div>
  )
}
