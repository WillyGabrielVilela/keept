'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { calculateOccurrencePenalty, formatCurrency } from '@/lib/utils'
import type { PenaltyMode } from '@/types'

interface Props {
  commitmentId: string; goalId: string
  currentCount: number; penalidade: number
  penaltyMode: PenaltyMode; multiplier: number
}

export function OccurrenceButton({ commitmentId, goalId, currentCount, penalidade, penaltyMode, multiplier }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  async function handleClick() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const nextOcc = currentCount + 1
    const penaltyValue = calculateOccurrencePenalty(penalidade, nextOcc, penaltyMode, multiplier)

    const { error } = await supabase.from('occurrences').insert({
      user_id: user.id, commitment_id: commitmentId, goal_id: goalId,
      data: new Date().toISOString().split('T')[0],
      numero_ocorrencia: nextOcc,
      penalidade_valor: penaltyValue,
    })

    if (error) { toast({ variant: 'destructive', title: 'Erro', description: error.message }); setLoading(false); return }

    toast({ title: `Ocorrência ${nextOcc} registrada`, description: `Consequência: ${formatCurrency(penaltyValue)}` })
    router.refresh()
    setLoading(false)
  }

  const nextPenalty = calculateOccurrencePenalty(penalidade, currentCount + 1, penaltyMode, multiplier)

  return (
    <button
      onClick={handleClick} disabled={loading}
      className="flex items-center gap-1 text-xs text-consequence hover:text-consequence/80 border border-consequence/30 hover:border-consequence/60 rounded-md px-2.5 py-1 transition-colors disabled:opacity-50"
      title={`Registrar ocorrência (consequência: ${formatCurrency(nextPenalty)})`}
    >
      <Plus className="w-3 h-3" />
      {loading ? '...' : `Ocorrência · ${formatCurrency(nextPenalty)}`}
    </button>
  )
}
