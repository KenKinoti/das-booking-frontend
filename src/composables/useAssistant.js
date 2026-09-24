/**
 * Shared state and helpers for the "Ask DASYIN" assistant (panel + page).
 */
import { reactive } from 'vue'
import api, { listFrom, apiErrorMessage } from '@/services/api'
import { API_BASE_URL } from '@/config'

const SS_OPEN = 'asst.open'
const SS_CONV = 'asst.conv'

function ssGet(k) {
  try {
    return sessionStorage.getItem(k)
  } catch {
    return null
  }
}
function ssSet(k, v) {
  try {
    if (v == null || v === '') sessionStorage.removeItem(k)
    else sessionStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

export const assistant = reactive({
  open: ssGet(SS_OPEN) === '1',
  // conversation shown in the panel
  panelConversation: ssGet(SS_CONV) || '',
  status: null,
  statusError: '',
  statusLoading: false,
  conversations: [],
  conversationsLoaded: false,
  conversationsLoading: false,
  // bump to ask open chats to focus their input
  focusTick: 0
})

export function openAssistant() {
  assistant.open = true
  assistant.focusTick++
  ssSet(SS_OPEN, '1')
}
export function closeAssistant() {
  assistant.open = false
  ssSet(SS_OPEN, '')
}
export function toggleAssistant() {
  if (assistant.open) closeAssistant()
  else openAssistant()
}
export function setPanelConversation(id) {
  assistant.panelConversation = id || ''
  ssSet(SS_CONV, id || '')
}

export async function loadStatus(force = false) {
  if (assistant.status && !force) return assistant.status
  assistant.statusLoading = true
  try {
    const { data } = await api.get('/assistant/status')
    assistant.status = data?.data || data
    assistant.statusError = ''
  } catch (e) {
    assistant.statusError = apiErrorMessage(e, 'Could not load the assistant status')
  } finally {
    assistant.statusLoading = false
  }
  return assistant.status
}

export async function loadConversations() {
  assistant.conversationsLoading = true
  try {
    const res = await api.get('/assistant/conversations')
    assistant.conversations = listFrom(res, 'data')
    assistant.conversationsLoaded = true
  } catch {
    /* keep old list */
  } finally {
    assistant.conversationsLoading = false
  }
}

export function upsertConversation(c) {
  if (!c?.id) return
  const i = assistant.conversations.findIndex((x) => x.id === c.id)
  const row = { ...(i >= 0 ? assistant.conversations[i] : {}), ...c, last_message_at: new Date().toISOString() }
  if (i >= 0) assistant.conversations.splice(i, 1)
  assistant.conversations.unshift(row)
}

export async function renameConversation(id, title) {
  const { data } = await api.patch(`/assistant/conversations/${id}`, { title })
  const t = data?.data?.title || title
  const c = assistant.conversations.find((x) => x.id === id)
  if (c) c.title = t
  return t
}

export async function deleteConversation(id) {
  await api.delete(`/assistant/conversations/${id}`)
  assistant.conversations = assistant.conversations.filter((x) => x.id !== id)
  if (assistant.panelConversation === id) setPanelConversation('')
}

export async function saveAutoApprove(value) {
  const { data } = await api.put('/assistant/settings', { auto_approve: !!value })
  if (assistant.status) assistant.status.settings = { ...(assistant.status.settings || {}), auto_approve: !!data?.data?.auto_approve }
}

/** What the user is looking at, sent with each message. */
export function pageContext(route) {
  if (!route) return {}
  const params = {}
  for (const [k, v] of Object.entries(route.params || {})) params[k] = Array.isArray(v) ? v.join('/') : String(v)
  const query = {}
  for (const [k, v] of Object.entries(route.query || {})) if (typeof v === 'string' && v.length < 100) query[k] = v
  let title = ''
  try {
    title = document.title || ''
  } catch {
    title = ''
  }
  return { path: route.path, name: typeof route.name === 'string' ? route.name : '', title: route.meta?.title || title, params, query }
}

/** Suggestion chips for the current page. Ending with "…" fills the input instead of sending. */
export function suggestionsFor(route) {
  const p = route?.path || ''
  const id = route?.params?.id
  if (/^\/invoices\/[^/]+$/.test(p) && id && id !== 'new' && id !== 'settings')
    return ['Summarise this invoice', 'Has this invoice been paid?', 'Record a payment on this invoice…']
  if (/^\/(invoices|billing)/.test(p)) return ['Which invoices are overdue?', 'How much is outstanding right now?', 'Create an invoice for …']
  if (/^\/quotes\/[^/]+$/.test(p) && id && id !== 'new') return ['Summarise this quote', 'Convert this quote to an invoice']
  if (/^\/quotes/.test(p)) return ['Which quotes are still awaiting a response?', 'Create a quote for …']
  if (/^\/customers/.test(p)) return ['Find customer …', 'Add a new customer …', 'Who are my top customers this year?']
  if (/^\/crm/.test(p)) return ['Which deals are closing this month?', 'Show my open pipeline by stage']
  if (/^\/(bookings|scheduling)/.test(p)) return ['What bookings do I have today?', 'Book an appointment for …', 'Any cancellations this week?']
  if (/^\/events/.test(p)) return ['Which events are coming up?', 'How many registrations do we have?']
  if (/^\/(inventory|production)/.test(p)) return ['Which items are low on stock?', 'What is my stock worth?']
  if (/^\/(suppliers|bills)/.test(p)) return ['Which bills are due this week?', 'How much do we owe suppliers?']
  if (/^\/(finance|banking|accounting)/.test(p)) return ['What is my cash position?', 'Show unreconciled bank transactions']
  if (/^\/projects/.test(p)) return ['Which tasks are overdue?', 'Summarise project progress']
  if (/^\/(dashboard|business|$)/.test(p) || p === '/') return ['What needs my attention today?', 'How are sales this month?', 'Which invoices are overdue?']
  return ['What can you help me with?', 'What needs my attention today?', 'Find customer …']
}

function timezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

/**
 * POST to an SSE endpoint and call onEvent(name, data) per event.
 * Resolves when the stream ends. Throws {status, message} for HTTP errors.
 */
export async function streamSSE(path, body, { signal, onEvent }) {
  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      // Time zone travels in the body: a custom header would need CORS allow-listing.
      body: JSON.stringify({ ...body, timezone: timezone() }),
      signal
    })
  let res = await doFetch()
  if (res.status === 401) {
    // Let the axios interceptor refresh the token, then try once more.
    try {
      await api.get('/assistant/status')
    } catch {
      /* interceptor handles sign-out */
    }
    res = await doFetch()
  }
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      msg = j?.error?.message || j?.message || (typeof j?.error === 'string' ? j.error : '') || msg
    } catch {
      /* not json */
    }
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  const dispatch = (chunk) => {
    let event = 'message'
    const data = []
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    }
    if (!data.length) return
    let parsed
    try {
      parsed = JSON.parse(data.join('\n'))
    } catch {
      parsed = data.join('\n')
    }
    onEvent(event, parsed)
  }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      dispatch(chunk)
    }
  }
  if (buf.trim()) dispatch(buf)
}

/** Tell the app that the assistant changed data. */
export function emitDataChanged(detail) {
  try {
    window.dispatchEvent(new CustomEvent('dasyin:data-changed', { detail }))
  } catch {
    /* ignore */
  }
}
