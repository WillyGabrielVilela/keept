'use client'

import { useState } from 'react'
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
import { categoryLabels } from '@/lib/utils'
import type { GoalCategory } from '@/types'

export default function NewGoalPage() {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [proposito, setProposito] = useState('')
  const [categoria, setCategoria] = useState<GoalCategory>('estudos')
  const [dataAlvo, setDataAlvo] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('goals').insert({
      user_id: user.id, nome,
      descricao: descricao || null,
      proposito: proposito || null,
      categoria,
      data_alvo: dataAlvo || null,
    }).select().single()

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      setLoading(false)
      return
    }
    toast({ title: 'Objetivo criado!', description: 'Agora crie seus compromissos.' })
    router.push(`/goals/${data.id}/commitments/new`)
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link href="/goals" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Objetivos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo objetivo</h1>
        <p className="text-sm text-muted-foreground mt-1">O que você quer alcançar? Seja específico.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do objetivo</Label>
          <Input id="nome" placeholder="Ex: Aprovação na SEFAZ-PE" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proposito">
            Por que isso importa para você?{' '}
            <span className="text-consequence text-xs font-normal">obrigatório</span>
          </Label>
          <Textarea
            id="proposito"
            placeholder="Ex: Quero estabilidade financeira para minha família."
            value={proposito}
            onChange={(e) => setProposito(e.target.value)}
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground">
            Seu propósito será exibido nos momentos de dificuldade para te lembrar do que realmente importa.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Textarea id="descricao" placeholder="Detalhes adicionais..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as GoalCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_alvo">Data alvo <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
            <Input id="data_alvo" type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Criando...' : 'Criar objetivo'}</Button>
          <Link href="/goals"><Button type="button" variant="outline">Cancelar</Button></Link>
        </div>
      </form>
    </div>
  )
}
