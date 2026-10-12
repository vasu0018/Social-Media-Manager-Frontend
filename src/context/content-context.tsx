import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { api, apiPath, ApiError, uploadFile } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { seedSettings } from '@/data/mock'
import type { ContentItem, MediaAsset, SocialAccount, WorkspaceSettings } from '@/types/content'

type SaveContentInput = {
  title: string
  caption: string
  hashtags: string
  firstComment: string | null
  audio?: { id: string; title: string; artist: string | null; audioVolume: number; videoVolume: number } | null
  destinations: Array<{ platform: 'instagram' | 'facebook'; accountId: string; format: string }>
  mediaId: string | null
  action: 'draft' | 'schedule' | 'publish'
  scheduledAt: string | null
  timezone: string
}

type ContentContextValue = {
  items: ContentItem[]
  accounts: SocialAccount[]
  media: MediaAsset[]
  settings: WorkspaceSettings
  loading: boolean
  refresh: () => Promise<void>
  saveContent: (input: SaveContentInput) => Promise<ContentItem>
  updateContent: (id: string, patch: { title?: string; caption?: string; hashtags?: string; firstComment?: string | null }) => Promise<void>
  reschedule: (id: string, scheduledAt: string, timezone: string) => Promise<void>
  deleteItem: (id: string) => void
  duplicateItem: (id: string) => void
  repostItem: (id: string) => void
  cancelSchedule: (id: string) => void
  publishNow: (id: string) => void
  retryItem: (id: string) => void
  uploadMedia: (file: File, format: string | null, onProgress: (percent: number) => void) => Promise<{ media: MediaAsset; errors: string[] }>
  deleteMedia: (id: string) => Promise<void>
  updateSettings: (settings: WorkspaceSettings) => void
  replaceAccount: (account: SocialAccount) => void
  removeAccountConnection: (id: string) => Promise<void>
}

const ContentContext = createContext<ContentContextValue | null>(null)
const SETTINGS_KEY = 'reel-studio-settings'

function readSettings(): WorkspaceSettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return seedSettings
  try {
    return { ...seedSettings, ...JSON.parse(raw) as WorkspaceSettings }
  } catch {
    return seedSettings
  }
}

