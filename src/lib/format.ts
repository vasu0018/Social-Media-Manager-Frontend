import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
} from 'date-fns'
import type { ContentItem, ContentStatus, ContentType, Platform } from '@/types/content'

export function formatDateTime(iso: string) {
  return format(new Date(iso), 'd MMM yyyy, h:mm a')
}

export function formatSchedule(iso: string) {
  const date = new Date(iso)
  const time = format(date, 'h:mm a')
  if (isToday(date)) return `Today, ${time}`
  if (isTomorrow(date)) return `Tomorrow, ${time}`
  return `${format(date, 'd MMM')}, ${time}`
}

export function formatRelative(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function formatCount(value: number) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || 'A'
}

export function typeLabel(type: ContentType) {
  if (type === 'reel') return 'Reel'
  if (type === 'story') return 'Story'
  if (type === 'post') return 'Post'
  return 'Image'
}

export function platformLabel(platform: Platform) {
  return platform === 'instagram' ? 'Instagram' : 'Facebook'
}

export function statusLabel(status: ContentStatus) {
  if (status === 'draft') return 'Draft'
  if (status === 'scheduled') return 'Scheduled'
  if (status === 'processing') return 'Processing'
  if (status === 'published') return 'Published'
  if (status === 'partially_published') return 'Partially Published'
  if (status === 'cancelled') return 'Cancelled'
  return 'Failed'
}

export function contentWhen(item: ContentItem) {
  return item.scheduledAt ?? item.publishedAt ?? item.createdAt
}

export function activityText(item: ContentItem) {
  if (item.status === 'published') return `${item.title} was published`
  if (item.status === 'partially_published') return `${item.title} was partially published`
  if (item.status === 'failed') return `${item.title} failed to publish`
  if (item.status === 'cancelled') return `${item.title} was cancelled`
  if (item.status === 'scheduled') return `${item.title} is scheduled`
  if (item.status === 'processing') return `${item.title} is processing`
  return `${item.title} was saved as a draft`
}
