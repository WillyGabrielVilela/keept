import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Plus, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Pencil, Zap,
} from 'lucide-react'
import {
  formatDate, formatCurrency, categoryEmoji, categoryLabels,
  frequencyLabels, unitLabels, getProgressPercent, getCycleDates,
  calculatePenalty, calculateTotalOccurrencePenalty, penaltyModeLabels,
  isCommitmentMet, isEventType, commitmentTypeLabels, cn,
} from '@/lib/utils'
import { format } from 'date-fns'
import { GoalActions } from '@/components/goals/goal-actions'
import type { Commitment, ProgressEntry } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function GoalDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: goal } = await supabase
    .from('goals').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!goal) notFound()

  const { data: commitments } = await supabase
    .from('commitments').select('*').eq('goal_id', id).eq('ativo', true).order('created_at')

  // Build per-commitment progress data
  const commitmentData = await Promise.all((commitments || []).map(async (c: Commitment) => {
    const { start: cycleStart, end: cycleEnd } = getCycleDates(c.frequencia)
    const freeQuota = c.free_quota || 0
    const daysLeft = Math.max(0, Math.round((cycleEnd.getTime() - new Date().getTime()) / 86400000))

    if (isEventType(c.commitment_type)) {
      const { data: occ } = await supabase
        .from('occurrences').select('*').eq('commitment_id', c.id)
        .gte('data', format(cycleStart, 'yyyy-MM-dd'))
        .lte('data', format(cycleEnd, 'yyyy-MM-dd'))
      const totalDone = (occ || []).length
      const totalPenalty = calculateTotalOccurrencePenalty(occ || [])
      const met = isCommitmentMet(c.commitment_type, 0, totalDone, freeQuota)
      return { ...c, totalDone, totalPenalty, met, daysLeft, freeQuota, cycleStart, cycleEnd }
    }

    const { data: entries } = await supabase
      .from('progress_entries').select('*').eq('commitment_id', c.id)
      .gte('data', format(cycleStart, 'yyyy-MM-dd'))
      .lte('data', format(cycleEnd, 'yyyy-MM-dd'))
    const totalDone = (entries || []).reduce((s: number, e: ProgressEntry) => s + Number(e.quantidade_realizada), 0)
    const met = isCommitmentMet(c.commitment_type, c.meta_valor, totalDone)
    const totalPenalty = met ? 0 : calculatePenalty(
      c.commitment_type, c.meta_valor, totalDone,
      c.penalidade_por_unidade, c.penalty_mode, c.penalty_multiplier
    )
    const pct = getProgressPercent(c.commitment_type, totalDone, c.meta_valor)
    return { ...c, totalDone, totalPenalty, met, daysLeft, freeQuota, pct, cycleStart, cycleEnd }
  }))

  const totalPenalty = commitmentData.reduce((s, c) => s + c.totalPenalty, 0)
  const metCount = commitmentData.filter(c => c.met).length

  const statusLabel: Record<string, string> = {
    ativo: 'Ativo', pausado: 'Pausado', concluido: 'Concluído', abandonado: 'Abandonado',
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link href="/goals" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Objetivos
        </Link>

        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{categoryEmoji[goal.categoria as keyof typeof categoryEmoji]}</span>
              <h1 className="text-2xl font-semibold tracking-tight">{goal.nome}</h1>
            </div>
            {goal.proposito && (
              <p className="text-sm text-muted-foreground italic">"{goal.proposito}"</p>
            )}
            {goal.descricao && <p className="text-muted-foreground text-sm">{goal.descricao}</p>}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-muted-foreground">{categoryLabels[goal.categoria as keyof typeof categoryLabels]}</span>
              <span className="text-xs text-muted-foreground">{statusLabel[goal.status]}</span>
              {goal.data_alvo && <span className="text-xs text-muted-foreground">Meta: {formatDate(goal.data_alvo)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/goals/${goal.id}/edit`} className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Editar objetivo">
              <Pencil className="w-4 h-4" />
            </Link>
            <GoalActions goalId={goal.id} currentStatus={goal.status} />
          </div>
        </div>
      </div>

      {/* Ciclo atual */}
      {commitmentData.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium">Ciclo atual</h2>
            <span className="text-xs text-muted-foreground">
              {metCount}/{commitmentData.filter(c => !isEventType(c.commitment_type)).length} metas cumpridas
            </span>
          </div>
          <div className="divide-y divide-border">
            {commitmentData.map((c) => {
              const event = isEventType(c.commitment_type)
              const pct = event ? 0 : getProgressPercent(c.commitment_type, c.totalDone, c.meta_valor)
              return (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {event
                        ? <Zap className="w-4 h-4 text-warning" />
                        : c.met
                        ? <CheckCircle2 className="w-4 h-4 text-success" />
                        : c.totalDone > 0
                        ? <AlertCircle className="w-4 h-4 text-warning" />
                        : <XCircle className="w-4 h-4 text-consequence" />}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-medium">{c.nome}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{commitmentTypeLabels[c.commitment_type]}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {event ? (
                            <span className="text-xs text-muted-foreground">
                              {c.totalDone}{c.freeQuota > 0 ? ` / ${c.freeQuota} grátis` : ''} ocorrências
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {c.totalDone} / {c.meta_valor} {unitLabels[c.unidade as keyof typeof unitLabels]}
                            </span>
                          )}
                          <Link href={`/goals/${goal.id}/commitments/${c.id}/edit`} className="text-muted-foreground hover:text-foreground">
                            <Pencil className="w-3 h-3" />
                          </Link>
                          {!event && (
                            <Link href={`/goals/${goal.id}/progress/new?commitment=${c.id}`} className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-0.5 transition-colors">
                              Registrar
                            </Link>
                          )}
                        </div>
                      </div>

                      {!event && (
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', c.met ? 'bg-success' : pct > 60 ? 'bg-warning' : 'bg-consequence/60')} style={{ width: `${pct}%` }} />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {frequencyLabels[c.frequencia as keyof typeof frequencyLabels]} ·{' '}
                          {c.daysLeft > 0 ? `${c.daysLeft} dias restantes` : 'encerrando hoje'}
                        </span>
                        {c.totalPenalty > 0 && (
                          <span className="text-consequence font-medium">{formatCurrency(c.totalPenalty)}</span>
                        )}
                      </div>

                      {/* Consequência emocional */}
                      {!c.met && !event && c.totalDone > 0 && goal.proposito && (
                        <div className="bg-secondary/50 rounded-md p-2.5">
                          <p className="text-xs text-muted-foreground">
                            {c.commitment_type === 'minimum_goal'
                              ? `Faltaram ${(c.meta_valor - c.totalDone).toFixed(1)} ${unitLabels[c.unidade as keyof typeof unitLabels]}.`
                              : `Excedeu ${(c.totalDone - c.meta_valor).toFixed(1)} ${unitLabels[c.unidade as keyof typeof unitLabels]}.`}
                          </p>
                          <p className="text-xs text-foreground/60 mt-1 italic">Lembre-se: "{goal.proposito}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {totalPenalty > 0 && (
            <div className="px-5 py-3 bg-secondary/40 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Consequência neste ciclo</span>
              <span className="text-sm font-medium text-consequence">{formatCurrency(totalPenalty)}</span>
            </div>
          )}
        </div>
      )}

      {/* Lista de compromissos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Compromissos</h2>
          <Link href={`/goals/${goal.id}/commitments/new`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-3.5 h-3.5" />Adicionar
          </Link>
        </div>
        {(commitments || []).length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Nenhum compromisso criado ainda.</p>
            <Link href={`/goals/${goal.id}/commitments/new`} className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" />Criar compromisso
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(commitments || []).map((c: Commitment) => {
              const event = isEventType(c.commitment_type)
              return (
                <div key={c.id} className="bg-card border border-border rounded-lg px-4 py-3.5 flex items-start justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {event && <Zap className="w-3.5 h-3.5 text-warning flex-shrink-0" />}
                      <p className="text-sm font-medium">{c.nome}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{commitmentTypeLabels[c.commitment_type]}</p>
                    {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
                    <p className="text-xs text-muted-foreground">
                      {event ? (
                        <>
                          {c.commitment_type === 'event_limited' && `Franquia: ${c.free_quota} · `}
                          {formatCurrency(c.penalidade_por_unidade)}/ocorrência ·{' '}
                          {penaltyModeLabels[c.penalty_mode as keyof typeof penaltyModeLabels]}
                        </>
                      ) : (
                        <>
                          {c.commitment_type === 'minimum_goal' ? 'Meta:' : 'Limite:'}{' '}
                          {c.meta_valor} {unitLabels[c.unidade as keyof typeof unitLabels]} ·{' '}
                          {frequencyLabels[c.frequencia as keyof typeof frequencyLabels]} ·{' '}
                          {formatCurrency(c.penalidade_por_unidade)}/un
                        </>
                      )}
                    </p>
                  </div>
                  <Link href={`/goals/${goal.id}/commitments/${c.id}/edit`} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
