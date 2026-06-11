import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WeeklyContractClient } from '@/components/commitments/weekly-contract-client'
import { getCurrentWeekRange } from '@/lib/utils'
import { format } from 'date-fns'
import type { Commitment, Goal } from '@/types'

export default async function WeeklyContractPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { start: weekStart, end: weekEnd } = getCurrentWeekRange()

  // Contrato desta semana
  const { data: weekContract } = await supabase
    .from('weekly_contracts')
    .select('*')
    .eq('user_id', user.id)
    .gte('semana_inicio', format(weekStart, 'yyyy-MM-dd'))
    .lte('semana_inicio', format(weekEnd, 'yyyy-MM-dd'))
    .single()

  // Compromisos ativos
  const { data: goals } = await supabase
    .from('goals').select('*').eq('user_id', user.id).eq('status', 'ativo')

  const { data: commitments } = await supabase
    .from('commitments').select('*').eq('user_id', user.id).eq('ativo', true)

  // Histórico de contratos
  const { data: contractHistory } = await supabase
    .from('weekly_contracts').select('*').eq('user_id', user.id)
    .order('semana_inicio', { ascending: false }).limit(10)

  // Contagem de contratos assumidos
  const { count: totalAssumed } = await supabase
    .from('weekly_contracts').select('id', { count: 'exact' })
    .eq('user_id', user.id).eq('status', 'assumido')

  const commitmentsList = (commitments || []).map((c: Commitment) => {
    const goal = (goals || []).find((g: Goal) => g.id === c.goal_id)
    return { ...c, goal_nome: goal?.nome || '' }
  })

  return (
    <WeeklyContractClient
      userId={user.id}
      weekStart={format(weekStart, 'yyyy-MM-dd')}
      weekEnd={format(weekEnd, 'yyyy-MM-dd')}
      existingContract={weekContract}
      commitments={commitmentsList}
      contractHistory={contractHistory || []}
      totalAssumed={totalAssumed || 0}
    />
  )
}
