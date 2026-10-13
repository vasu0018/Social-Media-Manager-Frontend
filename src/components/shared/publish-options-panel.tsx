import { Globe2, Lock, MapPin, MessageCircleOff, Tag, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PlacePicker } from '@/components/shared/place-picker'
import { normalizeHandle, TagInput } from '@/components/shared/tag-input'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { countries, countryName } from '@/lib/countries'
import type { FacebookOptions, InstagramOptions, Platform, PublishOptions } from '@/types/content'

type Kind = 'reel' | 'story' | 'image' | 'video'

export const facebookAgeLimits = [13, 15, 17, 18, 19, 21, 25, 65]

export function PublishOptionsPanel({
  kind,
  selected,
  value,
  onChange,
  songChosen,
  activeTag,
  onActiveTag,
  step,
}: {
  kind: Kind
  selected: Platform[]
  value: PublishOptions
  onChange: (next: PublishOptions) => void
  songChosen: boolean
  activeTag: number | null
  onActiveTag: (index: number | null) => void
  step: number
}) {
  const instagram = value.instagram ?? {}
  const facebook = value.facebook ?? {}
  const setInstagram = (patch: Partial<InstagramOptions>) => onChange({ ...value, instagram: { ...instagram, ...patch } })
  const setFacebook = (patch: Partial<FacebookOptions>) => onChange({ ...value, facebook: { ...facebook, ...patch } })

  if (selected.length === 0) return null

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">{step}. Post details</span>
        <p className="text-xs text-muted-foreground">The same choices Meta Business Suite offers for this post type. Options that Meta does not allow apps to set are explained instead of hidden.</p>
      </div>
      {selected.includes('instagram') ? (
        <InstagramSection kind={kind} options={instagram} onChange={setInstagram} songChosen={songChosen} activeTag={activeTag} onActiveTag={onActiveTag} />
      ) : null}
      {selected.includes('facebook') ? <FacebookSection kind={kind} options={facebook} onChange={setFacebook} /> : null}
    </section>
  )
}

