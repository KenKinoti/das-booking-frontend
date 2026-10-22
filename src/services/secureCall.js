/**
 * Secure calls — browser side of the end-to-end encryption and the relay.
 *
 * Link: `${PUBLIC_APP_URL}/c/<roomId>#<key>`
 *   roomId  128 random bits from the server (22 base64url characters)
 *   key     256 random bits made here with WebCrypto (43 base64url
 *           characters). It only ever lives in the URL fragment, which
 *           browsers never send to a server, and in this browser's storage.
 *
 * From the key (HKDF-SHA-256, salt "dasyin-seccall/v1"):
 *   link check  info "join-check", 16 bytes — sent when creating/joining so
 *               people who only know the room id can't join. The server
 *               keeps only its SHA-256; it can't be turned back into the key.
 *   message key info "signal-aes-gcm|<roomId>" — AES-GCM-256, never leaves
 *               WebCrypto (non-extractable).
 * Every signalling message is sealed with a random 12-byte IV and
 * "dasyin-seccall/v1|<roomId>|<from>|<to>" as associated data, so the relay
 * can neither read nor change it, nor pass one person's message off as
 * another's. Each sender numbers its messages; repeats are dropped.
 */
import api from '@/services/api'
import { API_BASE_URL } from '@/config'

const te = new TextEncoder()
const td = new TextDecoder()
const SALT = te.encode('dasyin-seccall/v1')

export function b64u(bytes) {
  let s = ''
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64u(s) {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(t + '==='.slice((t.length + 3) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Can this browser do secure calls at all? Returns '' or a reason. */
export function unsupportedReason() {
  if (typeof window === 'undefined') return 'No browser'
  if (!window.isSecureContext || !window.crypto?.subtle) return 'This page has to be opened over a secure (https) connection.'
  if (typeof window.RTCPeerConnection !== 'function') return "This browser can't make video calls. Open the link in Chrome, Safari, Edge or Firefox."
  return ''
}

/** A new 256-bit call key (base64url). */
export function newCallKey() {
  return b64u(crypto.getRandomValues(new Uint8Array(32)))
}

/** The key in a location hash, or '' when it is missing or cut off. */
export function keyFromHash(hash) {
  const k = String(hash || '').replace(/^#/, '').trim()
  if (!/^[A-Za-z0-9_-]{43}$/.test(k)) return ''
  try {
    return fromB64u(k).length === 32 ? k : ''
  } catch {
    return ''
  }
}

export function validRoomId(id) {
  return /^[A-Za-z0-9_-]{22}$/.test(String(id || ''))
}

async function baseKey(key) {
  return crypto.subtle.importKey('raw', fromB64u(key), 'HKDF', false, ['deriveKey', 'deriveBits'])
}

/** The link check for a key (16 bytes, base64url). */
export async function linkCheck(key) {
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: te.encode('join-check') }, await baseKey(key), 128)
  return b64u(new Uint8Array(bits))
}

/** The AES-GCM key for a room (non-extractable). */
export async function messageKey(key, roomId) {
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: SALT, info: te.encode('signal-aes-gcm|' + roomId) },
    await baseKey(key),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export function aadFor(roomId, from, to) {
  return te.encode(`dasyin-seccall/v1|${roomId}|${from}|${to}`)
}

/** Encrypt obj → "<iv>.<ciphertext>" (base64url). */
export async function seal(aesKey, aad, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, aesKey, te.encode(JSON.stringify(obj)))
  return b64u(iv) + '.' + b64u(new Uint8Array(ct))
}

/** Decrypt and authenticate; throws when the message was not made with this key for this sender/recipient. */
export async function unseal(aesKey, aad, s) {
  const [iv, ct, extra] = String(s || '').split('.')
  if (!iv || !ct || extra !== undefined) throw new Error('malformed')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64u(iv), additionalData: aad }, aesKey, fromB64u(ct))
  return JSON.parse(td.decode(pt))
}

/**
 * The security code: SHA-256 over the room id and the sorted DTLS
 * certificate fingerprints of everyone in the call → 12 digits ("482 913 075 266").
 * Everyone sees the same code only if every connection ended at the person
 * it was meant for.
 */
export async function securityCode(roomId, fingerprints) {
  const fps = [...new Set(fingerprints.map((f) => String(f).trim().toUpperCase()))].sort()
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(`dasyin-seccall/v1|${roomId}|${fps.join(',')}`)))
  // first 48 bits (exact in a double) → 12 decimal digits
  let n = 0
  for (let i = 0; i < 6; i++) n = n * 256 + h[i]
  const digits = String(n % 1e12).padStart(12, '0')
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ')
}

