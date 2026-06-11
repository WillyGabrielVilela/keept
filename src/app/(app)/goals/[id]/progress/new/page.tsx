'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { unitLabels } from '@/lib/utils'
import { format } from 'date-fns'
import { use } from 'react'
import type { Commitment } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function NewProgressPage({ params }: Props) {
  const { id: goalId } = use(params)
  const searchParams = useSearchParams()
  const preselectedCommitment = searchParams.get('commitment')

  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [commitmentId, setCommitmentId] = useState(preselectedCommitment || '')
  const [quantidade, setQuantidade] = useState('')
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function loadCommitments() {
      const { data } = await supabase
        .from('commitments')
        .select('*')
        .eq('goal_id', goalId)
        .eq('ativo', true)
        .order('created_at')
      setCommitments(data || [])
      if (!preselectedCommitment && data && data.length > 0) {
        setCommitmentId(data[0].id)
      }
    }
    loadCommitments()
  }, [goalId])

  const selectedCommitment = commitments.find((c) => c.id === commitmentId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commitmentId) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('progress_entries').insert({
      commitment_id: commitmentId,
      goal_id: goalId,
      user_id: user.id,
      data,
      quantidade_realizada: Number(quantidade),
      observacao: observacao || null,
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      setLoading(false)
      return
    }

    toast({ title: 'Progresso registrado!' })
    router.push(`/goals/${goalId}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link
          href={`/goals/${goalId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao objetivo
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">Registrar progresso</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quanto você realizou? Seja honesto — sua palavra depende disso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>Compromisso</Label>
          <Select value={commitmentId} onValueChange={setCommitmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o compromisso" />
            </SelectTrigger>
            <SelectContent>
              {commitments.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantidade">
            Quantidade realizada
            {selectedCommitment && (
              <span className="text-muted-foreground font-normal ml-1">
                (em {unitLabels[selectedCommitment.unidade]})
              </span>
            )}
          </Label>
          <Input
            id="quantidade"
            type="number"
            min="0"
            step="0.5"
            placeholder="Ex: 3"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
          />
          {selectedCommitment && (
            <p className="text-xs text-muted-foreground">
              Meta: {selectedCommitment.meta_valor} {unitLabels[selectedCommitment.unidade]} por período
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input
            id="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs">Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea
            id="obs"
            placeholder="Como foi? O que estudou? Algum impedimento?"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading || !commitmentId} className="flex-1">
            {loading ? 'Salvando...' : 'Registrar progresso'}
          </Button>
          <Link href={`/goals/${goalId}`}>
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
