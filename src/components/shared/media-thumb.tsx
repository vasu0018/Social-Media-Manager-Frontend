import { cn } from '@/lib/utils'
import type { MediaAsset } from '@/types/content'

export function MediaThumb({
  media,
  className,
  alt = '',
}: {
  media: MediaAsset | null
  className?: string
  alt?: string
}) {
  if (media?.src && media.kind === 'video') {
    return <video src={media.src} className={cn('h-full w-full object-cover', className)} muted />
  }

  if (media?.src) {
    return <img src={media.src} alt={alt} className={cn('h-full w-full object-cover', className)} />
  }

  return <div className={cn('h-full w-full', media?.tone ?? 'bg-slate-200', className)} />
}