// ---------------------------------------------------------------- host's keys on this device

const KEYS = 'seccall.keys.v1'

function userKey() {
  try {
    const u = JSON.parse(localStorage.getItem('current_user') || 'null')
    return `${KEYS}.${u?.id || 'anon'}`
  } catch {
    return `${KEYS}.anon`
  }
}

function readKeys() {
  try {
    return JSON.parse(localStorage.getItem(userKey()) || '{}') || {}
  } catch {
    return {}
  }
}

function writeKeys(m) {
  try {
    localStorage.setItem(userKey(), JSON.stringify(m))
  } catch {
    /* private mode / storage full: the host keeps the link they copied */
  }
}

/** Remember the key of a call this person created, until it expires. */
export function rememberKey(roomId, key, expiresAt) {
  const m = readKeys()
  const now = Date.now()
  for (const [id, v] of Object.entries(m)) if (!v || (v.e && Date.parse(v.e) < now - 3600e3)) delete m[id]
  m[roomId] = { k: key, e: expiresAt || null }
  writeKeys(m)
}

export function recallKey(roomId) {
  return readKeys()[roomId]?.k || ''
}

export function forgetKey(roomId) {
  const m = readKeys()
  delete m[roomId]
  writeKeys(m)
}

/** The key of the current tab's call (survives a reload, not a new tab). */
export function tabKey(roomId, key) {
  try {
    if (key === '-') sessionStorage.removeItem('seccall.tab.' + roomId)
    else if (key) sessionStorage.setItem('seccall.tab.' + roomId, key)
    return sessionStorage.getItem('seccall.tab.' + roomId) || ''
  } catch {
    return key && key !== '-' ? key : ''
  }
}

export function callLink(appUrl, roomId, key) {
  const base = (appUrl || window.location.origin).replace(/\/$/, '')
  return `${base}/c/${roomId}#${key}`
}

export const EXPIRY_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' }
]

// ---------------------------------------------------------------- host API (signed in)

export const secureCallsApi = {
  list: (status) => api.get('/secure-calls', { params: status ? { status } : {} }),
  create: (body) => api.post('/secure-calls', body),
  get: (id) => api.get(`/secure-calls/${id}`),
  end: (id) => api.post(`/secure-calls/${id}/end`),
  settings: () => api.get('/secure-call-settings'),
  saveSettings: (body) => api.put('/secure-call-settings', body),
  previewIce: () => api.get('/secure-call-settings/preview')
}

/** Start a call: key + check here, room on the server. */
export async function createSecureCall({ title, expires, lobby, maxParticipants }) {
  const key = newCallKey()
  const check = await linkCheck(key)
  const res = await secureCallsApi.create({ title, expires, lobby: !!lobby, max_participants: maxParticipants || undefined, link_check: check })
  const d = res.data?.data || {}
  rememberKey(d.call.id, key, d.call.expires_at)
  return { call: d.call, key, appUrl: d.app_url, link: callLink(d.app_url, d.call.id, key) }
}

// ---------------------------------------------------------------- plain fetch helpers (call page)

function errorFrom(status, body) {
  const e = new Error(body?.error?.message || `Request failed (${status})`)
  e.status = status
  e.code = body?.error?.code || ''
  return e
}

async function request(method, path, { token, body, signal, keepalive } = {}) {
  let res
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      keepalive,
      cache: 'no-store'
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    const e = new Error('Cannot reach the server. Check your connection.')
    e.status = 0
    e.code = 'NETWORK'
    throw e
  }
  let j = {}
  try {
    j = await res.json()
  } catch {
    j = {}
  }
  if (!res.ok) throw errorFrom(res.status, j)
  return j.data
}

/**
 * Signed-in requests from the call page without the app's axios
 * interceptors (an expired session must not send a guest to the sign-in page).
 */
export async function hostRequest(method, path, body) {
  let token = ''
  try {
    token = localStorage.getItem('auth_token') || ''
  } catch {
    token = ''
  }
  if (!token) {
    const e = new Error('Not signed in')
    e.status = 401
    throw e
  }
  try {
    return await request(method, path, { token, body })
  } catch (e) {
    if (e.status !== 401) throw e
    let refresh = ''
    try {
      refresh = localStorage.getItem('refresh_token') || ''
    } catch {
      refresh = ''
    }
    if (!refresh) throw e
    const d = await request('POST', '/auth/refresh', { body: { refresh_token: refresh } })
    if (!d?.token) throw e
    try {
      localStorage.setItem('auth_token', d.token)
      if (d.refresh_token) localStorage.setItem('refresh_token', d.refresh_token)
    } catch {
      /* ignore */
    }
    return request(method, path, { token: d.token, body })
  }
}

