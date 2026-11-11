import type { PreferredTime, Region, RouteType, RunType, SessionKind, Surface, TrainingGoal } from './types'

export const GOAL_LABEL: Record<TrainingGoal, string> = {
  general_fitness: 'General fitness',
  '5k': '5K',
  '10k': '10K',
  half_marathon: 'Half marathon',
  marathon: 'Marathon',
}

export const PREFERRED_TIME_LABEL: Record<PreferredTime, string> = {
  morning: 'Before work (before 8am)',
  evening: 'After work (after 6:30pm)',
  either: 'Whichever is cooler',
}

export const ROUTE_TYPE_LABEL: Record<RouteType, string> = {
  park_connector: 'Park connector',
  park_loop: 'Park loop',
  waterfront: 'Waterfront',
  trail: 'Trail',
  track: 'Track',
}

export const SURFACE_LABEL: Record<Surface, string> = {
  paved: 'Paved',
  trail: 'Trail',
  track: 'Track',
  mixed: 'Mixed',
}

export const REGION_LABEL: Record<Region, string> = {
  central: 'Central',
  east: 'East',
  north: 'North',
  north_east: 'North East',
  west: 'West',
}

export const RUN_TYPE_LABEL: Record<RunType, string> = {
  easy: 'Easy',
  long: 'Long run',
  tempo: 'Tempo',
  intervals: 'Intervals',
  race: 'Race',
  recovery: 'Recovery',
}

export const SESSION_LABEL: Record<SessionKind, string> = {
  easy: 'Easy',
  long: 'Long',
  tempo: 'Tempo',
  intervals: 'Intervals',
  hills: 'Hills',
  recovery: 'Recovery',
  rest: 'Rest',
  cross: 'Cross train',
  race: 'Race',
}

export const EFFORT_LABEL: Record<number, string> = {
  1: 'Barely moving',
  2: 'Very easy',
  3: 'Easy, could chat',
  4: 'Comfortable',
  5: 'Steady',
  6: 'Working',
  7: 'Comfortably hard',
  8: 'Hard',
  9: 'Very hard',
  10: 'All out',
}
