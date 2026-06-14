'use client'
import { useState, useMemo } from 'react'
import { Star, BookOpen, Dumbbell, Target, Heart, Zap } from 'lucide-react'
import { PeriodFilter, type Period } from './period-filter'
import {
  formatCurrency, formatNumber,
  getCurrentWeekRange, getCurrentMonthRange,
} from '@/lib/utils'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, parseISO, isWithinInterval,
} from 'date-fns'

interface Props {
  allProgress: any[]
  allOccurrences: any[]
  allPenalties: any[]
  honorDays: any[]
  contracts: any[]
  goals: any[]
}

function getPeriodInterval(period: Period) {
  const now = new Date()
  switch (period) {
    case 'semana':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'mes':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'ano':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'total':
      return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) }
  }
}

export function StatsClient({ allProgress, allOccurrences, allPenalties, honorDays, contracts, goals }: Props) {
  const [period, setPeriod] = useState<Period>('total')

  const stats = useMemo(() => {
    const interval = getPeriodInterval(period)

    const filteredProgress = allProgress.filter(p => {
      try { return isWithinInterval(parseISO(p.data), interval) } catch { return false }
    })
    const filteredOccurrences = allOccurrences.filter(o => {
      try { return isWithinInterval(parseISO(o.data), interval) } catch { return false }
    })
    const filteredPenalties = allPenalties.filter(p => {
      try { return isWithinInterval(parseISO(p.created_at), interval) } catch { return false }
    })
    const filteredContracts = contracts.filter(c => {
      try { return isWithinInterval(parseISO(c.semana_inicio), interval) } catch { return false }
    })

    // Acumular por unidade
    const unitTotals: Record<string, number> = {}
    const weeklyByUnit: Record<string, Record<string, number>> = {}

    filteredProgress.forEach((p: any) => {
      const unit = p.commitments?.unidade || 'unidades'
      unitTotals[unit] = (unitTotals[unit] || 0) + Number(p.quantidade_realizada)
      const week = p.data?.substring(0, 7)
      if (week) {
        if (!weeklyByUnit[unit]) weeklyByUnit[unit] = {}
        weeklyByUnit[unit][week] = (weeklyByUnit[unit][week] || 0) + Number(p.quantidade_realizada)
      }
    })

    const totalHoras = unitTotals['horas'] || 0
    const totalQuestoes = unitTotals['questoes'] || 0
    const totalSessoes = unitTotals['sessoes'] || 0
    const totalKm = unitTotals['quilometros'] || 0
    const totalPassos = unitTotals['passos'] || 0
    const totalKcal = unitTotals['kcal'] || 0

    const avgWeeksHoras = totalHoras > 0 && Object.keys(weeklyByUnit['horas'] || {}).length > 0
      ? totalHoras / Object.keys(weeklyByUnit['horas']).length : 0

    const occPenalty = filteredOccurrences.reduce((s, o) => s + Number(o.penalidade_valor), 0)
    const totalImpact = filteredPenalties.reduce((s, p) => s + Number(p.penalidade_valor), 0) + occPenalty

    const totalGoals = goals.length
    const totalGoalsConcluded = goals.filter((g: any) => g.status === 'concluido').length
    const totalContracts = filteredContracts.length

    return {
      totalHoras, totalQuestoes, totalSessoes, totalKm, totalPassos, totalKcal,
      avgWeeksHoras, totalImpact, totalGoals, totalGoalsConcluded, totalContracts,
    }
  }, [period, allProgress, allOccurrences, allPenalties, contracts, goals])

  // Honor days — sempre global (streak não faz sentido filtrado)
  const honorArr = honorDays.filter((d: any) => d.todos_cumpridos)
  let currentStreak = 0, bestStreak = 0, tempStreak = 0
  const totalHonor = honorArr.length

  if (honorArr.length > 0) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let prevDate: Date | null = null
    for (const day of honorArr) {
      const d = new Date(day.data); d.setHours(0, 0, 0, 0)
      if (!prevDate) {
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
        if (diff <= 1) currentStreak = 1
        tempStreak = 1
      } else {
        const diff = Math.round((prevDate.getTime() - d.getTime()) / 86400000)
        if (diff === 1) { tempStreak++; if (currentStreak > 0) currentStreak++ }
        else tempStreak = 1
      }
      if (tempStreak > bestStreak) bestStreak = tempStreak
      prevDate = d
    }
  }

  const periodLabel: Record<Period, string> = {
    semana: 'esta semana',
    mes: 'este mês',
    ano: 'este ano',
    total: 'desde o início',
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estatísticas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sua evolução {periodLabel[period]}.
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Dias de Honra — sempre global */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Dias de Honra</h2>
          <span className="text-xs text-muted-foreground">(histórico total)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Sequência atual</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-semibold">{currentStreak}</p>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 mb-1" />
            </div>
            <p className="text-xs text-muted-foreground">dias consecutivos</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Maior sequência</p>
            <p className="text-3xl font-semibold">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">dias (recorde)</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-5">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Total de Dias de Honra</p>
            <p className="text-3xl font-semibold text-amber-700 dark:text-amber-300">{totalHonor}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">dias cumpridos</p>
          </div>
        </div>
        {currentStreak > 0 && (
          <p className="text-sm text-muted-foreground">
            Você manteve sua palavra por{' '}
            <strong className="text-foreground">{currentStreak} dias consecutivos</strong>.
          </p>
        )}
      </div>

      {/* Estudos */}
      {(stats.totalHoras > 0 || stats.totalQuestoes > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Estudos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.totalHoras > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Total estudado</p>
                <p className="text-2xl font-semibold">{formatNumber(stats.totalHoras)}</p>
                <p className="text-xs text-muted-foreground">horas</p>
                {stats.avgWeeksHoras > 0 && period === 'total' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Média {stats.avgWeeksHoras.toFixed(1)}h/semana
                  </p>
                )}
              </div>
            )}
            {stats.totalQuestoes > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Questões resolvidas</p>
                <p className="text-2xl font-semibold">{formatNumber(stats.totalQuestoes)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saúde */}
      {(stats.totalSessoes > 0 || stats.totalKm > 0 || stats.totalPassos > 0 || stats.totalKcal > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Saúde e movimento</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.totalSessoes > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Sessões / treinos</p>
                <p className="text-2xl font-semibold">{formatNumber(stats.totalSessoes)}</p>
              </div>
            )}
            {stats.totalKm > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Quilômetros</p>
                <p className="text-2xl font-semibold">{formatNumber(stats.totalKm)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
            )}
            {stats.totalPassos > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Passos</p>
                <p className="text-2xl font-semibold">{formatNumber(stats.totalPassos)}</p>
              </div>
            )}
            {stats.totalKcal > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Calorias consumidas</p>
                <p className="text-2xl font-semibold">{formatNumber(stats.totalKcal)}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Objetivos */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Objetivos e compromissos</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Objetivos criados</p>
            <p className="text-2xl font-semibold">{stats.totalGoals}</p>
          </div>
          {stats.totalGoalsConcluded > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Concluídos</p>
              <p className="text-2xl font-semibold">{stats.totalGoalsConcluded}</p>
            </div>
          )}
          {stats.totalContracts > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Contratos assumidos</p>
              <p className="text-2xl font-semibold">{stats.totalContracts}</p>
              {period !== 'total' && <p className="text-xs text-muted-foreground">{periodLabel[period]}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Impacto */}
      {stats.totalImpact > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Consequências geradas</h2>
          </div>
          <div className="bg-foreground text-background rounded-xl p-6">
            <p className="text-background/60 text-xs uppercase tracking-widest mb-1">
              Total {periodLabel[period]}
            </p>
            <p className="text-3xl font-semibold">{formatCurrency(stats.totalImpact)}</p>
            <p className="text-sm text-background/60 mt-2">
              Mesmo nas falhas, você gerou impacto positivo.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalHoras === 0 && stats.totalQuestoes === 0 && stats.totalSessoes === 0 && stats.totalImpact === 0 && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum dado para {periodLabel[period]}. Registre seu progresso para ver as estatísticas.
          </p>
        </div>
      )}
    </div>
  )
}
