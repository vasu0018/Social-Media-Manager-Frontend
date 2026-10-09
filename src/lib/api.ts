export const apiBase = __API_URL__

export function apiPath(path: string) {
  return `${apiBase}${path}`
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiPath(path), {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })
  const text = await response.text()
  let data: { error?: string } = {}
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string }
    } catch {
      throw new ApiError(response.status, 'The studio API is unreachable.')
    }
  }
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'The studio API is unreachable.')
  return data as T
}

export function uploadFile(path: string, file: File, fields: Record<string, string>, onProgress: (percent: number) => void) {
  return new Promise<{ media: Record<string, unknown>; errors: string[] }>((resolve, reject) => {
    const body = new FormData()
    body.set('file', file)
    for (const [key, value] of Object.entries(fields)) body.set(key, value)
    const request = new XMLHttpRequest()
    request.open('POST', apiPath(path))
    request.withCredentials = true
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new ApiError(0, 'The upload was interrupted.'))
    request.onload = () => {
      const payload = request.responseText ? JSON.parse(request.responseText) as { error?: string; media?: unknown; errors?: string[] } : {}
      if (request.status < 200 || request.status >= 300) {
        reject(new ApiError(request.status, payload.error ?? 'Upload failed'))
        return
      }
      resolve({ media: payload.media as Record<string, unknown>, errors: payload.errors ?? [] })
    }
    request.send(body)
  })
}
