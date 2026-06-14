import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, XCircle, AlertCircle, Zap, Lock } from 'lucide-react'
import {
  formatCurrency, parseWeekId, getWeekRange, getWeekId, weekLabel,
  calculatePenalty, calculateOccurrencePenalty, calculateTotalOccurrencePenalty,
  isCommitmentMet, getProgressPercent, isEventType,
  commitmentTypeLabels, unitLabels, frequencyLabels, formatNumber, cn,
} from '@/lib/utils'
import { format, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { OccurrenceButton } from '@/components/week/occurrence-button'
import { WeekPlanEditor } from '@/components/week/week-plan-editor'
import type { Commitment, Goal, ProgressEntry, Occurrence } from '@/types'

interface Props { params: Promise<{ weekId: string }> }

export default async function WeekPage({ params }: Props) {
  const { weekId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let weekData: { year: number; week: number; date: Date }
  try { weekData = parseWeekId(weekId) } catch { notFound() }

  const { year, week: weekNumber, date: weekRefDate } = weekData
  const { start: weekStart, end: weekEnd } = getWeekRange(weekRefDate)
  const now = new Date()
  const currentWeekId = getWeekId(now)
  const isCurrentWeek = weekId === currentWeekId
  const isFuture = weekStart > now

  const prevWeekId = getWeekId(subWeeks(weekRefDate, 1))
  const nextWeekId = getWeekId(addWeeks(weekRefDate, 1))

  const { data: goals } = await supabase
    .from('goals').select('*').eq('user_id', user.id).eq('status', 'ativo')
  const { data: allCommitments } = await supabase
    .from('commitments').select('*').eq('user_id', user.id).eq('ativo', true)
  const { data: progressEntries } = await supabase
    .from('progress_entries').select('*').eq('user_id', user.id)
    .gte('data', format(weekStart, 'yyyy-MM-dd')).lte('data', format(weekEnd, 'yyyy-MM-dd'))
  const { data: occurrences } = await supabase
    .from('occurrences').select('*').eq('user_id', user.id)
    .gte('data', format(weekStart, 'yyyy-MM-dd')).lte('data', format(weekEnd, 'yyyy-MM-dd'))
  const { data: weekPlans } = await supabase
    .from('week_plans').select('*').eq('user_id', user.id)
    .eq('year', year).eq('week_number', weekNumber)
  const { data: profile } = await supabase
    .from('profiles').select('*, charities(*)').eq('id', user.id).single()

  // Build commitment rows
  const rows = (allCommitments || []).map((c: Commitment) => {
    const goal = (goals || []).find((g: Goal) => g.id === c.goal_id)
    if (!goal) return null

    const plan = (weekPlans || []).find(p => p.commitment_id === c.id)
    const metaEfetiva = plan ? Number(plan.meta_valor) : c.meta_valor
    const freeQuota = c.free_quota || 0

    if (isEventType(c.commitment_type)) {
      const occ = (occurrences || []).filter(o => o.commitment_id === c.id)
      const totalPenalty = calculateTotalOccurrencePenalty(occ)
      const met = isCommitmentMet(c.commitment_type, 0, occ.length, freeQuota)
      return {
        ...c, goal, metaEfetiva, freeQuota,
        totalDone: occ.length, totalPenalty, met,
        occ, pct: getProgressPercent(c.commitment_type, occ.length, metaEfetiva, freeQuota),
      }
    }

    const entries = (progressEntries || []).filter((p: ProgressEntry) => p.commitment_id === c.id)
    const totalDone = entries.reduce((s, e: ProgressEntry) => s + Number(e.quantidade_realizada), 0)
    const met = isCommitmentMet(c.commitment_type, metaEfetiva, totalDone)
    const penalty = met ? 0 : calculatePenalty(
      c.commitment_type, metaEfetiva, totalDone,
      c.penalidade_por_unidade, c.penalty_mode, c.penalty_multiplier
    )
    const pct = getProgressPercent(c.commitment_type, totalDone, metaEfetiva)
    return {
      ...c, goal, metaEfetiva, freeQuota,
      totalDone, totalPenalty: penalty, met, occ: [], pct,
    }
  }).filter(Boolean) as any[]

  const weeklyRows   = rows.filter(c => c.frequencia === 'semanal' || isEventType(c.commitment_type))
  const dailyRows    = rows.filter(c => c.frequencia === 'diaria')
  const monthlyRows  = rows.filter(c => c.frequencia === 'mensal')

  const totalPenalty = rows.reduce((s, c) => s + c.totalPenalty, 0)
  const weeklyBudget = Number(profile?.weekly_budget || 0)
  const budgetPct = weeklyBudget > 0 ? Math.round((totalPenalty / weeklyBudget) * 100) : 0

  // Potential penalty (worst case — nothing done)
  const potentialPenalty = rows.reduce((s, c) => {
    if (isEventType(c.commitment_type)) return s + c.totalPenalty
    if (c.met) return s
    return s + calculatePenalty(c.commitment_type, c.metaEfetiva, 0, c.penalidade_por_unidade, c.penalty_mode, c.penalty_multiplier)
  }, 0)

  function renderSection(title: string, sectionRows: any[]) {
    if (sectionRows.length === 0) return null
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-1">{title}</p>
        {sectionRows.map((c: any) => (
          <CommitmentRow
            key={c.id} c={c}
            goalId={c.goal_id}
            isCurrentWeek={isCurrentWeek}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/week/${prevWeekId}`} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              Semana {weekNumber}
              {isCurrentWeek && (
                <span className="text-xs font-normal text-success bg-success/10 px-2 py-0.5 rounded-full">atual</span>
              )}
              {isFuture && (
                <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">futura</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{weekLabel(weekId)}</p>
          </div>
          <Link href={`/week/${nextWeekId}`} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {isCurrentWeek && (
          <Link href="/goals/new" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-md transition-colors">
            <Plus className="w-3.5 h-3.5" />Novo objetivo
          </Link>
        )}
      </div>

      {/* Orçamento */}
      {weeklyBudget > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium">Orçamento de consequências</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold">{formatCurrency(weeklyBudget)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">orçamento</p>
            </div>
            <div>
              <p className={cn('text-lg font-semibold', totalPenalty > 0 ? 'text-consequence' : 'text-success')}>
                {formatCurrency(totalPenalty)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">acumulado</p>
            </div>
            <div>
              <p className={cn('text-lg font-semibold', potentialPenalty > weeklyBudget ? 'text-consequence' : 'text-warning')}>
                {formatCurrency(potentialPenalty)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">potencial</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uso atual</span>
              <span className={budgetPct > 100 ? 'text-consequence font-medium' : ''}>{budgetPct}% do orçamento</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', budgetPct > 100 ? 'bg-consequence' : budgetPct > 70 ? 'bg-warning' : 'bg-success')}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {rows.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-4">
          <p className="text-muted-foreground text-sm">Nenhum compromisso ativo.</p>
          <Link href="/goals/new" className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />Criar objetivo
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {renderSection('Compromissos semanais', weeklyRows)}
        {renderSection('Compromissos diários', dailyRows)}
        {renderSection('Compromissos mensais', monthlyRows)}
      </div>

      {/* Week plan editor */}
      {(isCurrentWeek || isFuture) && rows.length > 0 && (
        <WeekPlanEditor
          userId={user.id}
          weekId={weekId}
          weekNumber={weekNumber}
          year={year}
          commitments={rows}
          existingPlans={weekPlans || []}
        />
      )}

      {/* Impact summary */}
      {totalPenalty > 0 && (
        <div className="bg-foreground text-background rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-background/60 text-xs uppercase tracking-widest mb-1">Consequência acumulada</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalPenalty)}</p>
            {profile?.charities && (
              <p className="text-xs text-background/50 mt-1">→ {(profile.charities as any).nome}</p>
            )}
          </div>
          <Link href="/impact" className="text-sm text-background/70 hover:text-background transition-colors">
            Ver impacto →
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── CommitmentRow ────────────────────────────────────────────
function CommitmentRow({ c, goalId, isCurrentWeek }: { c: any; goalId: string; isCurrentWeek: boolean }) {
  const event = isEventType(c.commitment_type)
  const limited = c.commitment_type === 'event_limited'

  // Color logic
  const barColor = c.met ? 'bg-success'
    : c.pct > 80 ? 'bg-warning'
    : 'bg-consequence/60'

  const icon = event
    ? <Zap className="w-4 h-4 text-warning" />
    : c.met
    ? <CheckCircle2 className="w-4 h-4 text-success" />
    : c.totalDone > 0
    ? <AlertCircle className="w-4 h-4 text-warning" />
    : <XCircle className="w-4 h-4 text-consequence" />

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{c.nome}</p>
              <p className="text-xs text-muted-foreground">{c.goal?.nome}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              {event ? (
                <div>
                  <p className="text-sm font-medium">
                    {c.totalDone}
                    {limited && c.freeQuota > 0 && (
                      <span className="text-muted-foreground"> / {c.freeQuota} grátis</span>
                    )}
                    <span className="text-muted-foreground text-xs ml-1">ocorrências</span>
                  </p>
                  {limited && c.totalDone <= c.freeQuota && (
                    <p className="text-xs text-success">dentro da franquia</p>
                  )}
                </div>
              ) : (
                <p className="text-sm">
                  <span className="font-medium">{c.totalDone}</span>
                  <span className="text-muted-foreground"> / {c.metaEfetiva} {unitLabels[c.unidade as keyof typeof unitLabels]}</span>
                </p>
              )}
            </div>
          </div>

          {/* Progress bar — not for pure event_occurrence */}
          {!event && (
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${c.pct}%` }} />
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {event ? (
                <>
                  {c.commitmentType === 'event_limited'
                    ? `Franquia: ${c.freeQuota} · R$ ${c.penalidade_por_unidade}/excedente`
                    : `R$ ${c.penalidade_por_unidade}/ocorrência`
                  }
                </>
              ) : (
                <>
                  {c.commitment_type === 'minimum_goal' ? `Meta: ${c.metaEfetiva}` : `Limite: ${c.metaEfetiva}`}
                  {' '}{unitLabels[c.unidade as keyof typeof unitLabels]}
                </>
              )}
            </div>
            {c.totalPenalty > 0 && (
              <span className="text-xs font-medium text-consequence">
                {formatCurrency(c.totalPenalty)}
              </span>
            )}
          </div>

          {/* Action */}
          {isCurrentWeek && (
            <div className="flex justify-end">
              {event ? (
                <OccurrenceButton
                  commitmentId={c.id}
                  goalId={goalId}
                  currentCount={c.totalDone}
                  penalidade={c.penalidade_por_unidade}
                  penaltyMode={c.penalty_mode}
                  multiplier={c.penalty_multiplier}
                  freeQuota={c.freeQuota || 0}
                  commitmentType={c.commitment_type}
                />
              ) : (
                <Link
                  href={`/goals/${goalId}/progress/new?commitment=${c.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 transition-colors"
                >
                  Registrar progresso
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
