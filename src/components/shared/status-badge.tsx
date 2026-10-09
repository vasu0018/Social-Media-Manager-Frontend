import { Badge } from '@/components/ui/badge'
import { statusLabel } from '@/lib/format'
import type { ContentStatus } from '@/types/content'

const variants = {
  draft: 'secondary',
  scheduled: 'secondary',
  processing: 'default',
  published: 'success',
  partially_published: 'warning',
  failed: 'destructive',
  cancelled: 'secondary',
} as const

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge variant={variants[status]}>{statusLabel(status)}</Badge>
}
