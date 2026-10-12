import type { Platform } from '@/types/content'

export type ComposerFormat = {
  id: string
  label: string
  platform: Platform
  kind: 'image' | 'video' | 'either'
  note: string
  firstComment: boolean
}

export const composerFormats: ComposerFormat[] = [
  { id: 'instagram_reel', label: 'Instagram Reel', platform: 'instagram', kind: 'video', firstComment: true, note: 'MP4 or MOV, 3 seconds to 15 minutes, up to 300 MB. 9:16 is recommended.' },
  { id: 'instagram_story', label: 'Instagram Story', platform: 'instagram', kind: 'either', firstComment: false, note: 'Business accounts only. JPEG, PNG, WebP, or GIF up to 8 MB, or video from 3 to 60 seconds up to 100 MB.' },
  { id: 'instagram_feed_image', label: 'Instagram Feed Image', platform: 'instagram', kind: 'image', firstComment: true, note: 'JPEG only, up to 8 MB. Aspect ratio from 4:5 to 1.91:1, width 320 to 1440.' },
  { id: 'instagram_feed_video', label: 'Instagram Feed Video', platform: 'instagram', kind: 'video', firstComment: true, note: 'Published through the Reel API with sharing to the feed. MP4 or MOV, 3 seconds to 15 minutes.' },
  { id: 'facebook_reel', label: 'Facebook Reel', platform: 'facebook', kind: 'video', firstComment: false, note: '9:16 MP4 or MOV, at least 540×960, 3 to 90 seconds, up to 300 MB.' },
  { id: 'facebook_story', label: 'Facebook Story', platform: 'facebook', kind: 'either', firstComment: false, note: '9:16 photo (JPEG, PNG, WebP, GIF) or video. Video stories are 3 to 60 seconds and at least 540×960.' },
  { id: 'facebook_image', label: 'Facebook Image Post', platform: 'facebook', kind: 'image', firstComment: false, note: 'JPEG or PNG, up to 10 MB, at least 320 pixels wide.' },
  { id: 'facebook_video', label: 'Facebook Video Post', platform: 'facebook', kind: 'video', firstComment: false, note: 'MP4 or MOV, up to 300 MB.' },
]

export type LocalProbe = {
  kind: 'image' | 'video'
  mime: string
  bytes: number
  width: number | null
  height: number | null
  durationMs: number | null
}

const mb = (value: number) => value * 1024 * 1024

export function validateLocalMedia(formatId: string, probe: LocalProbe) {
  const format = composerFormats.find((entry) => entry.id === formatId)
  const errors: string[] = []
  if (!format) return ['Choose a content type.']
  if (format.kind !== 'either' && probe.kind !== format.kind) errors.push(`${format.label} needs a ${format.kind} file.`)
  if (format.id === 'instagram_feed_image') {
    if (probe.mime !== 'image/jpeg') errors.push('Instagram feed images must be JPEG.')
    if (probe.bytes > mb(8)) errors.push('Instagram images must be 8 MB or smaller.')
  }
  if (format.id === 'instagram_story' && probe.kind === 'image') {
    if (!probe.mime.startsWith('image/')) errors.push('Instagram Stories accept a photo or a video.')
    if (probe.bytes > mb(8)) errors.push('Instagram story photos must be 8 MB or smaller.')
  }
  if (format.id === 'instagram_feed_image' && probe.width && probe.height) {
    const aspect = probe.width / probe.height
    if (probe.width < 320 || probe.width > 1440) errors.push('Instagram feed images must be between 320 and 1440 pixels wide.')
    if (aspect < 0.79 || aspect > 1.92) errors.push('Use an aspect ratio between 4:5 and 1.91:1.')
  }
  if (format.id === 'facebook_image') {
    if (probe.mime !== 'image/jpeg' && probe.mime !== 'image/png') errors.push('Facebook image posts accept JPEG or PNG.')
    if (probe.bytes > mb(10)) errors.push('Facebook images must be 10 MB or smaller.')
    if (probe.width && probe.width < 320) errors.push('Width must be at least 320 pixels.')
  }
  if (probe.kind === 'video') {
    if (probe.mime !== 'video/mp4' && probe.mime !== 'video/quicktime') errors.push('Videos must be MP4 or MOV.')
    if (probe.durationMs == null) errors.push('The video duration could not be read.')
  }
  const videoRules: Record<string, { min: number; max: number; bytes: number }> = {
    instagram_reel: { min: 3, max: 900, bytes: mb(300) },
    instagram_feed_video: { min: 3, max: 900, bytes: mb(300) },
    instagram_story: { min: 3, max: 60, bytes: mb(100) },
    facebook_reel: { min: 3, max: 90, bytes: mb(300) },
    facebook_story: { min: 3, max: 60, bytes: mb(100) },
    facebook_video: { min: 1, max: 1200, bytes: mb(300) },
  }
  const rule = videoRules[format.id]
  if (probe.kind === 'video' && rule && probe.durationMs != null) {
    const seconds = probe.durationMs / 1000
    if (seconds < rule.min) errors.push(`${format.label} must be at least ${rule.min} seconds.`)
    if (seconds > rule.max) errors.push(`${format.label} must be ${rule.max} seconds or shorter.`)
    if (probe.bytes > rule.bytes) errors.push(`${format.label} must be ${Math.round(rule.bytes / (1024 * 1024))} MB or smaller.`)
    if ((format.id === 'facebook_reel' || format.id === 'facebook_story') && probe.width && probe.height) {
      if (probe.width < 540 || probe.height < 960) errors.push('Use a frame at least 540×960.')
      const aspect = probe.width / probe.height
      if (Math.abs(aspect - 9 / 16) > (format.id === 'facebook_story' ? 0.06 : 0.03)) errors.push('Facebook Reels and video Stories need a 9:16 frame.')
    }
    if ((format.id === 'instagram_reel' || format.id === 'instagram_feed_video') && probe.width && probe.width > 1920) {
      errors.push('Width must be 1920 pixels or less.')
    }
  }
  if (format.id === 'facebook_story' && probe.kind === 'image') {
    if (!probe.mime.startsWith('image/')) errors.push('Facebook photo Stories accept a photo file.')
    if (probe.width && probe.height && Math.abs(probe.width / probe.height - 9 / 16) > 0.06) errors.push('Facebook photo Stories need a 9:16 frame.')
    if (probe.bytes > mb(100)) errors.push('Facebook Stories must be 100 MB or smaller.')
  }
  return errors
}

export async function probeFile(file: File): Promise<LocalProbe> {
  const lower = file.name.toLowerCase()
  const mime = file.type
    || (lower.endsWith('.mov') ? 'video/quicktime'
      : lower.endsWith('.png') ? 'image/png'
        : lower.endsWith('.webp') ? 'image/webp'
          : lower.endsWith('.gif') ? 'image/gif'
            : lower.endsWith('.bmp') ? 'image/bmp'
              : lower.endsWith('.mp4') ? 'video/mp4'
                : 'image/jpeg')
  if (mime.startsWith('image/')) {
    const bitmap = await createImageBitmap(file)
    const probe = { kind: 'image' as const, mime, bytes: file.size, width: bitmap.width, height: bitmap.height, durationMs: null }
    bitmap.close()
    return probe
  }
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('This video could not be read. Export a standard MP4 and try again.'))
      video.src = url
    })
    return {
      kind: 'video',
      mime: mime.startsWith('video/') ? mime : 'video/mp4',
      bytes: file.size,
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
