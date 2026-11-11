-- RunTrackSG initial schema.
-- Run in the Supabase SQL editor, then run 002_seed_routes.sql for the route library.

create extension if not exists "uuid-ossp";

-- Runner profile. Everything here is the runner's to edit.
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  current_5k_pace_seconds integer check (current_5k_pace_seconds between 150 and 1200),
  training_goal text check (training_goal in ('general_fitness', '5k', '10k', 'half_marathon', 'marathon')),
  goal_race_date date,
  days_per_week integer not null default 3 check (days_per_week between 2 and 7),
  preferred_time text not null default 'morning' check (preferred_time in ('morning', 'evening', 'either')),
  -- Cached Claude read on pace vs weather, regenerated when the run count moves.
  insights jsonb,
  insights_generated_at timestamptz,
  insights_run_count integer
);

-- Plan lives in its own table so a runner can read it but never write it.
-- Billing writes here with the service role.
create table if not exists billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  updated_at timestamptz not null default now()
);

create table if not exists sg_routes (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  area text,
  region text check (region in ('central', 'east', 'north', 'north_east', 'west')),
  distance_km numeric not null,
  elevation_gain_m integer not null default 0,
  route_type text check (route_type in ('park_connector', 'park_loop', 'waterfront', 'trail', 'track')),
  surface text check (surface in ('paved', 'trail', 'track', 'mixed')),
  is_loop boolean not null default true,
  has_shade boolean not null default false,
  has_water_points boolean not null default false,
  has_toilets boolean not null default false,
  shade_note text,
  start_point text,
  nearest_mrt text,
  description text,
  -- Waypoints as [lng, lat] pairs. A trace of the route, not survey grade.
  path jsonb not null default '[]'::jsonb,
  sort_order integer not null default 100
);

create table if not exists run_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  run_date date not null,
  run_time time,
  distance_km numeric not null check (distance_km > 0 and distance_km <= 250),
  duration_minutes numeric not null check (duration_minutes > 0 and duration_minutes <= 2000),
  avg_pace_seconds_per_km integer generated always as (
    (round((duration_minutes * 60) / nullif(distance_km, 0)))::integer
  ) stored,
  route_id uuid references sg_routes(id) on delete set null,
  custom_route text check (char_length(custom_route) <= 120),
  temperature_c numeric check (temperature_c between 10 and 45),
  humidity_percent numeric check (humidity_percent between 0 and 100),
  weather_source text check (weather_source in ('openweather', 'open-meteo', 'manual')),
  perceived_effort integer check (perceived_effort between 1 and 10),
  run_type text check (run_type in ('easy', 'long', 'tempo', 'intervals', 'race', 'recovery')),
  notes text check (char_length(notes) <= 2000)
);

create table if not exists training_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  goal text not null,
  race_date date,
  days_per_week integer not null,
  plan jsonb not null,
  is_active boolean not null default true
);

-- Indexes
create index if not exists idx_runs_user on run_logs(user_id, run_date desc);
create index if not exists idx_plans_user on training_plans(user_id, created_at desc);

-- RLS
alter table user_profiles enable row level security;
alter table billing enable row level security;
alter table sg_routes enable row level security;
alter table run_logs enable row level security;
alter table training_plans enable row level security;

create policy "public_routes" on sg_routes for select using (true);
create policy "own_profile" on user_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read_own_billing" on billing for select using (auth.uid() = user_id);
create policy "own_runs" on run_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_plans" on training_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
