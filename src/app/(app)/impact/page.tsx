import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Heart, ExternalLink, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate, getCurrentWeekRange, getCurrentMonthRange, calculatePenalty, isEventType, cn } from '@/lib/utils'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CharityCard } from '@/components/goals/charity-card'
import type { Charity, Commitment } from '@/types'

export default async function ImpactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*, charities(*)').eq('id', user.id).single()
  const { data: charities } = await supabase.from('charities').select('*').eq('ativo', true).order('nome')

  const { start: weekStart, end: weekEnd } = getCurrentWeekRange()
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange()

  const { data: allCommitments } = await supabase.from('commitments').select('*').eq('user_id', user.id).eq('ativo', true)

  async function calcPeriodPenalty(dateStart: Date, dateEnd: Date): Promise<number> {
    const { data: prog } = await supabase.from('progress_entries').select('*, commitments(commitment_type,meta_valor,penalidade_por_unidade,penalty_mode,penalty_multiplier)')
      .eq('user_id', user!.id)
      .gte('data', format(dateStart, 'yyyy-MM-dd')).lte('data', format(dateEnd, 'yyyy-MM-dd'))
    const { data: occ } = await supabase.from('occurrences').select('penalidade_valor')
      .eq('user_id', user!.id)
      .gte('data', format(dateStart, 'yyyy-MM-dd')).lte('data', format(dateEnd, 'yyyy-MM-dd'))

    const progPenalty = (allCommitments || []).reduce((total: number, c: Commitment) => {
      if (isEventType(c.commitment_type)) return total
      const entries = (prog || []).filter((p: any) => p.commitment_id === c.id)
      const done = entries.reduce((s: number, e: any) => s + Number(e.quantidade_realizada), 0)
      return total + calculatePenalty(c.commitment_type, c.meta_valor, done, c.penalidade_por_unidade, c.penalty_mode, c.penalty_multiplier)
    }, 0)
    const occPenalty = (occ || []).reduce((s: number, o: any) => s + Number(o.penalidade_valor), 0)
    return progPenalty + occPenalty
  }

  const weekPenalty = await calcPeriodPenalty(weekStart, weekEnd)
  const monthPenalty = await calcPeriodPenalty(monthStart, monthEnd)

  const { data: allPenalties } = await supabase.from('penalties').select('penalidade_valor').eq('user_id', user.id)
  const totalAccumulated = (allPenalties || []).reduce((s: number, p: any) => s + Number(p.penalidade_valor), 0)

  // Evolução mensal (últimos 6 meses)
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const ref = subMonths(new Date(), i)
      const start = startOfMonth(ref)
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
      return calcPeriodPenalty(start, end).then(val => ({
        label: format(ref, 'MMM', { locale: ptBR }),
        value: val,
      }))
    })
  )
  const monthlyReversed = monthlyData.reverse()
  const maxMonthly = Math.max(...monthlyReversed.map(m => m.value), 1)

  const { data: recentPenalties } = await supabase
    .from('penalties').select('*, commitments(nome), goals(nome)')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)

  const selectedCharity = profile?.charities as Charity | null

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Impacto</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Seus compromisos geram transformação — mesmo nas falhas.</p>
      </div>

      {/* Hero de impacto */}
      {totalAccumulated > 0 && selectedCharity ? (
        <div className="bg-foreground text-background rounded-2xl p-8 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-background/50 text-xs uppercase tracking-widest mb-2">Total comprometido</p>
              <p className="text-5xl font-semibold">{formatCurrency(totalAccumulated)}</p>
              <p className="text-background/60 text-sm mt-2">
                destinados para o <span className="text-background font-medium">{selectedCharity.nome}</span>
              </p>
            </div>
            <Heart className="w-10 h-10 text-background/20" />
          </div>
          <p className="text-background/50 text-sm border-t border-background/10 pt-4">
            Cada compromisso não cumprido gerou impacto positivo. Suas falhas têm significado.
          </p>
        </div>
      ) : (
        <div className="bg-foreground text-background rounded-2xl p-8">
          <p className="text-background/50 text-sm">Escolha uma causa abaixo para que suas consequências gerem impacto real.</p>
        </div>
      )}

      {/* Métricas do período */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Esta semana</p>
          <p className="text-2xl font-semibold">{formatCurrency(weekPenalty)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Este mês</p>
          <p className="text-2xl font-semibold">{formatCurrency(monthPenalty)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Total acumulado</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalAccumulated)}</p>
        </div>
      </div>

      {/* Evolução mensal */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Evolução mensal</h2>
        </div>
        <div className="flex items-end gap-2 h-24">
          {monthlyReversed.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <div
                  className={cn('w-full rounded-t-sm transition-all', m.value > 0 ? 'bg-consequence/60' : 'bg-secondary')}
                  style={{ height: `${m.value > 0 ? Math.max(4, (m.value / maxMonthly) * 80) : 4}px` }}
                />
              </div>
              <p className="text-xs text-muted-foreground capitalize">{m.label}</p>
              {m.value > 0 && <p className="text-xs font-medium">{formatCurrency(m.value)}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Causa atual */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Sua causa social</h2>
        {selectedCharity && (
          <div className="bg-card border-2 border-foreground/20 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-consequence" />
                  <p className="font-medium">{selectedCharity.nome}</p>
                </div>
                <p className="text-sm text-muted-foreground">{selectedCharity.descricao}</p>
              </div>
              {selectedCharity.website && (
                <a href={selectedCharity.website} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Escolher causa */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          {selectedCharity ? 'Trocar causa' : 'Escolher causa'}
        </h2>
        <div className="grid gap-2">
          {(charities || []).map((c: Charity) => (
            <CharityCard key={c.id} charity={c} selected={selectedCharity?.id === c.id} userId={user.id} />
          ))}
        </div>
      </div>

      {/* Histórico */}
      {(recentPenalties || []).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Histórico de consequências</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {(recentPenalties || []).map((p: any) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.goals?.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.commitments?.nome} · {formatDate(p.periodo_inicio)}</p>
                </div>
                <span className="text-sm font-medium text-consequence">{formatCurrency(Number(p.penalidade_valor))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
