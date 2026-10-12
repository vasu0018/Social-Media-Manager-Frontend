import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { StudioBoard } from '@/components/shared/studio-board'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { statusLabel } from '@/lib/format'
import type { ContentStatus, ContentType, Platform } from '@/types/content'

function uploadFor(types?: ContentType[]) {
  if (types?.includes('story')) return { href: '/stories/compose', label: 'Upload story' }
  if (types?.some((type) => type === 'post' || type === 'image')) return { href: '/create?kind=image', label: 'Upload post' }
  if (types?.includes('reel')) return { href: '/create?kind=reel', label: 'Upload reel' }
  return { href: '/create', label: 'Upload reel' }
}

const statuses: Array<ContentStatus | 'all'> = ['all', 'draft', 'scheduled', 'processing', 'published', 'partially_published', 'failed', 'cancelled']

export function ContentListPage({
  title,
  description,
  types,
}: {
  title: string
  description: string
  types?: ContentType[]
}) {
  usePageTitle(title)
  const { items, accounts, deleteAllItems } = useContent()
  const [clearing, setClearing] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const status = params.get('status') ?? 'all'
  const platform = params.get('platform') ?? 'all'
  const typeFilter = params.get('type') ?? 'all'
  const accountId = params.get('account') ?? 'all'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const base = items.filter((item) => !types || types.includes(item.type))
  const filtered = base.filter((item) => {
    const haystack = `${item.title} ${item.caption}`.toLowerCase()
    if (query && !haystack.includes(query.toLowerCase())) return false
    if (status !== 'all' && item.status !== status) return false
    if (platform !== 'all' && !item.platforms.includes(platform as Platform)) return false
    if (!types && typeFilter !== 'all' && item.type !== typeFilter) return false
    if (accountId !== 'all' && !item.accountIds.includes(accountId) && !item.publications?.some((destination) => destination.accountId === accountId)) return false
    const stamp = new Date(item.scheduledAt ?? item.publishedAt ?? item.createdAt).getTime()
    if (from && stamp < new Date(`${from}T00:00:00`).getTime()) return false
    if (to && stamp > new Date(`${to}T23:59:59`).getTime()) return false
    return true
  })
  const filtersActive = Boolean(query || status !== 'all' || platform !== 'all' || accountId !== 'all' || from || to || (!types && typeFilter !== 'all'))
  const upload = uploadFor(types)
  const noun = types?.includes('reel') && types.length === 1
    ? 'reels'
    : types?.includes('story')
      ? 'stories'
      : types
        ? 'posts'
        : 'items'

  return (
    <div className="space-y-4">
    <PageHeader
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap gap-2">
          {base.length > 0 ? (
            <Button variant="outline" onClick={() => setClearing(true)}>Delete all</Button>
          ) : null}
          <Button asChild><Link to={upload.href}>{upload.label}</Link></Button>
        </div>
      }
    />
    <StudioBoard
      key={title}
      items={filtered}
      filtersOpen={filtersOpen || filtersActive}
      onToggleFilters={() => setFiltersOpen((open) => !open)}
      emptyTitle={filtersActive ? 'No content matches these filters' : `No ${title.toLowerCase()} yet`}
      emptyDescription={filtersActive ? 'Clear the filters or try a different search.' : description}
      emptyAction={<Button asChild><Link to={upload.href}>{upload.label}</Link></Button>}
      filters={
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <Input
            value={query}
            onChange={(event) => update('q', event.target.value)}
            placeholder="Search titles and captions"
            aria-label="Search content"
            className="lg:max-w-xs"
          />
          <NativeSelect className="lg:w-44" aria-label="Filter by status" value={status} onChange={(event) => update('status', event.target.value)}>
            {statuses.map((option) => (
              <option key={option} value={option}>{option === 'all' ? 'All statuses' : statusLabel(option)}</option>
            ))}
          </NativeSelect>
          <NativeSelect className="lg:w-44" aria-label="Filter by platform" value={platform} onChange={(event) => update('platform', event.target.value)}>
            <option value="all">All platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </NativeSelect>
          {types ? null : (
            <NativeSelect className="lg:w-40" aria-label="Filter by type" value={typeFilter} onChange={(event) => update('type', event.target.value)}>
              <option value="all">All types</option>
              <option value="reel">Reels</option>
              <option value="story">Stories</option>
              <option value="post">Posts</option>
              <option value="image">Images</option>
            </NativeSelect>
          )}
          <NativeSelect className="lg:w-48" aria-label="Filter by account" value={accountId} onChange={(event) => update('account', event.target.value)}>
            <option value="all">All accounts</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </NativeSelect>
          <Input className="lg:w-40" type="date" aria-label="From date" value={from} onChange={(event) => update('from', event.target.value)} />
          <Input className="lg:w-40" type="date" aria-label="To date" value={to} onChange={(event) => update('to', event.target.value)} />
          {filtersActive ? <Button variant="ghost" onClick={() => setParams(new URLSearchParams())}>Clear</Button> : null}
        </div>
      }
    />
    <ConfirmDialog
      open={clearing}
      onOpenChange={setClearing}
      title={`Delete all ${noun}?`}
      description={`This removes every ${noun} record from this workspace. Live Instagram and Facebook posts stay online. Items that are publishing now are skipped.`}
      confirmLabel="Delete all"
      destructive
      onConfirm={() => {
        void deleteAllItems(types)
          .then((result) => {
            toast.success(result.deleted === 0 ? `No ${noun} could be deleted.` : `${result.deleted} ${noun} deleted.`)
            setClearing(false)
          })
          .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not delete these items.'))
      }}
    />
    </div>
  )
}
