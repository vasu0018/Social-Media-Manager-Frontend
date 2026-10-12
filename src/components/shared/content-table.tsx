import { CalendarClock, Copy, ExternalLink, Eye, Inbox, MoreHorizontal, Pencil, RotateCcw, Trash2, Upload, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ContentPreviewDialog } from '@/components/shared/content-preview'
import { EmptyState } from '@/components/shared/empty-state'
import { MediaThumb } from '@/components/shared/media-thumb'
import { PlatformBadge } from '@/components/shared/platform-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useContent } from '@/context/content-context'
import { formatInZone } from '@/lib/time'
import { typeLabel } from '@/lib/format'
import type { ContentItem, PublicationRecord } from '@/types/content'

type Row = {
  key: string
  item: ContentItem
  destination: PublicationRecord | null
}

export function ContentTable({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: ContentItem[]
  emptyTitle: string
  emptyDescription: string
}) {
  const { media, deleteItem, cancelSchedule, retryItem, publishNow } = useContent()
  const [preview, setPreview] = useState<ContentItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ContentItem | null>(null)
  const [pendingCancel, setPendingCancel] = useState<ContentItem | null>(null)
  const [pendingUpload, setPendingUpload] = useState<ContentItem | null>(null)
  const [pendingRetry, setPendingRetry] = useState<ContentItem | null>(null)
  const rows = items.flatMap((item): Row[] => {
    if (!item.publications || item.publications.length === 0) return [{ key: item.id, item, destination: null }]
    return item.publications.map((destination) => ({ key: `${item.id}:${destination.id}`, item, destination }))
  })

  if (rows.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <caption className="sr-only">Content and publishing history</caption>
          <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">Thumbnail</th>
              <th scope="col" className="px-3 py-3 font-medium">Title</th>
              <th scope="col" className="px-3 py-3 font-medium">Type</th>
              <th scope="col" className="px-3 py-3 font-medium">Caption</th>
              <th scope="col" className="px-3 py-3 font-medium">Platform</th>
              <th scope="col" className="px-3 py-3 font-medium">Account</th>
              <th scope="col" className="px-3 py-3 font-medium">Scheduled</th>
              <th scope="col" className="px-3 py-3 font-medium">Published</th>
              <th scope="col" className="px-3 py-3 font-medium">Status</th>
              <th scope="col" className="px-3 py-3 font-medium">Retries</th>
              <th scope="col" className="px-3 py-3 font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const asset = media.find((entry) => entry.id === row.item.mediaId) ?? null
              const when = row.destination?.scheduledAt ?? row.item.scheduledAt
              const published = row.destination?.publishedAt ?? (row.destination ? null : row.item.publishedAt)
              const status = row.destination?.status ?? row.item.status
              return (
                <tr key={row.key} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100">
                      <MediaThumb media={asset} alt="" />
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium">{row.item.title}</td>
                  <td className="px-3 py-3">{typeLabel(row.item.type)}</td>
                  <td className="max-w-48 px-3 py-3 text-muted-foreground">
                    <p className="line-clamp-2">{row.item.caption || 'No caption'}</p>
                  </td>
                  <td className="px-3 py-3">
                    {row.destination ? <PlatformBadge platform={row.destination.platform} /> : <span className="text-muted-foreground">Unassigned</span>}
                  </td>
                  <td className="px-3 py-3">{row.destination?.accountName ?? 'Unassigned'}</td>
                  <td className="px-3 py-3 text-muted-foreground">{when ? formatInZone(when, row.item.timezone) : '—'}</td>
                  <td className="px-3 py-3 text-muted-foreground">{published ? formatInZone(published, row.item.timezone) : '—'}</td>
                  <td className="px-3 py-3"><StatusBadge status={status} /></td>
                  <td className="px-3 py-3">{row.destination?.attemptCount ?? 0}</td>
                  <td className="px-3 py-3 text-right">
                    <RowMenu
                      item={row.item}
                      destination={row.destination}
                      onPreview={setPreview}
                      onDelete={setPendingDelete}
                      onCancel={setPendingCancel}
                      onRetry={setPendingRetry}
                      onUploadNow={setPendingUpload}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ContentPreviewDialog item={preview} onClose={() => setPreview(null)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Delete this workspace record?"
        description={deleteDescription(pendingDelete)}
        confirmLabel="Delete record"
        destructive
        onConfirm={() => {
          if (!pendingDelete) return
          deleteItem(pendingDelete.id)
          toast.success(pendingDelete.publications?.some((destination) => destination.externalId) ? 'Workspace record removed. The live post was left online.' : `Deleted “${pendingDelete.title}”`)
          setPendingDelete(null)
        }}
      />
      <ConfirmDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => { if (!open) setPendingCancel(null) }}
        title="Cancel this schedule?"
        description={pendingCancel ? `"${pendingCancel.title}" will be marked cancelled and will not publish.` : ''}
        confirmLabel="Cancel schedule"
        destructive
        onConfirm={() => {
          if (!pendingCancel) return
          cancelSchedule(pendingCancel.id)
          toast.success('Schedule cancelled')
          setPendingCancel(null)
        }}
      />
      <ConfirmDialog
        open={pendingUpload !== null}
        onOpenChange={(open) => { if (!open) setPendingUpload(null) }}
        title="Upload this now?"
        description={pendingUpload ? `Reel Studio will check the account, permissions, and media for "${pendingUpload.title}", then publish it now. The later schedule is cleared. A result appears when Meta confirms it.` : ''}
        confirmLabel="Upload now"
        onConfirm={() => {
          if (!pendingUpload) return
          publishNow(pendingUpload.id)
          setPendingUpload(null)
        }}
      />
      <ConfirmDialog
        open={pendingRetry !== null}
        onOpenChange={(open) => { if (!open) setPendingRetry(null) }}
        title="Retry the failed destination?"
        description={pendingRetry ? `Only destinations without a post ID will be sent again. A published destination stays as it is.` : ''}
        confirmLabel="Retry"
        onConfirm={() => {
          if (!pendingRetry) return
          retryItem(pendingRetry.id)
          toast('Retry is running on the server.')
          setPendingRetry(null)
        }}
      />
    </>
  )
}

function deleteDescription(item: ContentItem | null) {
  if (!item) return ''
  if (item.publications?.some((destination) => destination.externalId)) {
    return `"${item.title}" will be removed from this workspace. The published post stays on Instagram or Facebook. This does not create a new publication.`
  }
  return `"${item.title}" will be removed from this workspace. Nothing is sent to Meta.`
}

function RowMenu({
  item,
  destination,
  onPreview,
  onDelete,
  onCancel,
  onRetry,
  onUploadNow,
}: {
  item: ContentItem
  destination: PublicationRecord | null
  onPreview: (item: ContentItem) => void
  onDelete: (item: ContentItem) => void
  onCancel: (item: ContentItem) => void
  onRetry: (item: ContentItem) => void
  onUploadNow: (item: ContentItem) => void
}) {
  const { repostItem } = useContent()
  const status = destination?.status ?? item.status
  const permalink = destination?.permalink
  const canRetry = item.publications?.some((entry) => entry.status === 'failed' && !entry.externalId) ?? false

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${item.title}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onPreview(item)}>
          <Eye className="h-4 w-4" /> View details
        </DropdownMenuItem>
        {item.status === 'draft' || status === 'scheduled' ? (
          <DropdownMenuItem asChild>
            <Link to={`/content/${item.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </DropdownMenuItem>
        ) : null}
        {status === 'scheduled' ? (
          <DropdownMenuItem onSelect={() => onUploadNow(item)}>
            <Upload className="h-4 w-4" /> Upload now
          </DropdownMenuItem>
        ) : null}
        {status === 'scheduled' ? (
          <DropdownMenuItem onSelect={() => onPreview(item)}>
            <CalendarClock className="h-4 w-4" /> Reschedule
          </DropdownMenuItem>
        ) : null}
        {status === 'scheduled' ? (
          <DropdownMenuItem onSelect={() => onCancel(item)}>
            <XCircle className="h-4 w-4" /> Cancel scheduled item
          </DropdownMenuItem>
        ) : null}
        {canRetry ? (
          <DropdownMenuItem onSelect={() => onRetry(item)}>
            <RotateCcw className="h-4 w-4" /> Retry failed publication
          </DropdownMenuItem>
        ) : null}
        {destination?.error || item.error ? (
          <DropdownMenuItem onSelect={() => onPreview(item)}>
            <Eye className="h-4 w-4" /> View error details
          </DropdownMenuItem>
        ) : null}
        {permalink ? (
          <DropdownMenuItem onSelect={() => window.open(permalink, '_blank', 'noopener,noreferrer')}>
            <ExternalLink className="h-4 w-4" /> Open published post
          </DropdownMenuItem>
        ) : null}
        {item.status !== 'draft' && item.status !== 'processing' ? (
          <DropdownMenuItem onSelect={() => repostItem(item.id)}>
            <Copy className="h-4 w-4" /> Repost as new draft
          </DropdownMenuItem>
        ) : null}
        {item.status !== 'processing' ? (
          <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(item)}>
            <Trash2 className="h-4 w-4" /> Delete record
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
