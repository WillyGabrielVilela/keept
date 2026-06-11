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
import { categoryLabels } from '@/lib/utils'
import type { GoalCategory, GoalStatus } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default function EditGoalPage({ params }: Props) {
  const { id } = use(params)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [proposito, setProposito] = useState('')
  const [categoria, setCategoria] = useState<GoalCategory>('estudos')
  const [dataAlvo, setDataAlvo] = useState('')
  const [status, setStatus] = useState<GoalStatus>('ativo')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('goals').select('*').eq('id', id).single()
      if (data) {
        setNome(data.nome)
        setDescricao(data.descricao || '')
        setProposito(data.proposito || '')
        setCategoria(data.categoria)
        setDataAlvo(data.data_alvo || '')
        setStatus(data.status)
      }
      setFetching(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Log edições relevantes
    const { data: original } = await supabase.from('goals').select('nome,proposito').eq('id', id).single()
    const edits = []
    if (original?.nome !== nome) edits.push({ campo: 'nome', valor_anterior: original?.nome, valor_novo: nome })
    if (original?.proposito !== proposito) edits.push({ campo: 'proposito', valor_anterior: original?.proposito, valor_novo: proposito })

    const { error } = await supabase.from('goals').update({
      nome, descricao: descricao || null, proposito: proposito || null,
      categoria, data_alvo: dataAlvo || null, status,
    }).eq('id', id)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      setLoading(false)
      return
    }

    if (edits.length > 0) {
      await supabase.from('edit_history').insert(
        edits.map(e => ({ user_id: user.id, entity_type: 'goal', entity_id: id, ...e }))
      )
    }

    toast({ title: 'Objetivo atualizado!' })
    router.push(`/goals/${id}`)
    router.refresh()
  }

  if (fetching) return <div className="text-sm text-muted-foreground">Carregando...</div>

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link href={`/goals/${id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Voltar ao objetivo
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Editar objetivo</h1>
        <p className="text-xs text-muted-foreground mt-1">Histórico de alterações é salvo automaticamente.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do objetivo</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proposito">Por que isso importa para você?</Label>
          <Textarea id="proposito" value={proposito} onChange={(e) => setProposito(e.target.value)} rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as GoalCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GoalStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="abandonado">Abandonado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_alvo">Data alvo</Label>
          <Input id="data_alvo" type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Salvando...' : 'Salvar alterações'}</Button>
          <Link href={`/goals/${id}`}><Button type="button" variant="outline">Cancelar</Button></Link>
        </div>
      </form>
    </div>
  )
}
