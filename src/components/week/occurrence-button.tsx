'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { calculateOccurrencePenalty, formatCurrency } from '@/lib/utils'
import type { PenaltyMode, CommitmentType } from '@/types'

interface Props {
  commitmentId: string
  goalId: string
  currentCount: number          // total already recorded this period
  penalidade: number            // base penalty per occurrence
  penaltyMode: PenaltyMode
  multiplier: number
  freeQuota: number             // 0 for event_occurrence, N for event_limited
  commitmentType: CommitmentType
}

export function OccurrenceButton({
  commitmentId, goalId, currentCount,
  penalidade, penaltyMode, multiplier, freeQuota, commitmentType,
}: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const nextOccNum = currentCount + 1
  const nextPenalty = calculateOccurrencePenalty(penalidade, nextOccNum, penaltyMode, multiplier, freeQuota)
  const isFree = nextOccNum <= freeQuota

  async function handleClick() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('occurrences').insert({
      user_id: user.id,
      commitment_id: commitmentId,
      goal_id: goalId,
      data: new Date().toISOString().split('T')[0],
      numero_ocorrencia: nextOccNum,
      penalidade_valor: nextPenalty,
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      setLoading(false)
      return
    }

    if (isFree) {
      toast({ title: `Ocorrência ${nextOccNum} registrada`, description: 'Dentro da franquia gratuita.' })
    } else {
      toast({
        title: `Ocorrência ${nextOccNum} registrada`,
        description: `Consequência: ${formatCurrency(nextPenalty)}`,
      })
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1 transition-colors disabled:opacity-50 ${
        isFree
          ? 'text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
          : 'text-consequence border-consequence/30 hover:border-consequence/60 hover:bg-consequence/5'
      }`}
      title={
        isFree
          ? `Ocorrência ${nextOccNum} — dentro da franquia`
          : `Ocorrência ${nextOccNum} — consequência: ${formatCurrency(nextPenalty)}`
      }
    >
      {loading ? (
        <span className="w-3 h-3 border border-current rounded-full border-t-transparent animate-spin" />
      ) : (
        <Plus className="w-3 h-3" />
      )}
      {isFree ? `Registrar (grátis)` : `Registrar · ${formatCurrency(nextPenalty)}`}
    </button>
  )
}
