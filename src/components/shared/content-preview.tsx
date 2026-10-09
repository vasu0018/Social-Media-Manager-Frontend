import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MediaThumb } from '@/components/shared/media-thumb'
import { PlatformBadge } from '@/components/shared/platform-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useContent } from '@/context/content-context'
import { timezones } from '@/data/mock'
import { formatDateTime, platformLabel, typeLabel } from '@/lib/format'
import { formatInZone, zonedToUtc } from '@/lib/time'
import type { ContentItem } from '@/types/content'

export function ContentPreviewDialog({
  item,
  onClose,
}: {
  item: ContentItem | null
  onClose: () => void
}) {
  const { accounts, media, updateContent, reschedule, cancelSchedule, retryItem, publishNow } = useContent()
  const asset = media.find((entry) => entry.id === item?.mediaId) ?? null
  const accountNames = accounts
    .filter((account) => item?.accountIds.includes(account.id))
    .map((account) => account.name)
  const canRetry = item?.publications?.some((publication) => publication.status === 'failed' && !publication.externalId) ?? item?.status === 'failed'
  const [confirmUpload, setConfirmUpload] = useState(false)

  return (
    <>
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) { setConfirmUpload(false); onClose() } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {item ? (
          <>
            <DialogHeader>
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>Details for this {typeLabel(item.type).toLowerCase()}.</DialogDescription>
            </DialogHeader>
            <div className="mb-4 flex flex-wrap gap-2">
              <StatusBadge status={item.status} />
              {item.platforms.map((platform) => <PlatformBadge key={platform} platform={platform} />)}
            </div>
            <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-slate-100">
              <MediaThumb media={asset} alt="" />
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">{item.caption}</p>
            {item.publications && item.publications.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {item.publications.map((publication) => (
                  <li key={publication.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{platformLabel(publication.platform)}</span>
                      <StatusBadge status={publication.status} />
                    </div>
                    <p className="mt-1 text-muted-foreground">{publication.accountName}</p>
                    {publication.publishedAt ? <p className="text-xs text-muted-foreground">Published {formatInZone(publication.publishedAt, item.timezone)}</p> : null}
                    {publication.externalId ? <p className="text-xs text-muted-foreground">Post ID {publication.externalId}</p> : null}
                    {publication.permalink ? <a className="text-xs underline" href={publication.permalink} target="_blank" rel="noreferrer">Open published post</a> : null}
                    {publication.errorCode ? <p className="text-xs text-muted-foreground">Error code {publication.errorCode}</p> : null}
                    {publication.error ? <p className="mt-1 text-rose-700">{publication.error}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {item.attempts && item.attempts.length > 0 ? (
              <ol className="mt-4 space-y-2 text-sm">
                {item.attempts.map((attempt) => (
                  <li key={attempt.id}>
                    <span className="font-medium">{platformLabel(attempt.platform)} · {attempt.outcome}</span>
                    <span className="text-muted-foreground"> · {formatDateTime(attempt.startedAt)}</span>
                    {attempt.message ? <p className="text-muted-foreground">{attempt.message}</p> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Accounts</dt>
                <dd>{accountNames.length > 0 ? accountNames.join(', ') : 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Schedule</dt>
                <dd>{item.scheduledAt ? formatInZone(item.scheduledAt, item.timezone) : 'Not scheduled'}</dd>
              </div>
            </dl>
            {item.status === 'draft' ? (
              <DraftEditor item={item} onSave={async (title, caption) => {
                await updateContent(item.id, { title, caption })
                toast.success('Draft updated')
                onClose()
              }} />
            ) : null}
            {item.status === 'scheduled' ? (
              <ScheduleEditor item={item} onSave={async (caption, when, zone) => {
                await updateContent(item.id, { caption })
                await reschedule(item.id, when, zone)
                toast.success('Schedule updated')
                onClose()
              }} onCancel={() => { cancelSchedule(item.id); toast.success('Schedule cancelled'); onClose() }} onUploadNow={() => setConfirmUpload(true)} />
            ) : null}
            {canRetry ? <Button className="mt-4" onClick={() => { retryItem(item.id); toast('Retry is running on the server.') }}>Retry failed destination</Button> : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={confirmUpload && item !== null}
      onOpenChange={(open) => { if (!open) setConfirmUpload(false) }}
      title="Upload this now?"
      description={item ? `Reel Studio will check the account, permissions, and media for "${item.title}", then publish it now. The later schedule is cleared. A result appears when Meta confirms it.` : ''}
      confirmLabel="Upload now"
      onConfirm={() => {
        if (!item) return
        publishNow(item.id)
        setConfirmUpload(false)
        onClose()
      }}
    />
    </>
  )
}

function DraftEditor({
  item,
  onSave,
}: {
  item: ContentItem
  onSave: (title: string, caption: string) => Promise<void>
}) {
  const [title, setTitle] = useState(item.title)
  const [caption, setCaption] = useState(item.caption)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="mt-4 space-y-3 rounded-xl border p-3">
      <p className="text-sm font-medium">Edit draft</p>
      <p className="text-xs text-muted-foreground">Saving changes updates this draft. It does not publish or create another copy.</p>
      <Input aria-label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <Textarea aria-label="Caption" value={caption} onChange={(event) => setCaption(event.target.value)} />
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button onClick={() => {
        if (title.trim().length < 2) {
          setError('Enter a title with at least 2 characters.')
          return
        }
        void onSave(title.trim(), caption).catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : 'Could not update this draft.')
        })
      }}>Save draft</Button>
    </div>
  )
}

function ScheduleEditor({
  item,
  onSave,
  onCancel,
  onUploadNow,
}: {
  item: ContentItem
  onSave: (caption: string, scheduledAt: string, timezone: string) => Promise<void>
  onCancel: () => void
  onUploadNow: () => void
}) {
  const [caption, setCaption] = useState(item.caption)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timezone, setTimezone] = useState(item.timezone || 'Asia/Kolkata')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mt-4 space-y-3 rounded-xl border p-3">
      <p className="text-sm font-medium">Edit scheduled content</p>
      <Textarea aria-label="Caption" value={caption} onChange={(event) => setCaption(event.target.value)} />
      <div className="grid gap-2 sm:grid-cols-3">
        <Input aria-label="Publication date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input aria-label="Publication time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <NativeSelect aria-label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
          {timezones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
        </NativeSelect>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => {
          if (!date || !time) {
            setError('Choose a new date and time.')
            return
          }
          const when = zonedToUtc(date, time, timezone)
          if (when.getTime() < Date.now() + 60_000) {
            setError('Choose a time at least a minute from now.')
            return
          }
          void onSave(caption, when.toISOString(), timezone).catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Could not update the schedule.')
          })
        }}>Save schedule</Button>
        <Button variant="outline" onClick={onUploadNow}>Upload now</Button>
        <Button variant="outline" onClick={onCancel}>Cancel schedule</Button>
      </div>
    </div>
  )
}
