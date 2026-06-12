import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, XCircle, AlertCircle, Zap, TrendingUp } from 'lucide-react'
import {
  formatCurrency, formatDate, parseWeekId, getWeekRange, getWeekId,
  weekLabel, calculatePenalty, calculateOccurrencePenalty,
  isCommitmentMet, getProgressPercent, commitmentTypeLabels,
  unitLabels, frequencyLabels, formatNumber, cn,
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

  // Commitments ativos
  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'ativo')
  const { data: allCommitments } = await supabase.from('commitments').select('*').eq('user_id', user.id).eq('ativo', true)

  // Progresso desta semana
  const { data: progressEntries } = await supabase
    .from('progress_entries').select('*').eq('user_id', user.id)
    .gte('data', format(weekStart, 'yyyy-MM-dd')).lte('data', format(weekEnd, 'yyyy-MM-dd'))

  // Ocorrências desta semana
  const { data: occurrences } = await supabase
    .from('occurrences').select('*').eq('user_id', user.id)
    .gte('data', format(weekStart, 'yyyy-MM-dd')).lte('data', format(weekEnd, 'yyyy-MM-dd'))

  // Week plans (meta customizada para esta semana)
  const { data: weekPlans } = await supabase
    .from('week_plans').select('*').eq('user_id', user.id)
    .eq('year', year).eq('week_number', weekNumber)

  // Profile (orçamento e causa)
  const { data: profile } = await supabase.from('profiles').select('*, charities(*)').eq('id', user.id).single()

  // Montar dados por compromisso
  const commitmentRows = (allCommitments || []).map((c: Commitment) => {
    const goal = (goals || []).find((g: Goal) => g.id === c.goal_id)
    if (!goal) return null

    // Verificar se há plan customizado para esta semana
    const plan = (weekPlans || []).find(p => p.commitment_id === c.id)
    const metaEfetiva = plan ? Number(plan.meta_valor) : c.meta_valor

    if (c.commitment_type === 'ocorrencia') {
      const occ = (occurrences || []).filter(o => o.commitment_id === c.id)
      const totalPenalty = occ.reduce((s, o) => s + Number(o.penalidade_valor), 0)
      return { ...c, goal, metaEfetiva, totalDone: occ.length, totalPenalty, met: false, occ, pct: 0 }
    }

    const entries = (progressEntries || []).filter((p: ProgressEntry) => p.commitment_id === c.id)
    const totalDone = entries.reduce((s, e) => s + Number(e.quantidade_realizada), 0)
    const met = isCommitmentMet(c.commitment_type, metaEfetiva, totalDone)
    const penalty = met ? 0 : calculatePenalty(c.commitment_type, metaEfetiva, totalDone, c.penalidade_por_unidade, c.penalty_mode, c.penalty_multiplier)
    const pct = getProgressPercent(c.commitment_type, totalDone, metaEfetiva)
    return { ...c, goal, metaEfetiva, totalDone, totalPenalty: penalty, met, occ: [], pct }
  }).filter(Boolean) as any[]

  const weeklyCommits = commitmentRows.filter(c => c.frequencia === 'semanal' || c.commitment_type === 'ocorrencia')
  const dailyCommits = commitmentRows.filter(c => c.frequencia === 'diaria')
  const monthlyCommits = commitmentRows.filter(c => c.frequencia === 'mensal')

  const totalPenalty = commitmentRows.reduce((s, c) => s + c.totalPenalty, 0)
  const weeklyBudget = Number(profile?.weekly_budget || 0)
  const budgetPct = weeklyBudget > 0 ? Math.round((totalPenalty / weeklyBudget) * 100) : 0

  // Consequência potencial (se nada for feito)
  const potentialPenalty = commitmentRows.reduce((s, c) => {
    if (c.commitment_type === 'ocorrencia') return s + c.totalPenalty
    if (c.met) return s
    return s + calculatePenalty(c.commitment_type, c.metaEfetiva, 0, c.penalidade_por_unidade, c.penalty_mode, c.penalty_multiplier)
  }, 0)

  const metCount = weeklyCommits.filter(c => c.met).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/week/${prevWeekId}`} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Semana {weekNumber}
                {isCurrentWeek && <span className="ml-2 text-xs font-normal text-success bg-success/10 px-2 py-0.5 rounded-full">atual</span>}
                {isFuture && <span className="ml-2 text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">futura</span>}
              </h1>
              <p className="text-sm text-muted-foreground">{weekLabel(weekId)}</p>
            </div>
            <Link href={`/week/${nextWeekId}`} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {isCurrentWeek && (
          <Link href="/goals" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-md transition-colors">
            <Plus className="w-3.5 h-3.5" />Novo objetivo
          </Link>
        )}
      </div>

      {/* Orçamento */}
      {weeklyBudget > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Orçamento de consequências</p>
            <p className="text-xs text-muted-foreground">Semana {weekNumber}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold">{formatCurrency(weeklyBudget)}</p>
              <p className="text-xs text-muted-foreground">orçamento</p>
            </div>
            <div>
              <p className={cn('text-lg font-semibold', totalPenalty > 0 ? 'text-consequence' : 'text-success')}>
                {formatCurrency(totalPenalty)}
              </p>
              <p className="text-xs text-muted-foreground">acumulado</p>
            </div>
            <div>
              <p className={cn('text-lg font-semibold', potentialPenalty > weeklyBudget ? 'text-consequence' : 'text-warning')}>
                {formatCurrency(potentialPenalty)}
              </p>
              <p className="text-xs text-muted-foreground">potencial</p>
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

      {commitmentRows.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-4">
          <p className="text-muted-foreground text-sm">Nenhum compromisso ativo.</p>
          <Link href="/goals/new" className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />Criar objetivo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Semanais */}
          {weeklyCommits.length > 0 && (
            <CommitmentSection
              title="Compromissos semanais"
              commitments={weeklyCommits}
              goalId={null}
              isCurrentWeek={isCurrentWeek}
              weekStart={format(weekStart, 'yyyy-MM-dd')}
              weekEnd={format(weekEnd, 'yyyy-MM-dd')}
            />
          )}
          {dailyCommits.length > 0 && (
            <CommitmentSection
              title="Compromissos diários"
              commitments={dailyCommits}
              goalId={null}
              isCurrentWeek={isCurrentWeek}
              weekStart={format(weekStart, 'yyyy-MM-dd')}
              weekEnd={format(weekEnd, 'yyyy-MM-dd')}
            />
          )}
          {monthlyCommits.length > 0 && (
            <CommitmentSection
              title="Compromissos mensais"
              commitments={monthlyCommits}
              goalId={null}
              isCurrentWeek={isCurrentWeek}
              weekStart={format(weekStart, 'yyyy-MM-dd')}
              weekEnd={format(weekEnd, 'yyyy-MM-dd')}
            />
          )}
        </div>
      )}

      {/* Planejamento futuro */}
      {(isFuture || isCurrentWeek) && commitmentRows.length > 0 && (
        <WeekPlanEditor
          userId={user.id}
          weekId={weekId}
          weekNumber={weekNumber}
          year={year}
          commitments={commitmentRows}
          existingPlans={weekPlans || []}
        />
      )}

      {/* Resumo */}
      {totalPenalty > 0 && (
        <div className="bg-foreground text-background rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-background/60 text-xs uppercase tracking-widest mb-1">Consequência acumulada esta semana</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalPenalty)}</p>
            {profile?.charities && (
              <p className="text-xs text-background/60 mt-1">→ {(profile.charities as any).nome}</p>
            )}
          </div>
          <Link href="/impact" className="text-sm text-background/70 hover:text-background transition-colors">Ver impacto →</Link>
        </div>
      )}
    </div>
  )
}

// ─── Commitment section component ───────────────────────────
function CommitmentSection({ title, commitments, isCurrentWeek, weekStart, weekEnd }: {
  title: string; commitments: any[]; goalId: string | null; isCurrentWeek: boolean; weekStart: string; weekEnd: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-1">{title}</p>
      {commitments.map((c: any) => (
        <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {c.commitment_type === 'ocorrencia'
                  ? <Zap className="w-4 h-4 text-warning" />
                  : c.met ? <CheckCircle2 className="w-4 h-4 text-success" />
                  : c.totalDone > 0 ? <AlertCircle className="w-4 h-4 text-warning" />
                  : <XCircle className="w-4 h-4 text-consequence" />}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.goal?.nome}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.commitment_type !== 'ocorrencia' && (
                      <span className="text-xs text-muted-foreground">
                        {c.totalDone} / {c.metaEfetiva} {unitLabels[c.unidade as keyof typeof unitLabels]}
                      </span>
                    )}
                    {c.commitment_type === 'ocorrencia' && (
                      <span className="text-xs text-muted-foreground">{c.totalDone} ocorrências</span>
                    )}
                  </div>
                </div>

                {/* Progress bar — não para ocorrência */}
                {c.commitment_type !== 'ocorrencia' && (
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', c.met ? 'bg-success' : c.pct > 60 ? 'bg-warning' : 'bg-consequence/60')}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                )}

                {/* Consequência + ação */}
                <div className="flex items-center justify-between">
                  {c.totalPenalty > 0
                    ? <span className="text-xs text-consequence">{formatCurrency(c.totalPenalty)} em consequência</span>
                    : <span className="text-xs text-muted-foreground">
                        {c.commitment_type === 'limite_maximo' ? `Limite: ${c.metaEfetiva} ${unitLabels[c.unidade as keyof typeof unitLabels]}`
                        : c.commitment_type === 'ocorrencia' ? `R$ ${c.penalidade_por_unidade}/ocorrência`
                        : `Meta: ${c.metaEfetiva} ${unitLabels[c.unidade as keyof typeof unitLabels]}`}
                      </span>
                  }
                  {isCurrentWeek && (
                    c.commitment_type === 'ocorrencia'
                      ? <OccurrenceButton commitmentId={c.id} goalId={c.goal_id} currentCount={c.totalDone} penalidade={c.penalidade_por_unidade} penaltyMode={c.penalty_mode} multiplier={c.penalty_multiplier} />
                      : <Link href={`/goals/${c.goal_id}/progress/new?commitment=${c.id}`} className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 transition-colors">
                          Registrar
                        </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
