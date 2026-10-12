import type { MediaAsset } from '@/types/content'

function draw(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, 768 / Math.max(width, 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not read this file.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

function framesFromImage(src: string) {
  return new Promise<string[]>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        resolve([draw(image, image.naturalWidth, image.naturalHeight)])
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('Could not read this photo.'))
    image.src = src
  })
}

function framesFromVideo(src: string) {
  return new Promise<string[]>((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = src
    const marks = [0.12, 0.5, 0.82]
    const frames: string[] = []
    const fail = () => reject(new Error('Could not read this video. Export it as H.264 MP4 and try again.'))
    video.onerror = fail
    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0
      const take = (index: number) => {
        if (index >= marks.length) {
          video.removeAttribute('src')
          video.load()
          resolve(frames)
          return
        }
        const point = duration > 0 ? Math.min(duration * (marks[index] ?? 0.5), Math.max(duration - 0.05, 0)) : 0
        if (Math.abs(video.currentTime - point) < 0.05 && index === 0) {
          try {
            frames.push(draw(video, video.videoWidth, video.videoHeight))
          } catch (error) {
            reject(error)
            return
          }
          take(index + 1)
          return
        }
        video.currentTime = point
      }
      video.onseeked = () => {
        if (!video.videoWidth) {
          reject(new Error('Could not read this video. Export it as H.264 MP4 and try again.'))
          return
        }
        try {
          frames.push(draw(video, video.videoWidth, video.videoHeight))
        } catch (error) {
          reject(error)
          return
        }
        take(frames.length)
      }
      take(0)
    }
  })
}

export async function framesForCaption(asset: MediaAsset) {
  const remote = asset.captureSrc || asset.src
  if (!remote) throw new Error('Upload the file before asking for a caption.')
  const response = await fetch(remote, { credentials: 'include' })
  if (!response.ok) throw new Error('Could not read this file.')
  const blob = await response.blob()
  const local = URL.createObjectURL(blob)
  try {
    return asset.kind === 'video' ? await framesFromVideo(local) : await framesFromImage(local)
  } finally {
    URL.revokeObjectURL(local)
  }
}
