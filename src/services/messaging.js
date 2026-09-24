import { WS_ORIGIN } from '../config'
import api from './api'

const unwrap = (res) => (res && res.data && Object.prototype.hasOwnProperty.call(res.data, 'data') ? res.data.data : res.data)

/** REST API for in-app messaging (/api/v1/messaging). Errors are thrown for callers to show. */
export const messagingService = {
  getThreads: () => api.get('/messaging/threads').then(unwrap),
  createThread: (payload) => api.post('/messaging/threads', payload).then(unwrap),
  getMessages: (threadId, page = 1, limit = 50) => api.get(`/messaging/threads/${threadId}/messages`, { params: { page, limit } }).then(unwrap),
  sendMessage: (threadId, payload) => api.post(`/messaging/threads/${threadId}/messages`, payload).then(unwrap),
  getSettings: () => api.get('/messaging/settings').then(unwrap),
  updateSettings: (settings) => api.put('/messaging/settings', settings).then(unwrap),
  getIntegrations: () => api.get('/messaging/integrations').then(unwrap),
  updateIntegration: (provider, data) => api.put(`/messaging/integrations/${provider}`, data).then(unwrap),
  searchMessages: (q, threadId = null) => api.get('/messaging/search', { params: { q, thread_id: threadId || undefined } }).then(unwrap),
  getUnreadCount: () => api.get('/messaging/unread-count').then((r) => Number(unwrap(r)?.count) || 0),
  testWhatsAppConnection: () => api.post('/messaging/whatsapp/test-connection').then((r) => r.data)
}

export function personName(u) {
  if (!u) return 'Unknown'
  const n = `${u.first_name || ''} ${u.last_name || ''}`.trim()
  return n || u.email || 'Unknown'
}

export function initials(name = '') {
  return (
    String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?'
  )
}

/**
 * Normalise a thread from the API. The API returns the latest message first in
 * `messages`, followed by a pseudo-message whose content is the unread count.
 */
export function normalizeThread(t, meId) {
  const msgs = Array.isArray(t.messages) ? t.messages : []
  let unread = 0
  let last = null
  for (const m of msgs) {
    if (!m.id && !m.sender_id) unread = Number(m.content) || 0
    else if (!last) last = m
  }
  const participants = (t.participants || []).filter((p) => p.is_active !== false)
  const others = participants.filter((p) => p.user_id !== meId)
  const otherNames = others.map((p) => personName(p.user))
  const isGroup = t.type === 'group' || others.length > 1
  const name = (t.name && t.name.trim()) || (otherNames.length ? otherNames.join(', ') : 'Just you')
  return {
    id: t.id,
    type: t.type,
    name,
    isGroup,
    participants,
    others,
    last,
    unread,
    updatedAt: (last && last.created_at) || t.last_message_at || t.created_at
  }
}

/**
 * Real-time messaging socket. Authenticates with {type:"auth", token} and
 * reconnects with backoff while anything is subscribed.
 */
export class WebSocketService {
  constructor() {
    this.socket = null
    this.authed = false
    this.listeners = new Map()
    this.attempts = 0
    this.timer = null
    this.wanted = false
    this.joined = new Set()
  }

  get isConnected() {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN && this.authed
  }

  connect() {
    this.wanted = true
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return
    clearTimeout(this.timer)
    let token = null
    try {
      token = localStorage.getItem('auth_token')
    } catch {
      token = null
    }
    if (!token) return
    let socket
    try {
      socket = new WebSocket(`${WS_ORIGIN}/ws/messaging`)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.socket = socket
    socket.onopen = () => {
      this.attempts = 0
      socket.send(JSON.stringify({ type: 'auth', token }))
    }
    socket.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (msg.type === 'auth_success') {
        this.authed = true
        this.joined.forEach((id) => this.send({ type: 'join_thread', thread_id: id }))
        this.emit('status', 'connected')
      } else if (msg.type === 'auth_error') {
        this.authed = false
        this.emit('status', 'unauthorized')
      }
      this.emit(msg.type, msg)
    }
    socket.onclose = () => {
      this.authed = false
      if (this.socket === socket) this.socket = null
      this.emit('status', 'disconnected')
      if (this.wanted) this.scheduleReconnect()
    }
    socket.onerror = () => {
      /* onclose handles reconnects */
    }
  }

  scheduleReconnect() {
    clearTimeout(this.timer)
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts, 5))
    this.attempts++
    this.timer = setTimeout(() => this.connect(), delay)
  }

  disconnect() {
    this.wanted = false
    clearTimeout(this.timer)
    if (this.socket) this.socket.close()
    this.socket = null
    this.authed = false
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(data))
  }

  on(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(cb)
    return () => this.off(type, cb)
  }

  off(type, cb) {
    this.listeners.get(type)?.delete(cb)
  }

  emit(type, data) {
    this.listeners.get(type)?.forEach((cb) => {
      try {
        cb(data)
      } catch {
        /* a listener error must not break the socket */
      }
    })
  }

  joinThread(id) {
    this.joined.add(id)
    if (this.authed) this.send({ type: 'join_thread', thread_id: id })
  }

  leaveThread(id) {
    this.joined.delete(id)
    if (this.authed) this.send({ type: 'leave_thread', thread_id: id })
  }

  startTyping(id) {
    if (this.authed) this.send({ type: 'typing_start', thread_id: id })
  }

  stopTyping(id) {
    if (this.authed) this.send({ type: 'typing_stop', thread_id: id })
  }
}

export const webSocketService = new WebSocketService()

export function formatMessageTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  const week = new Date()
  week.setDate(week.getDate() - 6)
  if (d > week) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function dayLabel(ts) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

/** Group messages (oldest first) by day, and mark runs from the same sender. */
export function groupMessagesByDate(messages) {
  const groups = []
  let prev = null
  for (const m of messages) {
    const key = new Date(m.created_at).toDateString()
    let g = groups[groups.length - 1]
    if (!g || g.key !== key) {
      g = { key, label: dayLabel(m.created_at), messages: [] }
      groups.push(g)
      prev = null
    }
    const cont = prev && prev.sender_id === m.sender_id && new Date(m.created_at) - new Date(prev.created_at) < 5 * 60 * 1000
    g.messages.push({ ...m, _continued: !!cont })
    prev = m
  }
  return groups
}
