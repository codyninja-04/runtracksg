export type Plan = 'free' | 'pro'

export const TRAINING_GOALS = ['general_fitness', '5k', '10k', 'half_marathon', 'marathon'] as const
export type TrainingGoal = (typeof TRAINING_GOALS)[number]

export const PREFERRED_TIMES = ['morning', 'evening', 'either'] as const
export type PreferredTime = (typeof PREFERRED_TIMES)[number]

export const ROUTE_TYPES = ['park_connector', 'park_loop', 'waterfront', 'trail', 'track'] as const
export type RouteType = (typeof ROUTE_TYPES)[number]

export const SURFACES = ['paved', 'trail', 'track', 'mixed'] as const
export type Surface = (typeof SURFACES)[number]

export const REGIONS = ['central', 'east', 'north', 'north_east', 'west'] as const
export type Region = (typeof REGIONS)[number]

export const RUN_TYPES = ['easy', 'long', 'tempo', 'intervals', 'race', 'recovery'] as const
export type RunType = (typeof RUN_TYPES)[number]

export type WeatherSource = 'openweather' | 'open-meteo' | 'manual'

export interface UserProfile {
  user_id: string
  updated_at: string
  current_5k_pace_seconds: number | null
  training_goal: TrainingGoal | null
  goal_race_date: string | null
  days_per_week: number
  preferred_time: PreferredTime
  insights: InsightSet | null
  insights_generated_at: string | null
  insights_run_count: number | null
}

export interface SgRoute {
  id: string
  slug: string
  name: string
  area: string | null
  region: Region | null
  distance_km: number
  elevation_gain_m: number
  route_type: RouteType | null
  surface: Surface | null
  is_loop: boolean
  has_shade: boolean
  has_water_points: boolean
  has_toilets: boolean
  shade_note: string | null
  start_point: string | null
  nearest_mrt: string | null
  description: string | null
  path: [number, number][]
  sort_order: number
}

export interface RunLog {
  id: string
  user_id: string
  created_at: string
  run_date: string
  run_time: string | null
  distance_km: number
  duration_minutes: number
  avg_pace_seconds_per_km: number
  route_id: string | null
  custom_route: string | null
  temperature_c: number | null
  humidity_percent: number | null
  weather_source: WeatherSource | null
  perceived_effort: number | null
  run_type: RunType | null
  notes: string | null
}

export interface RunWithRoute extends RunLog {
  route: Pick<SgRoute, 'id' | 'name' | 'slug' | 'area'> | null
}

export interface Conditions {
  temperature_c: number
  humidity_percent: number
  source: Exclude<WeatherSource, 'manual'>
  observed_at: string
}

export interface HourlyPoint {
  hour: number
  temperature_c: number
  humidity_percent: number
}

// What Claude writes about pace vs weather. Numbers come from lib/analysis, the
// words come from Claude.
export interface InsightSet {
  headline: string
  points: string[]
  suggestion: string
}

export type SessionKind = 'easy' | 'long' | 'tempo' | 'intervals' | 'hills' | 'recovery' | 'rest' | 'cross' | 'race'

export interface PlanSession {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  kind: SessionKind
  title: string
  distance_km: number | null
  duration_minutes: number | null
  target_pace: string | null
  time_window: string | null
  route_suggestion: string | null
  details: string
}

export interface PlanWeek {
  week: number
  focus: string
  total_km: number
  sessions: PlanSession[]
}

export interface TrainingPlanContent {
  summary: string
  heat_strategy: string[]
  pace_guide: { label: string; pace: string; note: string }[]
  weeks: PlanWeek[]
}

export interface TrainingPlan {
  id: string
  user_id: string
  created_at: string
  goal: TrainingGoal
  race_date: string | null
  days_per_week: number
  plan: TrainingPlanContent
  is_active: boolean
}
