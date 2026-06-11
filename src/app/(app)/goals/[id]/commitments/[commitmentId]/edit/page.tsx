'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { frequencyLabels, unitLabels, penaltyModeLabels, formatDate } from '@/lib/utils'
import type { CommitmentFrequency, CommitmentUnit, PenaltyMode } from '@/types'

interface Props { params: Promise<{ id: string; commitmentId: string }> }

export default function EditCommitmentPage({ params }: Props) {
  const { id: goalId, commitmentId } = use(params)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [frequencia, setFrequencia] = useState<CommitmentFrequency>('semanal')
  const [unidade, setUnidade] = useState<CommitmentUnit>('horas')
  const [metaValor, setMetaValor] = useState('')
  const [penalidade, setPenalidade] = useState('')
  const [penaltyMode, setPenaltyMode] = useState<PenaltyMode>('fixed')
  const [multiplier, setMultiplier] = useState('2')
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('commitments').select('*').eq('id', commitmentId).single()
      if (data) {
        setNome(data.nome); setDescricao(data.descricao || '')
        setFrequencia(data.frequencia); setUnidade(data.unidade)
        setMetaValor(String(data.meta_valor)); setPenalidade(String(data.penalidade_por_unidade))
        setPenaltyMode(data.penalty_mode || 'fixed'); setMultiplier(String(data.penalty_multiplier || 2))
        setUpdatedAt(data.updated_at)
      }
      setFetching(false)
    }
    load()
  }, [commitmentId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Log edições
    const { data: original } = await supabase.from('commitments').select('nome,meta_valor,penalidade_por_unidade').eq('id', commitmentId).single()
    const edits = []
    if (original?.nome !== nome) edits.push({ campo: 'nome', valor_anterior: original?.nome, valor_novo: nome })
    if (String(original?.meta_valor) !== metaValor) edits.push({ campo: 'meta_valor', valor_anterior: String(original?.meta_valor), valor_novo: metaValor })
    if (String(original?.penalidade_por_unidade) !== penalidade) edits.push({ campo: 'penalidade_por_unidade', valor_anterior: String(original?.penalidade_por_unidade), valor_novo: penalidade })

    const { error } = await supabase.from('commitments').update({
      nome, descricao: descricao || null, frequencia, unidade,
      meta_valor: Number(metaValor), penalidade_por_unidade: Number(penalidade) || 0,
      penalty_mode: penaltyMode, penalty_multiplier: Number(multiplier) || 2,
    }).eq('id', commitmentId)

    if (error) { toast({ variant: 'destructive', title: 'Erro', description: error.message }); setLoading(false); return }

    if (edits.length > 0) {
      await supabase.from('edit_history').insert(
        edits.map(e => ({ user_id: user.id, entity_type: 'commitment', entity_id: commitmentId, ...e }))
      )
    }

    toast({ title: 'Compromisso atualizado!' })
    router.push(`/goals/${goalId}`)
    router.refresh()
  }

  if (fetching) return <div className="text-sm text-muted-foreground">Carregando...</div>

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link href={`/goals/${goalId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Voltar ao objetivo
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Editar compromisso</h1>
        {updatedAt && <p className="text-xs text-muted-foreground mt-1">Última edição: {formatDate(updatedAt)}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select value={frequencia} onValueChange={(v) => setFrequencia(v as CommitmentFrequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(frequencyLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={unidade} onValueChange={(v) => setUnidade(v as CommitmentUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(unitLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Meta</Label>
            <Input type="number" min="0.1" step="0.5" value={metaValor} onChange={(e) => setMetaValor(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Penalidade base (R$)</Label>
            <Input type="number" min="0" step="0.5" value={penalidade} onChange={(e) => setPenalidade(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tipo de penalidade</Label>
          <Select value={penaltyMode} onValueChange={(v) => setPenaltyMode(v as PenaltyMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(penaltyModeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {penaltyMode !== 'fixed' && (
          <div className="space-y-2">
            <Label>{penaltyMode === 'linear' ? 'Incremento (R$)' : 'Multiplicador'}</Label>
            <Input type="number" min="1" step="0.5" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="max-w-28" />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Salvando...' : 'Salvar alterações'}</Button>
          <Link href={`/goals/${goalId}`}><Button type="button" variant="outline">Cancelar</Button></Link>
        </div>
      </form>
    </div>
  )
}
