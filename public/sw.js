/* DASYIN ERP service worker (hand-written, no dependencies).
 *
 * - Precaches the app shell (index.html, built JS/CSS, icons, offline page)
 *   listed in /precache-manifest.json, which both build pipelines write.
 * - Navigations: network first, offline → /offline.html.
 * - Built assets: cache first (hashed file names never change).
 * - Fonts, icons and images: cache first in a small runtime cache.
 * - API responses (/api/…) are NEVER cached — except the public organisation
 *   logo, which is served stale-while-revalidate.
 * - A new version waits until the page asks it to take over
 *   (postMessage({ type: 'SKIP_WAITING' }) from the "Reload" toast).
 *
 * BUILD_ID is replaced at build time so every release changes this file's
 * bytes, which is what makes browsers pick up the new worker.
 */
const BUILD_ID = '__BUILD_ID__'
const PREFIX = 'dasyin-'
const PRECACHE = `${PREFIX}precache-${BUILD_ID}`
const RUNTIME = `${PREFIX}runtime-v1`
const LOGOS = `${PREFIX}logos-v1`
const OFFLINE_URL = '/offline.html'
const RUNTIME_MAX = 150
const LOGOS_MAX = 20

// Always cached, even if the manifest can't be read
const CORE = ['/', '/index.html', OFFLINE_URL, '/site.webmanifest', '/favicon.svg', '/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE)
      let files = []
      try {
        const res = await fetch('/precache-manifest.json', { cache: 'no-store' })
        if (res.ok) files = (await res.json()).files || []
      } catch (e) {
        /* offline during install: fall back to the core list */
      }
      const urls = [...new Set([...CORE, ...files])]
      // Add one by one so a single missing file doesn't abort the install
      await Promise.all(
        urls.map((u) =>
          cache.add(new Request(u, { cache: 'reload' })).catch(() => {
            /* ignore */
          })
        )
      )
      // First install: nothing to replace, take over straight away
      if (!self.registration.active) await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PRECACHE, RUNTIME, LOGOS])
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n.startsWith(PREFIX) && !keep.has(n)).map((n) => caches.delete(n)))
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable()
        } catch (e) {
          /* not supported */
        }
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type
  if (type === 'SKIP_WAITING') self.skipWaiting()
  if (type === 'GET_VERSION' && event.ports && event.ports[0]) event.ports[0].postMessage({ build: BUILD_ID })
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

function isApi(url) {
  return url.pathname.startsWith('/api/') || url.pathname.includes('/api/v1/')
}

function isOrgLogo(url) {
  return /\/api\/v1\/public\/org-logo\//.test(url.pathname)
}

function isStaticAsset(url) {
  return url.origin === self.location.origin && /^\/(assets|js|css|images|chunks)\//.test(url.pathname)
}

function isMedia(request, url) {
  const d = request.destination
  return d === 'font' || d === 'image' || d === 'style' && /fonts\.googleapis\.com$/.test(url.hostname) || /\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|svg|ico)$/i.test(url.pathname) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)
}

async function networkFirstNavigation(event) {
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null
    if (preload) return preload
    return await fetch(event.request)
  } catch (e) {
    const cache = await caches.open(PRECACHE)
    return (await cache.match(OFFLINE_URL)) || new Response('<h1>You are offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}

async function cacheFirst(request, cacheName, max) {
  const hit = await caches.match(request, { ignoreVary: true })
  if (hit) return hit
  const res = await fetch(request)
  // Opaque (no-cors) responses are fine for fonts/images; skip errors
  if (res && (res.ok || res.type === 'opaque')) {
    const cache = await caches.open(cacheName)
    cache.put(request, res.clone()).then(() => max && trim(cacheName, max))
  }
  return res
}

async function staleWhileRevalidate(request, cacheName, max) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  const fresh = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).then(() => trim(cacheName, max))
      return res
    })
    .catch(() => hit)
  return hit || fresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  let url
  try {
    url = new URL(request.url)
  } catch (e) {
    return
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  // API: never cached (only the public organisation logo)
  if (isApi(url)) {
    if (isOrgLogo(url)) event.respondWith(staleWhileRevalidate(request, LOGOS, LOGOS_MAX))
    return // network only, untouched
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event))
    return
  }

  if (url.origin === self.location.origin) {
    // The worker, manifest and precache list must always be fresh
    if (/^\/(sw\.js|precache-manifest\.json)$/.test(url.pathname) || url.pathname.endsWith('.webmanifest')) return
    if (isStaticAsset(url)) {
      event.respondWith(cacheFirst(request, RUNTIME, RUNTIME_MAX))
      return
    }
  }

  if (isMedia(request, url)) {
    event.respondWith(cacheFirst(request, RUNTIME, RUNTIME_MAX).catch(() => caches.match(request)))
    return
  }

  // Anything else on our origin: network, falling back to a cached copy
  if (url.origin === self.location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request, { ignoreSearch: true })))
  }
})
