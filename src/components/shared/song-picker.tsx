import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'

export type SongChoice = {
  id: string
  title: string
  artist: string | null
  audioVolume: number
  videoVolume: number
}

type Track = SongChoice & {
  durationMs: number | null
  artworkUrl: string | null
  previewUrl: string | null
  type: 'music' | 'original_sound'
}

function lengthLabel(durationMs: number | null) {
  if (!durationMs) return ''
  const total = Math.round(durationMs / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function SongPicker({
  accountId,
  enabled,
  value,
  onChange,
}: {
  accountId: string
  enabled: boolean
  value: SongChoice | null
  onChange: (song: SongChoice | null) => void
}) {
  const [type, setType] = useState<'music' | 'original_sound'>('music')
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !accountId) return
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ accountId, type, q: query.trim() })
      api<{ tracks: Track[]; available: boolean; reason: string | null }>(`/api/audio?${params.toString()}`)
        .then((data) => {
          if (!active) return
          setTracks(data.tracks)
          setReason(data.available ? null : data.reason)
        })
        .catch((failure) => {
          if (!active) return
          setTracks([])
          setError(failure instanceof Error ? failure.message : 'Songs could not be loaded.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [accountId, enabled, query, type])

  if (!enabled) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Instagram does not let an app attach a catalog song to a Story, a Facebook post, or a photo. Those keep the audio already inside the file. A trending song can be added to an Instagram Reel.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Add a song</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Trending music and original sounds come from Instagram. The song is attached when the Reel is published. Facebook, if selected too, still uses the audio in the file.
        </p>
      </div>
      {!accountId ? <p className="text-sm text-muted-foreground">Choose an Instagram account to load songs.</p> : null}
      {reason ? <p className="text-sm text-amber-900" role="status">{reason}</p> : null}
      {accountId && !reason ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`rounded-full px-3 py-1 text-xs font-medium ${type === 'music' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`} onClick={() => setType('music')}>Trending music</button>
            <button type="button" className={`rounded-full px-3 py-1 text-xs font-medium ${type === 'original_sound' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`} onClick={() => setType('original_sound')}>Original sounds</button>
          </div>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={type === 'music' ? 'Search a song or artist' : 'Search an original sound'} aria-label="Search songs" />
          {loading ? <p className="text-sm text-muted-foreground">Loading songs…</p> : null}
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <ul className="max-h-72 space-y-2 overflow-auto">
            {tracks.map((track) => {
              const selected = value?.id === track.id
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left ${selected ? 'border-slate-900' : 'border-slate-200'}`}
                    onClick={() => onChange({ id: track.id, title: track.title, artist: track.artist, audioVolume: value?.audioVolume ?? 100, videoVolume: value?.videoVolume ?? 60 })}
                  >
                    {track.artworkUrl ? <img src={track.artworkUrl} alt="" className="h-12 w-12 rounded-md object-cover" /> : <span className="h-12 w-12 rounded-md bg-slate-100" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{track.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{[track.artist, lengthLabel(track.durationMs)].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                  {selected && track.previewUrl ? <audio className="mt-2 w-full" controls preload="none" src={track.previewUrl} /> : null}
                </li>
              )
            })}
          </ul>
          {!loading && tracks.length === 0 && !error ? <p className="text-sm text-muted-foreground">No songs matched. Leave the search empty to load what Instagram is trending.</p> : null}
          {value ? (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{value.title}{value.artist ? ` · ${value.artist}` : ''}</p>
                <button type="button" className="text-xs font-medium text-slate-600" onClick={() => onChange(null)}>Remove song</button>
              </div>
              <label className="block text-xs text-slate-600">Song volume {value.audioVolume}
                <input className="mt-1 w-full" type="range" min={1} max={100} value={value.audioVolume} onChange={(event) => onChange({ ...value, audioVolume: Number(event.target.value) })} />
              </label>
              <label className="block text-xs text-slate-600">Original video volume {value.videoVolume}
                <input className="mt-1 w-full" type="range" min={1} max={100} value={value.videoVolume} onChange={(event) => onChange({ ...value, videoVolume: Number(event.target.value) })} />
              </label>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
