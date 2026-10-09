import { format } from 'date-fns'
import {
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Clapperboard,
  CirclePlay,
  FilePen,
  Image as ImageIcon,
  Layers,
  Link2,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { PlatformIcon } from '@/components/shared/platform-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Hint } from '@/components/shared/hint'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { activityText, formatRelative, formatSchedule, platformLabel } from '@/lib/format'
import type { ContentItem, Platform } from '@/types/content'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return format(new Date(), 'EEEE, d MMMM yyyy')
}

function breakdown(items: ReturnType<typeof useContent>['items'], platform: Platform) {
  const scoped = items.filter((item) => item.platforms.includes(platform))
  const count = (status: 'published' | 'scheduled' | 'failed') =>
    scoped.filter((item) => item.status === status).length
  return {
    total: scoped.length,
    published: count('published'),
    scheduled: count('scheduled'),
    failed: count('failed'),
  }
}

export function DashboardPage() {
  usePageTitle('Dashboard')
  const { items, accounts, settings, publishNow } = useContent()
  const [uploadNow, setUploadNow] = useState<ContentItem | null>(null)
  const stats = {
    total: items.length,
    published: items.filter((item) => item.status === 'published').length,
    scheduled: items.filter((item) => item.status === 'scheduled').length,
    drafts: items.filter((item) => item.status === 'draft').length,
    failed: items.filter((item) => item.status === 'failed').length,
    connected: accounts.filter((account) => account.connected).length,
  }
  const upcoming = items
    .filter((item) => item.status === 'scheduled' && item.scheduledAt)
    .sort((a, b) => +new Date(a.scheduledAt ?? 0) - +new Date(b.scheduledAt ?? 0))
    .slice(0, 5)
  const activity = [...items].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6)

  const cards = [
    { to: '/content', label: 'Total Content', value: stats.total, hint: 'Reels, stories, posts, and images', icon: Layers, tone: 'indigo' as const },
    { to: '/history?status=published', label: 'Published Successfully', value: stats.published, hint: 'Marked published in this workspace', icon: CircleCheck, tone: 'emerald' as const },
    { to: '/scheduled', label: 'Scheduled Content', value: stats.scheduled, hint: 'Waiting for their publish time', icon: CalendarClock, tone: 'amber' as const },
    { to: '/content?status=draft', label: 'Drafts', value: stats.drafts, hint: 'Not queued yet', icon: FilePen, tone: 'slate' as const },
    { to: '/history?status=failed', label: 'Failed Publications', value: stats.failed, hint: 'Need a review before retry', icon: CircleAlert, tone: 'rose' as const },
    { to: '/accounts', label: 'Connected Accounts', value: stats.connected, hint: 'Instagram and Facebook ready', icon: Link2, tone: 'sky' as const },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${greeting()}, ${settings.displayName}`}
        title="Dashboard"
        description={`${todayLabel()}. Publishing overview for Instagram and Facebook.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Hint detail="Upload a finished reel, add the caption and hashtags, then publish or schedule it.">
              <Button asChild>
                <Link to="/create"><Plus className="h-4 w-4" /> Upload reel</Link>
              </Button>
            </Hint>
            <Hint detail="Upload a finished story file, then publish it now or schedule it.">
              <Button variant="secondary" asChild>
                <Link to="/stories/compose">Upload story</Link>
              </Button>
            </Hint>
          </div>
        }
      />

      <section aria-label="Workspace totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <StatCard {...card} />
          </Link>
        ))}
      </section>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start px-4 py-3">
          <Link to="/create?format=instagram_reel">
            <Clapperboard className="h-5 w-5 text-indigo-600" />
            <span className="text-left">
              <span className="block font-semibold">Create Reel</span>
              <span className="block text-xs font-normal text-muted-foreground">Vertical video</span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start px-4 py-3">
          <Link to="/create?format=instagram_story">
            <CirclePlay className="h-5 w-5 text-rose-600" />
            <span className="text-left">
              <span className="block font-semibold">Create Story</span>
              <span className="block text-xs font-normal text-muted-foreground">24-hour frame</span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start px-4 py-3">
          <Link to="/create?format=instagram_feed_image">
            <ImageIcon className="h-5 w-5 text-sky-700" />
            <span className="text-left">
              <span className="block font-semibold">Create Post</span>
              <span className="block text-xs font-normal text-muted-foreground">Feed post or image</span>
            </span>
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming scheduled content</CardTitle>
            <CardDescription>The next items waiting on the calendar.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarClock}
                title="Nothing is scheduled"
                description="Plan a reel, story, or post and it will show up here."
                action={<Button asChild><Link to="/create">Create content</Link></Button>}
              />
            ) : (
              <ul className="divide-y">
                {upcoming.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.scheduledAt ? formatSchedule(item.scheduledAt) : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.platforms.map((platform) => (
                        <span key={platform} className="text-xs text-muted-foreground">{platformLabel(platform)}</span>
                      ))}
                      <Hint detail="Checks the account and file, then publishes this now and clears the later time.">
                        <Button size="sm" variant="outline" onClick={() => setUploadNow(item)}>Upload now</Button>
                      </Hint>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/scheduled">View schedule</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Account connection status</CardTitle>
            <CardDescription>Accounts this workspace can publish to.</CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <EmptyState compact icon={Link2} title="No accounts yet" description="Add an Instagram or Facebook account to start." />
            ) : (
              <ul className="space-y-3">
                {accounts.map((account) => (
                  <li key={account.id} className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${account.platform === 'instagram' ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-700'}`}>
                      <PlatformIcon platform={account.platform} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{account.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{account.handle}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span className={`h-2 w-2 rounded-full ${account.connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {account.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/accounts">Manage accounts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent publishing activity</CardTitle>
            <CardDescription>Latest status changes in the workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState compact icon={Layers} title="No activity yet" description="Created content will appear here." />
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{activityText(item)}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(item.updatedAt)}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Platform statistics</CardTitle>
            <CardDescription>Published, scheduled, and failed by network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(['instagram', 'facebook'] as const).map((platform) => {
              const data = breakdown(items, platform)
              const width = (count: number) => (data.total === 0 ? 0 : (count / data.total) * 100)
              return (
                <div key={platform}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <PlatformIcon platform={platform} className="h-4 w-4" />
                      {platformLabel(platform)}
                    </span>
                    <span className="text-muted-foreground">{data.total} items</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="bg-emerald-500" style={{ width: `${width(data.published)}%` }} />
                    <div className="bg-amber-500" style={{ width: `${width(data.scheduled)}%` }} />
                    <div className="bg-rose-500" style={{ width: `${width(data.failed)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {data.published} published · {data.scheduled} scheduled · {data.failed} failed
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>
      <ConfirmDialog
        open={uploadNow !== null}
        onOpenChange={(open) => { if (!open) setUploadNow(null) }}
        title="Upload this now?"
        description={uploadNow ? `Reel Studio will check the account, permissions, and media for "${uploadNow.title}", then publish it now. The later schedule is cleared. A result appears when Meta confirms it.` : ''}
        confirmLabel="Upload now"
        onConfirm={() => {
          if (!uploadNow) return
          publishNow(uploadNow.id)
          setUploadNow(null)
        }}
      />
    </div>
  )
}
