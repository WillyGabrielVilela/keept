'use client'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ] as const

  if (compact) {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    const current = options.find(o => o.value === theme)!
    const Icon = current.icon
    return (
      <button
        onClick={() => setTheme(next)}
        className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        title={`Tema: ${current.label}`}
      >
        <Icon className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
