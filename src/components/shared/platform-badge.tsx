import { Badge } from '@/components/ui/badge'
import { platformLabel } from '@/lib/format'
import type { Platform } from '@/types/content'

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.2 8.5V6.7c0-2.2 1.2-3.2 3.3-3.2H19V6h-1.1c-.8 0-1 .4-1 1.1v1.4H19l-.4 2.5h-2.3V21h-2.7V11H12V8.5h2.2Z"
      />
    </svg>
  )
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <Badge variant="outline" className={platform === 'instagram' ? 'text-rose-600' : 'text-sky-700'}>
      <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
      {platformLabel(platform)}
    </Badge>
  )
}
