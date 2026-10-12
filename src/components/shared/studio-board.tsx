import { format } from 'date-fns'
import { CirclePlay, Clapperboard, Clock3, Image as ImageIcon, LayoutGrid, Pencil, Play, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ContentPreviewDialog } from '@/components/shared/content-preview'
import { EmptyState } from '@/components/shared/empty-state'
import { MediaThumb } from '@/components/shared/media-thumb'
import { PlatformIcon } from '@/components/shared/platform-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Hint } from '@/components/shared/hint'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useContent } from '@/context/content-context'
import { platformLabel, typeLabel } from '@/lib/format'
import { formatInZone } from '@/lib/time'
import type { ContentItem, ContentType } from '@/types/content'

const typeStyle: Record<ContentType, { icon: typeof Clapperboard; box: string }> = {
  reel: { icon: Clapperboard, box: 'bg-rose-50 text-rose-500 ring-rose-100' },
  story: { icon: CirclePlay, box: 'bg-violet-50 text-violet-600 ring-violet-100' },
  image: { icon: ImageIcon, box: 'bg-amber-50 text-amber-600 ring-amber-100' },
  post: { icon: ImageIcon, box: 'bg-sky-50 text-sky-600 ring-sky-100' },
}

export function StudioBoard({
  items,
  filters,
  filtersOpen,
  onToggleFilters,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  items: ContentItem[]
  filters: ReactNode
  filtersOpen: boolean
  onToggleFilters: () => void
  emptyTitle: string
  emptyDescription: string
  emptyAction?: ReactNode
}) {
  const { accounts, media, publishNow, cancelSchedule, refresh } = useContent()
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const [details, setDetails] = useState<ContentItem | null>(null)
  const [uploadNow, setUploadNow] = useState<ContentItem | null>(null)
  const [stopAuto, setStopAuto] = useState<ContentItem | null>(null)
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const connected = accounts.filter((account) => account.connected)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/accounts" className="inline-flex w-fit items-center gap-3 rounded-2xl border bg-white px-3 py-2 shadow-[0_8px_24px_rgba(36,27,69,0.05)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium">{connected.length} {connected.length === 1 ? 'account' : 'accounts'} connected</span>
          <span className={`h-2 w-2 rounded-full ${connected.length > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        </Link>
        <div className="flex flex-wrap gap-2">
          <Hint detail="Show search, status, platform, account, and date filters."><Button variant="outline" onClick={onToggleFilters}>Filters</Button></Hint>
          <Hint detail="Open the Instagram and Facebook accounts connected to this workspace."><Button variant="outline" asChild><Link to="/accounts">Accounts</Link></Button></Hint>
          <Hint detail="Open the calendar of scheduled and published items."><Button variant="outline" asChild><Link to="/calendar">Calendar</Link></Button></Hint>
          <Hint detail="Reload the list from the server."><Button variant="outline" size="icon" aria-label="Refresh content" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /></Button></Hint>
          <Hint detail="Upload a finished reel, add the caption and hashtags, then publish or schedule it."><Button asChild><Link to="/create">Upload reel</Link></Button></Hint>
          <Hint detail="Upload a finished story file, then publish it now or schedule it."><Button variant="secondary" asChild><Link to="/stories/compose">Upload story</Link></Button></Hint>
        </div>
      </div>
      {filtersOpen ? <Card className="p-4">{filters}</Card> : null}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          {items.length === 0 ? (
            <EmptyState icon={Clapperboard} title={emptyTitle} description={emptyDescription} action={emptyAction ?? <Button asChild><Link to="/create">Upload a reel</Link></Button>} />
          ) : (
            <ul className="divide-y">
              {items.map((item) => {
                const style = typeStyle[item.type]
                const Icon = style.icon
                const when = new Date(item.publishedAt ?? item.scheduledAt ?? item.createdAt)
                const asset = media.find((entry) => entry.id === item.mediaId) ?? null
                const active = selected?.id === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`grid w-full gap-3 px-4 py-3 text-left sm:grid-cols-[minmax(0,1.5fr)_auto_7.5rem_auto] sm:items-center ${active ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          <MediaThumb media={asset} alt="" />
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-sm font-medium">{item.caption.trim() || item.title}</span>
                          <span className="mt-1 flex items-center gap-1 text-muted-foreground">
                            {item.platforms.map((platform) => (
                              <PlatformIcon key={platform} platform={platform} className={`h-3.5 w-3.5 ${platform === 'instagram' ? 'text-rose-500' : 'text-sky-600'}`} />
                            ))}
                          </span>
                        </span>
                      </span>
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">
                        <span className="block">{format(when, 'MMM dd, yyyy')}</span>
                        <span className="block">{format(when, 'hh:mm a')}</span>
                      </span>
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${style.box}`} title={typeLabel(item.type)}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <div className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-9rem)] xl:overflow-y-auto xl:overscroll-contain">
          {selected ? (
            <PreviewCard
              item={selected}
              onDetails={() => setDetails(selected)}
              onUpload={() => setUploadNow(selected)}
              onStopAuto={() => setStopAuto(selected)}
            />
          ) : (
            <Card className="p-5 text-sm text-muted-foreground">Select a reel or story to preview it.</Card>
          )}
          <Card className="p-4">
            <p className="text-sm font-semibold">Easy connect</p>
            <p className="mt-1 text-xs text-muted-foreground">Connect Instagram and Facebook without sharing passwords.</p>
            <div className="mt-3 flex gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500"><PlatformIcon platform="instagram" className="h-4 w-4" /></span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600"><PlatformIcon platform="facebook" className="h-4 w-4" /></span>
            </div>
            <Button className="mt-3" variant="outline" size="sm" asChild><Link to="/accounts">Manage accounts</Link></Button>
          </Card>
        </div>
      </div>
      <ContentPreviewDialog item={details} onClose={() => setDetails(null)} />
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
      <ConfirmDialog
        open={stopAuto !== null}
        onOpenChange={(open) => { if (!open) setStopAuto(null) }}
        title="Turn off auto-publish?"
        description={stopAuto ? `"${stopAuto.title}" will stay in the workspace and will not publish at the scheduled time.` : ''}
        confirmLabel="Turn off"
        destructive
        onConfirm={() => {
          if (!stopAuto) return
          cancelSchedule(stopAuto.id)
          setStopAuto(null)
        }}
      />
    </div>
  )
}

function PreviewCard({
  item,
  onDetails,
  onUpload,
  onStopAuto,
}: {
  item: ContentItem
  onDetails: () => void
  onUpload: () => void
  onStopAuto: () => void
}) {
  const { media, accounts } = useContent()
  const asset = media.find((entry) => entry.id === item.mediaId) ?? null
  const names = accounts.filter((account) => item.accountIds.includes(account.id)).map((account) => account.name)
  const tags = (item.hashtags ?? '').split(/\s+/).filter((tag) => tag.startsWith('#'))
  const scheduled = item.status === 'scheduled'

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{names[0] ?? item.title}</p>
          <p className="text-xs text-muted-foreground">{typeLabel(item.type)}</p>
        </div>
        <span className="flex gap-1 text-muted-foreground">
          {item.platforms.map((platform) => (
            <PlatformIcon key={platform} platform={platform} className={`h-4 w-4 ${platform === 'instagram' ? 'text-rose-500' : 'text-sky-600'}`} />
          ))}
        </span>
      </div>
      <div className="relative mx-4 overflow-hidden rounded-2xl bg-slate-100">
        {asset ? (
          <div className="aspect-[4/5]">
            <MediaThumb media={asset} alt="" />
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">No file uploaded yet</div>
        )}
        {asset?.kind === 'video' ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow">
              <Play className="h-5 w-5 fill-current" />
            </span>
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm leading-6">{item.caption.trim() || item.title}</p>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => <span key={tag} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{tag}</span>)}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            Auto-publish
          </span>
          <Switch
            checked={scheduled}
            disabled={!scheduled}
            aria-label="Auto-publish"
            onCheckedChange={(checked) => { if (!checked) onStopAuto() }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {scheduled && item.scheduledAt
            ? `Publishes ${formatInZone(item.scheduledAt, item.timezone)} even if this browser is closed.`
            : item.status === 'published'
              ? `Published${item.publishedAt ? ` ${formatInZone(item.publishedAt, item.timezone)}` : ''}.`
              : `${platformLabel(item.platforms[0] ?? 'instagram')} · ${typeLabel(item.type)} is ${item.status.replaceAll('_', ' ')}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {item.status === 'draft' || item.status === 'scheduled' ? (
            <Hint detail="Change the caption, hashtags, and time, then schedule or publish it."><Button size="sm" asChild><Link to={`/content/${item.id}/edit`}><Pencil className="h-4 w-4" /> Edit</Link></Button></Hint>
          ) : null}
          {scheduled ? <Hint detail="Checks the account and file, then publishes this now and clears the later time."><Button size="sm" onClick={onUpload}>Upload now</Button></Hint> : null}
          <Hint detail="Open the caption, schedule, errors, and other actions for this item."><Button size="sm" variant="outline" onClick={onDetails}>Details</Button></Hint>
        </div>
      </div>
    </Card>
  )
}
