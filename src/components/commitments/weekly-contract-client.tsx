'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileText, Star, Calendar, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatDate, frequencyLabels, unitLabels } from '@/lib/utils'
import type { WeeklyContract } from '@/types'

interface Props {
  userId: string
  weekStart: string
  weekEnd: string
  existingContract: WeeklyContract | null
  commitments: any[]
  contractHistory: WeeklyContract[]
  totalAssumed: number
}

export function WeeklyContractClient({
  userId, weekStart, weekEnd, existingContract, commitments, contractHistory, totalAssumed
}: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const alreadyAssumed = existingContract?.status === 'assumido'

  async function handleAssume() {
    setLoading(true)
    const snapshot = commitments.map(c => ({
      id: c.id, nome: c.nome, meta_valor: c.meta_valor,
      unidade: c.unidade, frequencia: c.frequencia, goal_nome: c.goal_nome,
    }))

    if (existingContract) {
      await supabase.from('weekly_contracts').update({
        status: 'assumido', assumido_em: new Date().toISOString(),
        commitments_snapshot: snapshot,
      }).eq('id', existingContract.id)
    } else {
      const { data: lastContract } = await supabase
        .from('weekly_contracts').select('numero_semana').eq('user_id', userId)
        .order('numero_semana', { ascending: false }).limit(1).single()

      await supabase.from('weekly_contracts').insert({
        user_id: userId, semana_inicio: weekStart, semana_fim: weekEnd,
        numero_semana: (lastContract?.numero_semana || 0) + 1,
        commitments_snapshot: snapshot, status: 'assumido',
        assumido_em: new Date().toISOString(),
      })
    }

    toast({ title: 'Contrato assumido!', description: 'Promessas devem ser mantidas.' })
    router.refresh()
    setLoading(false)
  }

  const statusLabel: Record<string, string> = {
    pendente: 'Pendente', assumido: 'Assumido', encerrado: 'Encerrado'
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contrato Semanal</h1>
        <p className="text-sm text-muted-foreground mt-1">Promessas devem ser mantidas.</p>
      </div>

      {/* Semana atual */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDate(weekStart)} → {formatDate(weekEnd)}
            </span>
          </div>
          {alreadyAssumed && (
            <div className="flex items-center gap-1.5 text-success text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Contrato assumido
            </div>
          )}
        </div>

        {commitments.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            Nenhum compromisso ativo. Crie objetivos e compromissos primeiro.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {commitments.map((c: any) => (
              <div key={c.id} className="px-6 py-3.5 flex items-center gap-3">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${alreadyAssumed ? 'text-success' : 'text-muted-foreground/40'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.goal_nome}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {c.meta_valor} {unitLabels[c.unidade as keyof typeof unitLabels]} / {frequencyLabels[c.frequencia as keyof typeof frequencyLabels].toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {!alreadyAssumed && commitments.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30">
            <Button onClick={handleAssume} disabled={loading} className="w-full">
              {loading ? 'Assumindo...' : 'Assumir compromisso desta semana'}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Ao assumir, você confirma que fará o seu melhor para cumprir estes compromissos.
            </p>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      {totalAssumed > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Contratos assumidos</p>
            <p className="text-3xl font-semibold">{totalAssumed}</p>
          </div>
          <div className="bg-foreground text-background rounded-xl p-5">
            <p className="text-xs text-background/60 uppercase tracking-widest mb-1">Palavra empenhada</p>
            <p className="text-sm font-medium mt-1">{totalAssumed} {totalAssumed === 1 ? 'vez' : 'vezes'} você se comprometeu.</p>
          </div>
        </div>
      )}

      {/* Histórico */}
      {contractHistory.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Histórico</h2>
          <div className="bg-white border border-border rounded-xl divide-y divide-border overflow-hidden">
            {contractHistory.map((c: WeeklyContract) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Semana {c.numero_semana}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(c.semana_inicio)} → {formatDate(c.semana_fim)}
                  </p>
                  {c.assumido_em && (
                    <p className="text-xs text-muted-foreground">
                      Assumido em {new Date(c.assumido_em).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.status === 'assumido' ? 'bg-success/10 text-success'
                  : c.status === 'encerrado' ? 'bg-secondary text-muted-foreground'
                  : 'bg-warning/10 text-warning'
                }`}>
                  {statusLabel[c.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
