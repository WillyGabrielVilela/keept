'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn, frequencyLabels, unitLabels, penaltyModeLabels, commitmentTypeLabels, commitmentTypeDesc, formatCurrency, calculatePenalty } from '@/lib/utils'
import type { CommitmentFrequency, CommitmentUnit, PenaltyMode, CommitmentType } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default function NewCommitmentPage({ params }: Props) {
  const { id: goalId } = use(params)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [commitmentType, setCommitmentType] = useState<CommitmentType>('meta_minima')
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

  const isOcorrencia = commitmentType === 'ocorrencia'
  const previewPenalty = metaValor && penalidade && !isOcorrencia
    ? calculatePenalty(commitmentType, Number(metaValor), 0, Number(penalidade), penaltyMode, Number(multiplier))
    : 0

  const unidadeOptions: CommitmentUnit[] = commitmentType === 'ocorrencia'
    ? ['ocorrencias']
    : commitmentType === 'limite_maximo'
    ? ['horas', 'kcal', 'reais', 'unidades', 'passos']
    : ['horas', 'sessoes', 'dias', 'questoes', 'quilometros', 'passos', 'unidades']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('commitments').insert({
      goal_id: goalId, user_id: user.id, nome,
      descricao: descricao || null,
      commitment_type: commitmentType,
      frequencia: isOcorrencia ? 'semanal' : frequencia,
      unidade: isOcorrencia ? 'ocorrencias' : unidade,
      meta_valor: isOcorrencia ? 0 : Number(metaValor),
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
          <ArrowLeft className="w-4 h-4" />Voltar
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo compromisso</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina o que você vai cumprir — e a consequência se não cumprir.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de compromisso */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de compromisso</Label>
          <div className="grid gap-2">
            {(['meta_minima', 'limite_maximo', 'ocorrencia'] as CommitmentType[]).map((t) => (
              <button
                key={t} type="button"
                onClick={() => {
                  setCommitmentType(t)
                  if (t === 'ocorrencia') setUnidade('ocorrencias')
                  else if (t === 'limite_maximo') setUnidade('horas')
                  else setUnidade('horas')
                }}
                className={cn(
                  'text-left px-4 py-3 rounded-lg border-2 transition-all',
                  commitmentType === t
                    ? 'border-foreground bg-foreground/5 dark:bg-foreground/10'
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <p className="text-sm font-medium">{commitmentTypeLabels[t]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{commitmentTypeDesc[t]}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome"
            placeholder={
              commitmentType === 'meta_minima' ? 'Ex: Estudar 25 horas por semana'
              : commitmentType === 'limite_maximo' ? 'Ex: Máximo 2h de YouTube'
              : 'Ex: Entrar no Instagram'
            }
            value={nome} onChange={(e) => setNome(e.target.value)} required
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>

        {/* Meta / Limite — não para ocorrência */}
        {!isOcorrencia && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{commitmentType === 'meta_minima' ? 'Meta mínima' : 'Limite máximo'}</Label>
              <Input
                type="number" min="0" step="any"
                placeholder="25"
                value={metaValor} onChange={(e) => setMetaValor(e.target.value)} required
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={(v) => setUnidade(v as CommitmentUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {unidadeOptions.map(u => <SelectItem key={u} value={u}>{unitLabels[u]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {!isOcorrencia && (
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

        {/* Consequência */}
        <div className="space-y-4 border border-border rounded-xl p-4">
          <p className="text-sm font-medium">Consequência</p>

          <div className="space-y-2">
            <Label>
              {isOcorrencia ? 'Valor por ocorrência' : `Valor por unidade ${commitmentType === 'meta_minima' ? 'faltante' : 'excedida'}`}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                type="number" min="0" step="any"
                placeholder="2"
                value={penalidade} onChange={(e) => setPenalidade(e.target.value)}
                className="max-w-28"
              />
              {!isOcorrencia && (
                <span className="text-sm text-muted-foreground">por {unitLabels[unidade]?.replace(/s$/, '') || 'unidade'}</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Progressividade</Label>
            <Select value={penaltyMode} onValueChange={(v) => setPenaltyMode(v as PenaltyMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixa — mesmo valor sempre</SelectItem>
                <SelectItem value="linear">Linear — cresce a cada unidade</SelectItem>
                <SelectItem value="exponential">Exponencial — {isOcorrencia ? 'dobra por ocorrência' : 'dobra por unidade'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {penaltyMode !== 'fixed' && (
            <div className="space-y-2">
              <Label>{penaltyMode === 'linear' ? 'Incremento (R$)' : 'Multiplicador'}</Label>
              <Input type="number" min="1" step="any" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="max-w-28" />
            </div>
          )}

          {/* Preview */}
          {penalidade && Number(penalidade) > 0 && (
            <div className="bg-secondary/60 rounded-lg p-3 space-y-1">
              {isOcorrencia ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    1ª ocorrência: <strong className="text-foreground">{formatCurrency(Number(penalidade))}</strong>
                    {penaltyMode === 'linear' && ` · 2ª: ${formatCurrency(Number(penalidade) + Number(multiplier))} · 3ª: ${formatCurrency(Number(penalidade) + 2 * Number(multiplier))}`}
                    {penaltyMode === 'exponential' && ` · 2ª: ${formatCurrency(Number(penalidade) * Number(multiplier))} · 3ª: ${formatCurrency(Number(penalidade) * Math.pow(Number(multiplier), 2))}`}
                  </p>
                </>
              ) : metaValor ? (
                <p className="text-xs text-muted-foreground">
                  Se não cumprir nada das {metaValor} {unitLabels[unidade]}, consequência total:{' '}
                  <strong className="text-consequence">{formatCurrency(previewPenalty)}</strong>
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Criando...' : 'Criar compromisso'}</Button>
          <Link href={`/goals/${goalId}`}><Button type="button" variant="outline">Cancelar</Button></Link>
        </div>
      </form>
    </div>
  )
}
