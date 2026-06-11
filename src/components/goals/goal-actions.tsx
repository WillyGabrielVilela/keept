'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pause, Play, CheckCircle, X, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Props {
  goalId: string
  currentStatus: string
}

export function GoalActions({ goalId, currentStatus }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  async function updateStatus(status: string) {
    const { error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      return
    }

    const labels: Record<string, string> = {
      ativo: 'Objetivo reativado.',
      pausado: 'Objetivo pausado.',
      concluido: 'Objetivo marcado como concluído.',
      abandonado: 'Objetivo abandonado.',
    }

    toast({ title: labels[status] || 'Atualizado.' })
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Deletar este objetivo? Esta ação não pode ser desfeita.')) return

    const { error } = await supabase.from('goals').delete().eq('id', goalId)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      return
    }

    toast({ title: 'Objetivo removido.' })
    router.push('/goals')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-2 rounded-md hover:bg-secondary transition-colors">
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {currentStatus === 'ativo' && (
          <DropdownMenuItem onClick={() => updateStatus('pausado')}>
            <Pause className="w-4 h-4 mr-2" />
            Pausar objetivo
          </DropdownMenuItem>
        )}
        {currentStatus === 'pausado' && (
          <DropdownMenuItem onClick={() => updateStatus('ativo')}>
            <Play className="w-4 h-4 mr-2" />
            Reativar objetivo
          </DropdownMenuItem>
        )}
        {currentStatus !== 'concluido' && (
          <DropdownMenuItem onClick={() => updateStatus('concluido')}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar como concluído
          </DropdownMenuItem>
        )}
        {currentStatus !== 'abandonado' && (
          <DropdownMenuItem onClick={() => updateStatus('abandonado')}>
            <X className="w-4 h-4 mr-2" />
            Abandonar objetivo
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Deletar objetivo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
