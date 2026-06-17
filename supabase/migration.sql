-- ============================================================
-- Checklist Boa Vista II — Supabase Migration (v2)
-- Autenticação: Supabase Auth nativo com Magic Link (e-mail)
-- Execute este arquivo completo no SQL Editor do Supabase
-- (Project > SQL Editor > New Query > cole e clique em RUN)
-- ============================================================

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. UBS (Unidades Básicas de Saúde)
-- ────────────────────────────────────────────────────────────
create table if not exists public.ubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text default 'RJ',
  created_at timestamptz default now()
);

insert into public.ubs (id, name, city)
values ('00000000-0000-0000-0000-000000000001', 'UBS Boa Vista II', 'Barra Mansa')
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 2. Perfis — vincula auth.users (Supabase Auth) à equipe da UBS
-- O login é feito por Magic Link no e-mail; este perfil define
-- QUAL categoria profissional e UBS aquele e-mail representa.
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ubs_id uuid not null references public.ubs(id),
  name text not null,
  email text not null,
  professional text not null check (professional in ('medico','enfermeira','tecnico','acs','coordenacao')),
  active boolean default true,
  created_at timestamptz default now()
);

-- Pré-cadastro da equipe — IMPORTANTE: edite os e-mails reais antes de usar.
-- O Magic Link só funciona para e-mails que existirem aqui (verificação na rota de login).
-- Depois que cada pessoa fizer login pela 1ª vez, o Supabase Auth cria o auth.users
-- correspondente automaticamente; o trigger abaixo então preenche este profiles.
create table if not exists public.pending_team_members (
  email text primary key,
  ubs_id uuid not null references public.ubs(id),
  name text not null,
  professional text not null check (professional in ('medico','enfermeira','tecnico','acs','coordenacao'))
);

insert into public.pending_team_members (email, ubs_id, name, professional) values
  ('medico@example.com', '00000000-0000-0000-0000-000000000001', 'Médico(a) Responsável', 'medico'),
  ('enfermeira@example.com', '00000000-0000-0000-0000-000000000001', 'Enfermeiro(a) Responsável', 'enfermeira'),
  ('tecnico@example.com', '00000000-0000-0000-0000-000000000001', 'Técnico(a) de Enfermagem', 'tecnico'),
  ('acs@example.com', '00000000-0000-0000-0000-000000000001', 'ACS Território 1', 'acs'),
  ('coordenacao@example.com', '00000000-0000-0000-0000-000000000001', 'Coordenação', 'coordenacao')
on conflict (email) do nothing;

-- Trigger: quando um novo usuário confirma o Magic Link e é criado em
-- auth.users, isso cria automaticamente o profile correspondente,
-- buscando os dados em pending_team_members pelo e-mail.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  pending record;
begin
  select * into pending from public.pending_team_members where email = new.email;

  if pending is not null then
    insert into public.profiles (id, ubs_id, name, email, professional)
    values (new.id, pending.ubs_id, pending.name, new.email, pending.professional)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 3. Itens do checklist preenchidos
-- ────────────────────────────────────────────────────────────
create table if not exists public.checklist_entries (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null references public.ubs(id),
  professional text not null check (professional in ('medico','enfermeira','tecnico','acs','coordenacao')),
  month int not null check (month between 1 and 12),
  year int not null check (year between 2024 and 2100),
  item_id text not null,
  done boolean default false,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluido')),
  observation text default '',
  quantity text default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  unique (ubs_id, professional, month, year, item_id)
);

create index if not exists idx_checklist_entries_month
  on public.checklist_entries (ubs_id, month, year);

-- ────────────────────────────────────────────────────────────
-- 4. Pacientes faltosos (importados via upload de CSV do PEC)
-- ────────────────────────────────────────────────────────────
create table if not exists public.faltosos (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null references public.ubs(id),
  month int not null check (month between 1 and 12),
  year int not null check (year between 2024 and 2100),
  nome text not null,
  cns text,
  telefone text,
  condicao text not null check (condicao in
    ('hipertensao','diabetes','gestante','puerpera','idoso','crianca','preventivo','vacinacao','outro')),
  ultima_consulta date,
  dias_em_atraso int,
  microarea text,
  acs_responsavel text,
  observacao text default '',
  resolvido boolean default false,
  imported_at timestamptz default now()
);

create index if not exists idx_faltosos_month
  on public.faltosos (ubs_id, month, year, condicao);

