-- Módulo de agentes compatível com o banco de produção atual.
-- O projeto legado armazena ubs_id diretamente nos perfis e não possui
-- a tabela public.ubs, portanto este módulo não cria essa chave estrangeira.

create table if not exists public.health_agents (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_patients (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null,
  agent_id uuid not null references public.health_agents(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_patients_agent
  on public.agent_patients(agent_id);

create table if not exists public.controlled_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.agent_patients(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  dosage text not null default '',
  posology text not null default '',
  med_class text not null default 'outro_controlado' check (
    med_class in ('psicotropico','antipsicotico','opioide','anticonvulsivante','outro_controlado')
  ),
  prescription_end_date date,
  duration_days int check (duration_days is null or duration_days > 0),
  last_renewed_at date,
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_controlled_meds_patient
  on public.controlled_medications(patient_id);

alter table public.health_agents enable row level security;
alter table public.agent_patients enable row level security;
alter table public.controlled_medications enable row level security;

grant select, insert, update, delete on public.health_agents to authenticated;
grant select, insert, update, delete on public.agent_patients to authenticated;
grant select, insert, update, delete on public.controlled_medications to authenticated;
