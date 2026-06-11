import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Heart, ExternalLink, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate, getCurrentWeekRange, getCurrentMonthRange } from '@/lib/utils'
import { format } from 'date-fns'
import { CharityCard } from '@/components/goals/charity-card'
import type { Charity, Goal, Commitment } from '@/types'

export default async function ImpactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, charities(*)')
    .eq('id', user.id)
    .single()

  const { data: charities } = await supabase
    .from('charities')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  const { start: weekStart, end: weekEnd } = getCurrentWeekRange()
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange()

  // Calculate real-time penalties from progress
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'ativo')

  const { data: allCommitments } = await supabase
    .from('commitments')
    .select('*')
    .eq('user_id', user.id)
    .eq('ativo', true)

  // Week penalties
  const { data: weekProgress } = await supabase
    .from('progress_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('data', format(weekStart, 'yyyy-MM-dd'))
    .lte('data', format(weekEnd, 'yyyy-MM-dd'))

  // Month penalties
  const { data: monthProgress } = await supabase
    .from('progress_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('data', format(monthStart, 'yyyy-MM-dd'))
    .lte('data', format(monthEnd, 'yyyy-MM-dd'))

  function calcPenalty(progress: any[], commitments: Commitment[]) {
    return commitments.reduce((total: number, c: Commitment) => {
      const done = (progress || [])
        .filter((p) => p.commitment_id === c.id)
        .reduce((sum: number, p: any) => sum + Number(p.quantidade_realizada), 0)
      const diff = Math.max(0, c.meta_valor - done)
      return total + diff * c.penalidade_por_unidade
    }, 0)
  }

  const weekPenalty = calcPenalty(weekProgress || [], allCommitments || [])
  const monthPenalty = calcPenalty(monthProgress || [], allCommitments || [])

  // All time from penalties table
  const { data: allPenalties } = await supabase
    .from('penalties')
    .select('penalidade_valor')
    .eq('user_id', user.id)

  const totalAccumulated = (allPenalties || []).reduce(
    (sum: number, p: any) => sum + Number(p.penalidade_valor),
    0
  )

  // Recent history
  const { data: recentPenalties } = await supabase
    .from('penalties')
    .select('*, commitments(nome), goals(nome)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const selectedCharity = profile?.charities as Charity | null

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Impacto</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Suas consequências geram impacto positivo.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-5 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Esta semana</p>
          <p className="text-2xl font-semibold">{formatCurrency(weekPenalty)}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Este mês</p>
          <p className="text-2xl font-semibold">{formatCurrency(monthPenalty)}</p>
        </div>
        <div className="bg-foreground text-background rounded-xl p-5 space-y-1">
          <p className="text-xs text-background/60 uppercase tracking-widest">Total acumulado</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalAccumulated)}</p>
        </div>
      </div>

      {/* Cause selection */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Sua causa social
        </h2>

        {selectedCharity ? (
          <div className="bg-white border-2 border-foreground/20 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-consequence" />
                  <p className="font-medium">{selectedCharity.nome}</p>
                </div>
                <p className="text-sm text-muted-foreground">{selectedCharity.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  Categoria: {selectedCharity.categoria}
                </p>
              </div>
              {selectedCharity.website && (
                <a
                  href={selectedCharity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Site
                </a>
              )}
            </div>
            {totalAccumulated > 0 && (
              <div className="bg-secondary/60 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  Seu compromisso gerou{' '}
                  <strong className="text-foreground">{formatCurrency(totalAccumulated)}</strong>{' '}
                  em impacto para o <strong>{selectedCharity.nome}</strong>.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-secondary/40 border border-dashed border-border rounded-xl p-6 text-center space-y-2">
            <Heart className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Você ainda não escolheu uma causa. Selecione abaixo:
            </p>
          </div>
        )}
      </div>

      {/* Charity list */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Causas disponíveis
        </h2>
        <div className="grid gap-2">
          {(charities || []).map((charity: Charity) => (
            <CharityCard
              key={charity.id}
              charity={charity}
              selected={selectedCharity?.id === charity.id}
              userId={user.id}
            />
          ))}
        </div>
      </div>

      {/* Penalty history */}
      {(recentPenalties || []).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Histórico de consequências
            </h2>
            <Link
              href="/history"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Ver tudo
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white border border-border rounded-xl divide-y divide-border overflow-hidden">
            {(recentPenalties || []).map((p: any) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{p.goals?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.commitments?.nome} · {formatDate(p.periodo_inicio)} a {formatDate(p.periodo_fim)}
                  </p>
                </div>
                <span className="text-sm font-medium text-consequence">
                  {formatCurrency(Number(p.penalidade_valor))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


