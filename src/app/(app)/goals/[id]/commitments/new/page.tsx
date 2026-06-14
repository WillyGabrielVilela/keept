'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  cn, frequencyLabels, unitLabels, penaltyModeLabels,
  commitmentTypeLabels, commitmentTypeDesc, commitmentTypeExamples,
  formatCurrency, calculatePenalty, calculateOccurrencePenalty, isEventType,
} from '@/lib/utils'
import type { CommitmentFrequency, CommitmentUnit, PenaltyMode, CommitmentType } from '@/types'

interface Props { params: Promise<{ id: string }> }

const UNIT_OPTIONS: Record<CommitmentType, CommitmentUnit[]> = {
  minimum_goal:     ['horas', 'sessoes', 'dias', 'questoes', 'quilometros', 'passos', 'unidades'],
  maximum_limit:    ['horas', 'kcal', 'reais', 'unidades', 'passos'],
  event_occurrence: ['ocorrencias'],
  event_limited:    ['ocorrencias'],
}

export default function NewCommitmentPage({ params }: Props) {
  const { id: goalId } = use(params)
  const [type, setType] = useState<CommitmentType>('minimum_goal')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [frequencia, setFrequencia] = useState<CommitmentFrequency>('semanal')
  const [unidade, setUnidade] = useState<CommitmentUnit>('horas')
  const [metaValor, setMetaValor] = useState('')
  const [freeQuota, setFreeQuota] = useState('')
  const [penalidade, setPenalidade] = useState('')
  const [penaltyMode, setPenaltyMode] = useState<PenaltyMode>('fixed')
  const [multiplier, setMultiplier] = useState('2')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  function handleTypeChange(t: CommitmentType) {
    setType(t)
    const units = UNIT_OPTIONS[t]
    setUnidade(units[0])
    if (t === 'event_occurrence' || t === 'event_limited') {
      setMetaValor('0')
    } else {
      setMetaValor('')
    }
  }

  // Preview penalty
  const preview = (() => {
    const base = Number(penalidade) || 0
    const meta = Number(metaValor) || 0
    const quota = Number(freeQuota) || 0
    if (!base) return null

    if (type === 'minimum_goal') {
      const p = calculatePenalty('minimum_goal', meta, 0, base, penaltyMode, Number(multiplier))
      return meta > 0 ? `Se não cumprir nada: ${formatCurrency(p)}` : null
    }
    if (type === 'maximum_limit') {
      const excess = 5
      const p = calculatePenalty('maximum_limit', meta, meta + excess, base, penaltyMode, Number(multiplier))
      return `Ex: 5 unidades acima do limite = ${formatCurrency(p)}`
    }
    if (type === 'event_occurrence') {
      const p1 = calculateOccurrencePenalty(base, 1, penaltyMode, Number(multiplier), 0)
      const p2 = calculateOccurrencePenalty(base, 2, penaltyMode, Number(multiplier), 0)
      const p3 = calculateOccurrencePenalty(base, 3, penaltyMode, Number(multiplier), 0)
      return `1ª: ${formatCurrency(p1)} · 2ª: ${formatCurrency(p2)} · 3ª: ${formatCurrency(p3)}`
    }
    if (type === 'event_limited') {
      const p1 = calculateOccurrencePenalty(base, quota + 1, penaltyMode, Number(multiplier), quota)
      const p2 = calculateOccurrencePenalty(base, quota + 2, penaltyMode, Number(multiplier), quota)
      return quota > 0
        ? `Primeiras ${quota} grátis · ${quota + 1}ª: ${formatCurrency(p1)} · ${quota + 2}ª: ${formatCurrency(p2)}`
        : `1ª: ${formatCurrency(p1)} · 2ª: ${formatCurrency(p2)}`
    }
    return null
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('commitments').insert({
      goal_id: goalId,
      user_id: user.id,
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
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      setLoading(false)
      return
    }
    toast({ title: 'Compromisso criado!' })
    router.push(`/goals/${goalId}`)
  }

  const isEvent = isEventType(type)

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link href={`/goals/${goalId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Voltar
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo compromisso</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina o que você vai cumprir — e a consequência se não cumprir.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de compromisso</Label>
          <div className="grid grid-cols-1 gap-2">
            {(['minimum_goal', 'maximum_limit', 'event_occurrence', 'event_limited'] as CommitmentType[]).map((t) => (
              <button
                key={t} type="button"
                onClick={() => handleTypeChange(t)}
                className={cn(
                  'text-left px-4 py-3.5 rounded-xl border-2 transition-all',
                  type === t
                    ? 'border-foreground bg-foreground/5 dark:bg-foreground/10'
                    : 'border-border hover:border-foreground/30 bg-card'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{commitmentTypeLabels[t]}</p>
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0',
                    type === t ? 'border-foreground bg-foreground' : 'border-muted-foreground'
                  )} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{commitmentTypeDesc[t]}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Ex: {commitmentTypeExamples[t].slice(0, 2).join(' · ')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            placeholder={
              type === 'minimum_goal'     ? 'Ex: Estudar 25 horas por semana'
              : type === 'maximum_limit'  ? 'Ex: Máximo 2h de YouTube'
              : type === 'event_occurrence' ? 'Ex: Entrar no Instagram'
              : 'Ex: Acessar YouTube (até 3x grátis)'
            }
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>

        {/* Meta / Limite — apenas para minimum_goal e maximum_limit */}
        {!isEvent && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{type === 'minimum_goal' ? 'Meta mínima' : 'Limite máximo'}</Label>
              <Input
                type="number" min="0" step="any"
                placeholder="25"
                value={metaValor}
                onChange={(e) => setMetaValor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={(v) => setUnidade(v as CommitmentUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS[type].map(u => (
                    <SelectItem key={u} value={u}>{unitLabels[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Franquia gratuita — event_limited */}
        {type === 'event_limited' && (
          <div className="space-y-2">
            <Label htmlFor="free_quota">Ocorrências gratuitas por período</Label>
            <Input
              id="free_quota"
              type="number" min="0" step="1"
              placeholder="3"
              value={freeQuota}
              onChange={(e) => setFreeQuota(e.target.value)}
              className="max-w-32"
            />
            <p className="text-xs text-muted-foreground">
              As primeiras {freeQuota || '0'} ocorrências não geram consequência.
            </p>
          </div>
        )}

        {/* Frequência — apenas para minimum_goal e maximum_limit */}
        {!isEvent && (
          <div className="space-y-2">
            <Label>Frequência de avaliação</Label>
            <Select value={frequencia} onValueChange={(v) => setFrequencia(v as CommitmentFrequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(frequencyLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Consequência */}
        <div className="space-y-4 border border-border rounded-xl p-4 bg-card">
          <p className="text-sm font-semibold">Consequência</p>

          <div className="space-y-2">
            <Label>
              {isEvent
                ? 'Valor por ocorrência'
                : type === 'minimum_goal'
                ? `Valor por ${unitLabels[unidade]?.replace(/s$/, '') || 'unidade'} faltante`
                : `Valor por ${unitLabels[unidade]?.replace(/s$/, '') || 'unidade'} excedida`
              }
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">R$</span>
              <Input
                type="number" min="0" step="any"
                placeholder="2"
                value={penalidade}
                onChange={(e) => setPenalidade(e.target.value)}
                className="max-w-28"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Progressividade</Label>
            <Select value={penaltyMode} onValueChange={(v) => setPenaltyMode(v as PenaltyMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(penaltyModeLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {penaltyMode !== 'fixed' && (
            <div className="space-y-2">
              <Label>{penaltyMode === 'linear' ? 'Incremento (R$)' : 'Multiplicador'}</Label>
              <Input
                type="number" min="1" step="any"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                className="max-w-28"
              />
              <p className="text-xs text-muted-foreground">
                {penaltyMode === 'linear'
                  ? 'Cada unidade/ocorrência fica R$ mais cara que a anterior.'
                  : 'Cada unidade/ocorrência multiplica o valor anterior.'}
              </p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-secondary/60 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{preview}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Criando...' : 'Criar compromisso'}
          </Button>
          <Link href={`/goals/${goalId}`}>
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
