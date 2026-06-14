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
import {
  frequencyLabels, unitLabels, penaltyModeLabels,
  commitmentTypeLabels, formatDate, isEventType, cn,
} from '@/lib/utils'
import type { CommitmentFrequency, CommitmentUnit, PenaltyMode, CommitmentType } from '@/types'

interface Props { params: Promise<{ id: string; commitmentId: string }> }

const UNIT_OPTIONS: Record<CommitmentType, CommitmentUnit[]> = {
  minimum_goal:     ['horas', 'sessoes', 'dias', 'questoes', 'quilometros', 'passos', 'unidades'],
  maximum_limit:    ['horas', 'kcal', 'reais', 'unidades', 'passos'],
  event_occurrence: ['ocorrencias'],
  event_limited:    ['ocorrencias'],
}

export default function EditCommitmentPage({ params }: Props) {
  const { id: goalId, commitmentId } = use(params)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [type, setType] = useState<CommitmentType>('minimum_goal')
  const [frequencia, setFrequencia] = useState<CommitmentFrequency>('semanal')
  const [unidade, setUnidade] = useState<CommitmentUnit>('horas')
  const [metaValor, setMetaValor] = useState('')
  const [freeQuota, setFreeQuota] = useState('')
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
        setNome(data.nome)
        setDescricao(data.descricao || '')
        setType(data.commitment_type || 'minimum_goal')
        setFrequencia(data.frequencia)
        setUnidade(data.unidade)
        setMetaValor(String(data.meta_valor))
        setFreeQuota(String(data.free_quota || 0))
        setPenalidade(String(data.penalidade_por_unidade))
        setPenaltyMode(data.penalty_mode || 'fixed')
        setMultiplier(String(data.penalty_multiplier || 2))
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

    const original = await supabase.from('commitments')
      .select('nome,meta_valor,penalidade_por_unidade,free_quota').eq('id', commitmentId).single()
    const edits: any[] = []
    if (original.data?.nome !== nome)
      edits.push({ campo: 'nome', valor_anterior: original.data?.nome, valor_novo: nome })
    if (String(original.data?.meta_valor) !== metaValor)
      edits.push({ campo: 'meta_valor', valor_anterior: String(original.data?.meta_valor), valor_novo: metaValor })
    if (String(original.data?.penalidade_por_unidade) !== penalidade)
      edits.push({ campo: 'penalidade_por_unidade', valor_anterior: String(original.data?.penalidade_por_unidade), valor_novo: penalidade })

    const { error } = await supabase.from('commitments').update({
      nome,
      descricao: descricao || null,
      commitment_type: type,
      frequencia: isEventType(type) ? 'semanal' : frequencia,
      unidade,
      meta_valor: isEventType(type) ? 0 : Number(metaValor),
      penalidade_por_unidade: Number(penalidade) || 0,
      penalty_mode: penaltyMode,
      penalty_multiplier: Number(multiplier) || 2,
      free_quota: type === 'event_limited' ? Number(freeQuota) || 0 : 0,
    }).eq('id', commitmentId)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      setLoading(false)
      return
    }

    if (edits.length > 0) {
      await supabase.from('edit_history').insert(
        edits.map(e => ({ user_id: user.id, entity_type: 'commitment', entity_id: commitmentId, ...e }))
      )
    }

    toast({ title: 'Compromisso atualizado!' })
    router.push(`/goals/${goalId}`)
    router.refresh()
  }

  if (fetching) return <div className="text-sm text-muted-foreground p-8">Carregando...</div>

  const event = isEventType(type)

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link href={`/goals/${goalId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Voltar ao objetivo
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Editar compromisso</h1>
        {updatedAt && <p className="text-xs text-muted-foreground mt-1">Última edição: {formatDate(updatedAt)}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="space-y-3">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['minimum_goal', 'maximum_limit', 'event_occurrence', 'event_limited'] as CommitmentType[]).map((t) => (
              <button
                key={t} type="button"
                onClick={() => { setType(t); setUnidade(UNIT_OPTIONS[t][0]) }}
                className={cn(
                  'text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm',
                  type === t ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30 bg-card'
                )}
              >
                {commitmentTypeLabels[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>

        {!event && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{type === 'minimum_goal' ? 'Meta mínima' : 'Limite máximo'}</Label>
              <Input type="number" min="0" step="any" value={metaValor} onChange={(e) => setMetaValor(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={(v) => setUnidade(v as CommitmentUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS[type].map(u => <SelectItem key={u} value={u}>{unitLabels[u]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {type === 'event_limited' && (
          <div className="space-y-2">
            <Label>Ocorrências gratuitas por período</Label>
            <Input type="number" min="0" step="1" value={freeQuota} onChange={(e) => setFreeQuota(e.target.value)} className="max-w-28" />
          </div>
        )}

        {!event && (
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select value={frequencia} onValueChange={(v) => setFrequencia(v as CommitmentFrequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(frequencyLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{event ? 'Valor/ocorrência (R$)' : 'Penalidade base (R$)'}</Label>
            <Input type="number" min="0" step="any" value={penalidade} onChange={(e) => setPenalidade(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Progressividade</Label>
            <Select value={penaltyMode} onValueChange={(v) => setPenaltyMode(v as PenaltyMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(penaltyModeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {penaltyMode !== 'fixed' && (
          <div className="space-y-2">
            <Label>{penaltyMode === 'linear' ? 'Incremento (R$)' : 'Multiplicador'}</Label>
            <Input type="number" min="1" step="any" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="max-w-28" />
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Salvando...' : 'Salvar alterações'}</Button>
          <Link href={`/goals/${goalId}`}><Button type="button" variant="outline">Cancelar</Button></Link>
        </div>
      </form>
    </div>
  )
}
