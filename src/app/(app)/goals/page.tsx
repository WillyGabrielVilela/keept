import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Plus, ArrowRight, Target } from 'lucide-react'
import { formatDate, categoryEmoji, categoryLabels } from '@/lib/utils'
import type { Goal } from '@/types'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const activeGoals = (goals || []).filter((g: Goal) => g.status === 'ativo')
  const otherGoals = (goals || []).filter((g: Goal) => g.status !== 'ativo')

  const statusLabel: Record<string, string> = {
    ativo: 'Ativo',
    pausado: 'Pausado',
    concluido: 'Concluído',
    abandonado: 'Abandonado',
  }

  const statusStyle: Record<string, string> = {
    ativo: 'bg-success/10 text-success',
    pausado: 'bg-warning/10 text-warning',
    concluido: 'bg-secondary text-muted-foreground',
    abandonado: 'bg-secondary text-muted-foreground',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Objetivos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeGoals.length} objetivo{activeGoals.length !== 1 ? 's' : ''} ativo{activeGoals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/goals/new"
          className="flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo objetivo
        </Link>
      </div>

      {/* Empty */}
      {(goals || []).length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-4">
          <Target className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <h2 className="font-medium">Nenhum objetivo ainda</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Crie seu primeiro objetivo. O que você quer alcançar?
            </p>
          </div>
          <Link
            href="/goals/new"
            className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Criar objetivo
          </Link>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          {activeGoals.map((goal: Goal) => (
            <Link
              key={goal.id}
              href={`/goals/${goal.id}`}
              className="block bg-white border border-border rounded-xl p-5 hover:border-foreground/20 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryEmoji[goal.categoria as keyof typeof categoryEmoji]}</span>
                    <span className="font-medium text-foreground group-hover:text-foreground">
                      {goal.nome}
                    </span>
                  </div>
                  {goal.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {goal.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[goal.status]}`}>
                      {statusLabel[goal.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {categoryLabels[goal.categoria as keyof typeof categoryLabels]}
                    </span>
                    {goal.data_alvo && (
                      <span className="text-xs text-muted-foreground">
                        Até {formatDate(goal.data_alvo)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Other goals */}
      {otherGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Histórico</h2>
          {otherGoals.map((goal: Goal) => (
            <Link
              key={goal.id}
              href={`/goals/${goal.id}`}
              className="block bg-white border border-border rounded-xl p-5 hover:border-foreground/20 transition-colors group opacity-60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{categoryEmoji[goal.categoria as keyof typeof categoryEmoji]}</span>
                  <span className="font-medium text-foreground">{goal.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[goal.status]}`}>
                    {statusLabel[goal.status]}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
