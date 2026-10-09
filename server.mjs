import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const port = Number(process.env.PORT || 3000)
const upstream = new URL(process.env.API_UPSTREAM || 'http://api:4000')
const forward = upstream.protocol === 'https:' ? httpsRequest : httpRequest

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function fileFor(pathname) {
  let decoded = pathname
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relative = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '')
  const full = join(root, relative)
  if (full !== root && !full.startsWith(root + sep)) return null
  return full
}

function proxy(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  const headers = { ...req.headers, host: upstream.host }
  delete headers.connection
  const proxied = forward(`${upstream.origin}${url.pathname}${url.search}`, {
    method: req.method,
    headers,
  }, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers)
    upstreamRes.pipe(res)
  })
  proxied.on('error', () => {
    if (res.headersSent) return
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'The API is unreachable. Set API_UPSTREAM to the backend URL.' }))
  })
  req.pipe(proxied)
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    proxy(req, res)
    return
  }

  const candidate = fileFor(url.pathname)
  let file = join(root, 'index.html')
  if (candidate && existsSync(candidate)) {
    const stat = statSync(candidate)
    if (stat.isFile()) file = candidate
    if (stat.isDirectory()) {
      const index = join(candidate, 'index.html')
      if (existsSync(index)) file = index
    }
  }
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
  createReadStream(file).pipe(res)
})

server.requestTimeout = 0
server.headersTimeout = 120_000
server.listen(port, '0.0.0.0', () => {
  console.log(`Reel Studio frontend listening on ${port}, API ${upstream.origin}`)
})
