import { FolderOpen, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { MediaThumb } from '@/components/shared/media-thumb'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { formatDateTime } from '@/lib/format'
import { probeFile, validateLocalMedia } from '@/lib/formats'
import type { MediaAsset, Platform } from '@/types/content'

const uploadKinds = [
  { id: 'reel', label: 'Reel', hint: 'Vertical video. These show on the Reels page.', accept: 'video/mp4,video/quicktime', route: '/reels' },
  { id: 'story', label: 'Story', hint: 'Full-screen photo or video. These show on the Stories page.', accept: 'image/jpeg,image/png,video/mp4,video/quicktime', route: '/stories' },
  { id: 'image', label: 'Post', hint: 'Feed photo. These show on the Posts page.', accept: 'image/jpeg,image/png', route: '/posts' },
  { id: 'video', label: 'Feed video', hint: 'Feed video. These show on the Posts page.', accept: 'video/mp4,video/quicktime', route: '/posts' },
] as const

type UploadKind = (typeof uploadKinds)[number]['id']

function formatId(kind: UploadKind, platform: Platform) {
  if (kind === 'reel') return platform === 'instagram' ? 'instagram_reel' : 'facebook_reel'
  if (kind === 'story') return platform === 'instagram' ? 'instagram_story' : 'facebook_story'
  if (kind === 'image') return platform === 'instagram' ? 'instagram_feed_image' : 'facebook_image'
  return platform === 'instagram' ? 'instagram_feed_video' : 'facebook_video'
}

function titleFrom(name: string) {
  const title = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return (title || 'Upload').slice(0, 120)
}

export function MediaLibraryPage() {
  usePageTitle('Media Library')
  const navigate = useNavigate()
  const { media, accounts, uploadMedia, deleteMedia, deleteAllMedia, saveContent } = useContent()
  const [filter, setFilter] = useState('all')
  const [pending, setPending] = useState<MediaAsset | null>(null)
  const [clearing, setClearing] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [ask, setAsk] = useState(false)
  const [kind, setKind] = useState<UploadKind>('reel')
  const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({ instagram: true, facebook: true })
  const inputRef = useRef<HTMLInputElement>(null)
  const visible = media.filter((asset) => filter === 'all' || asset.kind === filter)
  const choice = uploadKinds.find((entry) => entry.id === kind) ?? uploadKinds[0]

  function openAsk() {
    const instagram = accounts.some((account) => account.platform === 'instagram' && account.connected)
    const facebook = accounts.some((account) => account.platform === 'facebook' && account.connected)
    setPlatforms({ instagram, facebook: facebook || !instagram })
    setAsk(true)
  }

  function beginPick() {
    const selected = (['instagram', 'facebook'] as const).filter((platform) => platforms[platform])
    if (selected.length === 0) {
      toast.error('Choose Instagram, Facebook, or both.')
      return
    }
    for (const platform of selected) {
      const account = accounts.find((entry) => entry.platform === platform && entry.connected)
      if (!account) {
        toast.error(`Connect ${platform === 'instagram' ? 'Instagram' : 'Facebook'} before uploading these ${choice.label.toLowerCase()}s.`)
        return
      }
    }
    setAsk(false)
    inputRef.current?.click()
  }

  async function onFiles(files: FileList | null) {
    const list = [...(files ?? [])]
    if (list.length === 0) return
    const selected = (['instagram', 'facebook'] as const).filter((platform) => platforms[platform])
    const destinations = selected.flatMap((platform) => {
      const account = accounts.find((entry) => entry.platform === platform && entry.connected)
      return account ? [{ platform, accountId: account.id, format: formatId(kind, platform) }] : []
    })
    if (destinations.length === 0) {
      toast.error('Connect Instagram or Facebook before saving these uploads.')
      return
    }
    const problems: string[] = []
    let saved = 0
    setProgress(0)
    try {
      for (let index = 0; index < list.length; index += 1) {
        const file = list[index]
        if (!file) continue
        if (file.size > 300 * 1024 * 1024) {
          problems.push(`${file.name} is larger than 300 MB.`)
          continue
        }
        try {
          const probe = await probeFile(file)
          const localErrors = [...new Set(destinations.flatMap((destination) => validateLocalMedia(destination.format, probe)))]
          if (localErrors.length > 0) {
            problems.push(`${file.name}: ${localErrors[0]}`)
            continue
          }
          const result = await uploadMedia(file, destinations[0]?.format ?? null, (percent) => {
            setProgress(Math.round(((index + percent / 100) / list.length) * 100))
          })
          if (result.errors.length > 0) {
            problems.push(`${file.name}: ${result.errors[0]}`)
            continue
          }
          await saveContent({
            title: titleFrom(file.name),
            caption: '',
            hashtags: '',
            firstComment: null,
            destinations,
            mediaId: result.media.id,
            action: 'draft',
            scheduledAt: null,
            timezone: 'Asia/Kolkata',
          })
          saved += 1
        } catch (error) {
          problems.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`)
        }
      }
      if (saved > 0) {
        toast.success(saved === 1 ? `1 ${choice.label.toLowerCase()} saved. Add the caption and schedule it from the list.` : `${saved} ${choice.label.toLowerCase()}s saved. Add a caption and schedule each one from the list.`)
        navigate(choice.route)
      }
      if (problems.length > 0) {
        const extra = problems.length > 1 ? ` ${problems.length - 1} more file${problems.length === 2 ? '' : 's'} had a problem.` : ''
        toast.error(`${problems[0]}${extra}`)
      }
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Upload several files at once. Choose reel, story, post, or feed video first, then they show on that page as drafts."
        action={
          <div className="flex flex-wrap gap-2">
            {media.length > 0 ? <Button variant="outline" onClick={() => setClearing(true)}><Trash2 className="h-4 w-4" /> Delete all</Button> : null}
            <Button onClick={openAsk}><Upload className="h-4 w-4" /> Bulk upload</Button>
          </div>
        }
      />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={choice.accept}
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        aria-label="Upload media"
        onChange={(event) => {
          void onFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {progress !== null ? (
        <div className="space-y-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-indigo-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Uploading {progress}%</p>
        </div>
      ) : null}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList aria-label="Media type">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="image">Images</TabsTrigger>
          <TabsTrigger value="video">Videos</TabsTrigger>
        </TabsList>
      </Tabs>
      {visible.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={FolderOpen}
            title={media.length === 0 ? 'Library is empty' : 'Nothing in this filter'}
            description="Choose reel, story, post, or feed video, then upload JPEG, PNG, MP4, or MOV files up to 300 MB."
            action={<Button onClick={openAsk}>Bulk upload</Button>}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((asset) => (
            <li key={asset.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="aspect-video bg-slate-100">
                <MediaThumb media={asset} alt={asset.name} />
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">{asset.name}</p>
                <p className="text-xs text-muted-foreground">{asset.kind === 'video' ? 'Video' : 'Image'} · {asset.sizeLabel}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(asset.createdAt)}</p>
                <Button variant="outline" size="sm" onClick={() => setPending(asset)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={ask} onOpenChange={setAsk}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What are these files?</DialogTitle>
            <DialogDescription>Each file becomes its own draft on the matching page. You can edit the caption and schedule it there.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {uploadKinds.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setKind(entry.id)}
                className={`rounded-xl border p-3 text-left ${kind === entry.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}
              >
                <span className="block text-sm font-semibold">{entry.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{entry.hint}</span>
              </button>
            ))}
          </div>
          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-medium">Publish to</legend>
            {(['instagram', 'facebook'] as const).map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={platforms[platform]}
                  onChange={(event) => setPlatforms((current) => ({ ...current, [platform]: event.target.checked }))}
                />
                {platform === 'instagram' ? 'Instagram' : 'Facebook'}
              </label>
            ))}
          </fieldset>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAsk(false)}>Cancel</Button>
            <Button onClick={beginPick}>Choose files</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={clearing}
        onOpenChange={setClearing}
        title="Delete all files?"
        description="This removes every file from the library. Files attached to scheduled or publishing items are skipped. Content that used a deleted file keeps its caption."
        confirmLabel="Delete all"
        destructive
        onConfirm={() => {
          void deleteAllMedia()
            .then((result) => {
              const extra = result.skipped > 0 ? ` ${result.skipped} stayed because they are on a schedule.` : ''
              toast.success(result.deleted === 0 ? `No files could be deleted.${extra}` : `${result.deleted} files deleted.${extra}`)
              setClearing(false)
            })
            .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not delete the library.'))
        }}
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null) }}
        title="Delete this file?"
        description={pending ? `"${pending.name}" will be removed from the library. Content that used it will keep its caption and lose the attachment.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!pending) return
          const target = pending
          setPending(null)
          void deleteMedia(target.id).then(() => toast.success('Media deleted')).catch(() => undefined)
        }}
      />
    </div>
  )
}
