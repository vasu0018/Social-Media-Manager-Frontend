import { MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { PlaceChoice } from '@/types/content'

export function PlacePicker({ id, value, onChange }: { id: string; value: PlaceChoice | null | undefined; onChange: (place: PlaceChoice | null) => void }) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<PlaceChoice[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const term = query.trim()
    const timer = window.setTimeout(() => {
      setLoading(true)
      api<{ places: PlaceChoice[]; searchError: string | null }>(`/api/places?q=${encodeURIComponent(term)}`)
        .then((result) => {
          setPlaces(result.places)
          setMessage(result.searchError ?? (term.length >= 2 && result.places.length === 0 ? 'No place with an address matched. Try the city name, or paste the Facebook link of the place.' : null))
        })
        .catch((error: unknown) => {
          setPlaces([])
          setMessage(error instanceof Error ? error.message : 'Places could not be loaded.')
        })
        .finally(() => setLoading(false))
    }, term ? 400 : 0)
    return () => window.clearTimeout(timer)
  }, [query, open])

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

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={query}
        placeholder="Search a city or place, or paste its Facebook link"
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
      />
      {open ? (
        <div className="rounded-lg border bg-white">
          {loading ? <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p> : null}
          {places.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto py-1">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => { onChange(place); setOpen(false); setQuery('') }}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{place.name}</span>
                      {place.address ? <span className="block truncate text-xs text-muted-foreground">{place.address}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && message ? <p className="px-3 py-2 text-xs text-amber-800">{message}</p> : null}
          {!loading && !message && places.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">Type at least 2 letters to search.</p> : null}
        </div>
      ) : null}
    </div>
  )
}
