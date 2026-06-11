import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, charities(*)')
    .eq('id', user.id)
    .single()

  // Calcular streak de Dias de Honra
  const { data: honorDays } = await supabase
    .from('honor_days')
    .select('data, todos_cumpridos')
    .eq('user_id', user.id)
    .eq('todos_cumpridos', true)
    .order('data', { ascending: false })
    .limit(365)

  let honorStreak = 0
  if (honorDays && honorDays.length > 0) {
    const today = new Date()
    let checkDate = new Date(today)
    checkDate.setHours(0, 0, 0, 0)

    for (const day of honorDays) {
      const dayDate = new Date(day.data)
      dayDate.setHours(0, 0, 0, 0)
      const diffDays = Math.round((checkDate.getTime() - dayDate.getTime()) / 86400000)
      if (diffDays <= 1) {
        honorStreak++
        checkDate = dayDate
      } else {
        break
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar user={user} profile={profile} honorStreak={honorStreak} />
      <main className="flex-1 min-w-0 ml-60">
        <div className="max-w-4xl mx-auto px-8 py-10 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
