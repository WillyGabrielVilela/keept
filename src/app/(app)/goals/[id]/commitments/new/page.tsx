'use client'

import { useState, use } from 'react'
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
import { frequencyLabels, unitLabels, penaltyModeLabels, formatCurrency, calculateProgressivePenalty } from '@/lib/utils'
import type { CommitmentFrequency, CommitmentUnit, PenaltyMode } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default function NewCommitmentPage({ params }: Props) {
  const { id: goalId } = use(params)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [frequencia, setFrequencia] = useState<CommitmentFrequency>('semanal')
  const [unidade, setUnidade] = useState<CommitmentUnit>('horas')
  const [metaValor, setMetaValor] = useState('')
  const [penalidade, setPenalidade] = useState('')
  const [penaltyMode, setPenaltyMode] = useState<PenaltyMode>('fixed')
  const [multiplier, setMultiplier] = useState('2')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const previewPenalty = metaValor && penalidade
    ? calculateProgressivePenalty(Number(metaValor), 0, Number(penalidade), penaltyMode, Number(multiplier))
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('commitments').insert({
      goal_id: goalId, user_id: user.id, nome,
      descricao: descricao || null, frequencia, unidade,
      meta_valor: Number(metaValor),
      penalidade_por_unidade: Number(penalidade) || 0,
      penalty_mode: penaltyMode,
      penalty_multiplier: Number(multiplier) || 2,
    })

    if (error) { toast({ variant: 'destructive', title: 'Erro', description: error.message }); setLoading(false); return }
    toast({ title: 'Compromisso criado!' })
    router.push(`/goals/${goalId}`)
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link href={`/goals/${goalId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Voltar ao objetivo
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo compromisso</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina uma ação mensurável. O que você vai fazer?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do compromisso</Label>
          <Input id="nome" placeholder="Ex: Estudar questões de Português" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Textarea id="descricao" placeholder="Detalhes adicionais..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select value={frequencia} onValueChange={(v) => setFrequencia(v as CommitmentFrequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(frequencyLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={unidade} onValueChange={(v) => setUnidade(v as CommitmentUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(unitLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Meta ({frequencyLabels[frequencia].toLowerCase()})</Label>
          <div className="flex items-center gap-2">
            <Input type="number" min="0.1" step="0.5" placeholder="20" value={metaValor} onChange={(e) => setMetaValor(e.target.value)} required className="max-w-32" />
            <span className="text-sm text-muted-foreground">{unitLabels[unidade]}</span>
          </div>
        </div>

        <div className="space-y-3 border border-border rounded-xl p-4">
          <p className="text-sm font-medium">Configurar consequência</p>

          <div className="space-y-2">
            <Label>Tipo de penalidade</Label>
            <Select value={penaltyMode} onValueChange={(v) => setPenaltyMode(v as PenaltyMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(penaltyModeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor base por unidade não cumprida</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input type="number" min="0" step="0.5" placeholder="2,00" value={penalidade} onChange={(e) => setPenalidade(e.target.value)} className="max-w-28" />
              <span className="text-sm text-muted-foreground">por {unitLabels[unidade].replace(/s$/, '')}</span>
            </div>
          </div>

          {penaltyMode !== 'fixed' && (
            <div className="space-y-2">
              <Label>{penaltyMode === 'linear' ? 'Incremento por unidade (R$)' : 'Multiplicador base'}</Label>
              <Input type="number" min="1" step="0.5" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="max-w-28" />
              {penaltyMode === 'exponential' && (
                <p className="text-xs text-muted-foreground">Ex: base R$1, mult 2 → 1ª unidade R$1, 2ª R$2, 3ª R$4...</p>
              )}
              {penaltyMode === 'linear' && (
                <p className="text-xs text-muted-foreground">Ex: base R$1, inc R$1 → 1ª unidade R$1, 2ª R$2, 3ª R$3...</p>
              )}
            </div>
          )}

          {metaValor && penalidade && Number(penalidade) > 0 && (
            <div className="bg-secondary/60 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Se você não cumprir <strong className="text-foreground">nenhuma</strong> das {metaValor} {unitLabels[unidade]},
                a consequência total será{' '}
                <strong className="text-consequence">{formatCurrency(previewPenalty)}</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Criando...' : 'Criar compromisso'}</Button>
          <Link href={`/goals/${goalId}`}><Button type="button" variant="outline">Cancelar</Button></Link>
        </div>
      </form>
    </div>
  )
}
