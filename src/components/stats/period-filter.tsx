'use client'
import { cn } from '@/lib/utils'

export type Period = 'semana' | 'mes' | 'ano' | 'total'

const options: { value: Period; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
  { value: 'total', label: 'Total' },
]

interface Props {
  value: Period
  onChange: (p: Period) => void
}

export function PeriodFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
