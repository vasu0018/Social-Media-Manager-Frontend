import { Bell, Menu, Search } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageSkeleton } from '@/components/shared/page-skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetClose } from '@/components/ui/sheet'
import { useAuth } from '@/context/auth-context'
import { useContent } from '@/context/content-context'
import { initials } from '@/lib/format'
import { X } from 'lucide-react'

export function AppShell() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { settings, items } = useContent()
  const [ready, setReady] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [query, setQuery] = useState('')
  const alerts = items.filter((item) => item.status === 'failed')

  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), 600)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function requestLogout() {
    setNavOpen(false)
    setLogoutOpen(true)
  }

  async function confirmLogout() {
    await logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = query.trim()
    navigate(next ? `/content?q=${encodeURIComponent(next)}` : '/content')
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-slate-800">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="z-40 flex h-9 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-xs text-slate-300">
        <span className="inline-flex items-center font-medium text-slate-200">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Official Meta Graph API
        </span>
        <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">Timezone {settings.timezone || 'Asia/Kolkata'}</span>
      </div>
      <div className="flex min-h-0 flex-1">
      <aside className="hidden h-full w-64 shrink-0 border-r border-slate-800 bg-sidebar lg:block">
        <SidebarNav onLogout={requestLogout} />
      </aside>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <div className="relative h-full">
          <SheetClose className="absolute right-3 top-4 rounded-md p-1 text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" aria-label="Close navigation">
            <X className="h-4 w-4" />
          </SheetClose>
          <SidebarNav onNavigate={() => setNavOpen(false)} onLogout={requestLogout} />
        </div>
      </Sheet>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setNavOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="font-semibold lg:hidden">Reel Studio</span>
          <form onSubmit={onSearch} className="relative ml-auto hidden w-full max-w-md sm:ml-0 sm:block">
            <label htmlFor="global-search" className="sr-only">Search content</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="global-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search content"
              className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </form>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={`Notifications, ${alerts.length} failed publications`} className="relative">
                  <Bell className="h-4 w-4" />
                  {alerts.length > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
                      {alerts.length}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <p className="px-2 py-1.5 text-sm font-medium">Publishing alerts</p>
                <DropdownMenuSeparator />
                {alerts.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">No failed publications.</p>
                ) : (
                  alerts.map((item) => (
                    <DropdownMenuItem key={item.id} onSelect={() => navigate('/history?status=failed')}>
                      <span className="truncate">{item.title}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 px-2" aria-label="Account menu">
                  <Avatar>
                    <AvatarFallback>{initials(settings.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => navigate('/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={requestLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">
            {ready ? <Outlet /> : <PageSkeleton />}
          </div>
        </main>
      </div>
      </div>
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out of Reel Studio?"
        description="You will need the administrator account to open the workspace again."
        confirmLabel="Sign out"
        onConfirm={confirmLogout}
      />
    </div>
  )
}
