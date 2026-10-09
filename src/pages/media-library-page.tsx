import { FolderOpen, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { MediaThumb } from '@/components/shared/media-thumb'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { formatDateTime } from '@/lib/format'
import type { MediaAsset } from '@/types/content'

export function MediaLibraryPage() {
  usePageTitle('Media Library')
  const { media, uploadMedia, deleteMedia } = useContent()
  const [kind, setKind] = useState('all')
  const [pending, setPending] = useState<MediaAsset | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const visible = media.filter((asset) => kind === 'all' || asset.kind === kind)

  async function onFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (file.size > 300 * 1024 * 1024) {
      toast.error('Files must be 300 MB or smaller')
      return
    }
    setProgress(0)
    try {
      const result = await uploadMedia(file, null, setProgress)
      if (result.errors.length > 0) toast.error(result.errors[0] ?? 'This file needs a different format')
      else toast.success('Media uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Images and videos available for reels, stories, and posts."
        action={<Button onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,video/mp4,video/quicktime"
        className="sr-only"
        aria-label="Upload media"
        onChange={(event) => {
          onFiles(event.target.files)
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
      <Tabs value={kind} onValueChange={setKind}>
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
            description="Upload a JPEG, PNG, MP4, or MOV up to 300 MB."
            action={<Button onClick={() => inputRef.current?.click()}>Upload media</Button>}
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
