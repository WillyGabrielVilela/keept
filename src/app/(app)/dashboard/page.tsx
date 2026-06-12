import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Plus, CheckCircle2, XCircle, AlertCircle, ArrowRight, Heart, Star, FileText } from 'lucide-react'
import {
  formatCurrency, categoryEmoji, getProgressPercent,
  getCurrentWeekRange, formatNumber, calculatePenalty,
} from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

    goalSummaries = goals.map((goal: Goal) => {
      const goalCommitments = (commitments || []).filter((c: Commitment) => c.goal_id === goal.id)
      const commitmentSummaries = goalCommitments.map((c: Commitment) => {
        const entries = (progressEntries || []).filter((p: ProgressEntry) => p.commitment_id === c.id)
        const totalDone = entries.reduce((s: number, e: ProgressEntry) => s + Number(e.quantidade_realizada), 0)
        const met = totalDone >= c.meta_valor
        const penalty = met ? 0 : calculatePenalty(
          c.commitment_type || 'meta_minima',
          c.meta_valor, totalDone, c.penalidade_por_unidade,
          c.penalty_mode, c.penalty_multiplier
        )
        return { ...c, totalDone, met, penalty }
      })
      const totalPenalty = commitmentSummaries.reduce((s: number, c: any) => s + c.penalty, 0)
      const metCount = commitmentSummaries.filter((c: any) => c.met).length
      return { goal, commitments: commitmentSummaries, totalPenalty, metCount }
    })
  }

  // Legado: estatísticas acumuladas de vida
  const { data: allProgress } = await supabase
    .from('progress_entries').select('quantidade_realizada, commitments(unidade)')
    .eq('user_id', user.id)

  const { data: allPenalties } = await supabase
    .from('penalties').select('penalidade_valor').eq('user_id', user.id)

  const { data: contracts } = await supabase
    .from('weekly_contracts').select('id').eq('user_id', user.id).eq('status', 'assumido')

  const { data: honorDaysAll } = await supabase
    .from('honor_days').select('todos_cumpridos').eq('user_id', user.id).eq('todos_cumpridos', true)

  const totalImpact = (allPenalties || []).reduce((s: number, p: any) => s + Number(p.penalidade_valor), 0)
  const totalContracts = (contracts || []).length
  const totalHonorDays = (honorDaysAll || []).length

  // Acumular por unidade
  const unitTotals: Record<string, number> = {}
  ;(allProgress || []).forEach((p: any) => {
    const unit = p.commitments?.unidade || 'unidades'
    unitTotals[unit] = (unitTotals[unit] || 0) + Number(p.quantidade_realizada)
  })

  const totalHoras = unitTotals['horas'] || 0
  const totalQuestoes = unitTotals['questoes'] || 0
  const totalSessoes = unitTotals['sessoes'] || 0
  const totalKm = unitTotals['quilometros'] || 0

  // Contrato semanal pendente?
  const { data: weekContract } = await supabase
    .from('weekly_contracts')
    .select('*')
    .eq('user_id', user.id)
    .gte('semana_inicio', format(weekStart, 'yyyy-MM-dd'))
    .single()

  const displayName = profile?.nome || user.email?.split('@')[0] || 'você'
  const hasLegacy = totalHoras > 0 || totalQuestoes > 0 || totalSessoes > 0 || totalContracts > 0 || totalHonorDays > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {displayName}.</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Semana de {format(weekStart, "d 'de' MMM", { locale: ptBR })} a{' '}
            {format(weekEnd, "d 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <Link href="/goals/new" className="flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors">
          <Plus className="w-4 h-4" />
          Novo objetivo
        </Link>
      </div>

      {/* Alerta de contrato pendente */}
      {(!weekContract || weekContract.status === 'pendente') && (goals || []).length > 0 && (
        <Link href="/weekly-contract" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
          <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Contrato semanal pendente</p>
            <p className="text-xs text-amber-600 mt-0.5">Assuma seus compromissos desta semana.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500" />
        </Link>
      )}

      {/* Empty state */}
      {goalSummaries.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-4">
          <div className="text-4xl">🎯</div>
          <div>
            <h2 className="font-medium text-foreground">Nenhum objetivo ativo</h2>
            <p className="text-sm text-muted-foreground mt-1">Comece criando um objetivo. Defina o que é importante para você.</p>
          </div>
          <Link href="/goals/new" className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />Criar primeiro objetivo
          </Link>
        </div>
      )}

      {/* Goal cards */}
      <div className="space-y-4">
        {goalSummaries.map(({ goal, commitments, totalPenalty, metCount }) => (
          <div key={goal.id} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-start justify-between border-b border-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{categoryEmoji[goal.categoria as keyof typeof categoryEmoji]}</span>
                  <h2 className="font-semibold text-foreground">{goal.nome}</h2>
                </div>
                {/* Propósito em falha */}
                {goal.proposito && metCount < commitments.length && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    "{goal.proposito}"
                  </p>
                )}
                {commitments.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {metCount} de {commitments.length} compromissos cumpridos esta semana
                  </p>
                )}
              </div>
              <Link href={`/goals/${goal.id}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Ver objetivo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {commitments.length === 0 ? (
              <div className="px-6 py-4 text-sm text-muted-foreground">
                Nenhum compromisso.{' '}
                <Link href={`/goals/${goal.id}/commitments/new`} className="text-foreground hover:underline">Criar compromisso</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {commitments.map((c: any) => {
                  const pct = getProgressPercent(c.totalDone, c.meta_valor)
                  return (
                    <div key={c.id} className="px-6 py-3.5 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {c.met ? <CheckCircle2 className="w-4 h-4 text-success" />
                          : c.totalDone > 0 ? <AlertCircle className="w-4 h-4 text-warning" />
                          : <XCircle className="w-4 h-4 text-consequence" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{c.nome}</span>
                          <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                            {c.totalDone} / {c.meta_valor} {c.unidade}
                          </span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${c.met ? 'bg-success' : pct > 50 ? 'bg-warning' : 'bg-consequence/60'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {/* Mensagem emocional */}
                        {!c.met && c.totalDone > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Faltaram {(c.meta_valor - c.totalDone).toFixed(1)} {c.unidade} para cumprir seu compromisso.
                            {c.penalty > 0 && <span className="text-consequence"> Impacto: {formatCurrency(c.penalty)}.</span>}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/goals/${goal.id}/progress/new?commitment=${c.id}`}
                        className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 transition-colors"
                      >
                        Registrar
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPenalty > 0 && (
              <div className="px-6 py-3 bg-secondary/40 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="w-3.5 h-3.5 text-consequence" />
                  <span>Impacto desta semana</span>
                </div>
                <span className="text-sm font-medium text-consequence">{formatCurrency(totalPenalty)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legado */}
      {hasLegacy && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-white">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Seu legado até agora</h2>
          </div>
          <div className="bg-white px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {totalHoras > 0 && (
                <div className="space-y-0.5">
                  <p className="text-2xl font-semibold">{formatNumber(totalHoras)}</p>
                  <p className="text-xs text-muted-foreground">horas estudadas</p>
                </div>
              )}
              {totalQuestoes > 0 && (
                <div className="space-y-0.5">
                  <p className="text-2xl font-semibold">{formatNumber(totalQuestoes)}</p>
                  <p className="text-xs text-muted-foreground">questões resolvidas</p>
                </div>
              )}
              {totalSessoes > 0 && (
                <div className="space-y-0.5">
                  <p className="text-2xl font-semibold">{formatNumber(totalSessoes)}</p>
                  <p className="text-xs text-muted-foreground">sessões realizadas</p>
                </div>
              )}
              {totalKm > 0 && (
                <div className="space-y-0.5">
                  <p className="text-2xl font-semibold">{formatNumber(totalKm)}</p>
                  <p className="text-xs text-muted-foreground">quilômetros</p>
                </div>
              )}
              {totalContracts > 0 && (
                <div className="space-y-0.5">
                  <p className="text-2xl font-semibold">{totalContracts}</p>
                  <p className="text-xs text-muted-foreground">contratos assumidos</p>
                </div>
              )}
              {totalHonorDays > 0 && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-2xl font-semibold">{totalHonorDays}</p>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <p className="text-xs text-muted-foreground">dias de honra</p>
                </div>
              )}
              {totalImpact > 0 && (
                <div className="space-y-0.5">
                  <p className="text-2xl font-semibold">{formatCurrency(totalImpact)}</p>
                  <p className="text-xs text-muted-foreground">em impacto social</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
