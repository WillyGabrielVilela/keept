'use client'
import { useState, useMemo } from 'react'
import { Star } from 'lucide-react'
import { PeriodFilter, type Period } from './period-filter'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { isWithinInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

interface Props {
  allProgress: { data: string; quantidade_realizada: number; unidade: string }[]
  allPenalties: { penalidade_valor: number; created_at: string }[]
  contracts: { semana_inicio: string }[]
  honorDaysTotal: number
  honorStreak: number
}

function getInterval(period: Period) {
  const now = new Date()
  switch (period) {
    case 'semana': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'mes':    return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'ano':    return { start: startOfYear(now), end: endOfYear(now) }
    case 'total':  return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) }
  }
}

export function DashboardLegacy({ allProgress, allPenalties, contracts, honorDaysTotal, honorStreak }: Props) {
  const [period, setPeriod] = useState<Period>('total')

  const stats = useMemo(() => {
    const interval = getInterval(period)
    const inRange = (d: string) => { try { return isWithinInterval(parseISO(d), interval) } catch { return false } }

    const fp = allProgress.filter(p => inRange(p.data))
    const unitTotals: Record<string, number> = {}
    fp.forEach(p => { unitTotals[p.unidade] = (unitTotals[p.unidade] || 0) + Number(p.quantidade_realizada) })

    const totalImpact = allPenalties.filter(p => inRange(p.created_at))
      .reduce((s, p) => s + Number(p.penalidade_valor), 0)
    const totalContracts = contracts.filter(c => inRange(c.semana_inicio)).length

    return {
      horas: unitTotals['horas'] || 0,
      questoes: unitTotals['questoes'] || 0,
      sessoes: unitTotals['sessoes'] || 0,
      km: unitTotals['quilometros'] || 0,
      totalImpact,
      totalContracts,
    }
  }, [period, allProgress, allPenalties, contracts])

  const hasData = stats.horas > 0 || stats.questoes > 0 || stats.sessoes > 0
    || stats.totalContracts > 0 || honorDaysTotal > 0 || stats.totalImpact > 0

  if (!hasData) return null

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Seu legado</h2>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <div className="bg-card px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.horas > 0 && (
            <div className="space-y-0.5">
              <p className="text-2xl font-semibold">{formatNumber(stats.horas)}</p>
              <p className="text-xs text-muted-foreground">horas estudadas</p>
            </div>
          )}
          {stats.questoes > 0 && (
            <div className="space-y-0.5">
              <p className="text-2xl font-semibold">{formatNumber(stats.questoes)}</p>
              <p className="text-xs text-muted-foreground">questões resolvidas</p>
            </div>
          )}
          {stats.sessoes > 0 && (
            <div className="space-y-0.5">
              <p className="text-2xl font-semibold">{formatNumber(stats.sessoes)}</p>
              <p className="text-xs text-muted-foreground">sessões realizadas</p>
            </div>
          )}
          {stats.km > 0 && (
            <div className="space-y-0.5">
              <p className="text-2xl font-semibold">{formatNumber(stats.km)}</p>
              <p className="text-xs text-muted-foreground">quilômetros</p>
            </div>
          )}
          {stats.totalContracts > 0 && (
            <div className="space-y-0.5">
              <p className="text-2xl font-semibold">{stats.totalContracts}</p>
              <p className="text-xs text-muted-foreground">contratos assumidos</p>
            </div>
          )}
          {(period === 'total' ? honorDaysTotal > 0 : false) && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <p className="text-2xl font-semibold">{honorDaysTotal}</p>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-xs text-muted-foreground">dias de honra</p>
            </div>
          )}
          {honorStreak > 0 && period === 'total' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <p className="text-2xl font-semibold">{honorStreak}</p>
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-xs text-muted-foreground">dias consecutivos</p>
            </div>
          )}
          {stats.totalImpact > 0 && (
            <div className="space-y-0.5">
              <p className="text-2xl font-semibold">{formatCurrency(stats.totalImpact)}</p>
              <p className="text-xs text-muted-foreground">em impacto social</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
