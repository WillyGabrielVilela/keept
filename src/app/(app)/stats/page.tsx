import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatsClient } from '@/components/stats/stats-client'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: allProgress } = await supabase
    .from('progress_entries')
    .select('quantidade_realizada, data, commitments(unidade, nome, commitment_type)')
    .eq('user_id', user.id)
    .order('data', { ascending: true })

  const { data: allOccurrences } = await supabase
    .from('occurrences')
    .select('penalidade_valor, data')
    .eq('user_id', user.id)

  const { data: allPenalties } = await supabase
    .from('penalties').select('penalidade_valor, created_at').eq('user_id', user.id)

  const { data: honorDays } = await supabase
    .from('honor_days').select('*').eq('user_id', user.id).order('data', { ascending: false })

  const { data: contracts } = await supabase
    .from('weekly_contracts').select('status, numero_semana, semana_inicio')
    .eq('user_id', user.id).eq('status', 'assumido')

  const { data: goals } = await supabase
    .from('goals').select('id, status, created_at').eq('user_id', user.id)

  return (
    <StatsClient
      allProgress={allProgress || []}
      allOccurrences={allOccurrences || []}
      allPenalties={allPenalties || []}
      honorDays={honorDays || []}
      contracts={contracts || []}
      goals={goals || []}
    />
  )
}
