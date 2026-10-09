import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const tones = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-700',
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  tone: keyof typeof tones
}) {
  return (
    <article className="h-full rounded-xl border bg-card p-5 shadow-sm transition group-hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </article>
  )
}
