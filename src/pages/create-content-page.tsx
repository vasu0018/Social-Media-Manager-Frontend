import { CalendarClock, CirclePlay, Clapperboard, FilePen, Image as ImageIcon, ImagePlus, Send, Upload, Video, X } from 'lucide-react'
import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Hint, HintButton } from '@/components/shared/hint'
import { Field } from '@/components/shared/field'
import { SongPicker, type SongChoice } from '@/components/shared/song-picker'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { composerFormats, probeFile, validateLocalMedia } from '@/lib/formats'
import { formatInZone, zonedToUtc } from '@/lib/time'
import { timezones } from '@/data/mock'
import type { MediaAsset, Platform, SocialAccount } from '@/types/content'

const kinds = [
  { id: 'reel', label: 'Reel', hint: '9:16 vertical video', icon: Clapperboard, iconClass: 'text-rose-500' },
  { id: 'story', label: 'Story', hint: 'Full-screen photo or video', icon: CirclePlay, iconClass: 'text-violet-500' },
  { id: 'image', label: 'Feed image', hint: 'Square or portrait photo', icon: ImageIcon, iconClass: 'text-emerald-500' },
  { id: 'video', label: 'Feed video', hint: 'Feed video post', icon: Video, iconClass: 'text-sky-500' },
] as const

type Kind = (typeof kinds)[number]['id']

function formatId(kind: Kind, platform: Platform) {
  if (kind === 'reel') return platform === 'instagram' ? 'instagram_reel' : 'facebook_reel'
  if (kind === 'story') return platform === 'instagram' ? 'instagram_story' : 'facebook_story'
  if (kind === 'image') return platform === 'instagram' ? 'instagram_feed_image' : 'facebook_image'
  return platform === 'instagram' ? 'instagram_feed_video' : 'facebook_video'
}

function supportMessage(kind: Kind, platform: Platform, account: SocialAccount | undefined) {
  if (kind !== 'story') return null
  if (!account) return 'Not supported by current API integration until an eligible account is connected.'
  if (platform === 'instagram' && account.accountType !== 'BUSINESS') {
    return 'Not supported by current API integration. Instagram Stories publish only to Business accounts.'
  }
  if (platform === 'facebook' && account.eligible === false) {
    return account.eligibilityReason || 'Not supported by current API integration for this Page role.'
  }
  if (!account.connected || account.tokenStatus === 'expired' || account.tokenStatus === 'revoked') {
    return 'Not supported by current API integration until this account is reconnected.'
  }
  return platform === 'instagram'
    ? 'Instagram Stories are supported for this Business account.'
    : 'Facebook photo and video Stories are supported for this Page.'
}

function initialKind(story: boolean, value: string | null): Kind {
  if (story || value === 'story') return 'story'
  if (value === 'image' || value === 'video' || value === 'reel') return value
  return 'reel'
}