-- ────────────────────────────────────────────────────────────
-- 5. Snapshot mensal (histórico para gráfico de evolução)
-- ────────────────────────────────────────────────────────────
create table if not exists public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null references public.ubs(id),
  professional text not null check (professional in ('medico','enfermeira','tecnico','acs','coordenacao')),
  month int not null check (month between 1 and 12),
  year int not null check (year between 2024 and 2100),
  total_items int not null,
  done int not null,
  in_progress int not null,
  percent int not null,
  created_at timestamptz default now(),
  unique (ubs_id, professional, month, year)
);

-- ────────────────────────────────────────────────────────────
-- 6. Metas dos indicadores Previne Brasil (configurável pela coordenação)
-- A meta % muda por nota técnica a cada quadrimestre; a coordenação
-- mantém o valor vigente atualizado aqui para o placar interno.
-- ────────────────────────────────────────────────────────────
create table if not exists public.previne_indicator_targets (
  id text primary key check (id in (
    'pn_consultas','pn_sifilis_hiv','pn_odonto','citopatologico',
    'vacinacao_1ano','has_pa','dm_hba1c'
  )),
  ubs_id uuid not null references public.ubs(id),
  target_percent numeric(5,2) not null default 0,
  quadrimestre text default '',
  updated_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 7. Log de e-mails enviados (auditoria dos lembretes)
-- ────────────────────────────────────────────────────────────
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  email text not null,
  subject text not null,
  type text not null check (type in ('weekly_reminder','critical_alert','monthly_report')),
  status text not null default 'sent' check (status in ('sent','failed')),
  sent_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- Agora usamos auth.uid() de verdade — cada pessoa só vê e edita
-- os dados da sua própria categoria profissional, e a coordenação
-- vê tudo.
-- ============================================================

alter table public.ubs enable row level security;
alter table public.profiles enable row level security;
alter table public.checklist_entries enable row level security;
alter table public.faltosos enable row level security;
alter table public.monthly_snapshots enable row level security;
alter table public.notification_log enable row level security;
alter table public.previne_indicator_targets enable row level security;
alter table public.pending_team_members enable row level security;

-- Função auxiliar: retorna a categoria profissional do usuário logado
create or replace function public.current_professional()
returns text as $$
  select professional from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.is_coordenacao()
returns boolean as $$
  select coalesce((select professional from public.profiles where id = auth.uid()) = 'coordenacao', false);
$$ language sql security definer stable;

-- profiles: cada um vê o próprio perfil; coordenação vê todos
create policy "profiles_select_own_or_coord" on public.profiles
  for select using (id = auth.uid() or public.is_coordenacao());

-- ubs: qualquer usuário autenticado pode ler (não há dado sensível)
create policy "ubs_select_authenticated" on public.ubs
  for select using (auth.role() = 'authenticated');

-- checklist_entries: cada profissional vê/edita os itens da própria
-- categoria; coordenação vê e edita tudo (para corrigir lançamentos)
create policy "checklist_select_own_category_or_coord" on public.checklist_entries
  for select using (professional = public.current_professional() or public.is_coordenacao());

create policy "checklist_insert_own_category_or_coord" on public.checklist_entries
  for insert with check (professional = public.current_professional() or public.is_coordenacao());

create policy "checklist_update_own_category_or_coord" on public.checklist_entries
  for update using (professional = public.current_professional() or public.is_coordenacao());

-- faltosos: leitura para todos autenticados (a lista é compartilhada
-- entre médico/enfermeira/ACS); escrita (marcar resolvido) para todos;
-- import via CSV (delete+insert) restrito à coordenação
create policy "faltosos_select_authenticated" on public.faltosos
  for select using (auth.role() = 'authenticated');

create policy "faltosos_update_authenticated" on public.faltosos
  for update using (auth.role() = 'authenticated');

create policy "faltosos_insert_coord_only" on public.faltosos
  for insert with check (public.is_coordenacao());

create policy "faltosos_delete_coord_only" on public.faltosos
  for delete using (public.is_coordenacao());

-- monthly_snapshots: leitura para todos autenticados; escrita (fechar
-- mês) restrita à coordenação
create policy "snapshots_select_authenticated" on public.monthly_snapshots
  for select using (auth.role() = 'authenticated');

create policy "snapshots_insert_coord_only" on public.monthly_snapshots
  for insert with check (public.is_coordenacao());

create policy "snapshots_update_coord_only" on public.monthly_snapshots
  for update using (public.is_coordenacao());

-- notification_log: só a coordenação vê o histórico de envios
create policy "notification_log_select_coord_only" on public.notification_log
  for select using (public.is_coordenacao());

-- previne_indicator_targets: leitura para todos autenticados (todo
-- profissional precisa ver a meta vigente no próprio checklist);
-- escrita restrita à coordenação
create policy "previne_targets_select_authenticated" on public.previne_indicator_targets
  for select using (auth.role() = 'authenticated');

create policy "previne_targets_upsert_coord_only" on public.previne_indicator_targets
  for insert with check (public.is_coordenacao());

create policy "previne_targets_update_coord_only" on public.previne_indicator_targets
  for update using (public.is_coordenacao());

-- pending_team_members: não exposto ao cliente (só o trigger/server usa)
create policy "pending_team_no_client_access" on public.pending_team_members
  for all using (false);

-- ============================================================
-- Módulo: Agentes de Saúde — pacientes e medicações controladas
-- Cadastro simples (sem vínculo formal de microárea): cada paciente
-- pertence diretamente a um agente de saúde, que organiza a lista de
-- medicações controladas para saber quando a receita precisa renovar.
-- ============================================================

create table if not exists public.health_agents (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null references public.ubs(id),
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.agent_patients (
  id uuid primary key default gen_random_uuid(),
  ubs_id uuid not null references public.ubs(id),
  agent_id uuid not null references public.health_agents(id) on delete cascade,
  name text not null,
  notes text default '',
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_agent_patients_agent
  on public.agent_patients (agent_id);

create table if not exists public.controlled_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.agent_patients(id) on delete cascade,
  name text not null,
  dosage text default '',
  posology text default '',
  med_class text not null default 'outro_controlado' check (med_class in
    ('psicotropico','antipsicotico','opioide','anticonvulsivante','outro_controlado')),
  prescription_end_date date,
  duration_days int,
  last_renewed_at date,
  notes text default '',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_controlled_meds_patient
  on public.controlled_medications (patient_id);

alter table public.health_agents enable row level security;
alter table public.agent_patients enable row level security;
alter table public.controlled_medications enable row level security;

-- health_agents: leitura para todos autenticados; escrita (criar/editar
-- agentes) restrita à coordenação
create policy "health_agents_select_authenticated" on public.health_agents
  for select using (auth.role() = 'authenticated');

create policy "health_agents_insert_coord_only" on public.health_agents
  for insert with check (public.is_coordenacao());

create policy "health_agents_update_coord_only" on public.health_agents
  for update using (public.is_coordenacao());

create policy "health_agents_delete_coord_only" on public.health_agents
  for delete using (public.is_coordenacao());

-- agent_patients: ACS gerencia os próprios pacientes; médico e
-- coordenação têm acesso total (médico precisa para renovar receita)
create policy "agent_patients_select_acs_medico_coord" on public.agent_patients
  for select using (
    public.current_professional() in ('acs','medico','coordenacao')
  );

create policy "agent_patients_insert_acs_medico_coord" on public.agent_patients
  for insert with check (
    public.current_professional() in ('acs','medico','coordenacao')
  );

create policy "agent_patients_update_acs_medico_coord" on public.agent_patients
  for update using (
    public.current_professional() in ('acs','medico','coordenacao')
  );

create policy "agent_patients_delete_acs_medico_coord" on public.agent_patients
  for delete using (
    public.current_professional() in ('acs','medico','coordenacao')
  );

-- controlled_medications: mesma regra — ACS, médico e coordenação têm
-- acesso total (não restringimos por paciente específico do ACS logado,
-- pois o cadastro não usa vínculo formal de microárea; o controle de
-- "quem cuida de quem" é organizacional, não tecnicamente bloqueado)
create policy "controlled_meds_select_acs_medico_coord" on public.controlled_medications
  for select using (
    public.current_professional() in ('acs','medico','coordenacao')
  );

create policy "controlled_meds_insert_acs_medico_coord" on public.controlled_medications
  for insert with check (
    public.current_professional() in ('acs','medico','coordenacao')
  );

create policy "controlled_meds_update_acs_medico_coord" on public.controlled_medications
  for update using (
    public.current_professional() in ('acs','medico','coordenacao')
  );

create policy "controlled_meds_delete_acs_medico_coord" on public.controlled_medications
  for delete using (
    public.current_professional() in ('acs','medico','coordenacao')
  );

-- ============================================================
-- Fim da migration.
-- Próximos passos:
-- 1. Edite a tabela pending_team_members com os e-mails reais da
--    equipe (Table Editor > pending_team_members), ou rode:
--    update public.pending_team_members set email = 'real@email.com'
--    where email = 'medico@example.com';
-- 2. Em Authentication > URL Configuration, adicione a URL do seu
--    site (ex: https://seusite.vercel.app) em "Redirect URLs"
-- 3. Em Authentication > Providers > Email, confirme que "Enable
--    Email provider" está ativo (vem ativo por padrão)
-- 4. Copie a "anon public" key e a "service_role" key em
--    Project Settings > API para o seu .env
-- ============================================================
