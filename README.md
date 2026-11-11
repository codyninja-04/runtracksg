# RunTrackSG

A running log and route planner built for Singapore. Log your runs after you finish, the weather fills itself in for when and where you ran, and over time you see exactly what the heat costs you. Claude turns that into training plans that put hard sessions in the cool slots and insights about your own pace against the weather.

No GPS tracking and no social feed. Keep recording with your watch or phone, and use this for the part your watch is bad at.

## What's in it

- **Run log.** Distance, time (pace is calculated live), date, start time, route, run type, effort slider and notes. Weather is pulled automatically for the route's location and the time you ran, or typed in by hand.
- **Heat adjusted pace.** Every run with weather shows a "cool day equivalent" pace, using the temperature + dew point rule coaches use for humid races. The heat index, risk level and a comparison against your runs in similar conditions sit next to it.
- **Dashboard.** Today's conditions with the coolest window left in the day, an hourly strip, weekly distance, a pace trend where each dot is coloured by temperature, and a "what the heat costs you" breakdown (hot vs cooler median pace, a line fit in sec/km per °C, and a table by temperature band).
- **Coach's read.** Claude writes a short read on your pace vs weather. All the numbers are calculated in `lib/analysis.ts` first; Claude only writes about them.
- **Route library.** 14 Singapore routes (East Coast, MacRitchie, Marina Bay, Southern Ridges, Bishan-AMK, Kallang PCN, Bedok Reservoir, Punggol, Pasir Ris, Jurong Lake, Rail Corridor, Bukit Timah, Bishan track and more) with distance, climb, surface, shade, water points, toilets and nearest MRT. Filterable, on a Mapbox map, with your own stats per route.
- **Training plans.** Pick a goal (general fitness to marathon), optional race date, current 5K pace, days per week and when you like to run. Claude builds a week by week plan with heat adjusted target paces, time windows, route suggestions and heat rules. Sessions tick off when you log a run that day.
- **Settings.** Profile, plan tier, CSV export and a delete my data option.
- **PWA.** Installable, with a small service worker that caches static assets and shows an offline page.

## Stack

Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + RLS, Google OAuth) · Claude API · Mapbox GL JS · OpenWeather with Open-Meteo fallback · Recharts · Tailwind CSS · Vitest

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill it in
npm run dev
```

### Supabase

1. Create a project and enable the Google provider under Authentication. Add `http://localhost:3000/auth/callback` (and your production URL) to the redirect URLs.
2. In the SQL editor run `supabase/migrations/001_initial_schema.sql`, then `002_seed_routes.sql` for the route library. The seed is safe to run again; it updates routes by slug.

### Environment

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything |
| `ANTHROPIC_API_KEY` | Training plans and the coach's read. The app works without it, those two features just say they are off. |
| `CLAUDE_MODEL` | Optional, defaults to `claude-sonnet-5-5` |
| `OPENWEATHER_API_KEY` | Optional. Used for current conditions, and for history if your account has One Call 3.0. Without it, Open-Meteo (free, no key) is used. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Optional. Without it the routes page draws a plain trace of every route instead of a map. |
| `ENFORCE_PRO` | Leave `false` until billing is live. When `true`, free accounts lose plans and insights and see the last 90 days of history. |
| `SUPABASE_SERVICE_ROLE_KEY` | Not used yet. Billing will use it to write the `billing` table, which users can only read. |

## Scripts

```bash
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm test           # vitest, the maths and validation
npm run build      # production build
```

## Notes on the data

- Route distances and climbs are the commonly quoted figures. The map lines are waypoint traces, close enough to see where a route goes but not survey grade.
- The heat adjustment is a rule of thumb, not physiology. It is there so a hot run is judged fairly, and your own logged numbers on the dashboard always win over it.
- The `billing` table is separate from `user_profiles` on purpose: profiles are writable by the user under RLS, the plan tier is not.
