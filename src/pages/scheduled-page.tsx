import { formatDistanceToNow } from 'date-fns'
import { Clock3, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ContentPreviewDialog } from '@/components/shared/content-preview'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { PlatformBadge } from '@/components/shared/platform-badge'
import { Hint } from '@/components/shared/hint'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { typeLabel } from '@/lib/format'
import { formatInZone } from '@/lib/time'
import type { ContentItem } from '@/types/content'

export function ScheduledPage() {
  usePageTitle('Scheduled Posts')
  const { items, cancelSchedule, publishNow } = useContent()
  const [preview, setPreview] = useState<ContentItem | null>(null)
  const [pending, setPending] = useState<ContentItem | null>(null)
  const [uploadNow, setUploadNow] = useState<ContentItem | null>(null)
  const scheduled = items
    .filter((item) => item.status === 'scheduled')
    .sort((a, b) => +new Date(a.scheduledAt ?? 0) - +new Date(b.scheduledAt ?? 0))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Posts"
        description="The server publishes these at the scheduled time, even if this browser is closed. Upload now checks the account and media, then publishes immediately."
      />
      <Card>
        {scheduled.length === 0 ? (
          <EmptyState icon={Clock3} title="No scheduled content" description="Schedule a reel, story, or post and it will wait here." />
        ) : (
          <ul className="divide-y">
            {scheduled.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  {item.caption.trim() ? <p className="line-clamp-2 text-sm">{item.caption}</p> : null}
                  {item.hashtags ? <p className="text-sm text-blue-700">{item.hashtags}</p> : null}
                  <p className="text-sm text-muted-foreground">
                    {typeLabel(item.type)} · {item.scheduledAt ? formatInZone(item.scheduledAt, item.timezone) : 'Unscheduled'}
                  </p>
                  {item.scheduledAt ? (
                    <p className="text-sm font-medium">Publishes {formatDistanceToNow(new Date(item.scheduledAt), { addSuffix: true })}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.platforms.map((platform) => (
                      <PlatformBadge key={platform} platform={platform} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Hint detail="Checks the account and file, then publishes this now and clears the later time.">
                    <Button size="sm" onClick={() => setUploadNow(item)}>
                      <Upload className="h-4 w-4" /> Upload now
                    </Button>
                  </Hint>
                  <Hint detail="Open the caption, hashtags, and schedule so you can review them.">
                    <Button variant="outline" size="sm" onClick={() => setPreview(item)}>Preview</Button>
                  </Hint>
                  <Hint detail="Stops this from publishing. The live post is not affected because it has not gone out yet.">
                    <Button variant="outline" size="sm" onClick={() => setPending(item)}>Cancel schedule</Button>
                  </Hint>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ContentPreviewDialog item={preview} onClose={() => setPreview(null)} />
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
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null) }}
        title="Cancel this schedule?"
        description={pending ? `"${pending.title}" will be marked cancelled and will not publish.` : ''}
        confirmLabel="Cancel schedule"
        destructive
        onConfirm={() => {
          if (!pending) return
          cancelSchedule(pending.id)
          toast.success('Schedule cancelled')
          setPending(null)
        }}
      />
    </div>
  )
}
