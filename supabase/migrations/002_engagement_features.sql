-- ============================================================
-- KEEPT — Migration 002: Melhorias de Engajamento
-- ============================================================

-- 1. PROPÓSITO DO OBJETIVO — campo "por que isso importa"
alter table public.goals
  add column if not exists proposito text;

-- 2. PENALIDADE PROGRESSIVA nos compromissos
alter table public.commitments
  add column if not exists penalty_mode text not null default 'fixed',
  -- fixed | linear | exponential
  add column if not exists penalty_multiplier numeric(6,2) not null default 2.0;
  -- para linear: incremento; para exponential: base do expoente

-- 3. CICLOS — controle explícito de períodos
create table if not exists public.cycles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fim date not null,
  numero_ciclo integer not null default 1,
  status text not null default 'em_andamento', -- em_andamento | concluido | falhou
  meta_valor numeric(10,2) not null,
  realizado_valor numeric(10,2) not null default 0,
  penalidade_valor numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. CONTRATO SEMANAL
create table if not exists public.weekly_contracts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semana_inicio date not null,
  semana_fim date not null,
  numero_semana integer not null default 1,
  commitments_snapshot jsonb not null default '[]',
  assumido_em timestamptz,
  status text not null default 'pendente', -- pendente | assumido | encerrado
  created_at timestamptz not null default now()
);

-- 5. DIAS DE HONRA
create table if not exists public.honor_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  todos_cumpridos boolean not null default false,
  commitments_total integer not null default 0,
  commitments_met integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, data)
);

-- 6. HISTÓRICO DE EDIÇÕES
create table if not exists public.edit_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null, -- goal | commitment
  entity_id uuid not null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  edited_at timestamptz not null default now()
);

-- 7. OCORRÊNCIAS (para penalidade progressiva por evento)
create table if not exists public.occurrences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  data date not null default current_date,
  numero_ocorrencia integer not null default 1,
  penalidade_valor numeric(10,2) not null default 0,
  observacao text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS nas novas tabelas
-- ============================================================
alter table public.cycles enable row level security;
alter table public.weekly_contracts enable row level security;
alter table public.honor_days enable row level security;
alter table public.edit_history enable row level security;
alter table public.occurrences enable row level security;

create policy "cycles_user" on public.cycles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_contracts_user" on public.weekly_contracts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "honor_days_user" on public.honor_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "edit_history_user" on public.edit_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "occurrences_user" on public.occurrences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger updated_at em cycles
create trigger cycles_updated_at before update on public.cycles
  for each row execute procedure public.handle_updated_at();