function Group({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">{icon}{title}</p>
      {children}
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{children}</p>
}

function ToggleRow({ id, label, detail, checked, onCheckedChange, disabled }: { id: string; label: string; detail: string; checked: boolean; onCheckedChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function InstagramSection({
  kind,
  options,
  onChange,
  songChosen,
  activeTag,
  onActiveTag,
}: {
  kind: Kind
  options: InstagramOptions
  onChange: (patch: Partial<InstagramOptions>) => void
  songChosen: boolean
  activeTag: number | null
  onActiveTag: (index: number | null) => void
}) {
  const [tagError, setTagError] = useState<string | null>(null)
  const [collabError, setCollabError] = useState<string | null>(null)
  const tags = options.userTags ?? []

  if (kind === 'story') {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Instagram</p>
        <Note>Instagram Stories published through Meta's API cannot carry a location, people tags, links, stickers, or a Close Friends audience. They are shared with everyone who can see your Stories.</Note>
      </div>
    )
  }

  const reel = kind === 'reel' || kind === 'video'

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Instagram</p>
      <Group title="Add location" icon={<MapPin className="h-4 w-4 text-rose-500" />}>
        <PlacePicker id="ig-location" value={options.location} onChange={(location) => onChange({ location })} />
      </Group>

      <Group title="Tag people" icon={<Tag className="h-4 w-4 text-indigo-500" />}>
        <TagInput
          id="ig-tags"
          values={tags.map((tag) => tag.username)}
          max={20}
          placeholder="Type an Instagram username and press Enter"
          invalidMessage="Use a public Instagram username."
          normalize={normalizeHandle}
          onInvalid={setTagError}
          chipClass="bg-indigo-50 text-indigo-700"
          onChange={(names) => {
            onChange({ userTags: names.map((username) => tags.find((tag) => tag.username === username) ?? { username }) })
            if (activeTag != null && activeTag >= names.length) onActiveTag(null)
          }}
        />
        {tagError ? <p className="text-xs text-destructive">{tagError}</p> : null}
        {kind === 'image' && tags.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pick a name, then click the photo in the Instagram preview where that person is.</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, index) => (
                <button
                  key={tag.username}
                  type="button"
                  onClick={() => onActiveTag(activeTag === index ? null : index)}
                  className={`rounded-md border px-2 py-1 text-xs ${activeTag === index ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  @{tag.username} {tag.x != null ? '· placed' : '· tap photo'}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {reel && tags.length > 0 ? <p className="text-xs text-muted-foreground">On Reels, tagged people are listed with the Reel instead of pinned to a spot.</p> : null}
        <p className="text-xs text-muted-foreground">Tagged accounts must be public. Instagram rejects the post if a username does not exist.</p>
      </Group>

      <Group title="Invite collaborators" icon={<Users className="h-4 w-4 text-sky-600" />}>
        <TagInput
          id="ig-collaborators"
          values={options.collaborators ?? []}
          max={3}
          placeholder="Up to 3 Instagram usernames"
          invalidMessage="Use a public Instagram username."
          normalize={normalizeHandle}
          onInvalid={setCollabError}
          chipClass="bg-sky-50 text-sky-700"
          onChange={(collaborators) => onChange({ collaborators })}
        />
        {collabError ? <p className="text-xs text-destructive">{collabError}</p> : null}
        <p className="text-xs text-muted-foreground">Each person gets an invite in Instagram. Once they accept, the post shows on both profiles.</p>
      </Group>

      {reel ? (
        <Group title="Reel settings" icon={<Globe2 className="h-4 w-4 text-emerald-600" />}>
          {kind === 'reel' ? (
            <ToggleRow
              id="ig-share-feed"
              label="Also share to Feed"
              detail="When on, the Reel also appears in your main profile grid and followers' Feed."
              checked={options.shareToFeed ?? true}
              disabled={options.trialReel != null && options.trialReel !== 'off'}
              onCheckedChange={(shareToFeed) => onChange({ shareToFeed })}
            />
          ) : <Note>Feed videos are published as Reels that are also shared to Feed.</Note>}
          <div className="space-y-1">
            <Label htmlFor="ig-trial">Trial reel</Label>
            <NativeSelect
              id="ig-trial"
              value={options.trialReel ?? 'off'}
              onChange={(event) => {
                const trialReel = event.target.value as InstagramOptions['trialReel']
                onChange({ trialReel, ...(trialReel !== 'off' ? { shareToFeed: false } : {}) })
              }}
            >
              <option value="off">Off: share with followers</option>
              <option value="MANUAL">Trial: show to non-followers, share with followers later yourself</option>
              <option value="SS_PERFORMANCE">Trial: show to non-followers, share automatically if it performs well</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ig-audio-name">Rename audio</Label>
            <Input
              id="ig-audio-name"
              value={options.audioName ?? ''}
              maxLength={100}
              disabled={songChosen}
              placeholder={songChosen ? 'The chosen song keeps its own name' : 'Name for the Reel original audio'}
              onChange={(event) => onChange({ audioName: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">Instagram lets you name the original audio only once.</p>
          </div>
        </Group>
      ) : null}

      <Group title="Accessibility" icon={<Tag className="h-4 w-4 text-slate-500" />}>
        <Label htmlFor="ig-alt">Alt text</Label>
        <Textarea id="ig-alt" rows={2} maxLength={1000} value={options.altText ?? ''} placeholder="Describe the photo or video for people who use screen readers" onChange={(event) => onChange({ altText: event.target.value })} />
      </Group>

      <Group title="Comments and visibility" icon={<MessageCircleOff className="h-4 w-4 text-slate-600" />}>
        <ToggleRow
          id="ig-comments-off"
          label="Turn off commenting"
          detail="Nobody can comment. You can turn comments back on in the Instagram app."
          checked={options.commentsOff ?? false}
          onCheckedChange={(commentsOff) => onChange({ commentsOff })}
        />
        <Note>
          Posts from a Business account are public. Meta's API does not let apps hide like and view counts, post to Close Friends, or limit who can see a post; change those in the Instagram app after publishing.
        </Note>
      </Group>
    </div>
  )
}

function FacebookSection({ kind, options, onChange }: { kind: Kind; options: FacebookOptions; onChange: (patch: Partial<FacebookOptions>) => void }) {
  const countriesChosen = options.countries ?? []
  const restricted = countriesChosen.length > 0 || Boolean(options.ageMin)
  const [choice, setAudience] = useState<'public' | 'restricted'>(restricted ? 'restricted' : 'public')
  const audience = restricted ? 'restricted' : choice
  const supportsAudience = kind === 'image' || kind === 'video'

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Facebook</p>

      {supportsAudience ? (
        <Group title="Audience" icon={audience === 'public' ? <Globe2 className="h-4 w-4 text-blue-600" /> : <Lock className="h-4 w-4 text-amber-600" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${audience === 'public' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
              <input type="radio" name="fb-audience" className="mt-1" checked={audience === 'public'} onChange={() => { setAudience('public'); onChange({ countries: [], ageMin: null }) }} />
              <span><span className="block font-medium">Public</span><span className="text-xs text-muted-foreground">Anyone on or off Facebook</span></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${audience === 'restricted' ? 'border-amber-600 bg-amber-50' : 'border-slate-200'}`}>
              <input type="radio" name="fb-audience" className="mt-1" checked={audience === 'restricted'} onChange={() => setAudience('restricted')} />
              <span><span className="block font-medium">Restricted</span><span className="text-xs text-muted-foreground">Only people in chosen countries or above an age</span></span>
            </label>
          </div>
          {audience === 'restricted' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="fb-country">Countries</Label>
                <NativeSelect
                  id="fb-country"
                  value=""
                  onChange={(event) => {
                    const code = event.target.value
                    if (code && !countriesChosen.includes(code) && countriesChosen.length < 25) onChange({ countries: [...countriesChosen, code] })
                  }}
                >
                  <option value="">Add a country…</option>
                  {countries.filter((country) => !countriesChosen.includes(country.code)).map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                </NativeSelect>
                {countriesChosen.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {countriesChosen.map((code) => (
                      <button key={code} type="button" className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800" onClick={() => onChange({ countries: countriesChosen.filter((entry) => entry !== code) })} aria-label={`Remove ${countryName(code)}`}>
                        {countryName(code)} ×
                      </button>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No country chosen: every country can see it.</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fb-age">Minimum age</Label>
                <NativeSelect id="fb-age" value={options.ageMin ? String(options.ageMin) : ''} onChange={(event) => onChange({ ageMin: event.target.value ? Number(event.target.value) : null })}>
                  <option value="">Any age</option>
                  {facebookAgeLimits.map((age) => <option key={age} value={age}>{age}+</option>)}
                </NativeSelect>
              </div>
            </div>
          ) : null}
        </Group>
      ) : (
        <Note>Facebook {kind === 'reel' ? 'Reels' : 'Stories'} are always public. Meta's API does not allow an audience limit, location, or tags on them.</Note>
      )}

      {kind === 'image' ? (
        <Group title="Check in" icon={<MapPin className="h-4 w-4 text-rose-500" />}>
          <PlacePicker id="fb-place" value={options.place} onChange={(place) => onChange({ place })} />
        </Group>
      ) : null}

      {kind === 'video' ? (
        <Group title="Video title" icon={<Tag className="h-4 w-4 text-slate-500" />}>
          <Input id="fb-title" value={options.videoTitle ?? ''} maxLength={255} placeholder="Shown above the video on Facebook" onChange={(event) => onChange({ videoTitle: event.target.value })} />
        </Group>
      ) : null}

      {kind === 'image' ? (
        <Group title="Accessibility" icon={<Tag className="h-4 w-4 text-slate-500" />}>
          <Label htmlFor="fb-alt">Alt text</Label>
          <Textarea id="fb-alt" rows={2} maxLength={1000} value={options.altText ?? ''} placeholder="Describe the photo for people who use screen readers" onChange={(event) => onChange({ altText: event.target.value })} />
        </Group>
      ) : null}

      {kind === 'story' ? null : (
        <Note>
          Hashtags from the Hashtags box are added to the Facebook post. Meta's API does not let a Page tag people, add a feeling or activity, or change comment settings; do those in Meta Business Suite after publishing.
        </Note>
      )}
    </div>
  )
}
