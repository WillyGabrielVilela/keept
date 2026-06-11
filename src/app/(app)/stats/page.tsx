import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Star, BookOpen, Dumbbell, Target, Heart } from 'lucide-react'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: allProgress } = await supabase
    .from('progress_entries')
    .select('quantidade_realizada, data, commitments(unidade, nome)')
    .eq('user_id', user.id)
    .order('data', { ascending: true })

  const { data: allPenalties } = await supabase
    .from('penalties').select('penalidade_valor').eq('user_id', user.id)

  const { data: honorDays } = await supabase
    .from('honor_days').select('*').eq('user_id', user.id).order('data', { ascending: false })

  const { data: contracts } = await supabase
    .from('weekly_contracts').select('status, numero_semana').eq('user_id', user.id)
    .eq('status', 'assumido').order('numero_semana')

  const { data: goals } = await supabase
    .from('goals').select('*').eq('user_id', user.id)

  // Acumular por unidade
  const unitTotals: Record<string, number> = {}
  const weeklyTotals: Record<string, Record<string, number>> = {}

  ;(allProgress || []).forEach((p: any) => {
    const unit = p.commitments?.unidade || 'unidades'
    unitTotals[unit] = (unitTotals[unit] || 0) + Number(p.quantidade_realizada)
    const week = p.data?.substring(0, 7) // YYYY-MM
    if (week) {
      if (!weeklyTotals[unit]) weeklyTotals[unit] = {}
      weeklyTotals[unit][week] = (weeklyTotals[unit][week] || 0) + Number(p.quantidade_realizada)
    }
  })

  // Cálculo de streak de Dias de Honra
  const honorArr = (honorDays || []).filter((d: any) => d.todos_cumpridos)
  let currentStreak = 0, bestStreak = 0, tempStreak = 0
  const totalHonor = honorArr.length

  if (honorArr.length > 0) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let prevDate: Date | null = null
    for (const day of honorArr) {
      const d = new Date(day.data); d.setHours(0, 0, 0, 0)
      if (prevDate === null) {
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
        if (diff <= 1) currentStreak = 1
        tempStreak = 1
      } else {
        const diff = Math.round((prevDate.getTime() - d.getTime()) / 86400000)
        if (diff === 1) { tempStreak++; if (currentStreak > 0) currentStreak++ }
        else tempStreak = 1
      }
      if (tempStreak > bestStreak) bestStreak = tempStreak
      prevDate = d
    }
  }

  const totalImpact = (allPenalties || []).reduce((s: number, p: any) => s + Number(p.penalidade_valor), 0)
  const totalContracts = (contracts || []).length
  const totalGoals = (goals || []).length
  const totalGoalsConcluded = (goals || []).filter((g: any) => g.status === 'concluido').length

  const totalHoras = unitTotals['horas'] || 0
  const totalQuestoes = unitTotals['questoes'] || 0
  const totalSessoes = unitTotals['sessoes'] || 0
  const totalKm = unitTotals['quilometros'] || 0
  const totalPassos = unitTotals['passos'] || 0

  const avgWeeksHoras = totalHoras > 0 && Object.keys(weeklyTotals['horas'] || {}).length > 0
    ? totalHoras / Object.keys(weeklyTotals['horas']).length : 0

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estatísticas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sua evolução acumulada desde o início.</p>
      </div>

      {/* Dias de Honra */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Dias de Honra</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-border rounded-xl p-5 space-y-1">
            <p className="text-xs text-muted-foreground">Sequência atual</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-semibold">{currentStreak}</p>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 mb-1" />
            </div>
            <p className="text-xs text-muted-foreground">dias consecutivos</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-5 space-y-1">
            <p className="text-xs text-muted-foreground">Maior sequência</p>
            <p className="text-3xl font-semibold">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">dias (recorde)</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 space-y-1">
            <p className="text-xs text-amber-600">Total de Dias de Honra</p>
            <p className="text-3xl font-semibold text-amber-700">{totalHonor}</p>
            <p className="text-xs text-amber-600">dias cumpridos</p>
          </div>
        </div>
        {currentStreak > 0 && (
          <p className="text-sm text-muted-foreground">
            Você manteve sua palavra por <strong className="text-foreground">{currentStreak} dias consecutivos</strong>.
          </p>
        )}
      </div>

      {/* Estudos */}
      {(totalHoras > 0 || totalQuestoes > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Estudos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {totalHoras > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Total estudado</p>
                <p className="text-2xl font-semibold">{formatNumber(totalHoras)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">horas</p>
                {avgWeeksHoras > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Média: {avgWeeksHoras.toFixed(1)}h/semana</p>
                )}
              </div>
            )}
            {totalQuestoes > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Questões resolvidas</p>
                <p className="text-2xl font-semibold">{formatNumber(totalQuestoes)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">no total</p>
              </div>
            )}
          </div>
          {totalHoras > 0 && (
            <p className="text-sm text-muted-foreground">
              Você já estudou <strong className="text-foreground">{formatNumber(totalHoras)} horas</strong>.{' '}
              {totalQuestoes > 0 && <>Resolveu <strong className="text-foreground">{formatNumber(totalQuestoes)} questões</strong>.</>}
            </p>
          )}
        </div>
      )}

      {/* Saúde */}
      {(totalSessoes > 0 || totalKm > 0 || totalPassos > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Saúde e movimento</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {totalSessoes > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Sessões realizadas</p>
                <p className="text-2xl font-semibold">{formatNumber(totalSessoes)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">treinos / sessões</p>
              </div>
            )}
            {totalKm > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Quilômetros</p>
                <p className="text-2xl font-semibold">{formatNumber(totalKm)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">km percorridos</p>
              </div>
            )}
            {totalPassos > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground mb-1">Passos dados</p>
                <p className="text-2xl font-semibold">{formatNumber(totalPassos)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">desde o início</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Objetivos e contratos */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Objetivos e compromisos</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Objetivos criados</p>
            <p className="text-2xl font-semibold">{totalGoals}</p>
          </div>
          {totalGoalsConcluded > 0 && (
            <div className="bg-white border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Concluídos</p>
              <p className="text-2xl font-semibold">{totalGoalsConcluded}</p>
            </div>
          )}
          {totalContracts > 0 && (
            <div className="bg-white border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Contratos assumidos</p>
              <p className="text-2xl font-semibold">{totalContracts}</p>
            </div>
          )}
        </div>
      </div>

      {/* Impacto */}
      {totalImpact > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Impacto social</h2>
          </div>
          <div className="bg-foreground text-background rounded-xl p-6">
            <p className="text-background/60 text-xs uppercase tracking-widest mb-1">Total destinado a causas</p>
            <p className="text-3xl font-semibold">{formatCurrency(totalImpact)}</p>
            <p className="text-sm text-background/70 mt-2">Mesmo nas falhas, você gerou impacto positivo.</p>
          </div>
        </div>
      )}
    </div>
  )
}