export function signedIn() {
  try {
    return !!localStorage.getItem('auth_token') && !!localStorage.getItem('current_user')
  } catch {
    return false
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * The relay: join, then post ciphertext and long-poll for it. Messages to
 * send are batched (one request per ~40 ms) and sent strictly in order.
 */
export class CallRelay {
  constructor(roomId) {
    this.roomId = roomId
    this.token = ''
    this.since = 0
    this.queue = []
    this.sending = false
    this.stopped = false
    this.abort = null
    this.onFatal = null
  }

  status() {
    return request('GET', `/public/calls/${this.roomId}`)
  }

  preview(check) {
    return request('POST', `/public/calls/${this.roomId}/preview`, { body: { link_check: check } })
  }

  async join(name, check, asHost) {
    const d = asHost
      ? await hostRequest('POST', `/secure-calls/${this.roomId}/join`, { name, link_check: check })
      : await request('POST', `/public/calls/${this.roomId}/join`, { body: { name, link_check: check } })
    this.token = d.token
    this.since = d.since || 0
    this.stopped = false
    return d
  }

  ice() {
    return request('GET', `/public/calls/${this.roomId}/ice`, { token: this.token })
  }

  /** Queue one ciphertext for `to` (a participant id or "*"). */
  send(to, ciphertext) {
    this.queue.push({ to, ciphertext })
    if (!this.sending) {
      this.sending = true
      setTimeout(() => this.flush(), 40)
    }
  }

  async flush() {
    let delay = 500
    while (this.queue.length && !this.stopped) {
      const batch = this.queue.slice(0, 20)
      try {
        await request('POST', `/public/calls/${this.roomId}/signal`, { token: this.token, body: { messages: batch } })
        this.queue.splice(0, batch.length)
        delay = 500
      } catch (e) {
        if (e.status === 0 || e.status >= 500 || e.status === 429) {
          await sleep(e.status === 429 ? 5000 : delay)
          delay = Math.min(delay * 2, 8000)
          continue
        }
        // refused for good (ended, removed …): drop what is queued
        this.queue = []
        if (this.onFatal) this.onFatal(e)
        break
      }
    }
    this.sending = false
  }

  /** Long-poll until stop(); onResult(res) is awaited so messages stay in order. */
  async poll(onResult, onError) {
    let backoff = 1000
    while (!this.stopped) {
      this.kicked = false
      this.abort = new AbortController()
      const timer = setTimeout(() => this.abort?.abort(), 40000)
      try {
        const d = await request('GET', `/public/calls/${this.roomId}/poll?since=${this.since}&wait=25`, { token: this.token, signal: this.abort.signal })
        clearTimeout(timer)
        if (this.stopped) return
        backoff = 1000
        this.since = d.next ?? this.since
        await onResult(d)
      } catch (e) {
        clearTimeout(timer)
        if (this.stopped) return
        if (this.kicked) {
          // aborted on purpose (the network changed): poll again right away
          this.kicked = false
          continue
        }
        const fatal = e.status && e.status !== 429 && e.status < 500 && e.code !== 'RESUME'
        const keep = await onError(e, fatal)
        if (fatal && keep !== true) return
        await sleep(e.status === 429 ? 15000 : backoff)
        backoff = Math.min(backoff * 2, 10000)
      }
    }
  }

  async leave() {
    this.stopped = true
    this.abort?.abort()
    if (!this.token) return
    try {
      await request('POST', `/public/calls/${this.roomId}/leave`, { token: this.token, keepalive: true })
    } catch {
      /* the server notices when polls stop */
    }
  }

  /** For pagehide: sendBeacon cannot set headers, so the token goes in a text/plain body. */
  beaconLeave() {
    if (!this.token || this.stopped) return
    this.stopped = true
    try {
      navigator.sendBeacon?.(API_BASE_URL + `/public/calls/${this.roomId}/leave`, new Blob([JSON.stringify({ token: this.token })], { type: 'text/plain' }))
    } catch {
      /* ignore */
    }
  }

  /** Drop the current long poll and start a new one (after a network change). */
  kick() {
    if (this.stopped || !this.abort) return
    this.kicked = true
    this.abort.abort()
  }

  stop() {
    this.stopped = true
    this.abort?.abort()
  }
}