function asMedia(raw: Record<string, unknown>): MediaAsset {
  const bytes = Number(raw.bytes ?? 0)
  return {
    id: String(raw.id),
    name: String(raw.name ?? 'upload'),
    kind: raw.kind === 'video' ? 'video' : 'image',
    src: typeof raw.src === 'string' ? (raw.src.startsWith('http') ? raw.src : apiPath(raw.src)) : null,
    tone: 'bg-slate-200',
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    sizeLabel: formatBytes(bytes),
    mime: typeof raw.mime === 'string' ? raw.mime : '',
    bytes,
    width: typeof raw.width === 'number' ? raw.width : null,
    height: typeof raw.height === 'number' ? raw.height : null,
    durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : null,
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed'
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<ContentItem[]>([])
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [settings, setSettings] = useState<WorkspaceSettings>(() => readSettings())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [content, accountData, mediaData] = await Promise.all([
      api<{ items: ContentItem[] }>('/api/content?pageSize=100'),
      api<{ accounts: SocialAccount[] }>('/api/accounts'),
      api<{ media: Record<string, unknown>[] }>('/api/media'),
    ])
    setItems(content.items)
    setAccounts(accountData.accounts)
    setMedia(mediaData.media.map(asMedia))
  }, [])

  useEffect(() => {
    if (!user) {
      setItems([])
      setAccounts([])
      setMedia([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    refresh()
      .catch((error) => {
        if (active) toast.error(message(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [refresh, user])

  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      void (async () => {
        const notes = await api<{ notices: Array<{ id: string; kind: string; body: string }> }>('/api/notices').catch(() => ({ notices: [] }))
        for (const notice of notes.notices) {
          if (notice.kind === 'failure') toast.error(notice.body)
          else if (notice.kind === 'partial') toast.warning(notice.body)
          else toast.success(notice.body)
          await api(`/api/notices/${notice.id}/read`, { method: 'POST' }).catch(() => undefined)
        }
        if (notes.notices.length > 0) await refresh().catch(() => undefined)
      })()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [refresh, user])

  useEffect(() => {
    if (!user) return
    const pending = items.some((item) => item.status === 'processing')
    if (!pending) return
    const timer = window.setInterval(() => {
      void refresh().catch(() => undefined)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [items, refresh, user])

  const value = useMemo<ContentContextValue>(() => ({
    items,
    accounts,
    media,
    settings,
    loading,
    refresh,
    saveContent: async (input) => {
      const data = await api<{ item: ContentItem }>('/api/content', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      setItems((current) => [data.item, ...current])
      return data.item
    },
    updateContent: async (id, patch) => {
      const data = await api<{ item: ContentItem }>(`/api/content/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setItems((current) => current.map((item) => item.id === id ? data.item : item))
    },
    reschedule: async (id, scheduledAt, timezone) => {
      const data = await api<{ item: ContentItem }>(`/api/content/${id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt, timezone }),
      })
      setItems((current) => current.map((item) => item.id === id ? data.item : item))
    },
    deleteItem: (id) => {
      void api(`/api/content/${id}`, { method: 'DELETE' })
        .then(() => setItems((current) => current.filter((item) => item.id !== id)))
        .catch((error) => toast.error(message(error)))
    },
    duplicateItem: (id) => {
      void api<{ item: ContentItem }>(`/api/content/${id}/duplicate`, { method: 'POST' })
        .then((data) => setItems((current) => [data.item, ...current]))
        .catch((error) => toast.error(message(error)))
    },
    repostItem: (id) => {
      void api<{ item: ContentItem }>(`/api/content/${id}/repost`, { method: 'POST' })
        .then((data) => {
          setItems((current) => [data.item, ...current])
          toast.success('New draft created. The original post was left unchanged.')
        })
        .catch((error) => toast.error(message(error)))
    },
    cancelSchedule: (id) => {
      void api<{ item: ContentItem }>(`/api/content/${id}/cancel`, { method: 'POST' })
        .then((data) => setItems((current) => current.map((item) => item.id === id ? data.item : item)))
        .catch((error) => toast.error(message(error)))
    },
    publishNow: (id) => {
      void api<{ item: ContentItem }>(`/api/content/${id}/publish`, { method: 'POST' })
        .then((data) => {
          setItems((current) => current.map((item) => item.id === id ? data.item : item))
          toast('Publishing is running on the server. A result appears when Meta confirms it.')
        })
        .catch((error) => toast.error(message(error)))
    },
    retryItem: (id) => {
      void api<{ item: ContentItem }>(`/api/content/${id}/retry`, { method: 'POST' })
        .then((data) => setItems((current) => current.map((item) => item.id === id ? data.item : item)))
        .catch((error) => toast.error(message(error)))
    },
    uploadMedia: async (file, format, onProgress) => {
      const result = await uploadFile('/api/media', file, format ? { format } : {}, onProgress)
      const asset = asMedia(result.media)
      setMedia((current) => [asset, ...current.filter((entry) => entry.id !== asset.id)])
      return { media: asset, errors: result.errors }
    },
    deleteMedia: async (id) => {
      try {
        await api(`/api/media/${id}`, { method: 'DELETE' })
        setMedia((current) => current.filter((asset) => asset.id !== id))
      } catch (error) {
        if (error instanceof ApiError) toast.error(error.message)
        throw error
      }
    },
    updateSettings: (next) => {
      setSettings(next)
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    },
    replaceAccount: (account) => {
      setAccounts((current) => current.map((entry) => entry.id === account.id ? account : entry))
    },
    removeAccountConnection: async (id) => {
      const data = await api<{ account: SocialAccount }>(`/api/accounts/${id}/disconnect`, { method: 'POST' })
      setAccounts((current) => current.map((entry) => entry.id === id ? data.account : entry))
    },
  }), [accounts, items, loading, media, refresh, settings])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const value = useContext(ContentContext)
  if (!value) throw new Error('useContent must be used within ContentProvider')
  return value
}
