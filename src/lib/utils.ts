import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, differenceInDays, addDays, addMonths, addWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CommitmentFrequency, CommitmentUnit, GoalCategory, PenaltyMode } from '@/types'

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

export function getCurrentWeekRange() {
  const now = new Date()
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  }
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
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }
    case 'mensal':
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

export function getDaysRemaining(endDate: Date): number {
  return Math.max(0, differenceInDays(endDate, new Date()))
}

// Penalidade progressiva
export function calculateProgressivePenalty(
  meta: number,
  realizado: number,
  penalidade_por_unidade: number,
  mode: PenaltyMode,
  multiplier: number,
  occurrences: number = 0 // para modo de ocorrências (events)
): number {
  const diferenca = Math.max(0, meta - realizado)
  if (diferenca === 0) return 0

  switch (mode) {
    case 'fixed':
      return diferenca * penalidade_por_unidade
    case 'linear':
      // cada unidade faltante vale penalidade_base + (índice * multiplier)
      let totalLinear = 0
      for (let i = 0; i < diferenca; i++) {
        totalLinear += penalidade_por_unidade + i * multiplier
      }
      return totalLinear
    case 'exponential':
      // penalidade_base * multiplier^(unidades_faltantes - 1)
      let totalExp = 0
      for (let i = 0; i < diferenca; i++) {
        totalExp += penalidade_por_unidade * Math.pow(multiplier, i)
      }
      return totalExp
    default:
      return diferenca * penalidade_por_unidade
  }
}

export function calculateOccurrencePenalty(
  penalidade_base: number,
  occurrence_number: number,
  mode: PenaltyMode,
  multiplier: number
): number {
  switch (mode) {
    case 'fixed':
      return penalidade_base
    case 'linear':
      return penalidade_base + (occurrence_number - 1) * multiplier
    case 'exponential':
      return penalidade_base * Math.pow(multiplier, occurrence_number - 1)
    default:
      return penalidade_base
  }
}

export function getProgressPercent(realizado: number, meta: number): number {
  if (meta === 0) return 100
  return Math.min(100, Math.round((realizado / meta) * 100))
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(n))
}

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
}

export const penaltyModeLabels: Record<PenaltyMode, string> = {
  fixed: 'Fixa',
  linear: 'Linear (cresce por unidade)',
  exponential: 'Exponencial (dobra)',
}

export const categoryEmoji: Record<GoalCategory, string> = {
  estudos: '📚',
  saude: '💪',
  financas: '💰',
  carreira: '🎯',
  desenvolvimento_pessoal: '🌱',
  outro: '✦',
}
