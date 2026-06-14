import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Plus, CheckCircle2, XCircle, AlertCircle, ArrowRight, Heart, FileText, Zap } from 'lucide-react'
import {
  formatCurrency, categoryEmoji, getProgressPercent,
  getCurrentWeekRange, calculatePenalty, calculateTotalOccurrencePenalty,
  isCommitmentMet, isEventType,
} from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DashboardLegacy } from '@/components/stats/dashboard-legacy'
import type { Goal, Commitment, ProgressEntry } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*, charities(*)').eq('id', user.id).single()

  const { data: goals } = await supabase
    .from('goals').select('*').eq('user_id', user.id).eq('status', 'ativo')
    .order('created_at', { ascending: false })

  const { start: weekStart, end: weekEnd } = getCurrentWeekRange()

  let goalSummaries: any[] = []
  if (goals && goals.length > 0) {
    const { data: commitments } = await supabase
      .from('commitments').select('*')
      .in('goal_id', goals.map((g: Goal) => g.id)).eq('ativo', true)

    const { data: progressEntries } = await supabase
      .from('progress_entries').select('*')
      .in('goal_id', goals.map((g: Goal) => g.id))
      .gte('data', format(weekStart, 'yyyy-MM-dd'))
      .lte('data', format(weekEnd, 'yyyy-MM-dd'))

    const { data: occurrences } = await supabase
      .from('occurrences').select('*')
      .in('goal_id', goals.map((g: Goal) => g.id))
      .gte('data', format(weekStart, 'yyyy-MM-dd'))
      .lte('data', format(weekEnd, 'yyyy-MM-dd'))

    goalSummaries = goals.map((goal: Goal) => {
      const goalCommitments = (commitments || []).filter((c: Commitment) => c.goal_id === goal.id)
      const commitmentSummaries = goalCommitments.map((c: Commitment) => {
        const freeQuota = c.free_quota || 0

        if (isEventType(c.commitment_type)) {
          const occ = (occurrences || []).filter(o => o.commitment_id === c.id)
          const totalPenalty = calculateTotalOccurrencePenalty(occ)
          return { ...c, totalDone: occ.length, penalty: totalPenalty, met: false, freeQuota }
        }

        const entries = (progressEntries || []).filter((p: ProgressEntry) => p.commitment_id === c.id)
        const totalDone = entries.reduce((s: number, e: ProgressEntry) => s + Number(e.quantidade_realizada), 0)
        const met = isCommitmentMet(c.commitment_type, c.meta_valor, totalDone)
        const penalty = met ? 0 : calculatePenalty(
          c.commitment_type, c.meta_valor, totalDone,
          c.penalidade_por_unidade, c.penalty_mode, c.penalty_multiplier
        )
        return { ...c, totalDone, penalty, met, freeQuota }
      })

      const totalPenalty = commitmentSummaries.reduce((s: number, c: any) => s + c.penalty, 0)
      const metCount = commitmentSummaries.filter((c: any) => c.met && !isEventType(c.commitment_type)).length
      const nonEventCount = commitmentSummaries.filter((c: any) => !isEventType(c.commitment_type)).length
      return { goal, commitments: commitmentSummaries, totalPenalty, metCount, nonEventCount }
    })
  }

  // Raw data for legacy component
  const { data: allProgress } = await supabase
    .from('progress_entries').select('quantidade_realizada, data, commitments(unidade)')
    .eq('user_id', user.id)
  const { data: allPenalties } = await supabase
    .from('penalties').select('penalidade_valor, created_at').eq('user_id', user.id)
  const { data: contracts } = await supabase
    .from('weekly_contracts').select('semana_inicio').eq('user_id', user.id).eq('status', 'assumido')
  const { data: honorDaysAll } = await supabase
    .from('honor_days').select('todos_cumpridos, data').eq('user_id', user.id)
    .eq('todos_cumpridos', true).order('data', { ascending: false })

  let honorStreak = 0
  if (honorDaysAll && honorDaysAll.length > 0) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let checkDate = new Date(today)
    for (const day of honorDaysAll) {
      const d = new Date(day.data); d.setHours(0, 0, 0, 0)
      if (Math.round((checkDate.getTime() - d.getTime()) / 86400000) <= 1) {
        honorStreak++; checkDate = d
      } else break
    }
  }

  const totalImpact = (allPenalties || []).reduce((s: number, p: any) => s + Number(p.penalidade_valor), 0)

  const { data: weekContract } = await supabase
    .from('weekly_contracts').select('status').eq('user_id', user.id)
    .gte('semana_inicio', format(weekStart, 'yyyy-MM-dd')).single()

  const displayName = profile?.nome || user.email?.split('@')[0] || 'você'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {displayName}.</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Semana de {format(weekStart, "d 'de' MMM", { locale: ptBR })} a{' '}
            {format(weekEnd, "d 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <Link href="/goals/new" className="flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors">
          <Plus className="w-4 h-4" />Novo objetivo
        </Link>
      </div>

      {/* Contrato pendente */}
      {(!weekContract || weekContract.status === 'pendente') && (goals || []).length > 0 && (
        <Link href="/weekly-contract" className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
          <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Contrato semanal pendente</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Assuma seus compromissos desta semana.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500" />
        </Link>
      )}

      {goalSummaries.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-4">
          <div className="text-4xl">🎯</div>
          <div>
            <h2 className="font-medium">Nenhum objetivo ativo</h2>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro objetivo e defina compromissos reais.</p>
          </div>
          <Link href="/goals/new" className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />Criar primeiro objetivo
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {goalSummaries.map(({ goal, commitments, totalPenalty, metCount, nonEventCount }) => (
          <div key={goal.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-start justify-between border-b border-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{categoryEmoji[goal.categoria as keyof typeof categoryEmoji]}</span>
                  <h2 className="font-semibold">{goal.nome}</h2>
                </div>
                {goal.proposito && metCount < nonEventCount && (
                  <p className="text-xs text-muted-foreground italic">"{goal.proposito}"</p>
                )}
                {nonEventCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {metCount}/{nonEventCount} metas cumpridas esta semana
                  </p>
                )}
              </div>
              <Link href={`/goals/${goal.id}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Ver <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {commitments.length === 0 ? (
              <div className="px-6 py-4 text-sm text-muted-foreground">
                Nenhum compromisso.{' '}
                <Link href={`/goals/${goal.id}/commitments/new`} className="text-foreground hover:underline">Criar</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {commitments.map((c: any) => {
                  const event = isEventType(c.commitment_type)
                  const pct = event ? 0 : getProgressPercent(c.commitment_type, c.totalDone, c.meta_valor)
                  return (
                    <div key={c.id} className="px-6 py-3.5 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {event
                          ? <Zap className="w-4 h-4 text-warning" />
                          : c.met
                          ? <CheckCircle2 className="w-4 h-4 text-success" />
                          : c.totalDone > 0
                          ? <AlertCircle className="w-4 h-4 text-warning" />
                          : <XCircle className="w-4 h-4 text-consequence" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{c.nome}</span>
                          <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                            {event
                              ? `${c.totalDone}${c.freeQuota > 0 ? `/${c.freeQuota}` : ''} ocorrências`
                              : `${c.totalDone} / ${c.meta_valor} ${c.unidade}`}
                          </span>
                        </div>
                        {!event && (
                          <div className="h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${c.met ? 'bg-success' : pct > 50 ? 'bg-warning' : 'bg-consequence/60'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {!c.met && !event && c.totalDone > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.commitment_type === 'minimum_goal'
                              ? `Faltaram ${(c.meta_valor - c.totalDone).toFixed(1)} ${c.unidade}.`
                              : `Excedeu ${(c.totalDone - c.meta_valor).toFixed(1)} ${c.unidade}.`}
                            {c.penalty > 0 && <span className="text-consequence"> Consequência: {formatCurrency(c.penalty)}.</span>}
                          </p>
                        )}
                      </div>
                      {!event && (
                        <Link href={`/goals/${goal.id}/progress/new?commitment=${c.id}`} className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 transition-colors">
                          Registrar
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {totalPenalty > 0 && (
              <div className="px-6 py-3 bg-secondary/40 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="w-3.5 h-3.5 text-consequence" />
                  <span>Consequência esta semana</span>
                </div>
                <span className="text-sm font-medium text-consequence">{formatCurrency(totalPenalty)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <DashboardLegacy
        allProgress={(allProgress || []).map((p: any) => ({
          data: p.data,
          quantidade_realizada: Number(p.quantidade_realizada),
          unidade: p.commitments?.unidade || 'unidades',
        }))}
        allPenalties={(allPenalties || []).map((p: any) => ({
          penalidade_valor: Number(p.penalidade_valor),
          created_at: p.created_at,
        }))}
        contracts={(contracts || []).map((c: any) => ({ semana_inicio: c.semana_inicio }))}
        honorDaysTotal={honorDaysAll?.length || 0}
        honorStreak={honorStreak}
      />

      {totalImpact > 0 && (
        <div className="bg-foreground text-background rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-background/60 text-xs uppercase tracking-widest mb-1">Impacto total acumulado</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalImpact)}</p>
          </div>
          <Link href="/impact" className="text-sm text-background/70 hover:text-background flex items-center gap-1 transition-colors">
            Ver detalhes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
