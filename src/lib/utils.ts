import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, getISOWeek, getYear, addWeeks, subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  CommitmentFrequency, CommitmentUnit, GoalCategory,
  PenaltyMode, CommitmentType,
} from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateLong(date: string | Date): string {
  return format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(n))
}

// ─── Week helpers ────────────────────────────────────────────
export function getWeekRange(date: Date = new Date()) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

export function getWeekId(date: Date = new Date()): string {
  const week = getISOWeek(date)
  const year = getYear(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function parseWeekId(weekId: string): { year: number; week: number; date: Date } {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(weekStr)
  const jan4 = new Date(year, 0, 4)
  const startOfYear = startOfWeek(jan4, { weekStartsOn: 1 })
  const date = addWeeks(startOfYear, week - 1)
  return { year, week, date }
}

export function weekIdFromDate(date: Date): string {
  return getWeekId(date)
}

export function weekLabel(weekId: string): string {
  const { date } = parseWeekId(weekId)
  const { start, end } = getWeekRange(date)
  return `${format(start, 'd/MM', { locale: ptBR })} → ${format(end, 'd/MM/yyyy', { locale: ptBR })}`
}

export function getCurrentWeekRange() {
  return getWeekRange(new Date())
}

export function getCurrentMonthRange() {
  const now = new Date()
  return { start: startOfMonth(now), end: endOfMonth(now) }
}

export function getCycleDates(frequency: CommitmentFrequency, referenceDate?: Date) {
  const now = referenceDate || new Date()
  switch (frequency) {
    case 'diaria':  return { start: now, end: now }
    case 'semanal': return getWeekRange(now)
    case 'mensal':  return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

// ─── Penalty calculation ─────────────────────────────────────
/**
 * Calculates total penalty for progress-based commitment types.
 * For event_occurrence / event_limited use calculateOccurrencePenalty.
 */
export function calculatePenalty(
  type: CommitmentType,
  meta: number,
  realizado: number,
  penalidade_por_unidade: number,
  mode: PenaltyMode = 'fixed',
  multiplier: number = 1,
): number {
  let units = 0

  if (type === 'minimum_goal') {
    units = Math.max(0, meta - realizado)
  } else if (type === 'maximum_limit') {
    units = Math.max(0, realizado - meta)
  } else {
    return 0 // event types handled separately
  }

  if (units === 0) return 0
  return calcProgressive(units, penalidade_por_unidade, mode, multiplier)
}

/**
 * Calculates penalty for a single occurrence (event_occurrence or event_limited).
 * For event_limited, pass total occurrences so far; this returns penalty for the next one.
 */
export function calculateOccurrencePenalty(
  penalidade_base: number,
  occurrence_number: number,   // 1-based, total occurrences including this one
  mode: PenaltyMode,
  multiplier: number,
  free_quota: number = 0,      // event_limited: free occurrences
): number {
  if (occurrence_number <= free_quota) return 0  // within free quota
  const billable = occurrence_number - free_quota // 1-based billable index
  switch (mode) {
    case 'fixed':       return penalidade_base
    case 'linear':      return penalidade_base + (billable - 1) * multiplier
    case 'exponential': return penalidade_base * Math.pow(multiplier, billable - 1)
    default:            return penalidade_base
  }
}

/**
 * Total penalty for all occurrences recorded (event_occurrence / event_limited).
 */
export function calculateTotalOccurrencePenalty(
  occurrences: { penalidade_valor: number }[],
): number {
  return occurrences.reduce((s, o) => s + Number(o.penalidade_valor), 0)
}

function calcProgressive(
  units: number,
  base: number,
  mode: PenaltyMode,
  multiplier: number,
): number {
  switch (mode) {
    case 'fixed': return units * base
    case 'linear': {
      let total = 0
      for (let i = 0; i < units; i++) total += base + i * multiplier
      return total
    }
    case 'exponential': {
      let total = 0
      for (let i = 0; i < units; i++) total += base * Math.pow(multiplier, i)
      return total
    }
    default: return units * base
  }
}

/**
 * Returns true if commitment was met (no penalty).
 */
export function isCommitmentMet(
  type: CommitmentType,
  meta: number,
  realizado: number,
  free_quota: number = 0,
): boolean {
  switch (type) {
    case 'minimum_goal':    return realizado >= meta
    case 'maximum_limit':   return realizado <= meta
    case 'event_occurrence': return false  // no concept of "met"
    case 'event_limited':   return realizado <= free_quota
    default:                return false
  }
}

/**
 * Returns whether the type uses the occurrences table (not progress_entries).
 */
export function isEventType(type: CommitmentType): boolean {
  return type === 'event_occurrence' || type === 'event_limited'
}

/**
 * Progress percent for display bar.
 * For maximum_limit: bar fills as you approach/exceed limit.
 * For event types: percentage of free quota used.
 */
export function getProgressPercent(
  type: CommitmentType,
  realizado: number,
  meta: number,
  free_quota: number = 0,
): number {
  if (type === 'event_occurrence') return 0
  if (type === 'event_limited') {
    if (free_quota === 0) return 100
    return Math.min(150, Math.round((realizado / free_quota) * 100))
  }
  if (meta === 0) return 100
  return Math.min(100, Math.round((realizado / meta) * 100))
}

// ─── Labels ──────────────────────────────────────────────────
export const categoryLabels: Record<GoalCategory, string> = {
  estudos: 'Estudos',
  saude: 'Saúde',
  financas: 'Finanças',
  carreira: 'Carreira',
  desenvolvimento_pessoal: 'Desenvolvimento Pessoal',
  outro: 'Outro',
}

export const frequencyLabels: Record<CommitmentFrequency, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
}

export const unitLabels: Record<CommitmentUnit, string> = {
  horas: 'horas',
  sessoes: 'sessões',
  dias: 'dias',
  questoes: 'questões',
  quilometros: 'km',
  passos: 'passos',
  unidades: 'unidades',
  kcal: 'kcal',
  reais: 'R$',
  ocorrencias: 'ocorrências',
}

export const commitmentTypeLabels: Record<CommitmentType, string> = {
  minimum_goal:     'Meta mínima',
  maximum_limit:    'Limite máximo',
  event_occurrence: 'Evento por ocorrência',
  event_limited:    'Evento limitado',
}

export const commitmentTypeDesc: Record<CommitmentType, string> = {
  minimum_goal:     'Consequência quando você fica abaixo da meta (ex: estudar 20h)',
  maximum_limit:    'Consequência quando você ultrapassa o limite (ex: até 2h YouTube)',
  event_occurrence: 'Cada ocorrência gera consequência independente (ex: acessar Instagram)',
  event_limited:    'Algumas ocorrências são gratuitas; excesso gera consequência (ex: até 3x YouTube)',
}

export const commitmentTypeExamples: Record<CommitmentType, string[]> = {
  minimum_goal:     ['Estudar 25 horas', 'Resolver 300 questões', 'Academia 4x na semana'],
  maximum_limit:    ['Até 14.000 kcal', 'Até 2h YouTube', 'Até R$100 em gastos impulsivos'],
  event_occurrence: ['Entrar no Instagram', 'Pedir delivery', 'Compra por impulso'],
  event_limited:    ['Até 3x YouTube na semana', 'Até 2 refeições livres', 'Até 5x Instagram'],
}

export const penaltyModeLabels: Record<PenaltyMode, string> = {
  fixed:       'Fixa — mesmo valor sempre',
  linear:      'Linear — cresce a cada unidade',
  exponential: 'Exponencial — multiplica a cada unidade',
}

export const categoryEmoji: Record<GoalCategory, string> = {
  estudos: '📚',
  saude: '💪',
  financas: '💰',
  carreira: '🎯',
  desenvolvimento_pessoal: '🌱',
  outro: '✦',
}
