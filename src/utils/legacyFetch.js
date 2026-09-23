/**
 * Drop-in replacement for window.fetch used by older views that were written
 * against a local dev server (http://localhost:8080/api/...). It routes the
 * request to the configured API, adds the auth token and normalises the
 * response into the { success, data } envelope those views expect.
 */
import { API_BASE_URL, API_ORIGIN } from '../config'

const PATH_ALIASES = { '/staff': '/users' }

function resolve(url) {
  let path = String(url).replace(/^https?:\/\/localhost:\d+/, '')
  if (/^\/(api\/)?health/.test(path)) return `${API_ORIGIN}/health`
  path = path.replace(/^\/api(\/v1)?/, '')
  const [p, q] = path.split('?')
  const aliased = PATH_ALIASES[p] || p
  return `${API_BASE_URL}${aliased}${q ? '?' + q : ''}`
}

export async function legacyFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = localStorage.getItem('auth_token')
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(resolve(url), { ...options, headers })
  let body = null
  const text = await res.text()
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { message: text }
  }
  let normalised = body
  if (body && typeof body === 'object' && !Array.isArray(body) && !('success' in body)) {
    normalised = { success: res.ok, data: body, message: typeof body.error === 'string' ? body.error : body.message }
  }
  if (normalised?.data && normalised.data.users && !normalised.data.staff) normalised.data.staff = normalised.data.users
  if (normalised?.data?.data && typeof normalised.data.data === 'object') {
    // unwrap { success, data: { data: {...} } }
    Object.assign(normalised.data, normalised.data.data)
  }
  if (normalised && !normalised.message && normalised.error?.message) normalised.message = normalised.error.message
  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    url: res.url,
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : res.headers.get(k)), entries: () => res.headers.entries() },
    json: async () => normalised,
    text: async () => text
  }
}
