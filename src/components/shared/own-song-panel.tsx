import { Loader2, Music, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useContent } from '@/context/content-context'
import type { MediaAsset } from '@/types/content'

function seconds(value: number) {
  const total = Math.max(0, Math.round(value))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function OwnSongPanel({
  asset,
  format,
  onMixed,
}: {
  asset: MediaAsset | null
  format: string
  onMixed: (previous: MediaAsset, next: MediaAsset) => void
}) {
  const { addSong } = useContent()
  const inputRef = useRef<HTMLInputElement>(null)
  const playerRef = useRef<HTMLAudioElement>(null)
  const [song, setSong] = useState<File | null>(null)
  const [songUrl, setSongUrl] = useState<string | null>(null)
  const [songLength, setSongLength] = useState(0)
  const [startSec, setStartSec] = useState(0)
  const [songVolume, setSongVolume] = useState(100)
  const [originalVolume, setOriginalVolume] = useState(30)
  const [lengthSec, setLengthSec] = useState(15)
  const [busy, setBusy] = useState<number | null>(null)
  const photo = asset?.kind === 'image'

  useEffect(() => () => { if (songUrl) URL.revokeObjectURL(songUrl) }, [songUrl])

  function pick(file: File | undefined) {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('The song file must be 50 MB or smaller.')
      return
    }
    setSong(file)
    setSongUrl(URL.createObjectURL(file))
    setStartSec(0)
    setSongLength(0)
  }

  async function apply() {
    if (!asset || !song) return
    setBusy(0)
    try {
      const result = await addSong(asset.id, song, {
        format,
        startSec: String(startSec),
        songVolume: String(songVolume),
        originalVolume: String(originalVolume),
        lengthSec: String(lengthSec),
      }, (percent) => setBusy(percent))
      if (result.errors.length > 0) {
        toast.error(result.errors[0])
        return
      }
      onMixed(asset, result.media)
      setSong(null)
      setSongUrl(null)
      toast.success(photo ? 'Song added. The photo is now a story video with the song.' : 'Song added. The preview now plays with the song.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The song could not be added.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"><Music className="h-4 w-4" /></span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Add your own song (MP3)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The song is mixed into the file itself, so it plays on Instagram and Facebook{photo ? ', and the photo becomes a short story video' : ''}. Instagram may mute songs it finds copyrighted.
          </p>
        </div>
      </div>
      {!asset ? <p className="text-sm text-muted-foreground">Upload the {format.endsWith('story') ? 'story photo or video' : 'video'} first.</p> : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,.mp3,.m4a,.aac,.wav"
            className="hidden"
            onChange={(event) => { pick(event.target.files?.[0]); event.target.value = '' }}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {song ? 'Choose a different song' : 'Choose song file'}
          </Button>
          {song && songUrl ? (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
              <p className="truncate text-sm font-medium">{song.name}</p>
              <audio
                ref={playerRef}
                src={songUrl}
                controls
                className="w-full"
                onLoadedMetadata={(event) => setSongLength(event.currentTarget.duration || 0)}
              />
              {songLength > 0 ? (
                <label className="block text-xs text-slate-600">
                  Start the song at {seconds(startSec)}
                  <input className="mt-1 w-full" type="range" min={0} max={Math.max(0, Math.floor(songLength) - 3)} value={startSec} onChange={(event) => setStartSec(Number(event.target.value))} />
                </label>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => setStartSec(Math.floor(playerRef.current?.currentTime ?? 0))}>
                Start from where the player is now
              </Button>
              <label className="block text-xs text-slate-600">
                Song volume {songVolume}
                <input className="mt-1 w-full" type="range" min={1} max={100} value={songVolume} onChange={(event) => setSongVolume(Number(event.target.value))} />
              </label>
              {photo ? (
                <label className="block text-xs text-slate-600">
                  Story length {lengthSec} seconds
                  <input className="mt-1 w-full" type="range" min={5} max={60} value={lengthSec} onChange={(event) => setLengthSec(Number(event.target.value))} />
                </label>
              ) : (
                <label className="block text-xs text-slate-600">
                  Original video sound {originalVolume === 0 ? 'off' : originalVolume}
                  <input className="mt-1 w-full" type="range" min={0} max={100} value={originalVolume} onChange={(event) => setOriginalVolume(Number(event.target.value))} />
                </label>
              )}
              <Button type="button" disabled={busy !== null} onClick={() => void apply()}>
                {busy !== null ? <><Loader2 className="h-4 w-4 animate-spin" /> {busy < 100 ? `Uploading ${busy}%` : 'Adding the song…'}</> : 'Add song to the file'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
