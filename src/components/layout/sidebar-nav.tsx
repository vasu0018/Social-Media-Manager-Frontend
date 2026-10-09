import { Clapperboard } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navSections } from '@/components/layout/nav'
import { Separator } from '@/components/ui/separator'
import { useContent } from '@/context/content-context'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

const iconTone: Record<string, string> = {
  '/dashboard': 'text-slate-400',
  '/create': 'text-indigo-400',
  '/content': 'text-slate-400',
  '/reels': 'text-rose-400',
  '/stories': 'text-violet-400',
  '/posts': 'text-sky-400',
  '/calendar': 'text-slate-400',
  '/scheduled': 'text-amber-400',
  '/history': 'text-slate-400',
  '/accounts': 'text-sky-400',
  '/media': 'text-slate-400',
  '/settings': 'text-slate-400',
}

export function SidebarNav({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void
  onLogout: () => void
}) {
  const { settings } = useContent()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
          <Clapperboard className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-base font-bold tracking-tight text-white">Reel Studio</span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-indigo-300">Admin</span>
        </span>
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.action === 'logout' ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-rose-500/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </button>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to ?? '/'}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
                        isActive
                          ? 'bg-slate-800 font-medium text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      )
                    }
                  >
                    <item.icon className={cn('h-4 w-4', iconTone[item.to ?? ''])} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>
      <Separator className="bg-white/10" />
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
          {initials(settings.displayName)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{settings.displayName}</span>
          <span className="block text-xs text-sidebar-muted">Administrator</span>
        </span>
      </div>
    </div>
  )
}
