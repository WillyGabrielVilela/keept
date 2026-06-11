'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Charity } from '@/types'

interface Props {
  charity: Charity
  selected: boolean
  userId: string
}

export function CharityCard({ charity, selected, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  async function handleSelect() {
    if (selected) return
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({ charity_id: charity.id })
      .eq('id', userId)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
    } else {
      toast({ title: `${charity.nome} selecionada como sua causa.` })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleSelect}
      disabled={selected || loading}
      className={cn(
        'w-full text-left bg-white border rounded-xl p-4 flex items-start justify-between gap-3 transition-all',
        selected
          ? 'border-foreground/30 bg-secondary/30'
          : 'border-border hover:border-foreground/20'
      )}
    >
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{charity.nome}</p>
          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{charity.descricao}</p>
        <p className="text-xs text-muted-foreground">{charity.categoria}</p>
      </div>
      {charity.website && (
        <a
          href={charity.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </button>
  )
}