export function CreateContentPage({ story = false }: { story?: boolean }) {
  const [params, setParams] = useSearchParams()
  usePageTitle(story ? 'Create Story' : 'Create Content')
  const navigate = useNavigate()
  const { accounts, media, settings, saveContent, uploadMedia, refresh } = useContent()
  const [kind, setKind] = useState<Kind>(() => initialKind(story, params.get('kind')))
  const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({ instagram: true, facebook: false })
  const [accountIds, setAccountIds] = useState<Record<Platform, string>>({ instagram: '', facebook: '' })
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [firstComment, setFirstComment] = useState('')
  const [song, setSong] = useState<SongChoice | null>(null)
  const [batch, setBatch] = useState<MediaAsset[]>([])
  const [mediaId, setMediaId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Kolkata')
  const [errors, setErrors] = useState<string[]>([])
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [captionError, setCaptionError] = useState<string | null>(null)
  const [hashtagError, setHashtagError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [confirm, setConfirm] = useState<'publish' | 'schedule' | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (params.get('connected') !== 'facebook') return
    toast.success('Facebook Page connected. Songs load for the Instagram account that Page owns.')
    void refresh()
    const next = new URLSearchParams(params)
    next.delete('connected')
    setParams(next, { replace: true })
  }, [params, refresh, setParams])

  const selected = (['instagram', 'facebook'] as const).filter((platform) => platforms[platform])
  const songEnabled = (kind === 'reel' || kind === 'video') && platforms.instagram
  const formats = selected.map((platform) => composerFormats.find((entry) => entry.id === formatId(kind, platform))!)
  const asset = batch.find((entry) => entry.id === mediaId) ?? batch[0] ?? media.find((entry) => entry.id === mediaId) ?? null
  const firstCommentAllowed = formats.some((format) => format.firstComment)
  const scheduledAt = date && time ? zonedToUtc(date, time, timezone) : null
  const nextRun = scheduledAt ? `${formatInZone(scheduledAt.toISOString(), timezone)} (${timezone})` : null

  const previewCaption = useMemo(() => [caption.trim(), hashtags.trim()].filter(Boolean).join('\n\n'), [caption, hashtags])

  function accountProblem(account: SocialAccount, platform: Platform) {
    const blocked = supportMessage(kind, platform, account)
    if (kind === 'story' && blocked?.startsWith('Not supported')) return blocked
    if (!account.connected) return 'Disconnected'
    if (account.tokenStatus === 'expired' || account.tokenStatus === 'revoked') return 'Reconnect required'
    if (account.eligible === false) return account.eligibilityReason || 'Not eligible'
    return null
  }

  async function onFiles(files: File[]) {
    if (files.length === 0) return
    setErrors([])
    const active = selected.length > 0 ? selected : (['instagram'] as const)
    const accepted: MediaAsset[] = []
    const problems: string[] = []
    setProgress(0)
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        if (!file) continue
        if (file.size > 300 * 1024 * 1024) {
          problems.push(`${file.name}: Files must be 300 MB or smaller.`)
          continue
        }
        try {
          const probe = await probeFile(file)
          const localErrors = [...new Set(active.flatMap((platform) => validateLocalMedia(formatId(kind, platform), probe)))]
          if (localErrors.length > 0) {
            problems.push(`${file.name}: ${localErrors[0]}`)
            continue
          }
          const uploaded = await uploadMedia(file, formatId(kind, active[0] ?? 'instagram'), (percent) => {
            setProgress(Math.round(((index + percent / 100) / files.length) * 100))
          })
          if (uploaded.errors.length > 0) {
            problems.push(`${file.name}: ${uploaded.errors[0]}`)
            continue
          }
          accepted.push(uploaded.media)
        } catch (error) {
          problems.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`)
        }
      }
      if (accepted.length > 0) {
        setBatch((current) => {
          const next = [...current]
          for (const item of accepted) {
            if (!next.some((entry) => entry.id === item.id)) next.push(item)
          }
          return next
        })
        setMediaId((current) => current ?? accepted[0]?.id ?? null)
        const firstName = accepted[0]?.name ?? ''
        setTitle((current) => current.trim() || firstName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 120))
      }
      setErrors(problems)
    } finally {
      setProgress(null)
    }
  }

  function preparedHashtags() {
    return [...new Set(
      hashtags.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
    )]
  }

  function validate(action: 'draft' | 'schedule' | 'publish') {
    setFieldError(null)
    setCaptionError(null)
    setHashtagError(null)
    const tags = preparedHashtags()
    const needsCopy = kind !== 'story'
    if (action !== 'draft' && needsCopy && !caption.trim()) {
      setCaptionError(kind === 'reel' ? 'Write the caption that should appear on this reel.' : 'Write the caption for this post.')
      return false
    }
    if (action !== 'draft' && needsCopy && tags.length === 0) {
      setHashtagError(kind === 'reel' ? 'Add the hashtags for this reel, such as #studio #reel.' : 'Add the hashtags for this post, such as #studio #reel.')
      return false
    }
    if (selected.includes('instagram') && tags.length > 30) {
      setHashtagError('Instagram allows up to 30 hashtags.')
      return false
    }
    if (title.trim().length < 2) {
      setFieldError('Enter an internal title with at least 2 characters.')
      return false
    }
    if (action !== 'draft' && selected.length === 0) {
      setFieldError('Select at least one platform.')
      return false
    }
    if (action !== 'draft') {
      for (const platform of selected) {
        const account = accounts.find((entry) => entry.id === accountIds[platform])
        if (!account) {
          setFieldError(`Choose an eligible ${platform === 'instagram' ? 'Instagram' : 'Facebook'} account.`)
          return false
        }
        const problem = accountProblem(account, platform)
        if (problem) {
          setFieldError(problem)
          return false
        }
      }
      if (batch.length === 0) {
        setFieldError(errors[0] ?? 'Upload a file that meets every selected platform.')
        return false
      }
    }
    if (action === 'schedule' && !scheduledAt) {
      setFieldError('Choose a publication date, time, and timezone.')
      return false
    }
    if (scheduledAt && scheduledAt.getTime() < Date.now() + 60_000 && action === 'schedule') {
      setFieldError('Choose a time at least a minute from now.')
      return false
    }
    return true
  }

  async function submit(action: 'draft' | 'schedule' | 'publish') {
    if (!validate(action)) {
      setConfirm(null)
      return
    }
    setSaving(true)
    try {
      const files = batch.length > 0 ? batch : [null]
      for (const file of files) {
        const fileTitle = file && files.length > 1
          ? `${title.trim()} · ${file.name.replace(/\.[^.]+$/, '')}`.slice(0, 120)
          : title.trim()
        await saveContent({
          title: fileTitle,
          caption: caption.trim(),
          hashtags: preparedHashtags().join(' '),
          firstComment: firstCommentAllowed ? firstComment.trim() || null : null,
          audio: songEnabled ? song : null,
          destinations: selected.map((platform) => ({
            platform,
            accountId: accountIds[platform],
            format: formatId(kind, platform),
          })),
          mediaId: file?.id ?? null,
          action,
          scheduledAt: action === 'schedule' && scheduledAt ? scheduledAt.toISOString() : null,
          timezone,
        })
      }
      const countLabel = files.length > 1 ? `${files.length} posts` : 'This post'
      if (action === 'publish') toast(`${countLabel} ${files.length > 1 ? 'are' : 'is'} publishing on the server. A result appears when Meta confirms it.`)
      else toast.success(action === 'draft' ? (files.length > 1 ? `${files.length} drafts saved` : 'Draft saved') : `${countLabel} scheduled for ${nextRun}`)
      navigate(action === 'draft' ? '/content' : action === 'schedule' ? '/scheduled' : '/history')
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Could not save this content.')
    } finally {
      setSaving(false)
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={story ? 'Upload a story' : 'Upload a reel or story'}
        description="The file is already made. Drop it here, choose Instagram, Facebook, or both, then publish now or pick a time."
      />
      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-4">
          {story ? null : (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <StepLabel n={1} title="Choose a reel, story, or post" />
            <div className="grid gap-3 sm:grid-cols-2">
              {kinds.map((entry) => {
                const Icon = entry.icon
                const active = kind === entry.id
                return (
                  <Hint key={entry.id} className="w-full" detail={`${entry.label}: ${entry.hint}. Hover explains the choice. Click to select it before you upload.`}>
                  <button
                    type="button"
                    onClick={() => { setKind(entry.id); setErrors([]) }}
                    className={`w-full rounded-xl border-2 bg-white p-3.5 text-left ${active ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <Icon className={`mb-2 h-5 w-5 ${entry.iconClass}`} />
                    <span className="block text-sm font-semibold">{entry.label}</span>
                    <span className="block text-xs opacity-80">{entry.hint}</span>
                  </button>
                  </Hint>
                )
              })}
            </div>
            </section>
          )}
          <div className="space-y-1.5">
            <StepLabel n={story ? 1 : 2} title="Add the finished file" />
            <label
              htmlFor="media-file"
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event: DragEvent<HTMLLabelElement>) => {
                event.preventDefault()
                setDragging(false)
                void onFiles([...event.dataTransfer.files])
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-12 text-center ${dragging ? 'border-primary bg-blue-50' : 'border-blue-200 bg-white'}`}
            >
              <Upload className="mb-2 h-6 w-6 text-primary" />
              <span className="text-sm font-semibold">Drop one or more finished {kind === 'story' ? 'stories' : `${kind}s`} here</span>
              <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, MP4, or MOV. Several files become separate posts with the same caption.</span>
              <input id="media-file" type="file" multiple className="sr-only" accept="image/jpeg,image/png,video/mp4,video/quicktime" onChange={(event) => {
                const files = [...(event.target.files ?? [])]
                event.target.value = ''
                void onFiles(files)
              }} />
            </label>
            {progress !== null ? (
              <div aria-live="polite">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
                <p className="text-xs text-muted-foreground">Uploading {progress}%</p>
              </div>
            ) : null}
            {batch.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm">{batch.length === 1 ? `Selected: ${batch[0]?.name} · ${batch[0]?.sizeLabel}` : `${batch.length} files selected. Each one is published separately.`}</p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {batch.map((item) => (
                    <li key={item.id} className="space-y-1">
                      <button type="button" onClick={() => setMediaId(item.id)} className={`block aspect-square w-full overflow-hidden rounded-lg border bg-slate-100 ${item.id === asset?.id ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'}`} aria-label={`Preview ${item.name}`}>
                        {item.kind === 'video'
                          ? <video src={item.src ?? undefined} className="h-full w-full object-cover" muted />
                          : <img src={item.src ?? undefined} alt="" className="h-full w-full object-cover" />}
                      </button>
                      <button type="button" className="text-xs font-medium text-slate-600" onClick={() => {
                        setBatch((current) => current.filter((entry) => entry.id !== item.id))
                        setMediaId((current) => current === item.id ? null : current)
                      }}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {errors.length > 0 ? <ul className="space-y-1 text-sm text-destructive" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <StepLabel n={story ? 2 : 3} title={kind === 'story' ? 'Caption and hashtags' : kind === 'reel' ? 'Caption and hashtags for this reel' : 'Caption and hashtags for this post'} />
              <p className="text-xs text-muted-foreground">
                {kind === 'story'
                  ? 'Stories publish the file itself. A caption is not sent with an Instagram or Facebook Story.'
                  : 'This text is published with the file. Hashtags are placed after the caption.'}
              </p>
            </div>
            <Field label="Caption" htmlFor="caption" error={captionError ?? undefined} hint={kind === 'story' ? 'Optional for Stories.' : 'Required before you schedule or publish.'}>
              <Textarea id="caption" value={caption} rows={5} maxLength={2200} onChange={(event) => { setCaption(event.target.value); setCaptionError(null) }} placeholder={kind === 'reel' ? 'Write what should appear under the reel' : 'Write the caption'} />
            </Field>
            <Field
              label="Hashtags"
              htmlFor="hashtags"
              error={hashtagError ?? undefined}
              hint={selected.includes('instagram') ? `${preparedHashtags().length}/30 hashtags. Words without # are converted for you.` : 'Words without # are converted for you.'}
            >
              <Input id="hashtags" value={hashtags} onChange={(event) => { setHashtags(event.target.value); setHashtagError(null) }} placeholder="#studio #reel #behindthescenes" />
            </Field>
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium"><StepLabel n={story ? 3 : 4} title="Choose Instagram, Facebook, or both" /></legend>
            {(['instagram', 'facebook'] as const).map((platform) => {
              const format = composerFormats.find((entry) => entry.id === formatId(kind, platform))
              const choices = accounts.filter((account) => account.platform === platform)
              const account = choices.find((entry) => entry.id === accountIds[platform])
              const note = supportMessage(kind, platform, account)
              return (
                <div key={platform} className="rounded-xl border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={platforms[platform]}
                      onChange={(event) => setPlatforms((current) => ({ ...current, [platform]: event.target.checked }))}
                    />
                    {platform === 'instagram' ? 'Instagram' : 'Facebook'}
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">{format?.note}</p>
                  {platforms[platform] ? (
                    <NativeSelect
                      className="mt-3"
                      aria-label={`${platform} account`}
                      value={accountIds[platform]}
                      onChange={(event) => setAccountIds((current) => ({ ...current, [platform]: event.target.value }))}
                    >
                      <option value="">Select account</option>
                      {choices.map((entry) => {
                        const problem = accountProblem(entry, platform)
                        return <option key={entry.id} value={entry.id} disabled={Boolean(problem)}>{entry.name} {problem ? `— ${problem}` : ''}</option>
                      })}
                    </NativeSelect>
                  ) : null}
                  {platforms[platform] && note ? (
                    <p className={`mt-2 text-sm ${note.startsWith('Not supported') ? 'text-amber-800' : 'text-emerald-800'}`} role="status">{note}</p>
                  ) : null}
                </div>
              )
            })}
          </fieldset>
          <SongPicker accountId={accountIds.instagram} enabled={songEnabled} facebookToo={platforms.facebook} value={song} onChange={setSong} />
          <Field label="Title" htmlFor="title" hint="Internal only. This is not sent to Instagram or Facebook." error={fieldError && title.trim().length < 2 ? fieldError : undefined}>
            <Input id="title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          {firstCommentAllowed ? (
            <Field label="First comment" htmlFor="comment" hint="Optional, and only sent to Instagram when comment permission was granted.">
              <Textarea id="comment" value={firstComment} rows={3} maxLength={2200} onChange={(event) => setFirstComment(event.target.value)} />
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">A first comment is available for Instagram feed posts and Reels. Stories do not send one.</p>
          )}
          <div className="space-y-3">
            <StepLabel n={story ? 4 : 5} title="Pick a time if this should wait" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Publication date" htmlFor="date"><Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
            <Field label="Publication time" htmlFor="time"><Input id="time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Field>
            <Field label="Timezone" htmlFor="zone">
              <NativeSelect id="zone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {timezones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
              </NativeSelect>
            </Field>
          </div>
          </div>
          {nextRun ? <p className="text-sm" role="status">Next scheduled execution: {nextRun}. Stored in UTC as {scheduledAt?.toISOString()}.</p> : null}
          {fieldError && title.trim().length >= 2 ? <p className="text-sm text-destructive" role="alert">{fieldError}</p> : null}
          <div className="sticky bottom-4 z-10 flex flex-wrap gap-2 rounded-2xl border bg-white/95 p-3 shadow-[0_12px_40px_rgba(36,27,69,0.12)] backdrop-blur">
            <HintButton type="button" disabled={saving} detail="Checks the file, account, caption, and hashtags, then sends it now. It is marked published only after Meta confirms it." onClick={() => { if (validate('publish')) setConfirm('publish') }}><Send className="h-4 w-4" /> Publish Now</HintButton>
            <HintButton type="button" variant="outline" disabled={saving} detail="Saves the caption, hashtags, and time. The server posts it then, even if you close this site." onClick={() => { if (validate('schedule')) setConfirm('schedule') }}><CalendarClock className="h-4 w-4" /> Schedule</HintButton>
            <HintButton type="button" variant="outline" disabled={saving} detail="Keeps this in the workspace. Nothing is sent to Instagram or Facebook." onClick={() => void submit('draft')}><FilePen className="h-4 w-4" /> Save Draft</HintButton>
            <HintButton type="button" variant="ghost" detail="Closes this screen. Anything you have not saved is discarded." onClick={() => navigate(story ? '/stories' : '/content')}><X className="h-4 w-4" /> Cancel</HintButton>
          </div>
        </div>
        <div className="space-y-4">
          {(selected.length > 0 ? selected : (['instagram'] as const)).map((platform) => (
            <Card key={platform}>
              <CardHeader><CardTitle>{platform === 'instagram' ? 'Instagram preview' : 'Facebook preview'}</CardTitle></CardHeader>
              <CardContent>
                {platform === 'instagram'
                  ? <InstagramPreview story={kind === 'story' || kind === 'reel'} caption={previewCaption} asset={asset} />
                  : <FacebookPreview caption={previewCaption} asset={asset} name={accounts.find((account) => account.id === accountIds.facebook)?.name ?? 'Facebook Page'} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </form>
      <ConfirmDialog
        open={confirm === 'publish'}
        onOpenChange={(open) => { if (!open) setConfirm(null) }}
        title="Publish this now?"
        description={`Caption: ${caption.trim() || 'None'}\nHashtags: ${preparedHashtags().join(' ') || 'None'}\n\nReel Studio will create ${selected.length === 2 ? 'a separate publishing job for Instagram and Facebook' : 'one publishing job'}. Success is shown only after Meta confirms publication.`}
        confirmLabel="Publish Now"
        onConfirm={() => void submit('publish')}
      />
      <ConfirmDialog
        open={confirm === 'schedule'}
        onOpenChange={(open) => { if (!open) setConfirm(null) }}
        title="Confirm this schedule?"
        description={nextRun ? `Caption: ${caption.trim() || 'None'}\nHashtags: ${preparedHashtags().join(' ') || 'None'}\n\nThe server will publish at ${nextRun}, even if this browser is closed.` : 'Choose a schedule time.'}
        confirmLabel="Schedule"
        onConfirm={() => void submit('schedule')}
      />
    </div>
  )
}

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">{n}. {title}</span>
  )
}

function InstagramPreview({ story, caption, asset }: { story: boolean; caption: string; asset: MediaAsset | null }) {
  return (
    <div className={`mx-auto overflow-hidden rounded-[28px] border bg-black text-white shadow-sm ${story ? 'relative aspect-[9/16] w-full max-w-[260px]' : 'w-full max-w-[320px]'}`}>
      <div className={story ? 'absolute inset-0' : 'relative aspect-square'}>
        <PreviewMedia asset={asset} />
      </div>
      {story ? null : <p className="max-h-28 overflow-hidden whitespace-pre-wrap bg-black px-3 py-2 text-xs">{caption || 'Caption preview'}</p>}
    </div>
  )
}

function FacebookPreview({ caption, asset, name }: { caption: string; asset: MediaAsset | null; name: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">{name.slice(0, 1)}</span>
        <span className="text-sm font-semibold">{name}</span>
      </div>
      <p className="whitespace-pre-wrap px-3 pb-2 text-sm">{caption || 'Caption preview'}</p>
      <div className="relative aspect-video bg-slate-950"><PreviewMedia asset={asset} /></div>
    </div>
  )
}

function PreviewMedia({ asset }: { asset: MediaAsset | null }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [asset?.id, asset?.src])
  if (!asset?.src || failed) {
    return <div className="flex h-full min-h-40 w-full items-center justify-center bg-slate-900 text-slate-400"><ImagePlus className="h-6 w-6" /></div>
  }
  if (asset.kind === 'video') {
    return <video src={asset.src} className="h-full w-full bg-black object-contain" muted controls playsInline onError={() => setFailed(true)} />
  }
  return <img src={asset.src} alt="" className="h-full w-full bg-black object-contain" onError={() => setFailed(true)} />
}
