'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { unitLabels } from '@/lib/utils'

interface Props {
  userId: string; weekId: string; weekNumber: number; year: number
  commitments: any[]; existingPlans: any[]
}

export function WeekPlanEditor({ userId, weekId, weekNumber, year, commitments, existingPlans }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    existingPlans.forEach(p => { init[p.commitment_id] = String(p.meta_valor) })
    return init
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    const entries = Object.entries(values).filter(([, v]) => v && Number(v) > 0)

    for (const [commitmentId, metaValor] of entries) {
      const c = commitments.find(c => c.id === commitmentId)
      if (!c) continue

      await supabase.from('week_plans').upsert({
        user_id: userId, commitment_id: commitmentId, goal_id: c.goal_id,
        week_number: weekNumber, year,
        meta_valor: Number(metaValor),
        data_inicio: c.cycleStart || new Date().toISOString().split('T')[0],
        data_fim: c.cycleEnd || new Date().toISOString().split('T')[0],
      }, { onConflict: 'user_id,commitment_id,year,week_number' })
    }

    toast({ title: 'Planejamento salvo!' })
    setSaving(false)
    router.refresh()
  }

  const editableCommitments = commitments.filter(c => c.commitment_type !== 'ocorrencia')
  if (editableCommitments.length === 0) return null

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-medium">Planejamento desta semana</p>
          <p className="text-xs text-muted-foreground">Customize as metas para esta semana específica</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {editableCommitments.map((c: any) => (
            <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.nome}</p>
                <p className="text-xs text-muted-foreground">Padrão: {c.meta_valor} {unitLabels[c.unidade as keyof typeof unitLabels]}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input
                  type="number" min="0" step="any"
                  placeholder={String(c.meta_valor)}
                  value={values[c.id] || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, [c.id]: e.target.value }))}
                  className="w-24 text-sm h-8"
                />
                <span className="text-xs text-muted-foreground">{unitLabels[c.unidade as keyof typeof unitLabels]}</span>
              </div>
            </div>
          ))}
          <div className="px-5 py-3">
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : 'Salvar planejamento'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
