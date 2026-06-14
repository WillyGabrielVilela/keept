-- ============================================================
-- KEEPT — Migration 004: 4 Tipos de Compromisso
-- Backward compatible — não remove dados existentes
-- ============================================================

-- 1. Renomear valores existentes para o novo esquema de nomes
--    meta_minima      → minimum_goal
--    limite_maximo    → maximum_limit
--    ocorrencia       → event_occurrence
--    (novo)           → event_limited

-- Atualizar registros existentes
update public.commitments
  set commitment_type = case
    when commitment_type = 'meta_minima'    then 'minimum_goal'
    when commitment_type = 'limite_maximo'  then 'maximum_limit'
    when commitment_type = 'ocorrencia'     then 'event_occurrence'
    else commitment_type
  end
where commitment_type in ('meta_minima', 'limite_maximo', 'ocorrencia');

-- Garantir default correto
alter table public.commitments
  alter column commitment_type set default 'minimum_goal';

-- 2. Adicionar campo free_quota (franquia gratuita para event_limited)
alter table public.commitments
  add column if not exists free_quota integer not null default 0;
-- free_quota = 0 para todos os tipos exceto event_limited
-- Para event_limited: número de ocorrências gratuitas por período

-- 3. Comentários descritivos
comment on column public.commitments.commitment_type is
  'minimum_goal: realizado < meta gera consequência | '
  'maximum_limit: realizado > limite gera consequência | '
  'event_occurrence: cada ocorrência gera consequência individual | '
  'event_limited: ocorrências acima de free_quota geram consequência';

comment on column public.commitments.free_quota is
  'Para event_limited: número de ocorrências gratuitas por período';

comment on column public.commitments.meta_valor is
  'minimum_goal: meta mínima | maximum_limit: limite máximo | '
  'event_occurrence: não usado (0) | event_limited: não usado (0)';
