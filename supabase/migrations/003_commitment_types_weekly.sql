-- ============================================================
-- KEEPT — Migration 003: Nova Arquitetura de Compromissos
-- ============================================================

-- 1. Novos campos em commitments
alter table public.commitments
  add column if not exists commitment_type text not null default 'meta_minima',
  -- meta_minima | limite_maximo | ocorrencia
  add column if not exists weekly_budget numeric(10,2);
  -- orçamento semanal de consequências (opcional)

-- 2. weekly_budget na tabela de profiles
alter table public.profiles
  add column if not exists weekly_budget numeric(10,2) default 0;

-- 3. Tabela de semanas — entidade central
create table if not exists public.weeks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number integer not null,         -- número da semana ISO do ano
  year integer not null,
  data_inicio date not null,
  data_fim date not null,
  status text not null default 'futuro', -- futuro | em_andamento | encerrado
  total_consequencias numeric(10,2) not null default 0,
  total_orcamento numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year, week_number)
);

-- 4. Planejamento semanal por compromisso
create table if not exists public.week_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  week_number integer not null,
  year integer not null,
  meta_valor numeric(10,2) not null,     -- pode ser diferente da meta padrão
  data_inicio date not null,
  data_fim date not null,
  created_at timestamptz not null default now(),
  unique(user_id, commitment_id, year, week_number)
);

-- RLS
alter table public.weeks enable row level security;
alter table public.week_plans enable row level security;

create policy "weeks_user" on public.weeks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "week_plans_user" on public.week_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger updated_at em weeks
create trigger weeks_updated_at before update on public.weeks
  for each row execute procedure public.handle_updated_at();
