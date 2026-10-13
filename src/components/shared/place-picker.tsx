import { Bookmark, MapPin, Star, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { PlaceChoice } from '@/types/content'

type PlaceResult = PlaceChoice & { saved?: boolean; isDefault?: boolean }

const pastedLink = /facebook\.com|^\d{5,30}$/i

export function PlacePicker({ id, value, onChange }: { id: string; value: PlaceChoice | null | undefined; onChange: (place: PlaceChoice | null) => void }) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<PlaceResult[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [naming, setNaming] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const term = query.trim()
    const timer = window.setTimeout(() => {
      setLoading(true)
      api<{ places: PlaceResult[]; searchError: string | null }>(`/api/places?q=${encodeURIComponent(term)}`)
        .then((result) => {
          setPlaces(result.places)
          setMessage(result.searchError)
          const fresh = result.places.find((place) => !place.saved && !place.address)
          setNaming(fresh && !fresh.name.startsWith('Facebook place') ? fresh.name : '')
        })
        .catch((error: unknown) => {
          setPlaces([])
          setMessage(error instanceof Error ? error.message : 'Places could not be loaded.')
        })
        .finally(() => setLoading(false))
    }, term ? 400 : 0)
    return () => window.clearTimeout(timer)
  }, [query, open, refresh])

  async function choose(place: PlaceResult, name = place.name) {
    setBusy(true)
    try {
      const stored = place.saved && name === place.name
        ? place
        : await api<PlaceResult>('/api/places', { method: 'POST', body: JSON.stringify({ id: place.id, name, address: place.address ?? null }) })
      onChange({ id: stored.id, name: stored.name, address: stored.address ?? null })
      setOpen(false)
      setQuery('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The place could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleDefault(place: PlaceResult) {
    try {
      const result = await api<{ isDefault: boolean }>(`/api/places/${encodeURIComponent(place.id)}/default`, { method: 'POST' })
      toast.success(result.isDefault ? `${place.name} is now filled in on every new post.` : `${place.name} is no longer the default.`)
      setRefresh((count) => count + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The default could not be changed.')
    }
  }

  async function forget(place: PlaceResult) {
    try {
      await api(`/api/places/${encodeURIComponent(place.id)}/delete`, { method: 'POST' })
      setRefresh((count) => count + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The place could not be removed.')
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{value.name}</span>
            {value.address ? <span className="block truncate text-xs text-muted-foreground">{value.address}</span> : null}
          </span>
        </span>
        <button type="button" className="rounded p-1 hover:bg-slate-200" aria-label="Remove location" onClick={() => onChange(null)}><X className="h-4 w-4" /></button>
      </div>
    )
  }

  const fresh = pastedLink.test(query.trim()) ? places.find((place) => !place.saved && !place.address) : undefined
  const listed = places.filter((place) => place !== fresh)

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={query}
        placeholder="Type a city or place, or paste its Facebook link"
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
      />
      {open ? (
        <div className="rounded-lg border bg-white">
          {loading ? <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p> : null}
          {!loading && fresh ? (
            <div className="space-y-2 px-3 py-3">
              <label htmlFor={`${id}-name`} className="block text-xs font-medium text-slate-700">Name this place so you can find it next time</label>
              <div className="flex gap-2">
                <Input
                  id={`${id}-name`}
                  value={naming}
                  maxLength={120}
                  placeholder="For example: Ahmedabad, Gujarat"
                  onChange={(event) => setNaming(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    if (naming.trim()) void choose(fresh, naming.trim())
                  }}
                />
                <Button type="button" size="sm" disabled={busy || !naming.trim()} onClick={() => void choose(fresh, naming.trim())}>Save and use</Button>
              </div>
            </div>
          ) : null}
          {!loading && listed.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto py-1">
              {listed.map((place) => (
                <li key={place.id} className="flex items-center hover:bg-slate-50">
                  <button
                    type="button"
                    disabled={busy}
                    className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2 text-left text-sm"
                    onClick={() => void choose(place)}
                  >
                    {place.saved ? <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> : <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{place.name}</span>
                      {place.isDefault ? <span className="block text-xs text-amber-700">Default for new posts</span> : null}
                      {place.address ? <span className="block truncate text-xs text-muted-foreground">{place.address}</span> : null}
                    </span>
                  </button>
                  {place.saved ? (
                    <>
                      <button
                        type="button"
                        className={`rounded p-1 hover:bg-slate-200 ${place.isDefault ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                        aria-label={place.isDefault ? `Stop using ${place.name} as the default` : `Use ${place.name} on every new post`}
                        title={place.isDefault ? 'Default for new posts' : 'Use on every new post'}
                        onClick={() => void toggleDefault(place)}
                      >
                        <Star className="h-4 w-4" fill={place.isDefault ? 'currentColor' : 'none'} />
                      </button>
                      <button type="button" className="mr-2 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600" aria-label={`Remove ${place.name} from saved places`} onClick={() => void forget(place)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && message && !fresh ? <p className="px-3 py-2 text-xs text-amber-800">{message}</p> : null}
          {!loading && !message && !fresh && listed.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No saved places yet. Paste the Facebook link of a place once and it stays here for everyone.</p>
          ) : null}
          {!loading && fresh ? <p className="px-3 pb-2 text-xs text-muted-foreground">Meta checks this place when the post is published.</p> : null}
        </div>
      ) : null}
    </div>
  )
}
