import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, getISOWeek, getYear, addWeeks, subWeeks, parseISO,
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
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
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

// ─── Week helpers ───────────────────────────────────────────
export function getWeekRange(date: Date = new Date()) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

export function getWeekId(date: Date = new Date()) {
  // Returns "2026-W25"
  const week = getISOWeek(date)
  const year = getYear(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function parseWeekId(weekId: string): { year: number; week: number; date: Date } {
  // "2026-W25" → date of Monday of that week
  const [yearStr, weekStr] = weekId.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(weekStr)
  // Jan 4th is always in week 1
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
    case 'diaria':
      return { start: now, end: now }
    case 'semanal':
      return getWeekRange(now)
    case 'mensal':
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

// ─── Penalty calculation ─────────────────────────────────────
export function calculatePenalty(
  commitment_type: CommitmentType,
  meta: number,
  realizado: number,
  penalidade_por_unidade: number,
  mode: PenaltyMode = 'fixed',
  multiplier: number = 1,
): number {
  if (commitment_type === 'ocorrencia') {
    // calculated per-occurrence, not here
    return 0
  }

  if (commitment_type === 'meta_minima') {
    const deficit = Math.max(0, meta - realizado)
    if (deficit === 0) return 0
    return calcProgressive(deficit, penalidade_por_unidade, mode, multiplier)
  }

  if (commitment_type === 'limite_maximo') {
    const excess = Math.max(0, realizado - meta)
    if (excess === 0) return 0
    return calcProgressive(excess, penalidade_por_unidade, mode, multiplier)
  }

  return 0
}

function calcProgressive(units: number, base: number, mode: PenaltyMode, multiplier: number): number {
  switch (mode) {
    case 'fixed':
      return units * base
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
    default:
      return units * base
  }
}

export function calculateOccurrencePenalty(
  penalidade_base: number,
  occurrence_number: number,
  mode: PenaltyMode,
  multiplier: number,
): number {
  switch (mode) {
    case 'fixed': return penalidade_base
    case 'linear': return penalidade_base + (occurrence_number - 1) * multiplier
    case 'exponential': return penalidade_base * Math.pow(multiplier, occurrence_number - 1)
    default: return penalidade_base
  }
}

export function isCommitmentMet(
  type: CommitmentType,
  meta: number,
  realizado: number,
): boolean {
  if (type === 'meta_minima') return realizado >= meta
  if (type === 'limite_maximo') return realizado <= meta
  return true // ocorrência não tem "met" binário
}

export function getProgressPercent(
  type: CommitmentType,
  realizado: number,
  meta: number,
): number {
  if (meta === 0) return 100
  if (type === 'limite_maximo') {
    return Math.min(100, Math.round((realizado / meta) * 100))
  }
  return Math.min(100, Math.round((realizado / meta) * 100))
}

// ─── Labels ─────────────────────────────────────────────────
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
  meta_minima: 'Meta mínima',
  limite_maximo: 'Limite máximo',
  ocorrencia: 'Evento / ocorrência',
}

export const commitmentTypeDesc: Record<CommitmentType, string> = {
  meta_minima: 'Consequência quando você fica abaixo da meta (ex: estudar 20h)',
  limite_maximo: 'Consequência quando você ultrapassa o limite (ex: até 2h YouTube)',
  ocorrencia: 'Cada ocorrência gera consequência individual (ex: acessar Instagram)',
}

export const penaltyModeLabels: Record<PenaltyMode, string> = {
  fixed: 'Fixa',
  linear: 'Linear',
  exponential: 'Exponencial',
}

export const categoryEmoji: Record<GoalCategory, string> = {
  estudos: '📚',
  saude: '💪',
  financas: '💰',
  carreira: '🎯',
  desenvolvimento_pessoal: '🌱',
  outro: '✦',
}
