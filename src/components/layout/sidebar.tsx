'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Target, Heart, History,
  LogOut, User, BarChart2, FileText, Star
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/goals', label: 'Objetivos', icon: Target },
  { href: '/weekly-contract', label: 'Contrato Semanal', icon: FileText },
  { href: '/stats', label: 'Estatísticas', icon: BarChart2 },
  { href: '/impact', label: 'Impacto', icon: Heart },
  { href: '/history', label: 'Histórico', icon: History },
]

interface SidebarProps {
  user: { email?: string }
  profile: { nome?: string | null } | null
  honorStreak?: number
}

export function Sidebar({ user, profile, honorStreak = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const displayName = profile?.nome || user.email?.split('@')[0] || 'Usuário'

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-border bg-white flex flex-col z-40">
      <div className="h-14 flex items-center px-5 border-b border-border">
        <span className="font-semibold tracking-tight text-foreground">Keept</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}

        {honorStreak > 0 && (
          <div className="mt-4 mx-1 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-md">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-medium text-amber-700">{honorStreak} dias de honra</span>
            </div>
            <p className="text-xs text-amber-600 mt-0.5">Sequência atual</p>
          </div>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md mb-0.5">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
