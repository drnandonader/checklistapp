create table if not exists public.weekly_home_visits (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null,
  week_start date not null,
  visit_date date not null,
  slot_number smallint not null check (slot_number between 1 and 4),
  patient_name text not null check (length(trim(patient_name)) > 0),
  agent_id uuid not null references public.health_agents(id),
  notes text not null default '',
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ubs_id, week_start, slot_number)
);

create index if not exists idx_weekly_home_visits_week
  on public.weekly_home_visits(ubs_id, week_start);

alter table public.weekly_home_visits enable row level security;
grant select, insert, update, delete on public.weekly_home_visits to authenticated;

drop policy if exists weekly_home_visits_team_access on public.weekly_home_visits;
create policy weekly_home_visits_team_access on public.weekly_home_visits
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  ));
