import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: entries } = await supabase
    .from('progress_entries')
    .select('*, commitments(nome, unidade, meta_valor, penalidade_por_unidade), goals(nome)')
    .eq('user_id', user.id)
    .order('data', { ascending: false })
    .limit(100)

  // Group by month
  const grouped: Record<string, any[]> = {}
  ;(entries || []).forEach((entry: any) => {
    const month = entry.data.substring(0, 7) // YYYY-MM
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(entry)
  })

  const monthNames: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março',
    '04': 'Abril', '05': 'Maio', '06': 'Junho',
    '07': 'Julho', '08': 'Agosto', '09': 'Setembro',
    '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  }

  function formatMonthKey(key: string) {
    const [year, month] = key.split('-')
    return `${monthNames[month]} ${year}`
  }

  function calcEntryPenalty(entry: any): number {
    const c = entry.commitments
    if (!c || c.penalidade_por_unidade === 0) return 0
    const diff = Math.max(0, c.meta_valor - Number(entry.quantidade_realizada))
    return diff * c.penalidade_por_unidade
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Todos os seus registros de progresso.
        </p>
      </div>

      {(entries || []).length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum registro ainda. Comece registrando seu progresso.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([month, monthEntries]) => (
              <div key={month} className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {formatMonthKey(month)}
                </h2>
                <div className="bg-white border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {monthEntries.map((entry: any) => {
                    const penalty = calcEntryPenalty(entry)
                    const met = Number(entry.quantidade_realizada) >= entry.commitments?.meta_valor
                    return (
                      <div key={entry.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {entry.goals?.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.commitments?.nome}
                            </p>
                            {entry.observacao && (
                              <p className="text-xs text-muted-foreground italic">
                                "{entry.observacao}"
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 space-y-0.5">
                            <p className="text-sm font-medium">
                              {entry.quantidade_realizada} {entry.commitments?.unidade}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.data)}
                            </p>
                            {penalty > 0 && (
                              <p className="text-xs text-consequence">
                                {formatCurrency(penalty)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
