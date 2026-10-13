import { Check, Loader2, Music2, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, apiPath } from '@/lib/api'

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

function mediaAddress(url: string) {
  return url.startsWith('http') ? url : apiPath(url)
}

export function SongPicker({
  accountId,
  enabled,
  facebookToo = false,
  value,
  onChange,
}: {
  accountId: string
  enabled: boolean
  facebookToo?: boolean
  value: SongChoice | null
  onChange: (song: SongChoice | null) => void
}) {
  const [query, setQuery] = useState('')
  const search = query.trim()
  const requestQuery = search.length >= 2 ? search : ''
  const [tracks, setTracks] = useState<Track[]>([])
  const [needsPage, setNeedsPage] = useState(false)
  const [needsLink, setNeedsLink] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [playError, setPlayError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!enabled || !accountId) return
    let active = true
    setLoading(true)
    setError(null)
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ accountId, type: 'music', q: requestQuery })
      api<{ tracks: Track[]; available: boolean; needsPage?: boolean; needsLink?: boolean; reason: string | null }>(`/api/audio?${params.toString()}`)
        .then((data) => {
          if (!active) return
          setTracks([...data.tracks.filter((track) => track.previewUrl), ...data.tracks.filter((track) => !track.previewUrl)])
          setNeedsPage(Boolean(data.needsPage))
          setNeedsLink(Boolean(data.needsLink))
          setReason(data.available ? null : data.reason)
        })
        .catch((failure) => {
          if (!active) return
          setTracks([])
          setNeedsPage(false)
          setNeedsLink(false)
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
  }, [accountId, enabled, requestQuery])

  useEffect(() => () => audioRef.current?.pause(), [])

  function choose(track: Track) {
    onChange({ id: track.id, title: track.title, artist: track.artist, audioVolume: value?.audioVolume ?? 100, videoVolume: value?.videoVolume ?? 60 })
  }

  function play(track: Track) {
    setPlayError(null)
    if (!track.previewUrl) {
      setPlayError('Instagram did not give a preview for this song. You can still select it.')
      choose(track)
      return
    }
    const player = audioRef.current
    if (!player) return
    if (playingId === track.id && !player.paused) {
      player.pause()
      setPlayingId(null)
      setLoadingId(null)
      return
    }
    setLoadingId(track.id)
    player.src = mediaAddress(track.previewUrl)
    player.onended = () => {
      setPlayingId(null)
      setLoadingId(null)
    }
    player.onerror = () => {
      setPlayingId(null)
      setLoadingId(null)
      setPlayError('This preview could not be played. You can still select the song.')
    }
    void player.play().then(() => {
      setLoadingId(null)
      setPlayingId(track.id)
    }).catch(() => {
      setPlayingId(null)
      setLoadingId(null)
      setPlayError('This preview could not be played. You can still select the song.')
    })
  }

  if (!enabled) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        A catalog song can be added to an Instagram Reel or Instagram feed video. Stories, photos, and Facebook posts keep the audio already inside the file.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"><Music2 className="h-4 w-4" /></span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Add audio</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Trending Instagram songs. Play a preview, then select the one to attach when the Reel is published.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Instagram gives apps only the music that business accounts may use, so many original film songs are not in this list.
          </p>
        </div>
      </div>
      {!accountId ? <p className="text-sm text-muted-foreground">Choose an Instagram account to load songs.</p> : null}
      {needsPage ? (
        <div className="space-y-3 rounded-lg bg-slate-50 p-3">
          <p className="text-sm text-slate-700" role="status">{reason}</p>
          {needsLink ? null : (
            <Button type="button" asChild>
              <Link to="/settings#connections">Open Settings</Link>
            </Button>
          )}
        </div>
      ) : null}
      {accountId && !needsPage ? (
        <>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trending songs or artists" aria-label="Search trending songs" />
          <div className="rounded-lg border bg-slate-50 p-3">
            <audio ref={audioRef} controls className="w-full" preload="none" />
            <p className="mt-1 text-xs text-muted-foreground">{playingId ? 'Playing preview' : 'Choose a song below, then press play.'}</p>
          </div>
          <p className="text-xs font-medium text-slate-700">{requestQuery ? `Trending results for “${requestQuery}”` : 'Trending songs'}</p>
          {loading ? <p className="text-sm text-muted-foreground">Loading songs…</p> : null}
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          {playError ? <p className="text-sm text-amber-800" role="status">{playError}</p> : null}
          <ul className="max-h-[28rem] space-y-1 overflow-auto">
            {tracks.map((track) => {
              const selected = value?.id === track.id
              return (
                <li key={track.id}>
                  <div className={`flex items-center gap-3 rounded-lg px-2 py-2 ${selected ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                    <button type="button" className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-200" onClick={() => play(track)} aria-label={!track.previewUrl ? `Select ${track.title} (no preview)` : playingId === track.id ? 'Pause preview' : 'Play preview'}>
                      {track.artworkUrl ? <img src={mediaAddress(track.artworkUrl)} alt="" className="h-full w-full object-cover" /> : null}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                        {!track.previewUrl ? <Music2 className="h-4 w-4" /> : loadingId === track.id ? <Loader2 className="h-4 w-4 animate-spin" /> : playingId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => choose(track)}
                    >
                      <span className="block truncate text-sm font-semibold">{track.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{[track.artist, lengthLabel(track.durationMs), track.previewUrl ? null : 'No preview'].filter(Boolean).join(' · ')}</span>
                    </button>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-slate-900" aria-label="Selected" /> : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {!loading && tracks.length === 0 && !error ? <p className="text-sm text-muted-foreground">{requestQuery ? `No songs matched “${requestQuery}”.` : 'Instagram did not return trending songs for this account.'}</p> : null}
          {value ? (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Using {value.title}{value.artist ? ` · ${value.artist}` : ''}</p>
                <button type="button" className="text-xs font-medium text-slate-600" onClick={() => onChange(null)}>Remove</button>
              </div>
              <label className="block text-xs text-slate-600">Song volume {value.audioVolume}
                <input className="mt-1 w-full" type="range" min={1} max={100} value={value.audioVolume} onChange={(event) => onChange({ ...value, audioVolume: Number(event.target.value) })} />
              </label>
              {facebookToo ? <p className="text-xs text-slate-600">Instagram publishes this Reel with the song. Facebook publishes the same video with the sound already in the file.</p> : null}
              <label className="block text-xs text-slate-600">Original audio {value.videoVolume}
                <input className="mt-1 w-full" type="range" min={1} max={100} value={value.videoVolume} onChange={(event) => onChange({ ...value, videoVolume: Number(event.target.value) })} />
              </label>
            </div>
          ) : null}
        </>
      ) : null}
      {error && needsPage ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}
