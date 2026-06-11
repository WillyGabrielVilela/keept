-- ============================================================
-- KEEPT — Schema Completo v1
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CHARITIES
-- ============================================================
create table public.charities (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text not null,
  categoria text not null,
  logo_url text,
  website text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed charities
insert into public.charities (nome, descricao, categoria, website) values
  ('Médicos Sem Fronteiras', 'Assistência médica humanitária em zonas de conflito e desastres.', 'Saúde', 'https://www.msf.org.br'),
  ('Cruz Vermelha Brasileira', 'Assistência humanitária e promoção do direito internacional humanitário.', 'Humanitária', 'https://www.cruzvermelha.org.br'),
  ('WWF Brasil', 'Conservação da natureza e redução do impacto humano no meio ambiente.', 'Meio Ambiente', 'https://www.wwf.org.br'),
  ('Instituto Ayrton Senna', 'Educação de qualidade para crianças e jovens do Brasil.', 'Educação', 'https://www.institutoayrtonsenna.org.br'),
  ('APAE Brasil', 'Defesa dos direitos e promoção da qualidade de vida de pessoas com deficiência.', 'Inclusão', 'https://www.apae.com.br'),
  ('Cão Sem Dono', 'Proteção e adoção responsável de animais abandonados.', 'Animais', null),
  ('Banco de Alimentos', 'Combate ao desperdício de alimentos e à fome no Brasil.', 'Alimentação', null),
  ('UNICEF Brasil', 'Defesa dos direitos de crianças e adolescentes.', 'Infância', 'https://www.unicef.org/brazil');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  charity_id uuid references public.charities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- GOALS
-- ============================================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  categoria text not null default 'outro',
  data_inicio date not null default current_date,
  data_alvo date,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COMMITMENTS
-- ============================================================
create table public.commitments (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  frequencia text not null default 'semanal',
  unidade text not null default 'horas',
  meta_valor numeric(10,2) not null,
  penalidade_por_unidade numeric(10,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROGRESS ENTRIES
-- ============================================================
create table public.progress_entries (
  id uuid primary key default uuid_generate_v4(),
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null default current_date,
  quantidade_realizada numeric(10,2) not null,
  observacao text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PENALTIES
-- ============================================================
create table public.penalties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  charity_id uuid references public.charities(id),
  periodo_inicio date not null,
  periodo_fim date not null,
  meta_valor numeric(10,2) not null,
  realizado_valor numeric(10,2) not null default 0,
  diferenca numeric(10,2) not null default 0,
  penalidade_valor numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.commitments enable row level security;
alter table public.progress_entries enable row level security;
alter table public.penalties enable row level security;
alter table public.charities enable row level security;

-- Charities: read-only for all authenticated users
create policy "Charities são públicas" on public.charities
  for select using (true);

-- Profiles
create policy "Usuários veem seu próprio perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "Usuários atualizam seu próprio perfil" on public.profiles
  for update using (auth.uid() = id);

create policy "Usuários inserem seu próprio perfil" on public.profiles
  for insert with check (auth.uid() = id);

-- Goals
create policy "Usuários veem seus objetivos" on public.goals
  for select using (auth.uid() = user_id);

create policy "Usuários criam seus objetivos" on public.goals
  for insert with check (auth.uid() = user_id);

create policy "Usuários atualizam seus objetivos" on public.goals
  for update using (auth.uid() = user_id);

create policy "Usuários deletam seus objetivos" on public.goals
  for delete using (auth.uid() = user_id);

-- Commitments
create policy "Usuários veem seus compromissos" on public.commitments
  for select using (auth.uid() = user_id);

create policy "Usuários criam seus compromissos" on public.commitments
  for insert with check (auth.uid() = user_id);

create policy "Usuários atualizam seus compromissos" on public.commitments
  for update using (auth.uid() = user_id);

create policy "Usuários deletam seus compromissos" on public.commitments
  for delete using (auth.uid() = user_id);

-- Progress entries
create policy "Usuários veem seu progresso" on public.progress_entries
  for select using (auth.uid() = user_id);

create policy "Usuários registram progresso" on public.progress_entries
  for insert with check (auth.uid() = user_id);

create policy "Usuários atualizam progresso" on public.progress_entries
  for update using (auth.uid() = user_id);

create policy "Usuários deletam progresso" on public.progress_entries
  for delete using (auth.uid() = user_id);

-- Penalties
create policy "Usuários veem suas consequências" on public.penalties
  for select using (auth.uid() = user_id);

create policy "Usuários registram consequências" on public.penalties
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, new.raw_user_meta_data->>'nome');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger goals_updated_at before update on public.goals
  for each row execute procedure public.handle_updated_at();

create trigger commitments_updated_at before update on public.commitments
  for each row execute procedure public.handle_updated_at();
