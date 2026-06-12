export type GoalCategory =
  | 'estudos' | 'saude' | 'financas' | 'carreira'
  | 'desenvolvimento_pessoal' | 'outro'

export type GoalStatus = 'ativo' | 'pausado' | 'concluido' | 'abandonado'
export type CommitmentFrequency = 'diaria' | 'semanal' | 'mensal'
export type PenaltyMode = 'fixed' | 'linear' | 'exponential'
export type CommitmentUnit =
  | 'horas' | 'sessoes' | 'dias' | 'questoes'
  | 'quilometros' | 'passos' | 'unidades' | 'kcal' | 'reais' | 'ocorrencias'

// TIPO 1: meta_minima — realizado < meta gera consequência
// TIPO 2: limite_maximo — realizado > limite gera consequência
// TIPO 3: ocorrencia — cada evento gera consequência individual
export type CommitmentType = 'meta_minima' | 'limite_maximo' | 'ocorrencia'

export interface Goal {
  id: string
  user_id: string
  nome: string
  descricao: string | null
  proposito: string | null
  categoria: GoalCategory
  data_inicio: string
  data_alvo: string | null
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface Commitment {
  id: string
  goal_id: string
  user_id: string
  nome: string
  descricao: string | null
  frequencia: CommitmentFrequency
  unidade: CommitmentUnit
  meta_valor: number
  penalidade_por_unidade: number
  penalty_mode: PenaltyMode
  penalty_multiplier: number
  commitment_type: CommitmentType
  weekly_budget: number | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ProgressEntry {
  id: string
  commitment_id: string
  goal_id: string
  user_id: string
  data: string
  quantidade_realizada: number
  observacao: string | null
  created_at: string
}

export interface Occurrence {
  id: string
  user_id: string
  commitment_id: string
  goal_id: string
  data: string
  numero_ocorrencia: number
  penalidade_valor: number
  observacao: string | null
  created_at: string
}

export interface Penalty {
  id: string
  user_id: string
  commitment_id: string
  goal_id: string
  charity_id: string | null
  periodo_inicio: string
  periodo_fim: string
  meta_valor: number
  realizado_valor: number
  diferenca: number
  penalidade_valor: number
  created_at: string
}

export interface WeeklyContract {
  id: string
  user_id: string
  semana_inicio: string
  semana_fim: string
  numero_semana: number
  commitments_snapshot: ContractCommitment[]
  assumido_em: string | null
  status: 'pendente' | 'assumido' | 'encerrado'
  created_at: string
}

export interface ContractCommitment {
  id: string
  nome: string
  meta_valor: number
  unidade: CommitmentUnit
  frequencia: CommitmentFrequency
  goal_nome: string
  commitment_type: CommitmentType
}

export interface HonorDay {
  id: string
  user_id: string
  data: string
  todos_cumpridos: boolean
  commitments_total: number
  commitments_met: number
  created_at: string
}

export interface Charity {
  id: string
  nome: string
  descricao: string
  categoria: string
  logo_url: string | null
  website: string | null
  ativo: boolean
}

export interface Week {
  id: string
  user_id: string
  week_number: number
  year: number
  data_inicio: string
  data_fim: string
  status: 'futuro' | 'em_andamento' | 'encerrado'
  total_consequencias: number
  total_orcamento: number
  created_at: string
}

export interface WeekPlan {
  id: string
  user_id: string
  commitment_id: string
  goal_id: string
  week_number: number
  year: number
  meta_valor: number
  data_inicio: string
  data_fim: string
}

export interface CommitmentWithProgress extends Commitment {
  goal?: Goal
  progress_entries?: ProgressEntry[]
  occurrences?: Occurrence[]
  current_period_done: number
  current_period_penalty: number
  met: boolean
}

export interface WeekSummary {
  weekNumber: number
  year: number
  dateStart: Date
  dateEnd: Date
  commitments: CommitmentWithProgress[]
  totalPenalty: number
  totalBudget: number
  budgetUsedPct: number
}
