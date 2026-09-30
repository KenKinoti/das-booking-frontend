/**
 * In-app notification centre state (the bell in the top bar).
 *
 * Refreshes when the panel opens, every 60 s, and when the window regains
 * focus. Notifications that arrive while the app is open also pop up as a
 * toast. Backend: /api/v1/notifications (pkg/notify).
 */
import { reactive } from 'vue'
import api, { listFrom, apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export const notifications = reactive({
  items: [],
  unread: 0,
  total: 0,
  hasMore: false,
  loading: false,
  loaded: false,
  error: '',
  latestAt: null, // newest created_at we have seen (ISO)
  open: false
})

const POLL_MS = 60000
let timer = null
let started = 0
let polling = false
let primed = false // first poll done: later arrivals are "new"

const SEVERITY_TOAST = { success: 'success', warning: 'warning', error: 'error', info: 'info' }

const ts = (iso) => Date.parse(iso || '') || 0
const newer = (a, b) => ts(a) > ts(b)

function newest(list) {
  let max = null
  for (const n of list) if (n.created_at && (!max || newer(n.created_at, max))) max = n.created_at
  return max
}

function data(res) {
  return res?.data?.data || res?.data || {}
}

export async function refreshNotifications({ silent = false } = {}) {
  if (!silent) notifications.loading = true
  try {
    const res = await api.get('/notifications', { params: { limit: 50 } })
    const d = data(res)
    const list = listFrom(res, 'notifications')
    notifications.items = list
    notifications.unread = d.unread ?? list.filter((n) => !n.read_at).length
    notifications.total = d.total ?? list.length
    notifications.hasMore = !!d.has_more
    const max = newest(list)
    if (max && (!notifications.latestAt || newer(max, notifications.latestAt))) notifications.latestAt = max
    notifications.loaded = true
    notifications.error = ''
  } catch (e) {
    notifications.error = apiErrorMessage(e, 'Could not load notifications')
  } finally {
    notifications.loading = false
  }
}

export async function loadMoreNotifications() {
  const last = notifications.items[notifications.items.length - 1]
  if (!last) return
  try {
    const res = await api.get('/notifications', { params: { limit: 50, before: last.created_at } })
    const more = listFrom(res, 'notifications').filter((n) => !notifications.items.some((x) => x.id === n.id))
    notifications.items.push(...more)
    notifications.hasMore = !!data(res).has_more
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not load more notifications'))
  }
}

function announce(fresh) {
  if (!fresh.length || notifications.open) return
  if (fresh.length > 3) {
    toast.info(`${fresh.length} new notifications`, {
      title: 'Notifications',
      icon: 'fa-solid fa-bell',
      key: 'notif-batch',
      action: { label: 'View', run: () => (notifications.open = true) }
    })
    return
  }
  // Oldest first so the newest ends up on top of the stack
  ;[...fresh].reverse().forEach((n) => {
    toast(n.body || '', SEVERITY_TOAST[n.severity] || 'info', {
      title: n.title,
      icon: n.severity === 'info' ? 'fa-solid fa-bell' : undefined,
      link: n.link || '',
      duration: n.severity === 'error' ? 9000 : 6500,
      action: n.link ? { label: 'View', run: () => markRead(n) } : undefined
    })
  })
}

/** Cheap poll: badge count; fetch + toast only when something new arrived. */
export async function pollNotifications() {
  if (polling) return
  polling = true
  try {
    const res = await api.get('/notifications/unread-count')
    const d = data(res)
    const latest = d.latest_at || null
    const before = notifications.latestAt
    notifications.unread = d.unread ?? notifications.unread
    const first = !primed
    primed = true
    if (latest && (!before || newer(latest, before))) {
      if (first) {
        // First poll of the session: remember where we are, don't toast history.
        notifications.latestAt = latest
        return
      }
      const r = await api.get('/notifications', { params: { since: before || undefined, limit: 20 } })
      const fresh = listFrom(r, 'notifications').filter((n) => !notifications.items.some((x) => x.id === n.id))
      notifications.items = [...fresh, ...notifications.items].slice(0, 200)
      notifications.unread = data(r).unread ?? notifications.unread
      notifications.latestAt = newest(fresh) || latest
      announce(fresh.filter((n) => !n.read_at))
    }
  } catch {
    /* offline or signed out: try again next tick */
  } finally {
    polling = false
  }
}

function onFocus() {
  if (document.visibilityState === 'hidden') return
  pollNotifications()
}

export function startNotifications() {
  started++
  if (timer) return
  pollNotifications()
  timer = setInterval(() => {
    if (document.visibilityState !== 'hidden') pollNotifications()
  }, POLL_MS)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
}

export function stopNotifications() {
  started = Math.max(0, started - 1)
  if (started || !timer) return
  clearInterval(timer)
  timer = null
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onFocus)
}

export function resetNotifications() {
  primed = false
  Object.assign(notifications, { items: [], unread: 0, total: 0, hasMore: false, loaded: false, error: '', latestAt: null, open: false })
}

export async function markRead(n, read = true) {
  if (!n || !!n.read_at === read) return
  const prev = n.read_at
  n.read_at = read ? new Date().toISOString() : null
  notifications.unread = Math.max(0, notifications.unread + (read ? -1 : 1))
  try {
    const res = await api.post(`/notifications/${n.id}/read`, { read })
    notifications.unread = data(res).unread ?? notifications.unread
  } catch (e) {
    n.read_at = prev
    notifications.unread = Math.max(0, notifications.unread + (read ? 1 : -1))
    toast.error(apiErrorMessage(e, 'Could not update the notification'))
  }
}

export async function markAllRead() {
  const unread = notifications.items.filter((n) => !n.read_at)
  if (!notifications.unread && !unread.length) return
  const now = new Date().toISOString()
  unread.forEach((n) => (n.read_at = now))
  const before = notifications.unread
  notifications.unread = 0
  try {
    await api.post('/notifications/read-all')
    toast.success('All caught up', { duration: 2500 })
  } catch (e) {
    unread.forEach((n) => (n.read_at = null))
    notifications.unread = before
    toast.error(apiErrorMessage(e, 'Could not mark notifications as read'))
  }
}

/** Remove one notification. The delete is sent after the Undo window closes. */
export function removeNotification(n) {
  const i = notifications.items.findIndex((x) => x.id === n.id)
  if (i === -1) return
  notifications.items.splice(i, 1)
  if (!n.read_at) notifications.unread = Math.max(0, notifications.unread - 1)
  let undone = false
  const commit = async () => {
    if (undone) return
    try {
      await api.delete(`/notifications/${n.id}`)
    } catch (e) {
      notifications.items.splice(Math.min(i, notifications.items.length), 0, n)
      if (!n.read_at) notifications.unread++
      toast.error(apiErrorMessage(e, 'Could not remove the notification'))
    }
  }
  const t = setTimeout(commit, 5200)
  toast('Notification removed', 'info', {
    duration: 5000,
    icon: 'fa-regular fa-trash-can',
    action: {
      label: 'Undo',
      icon: 'fa-solid fa-rotate-left',
      run: () => {
        undone = true
        clearTimeout(t)
        notifications.items.splice(Math.min(i, notifications.items.length), 0, n)
        if (!n.read_at) notifications.unread++
      }
    }
  })
}

export async function clearNotifications(scope = 'read') {
  try {
    const res = await api.delete('/notifications', { params: { scope } })
    const n = data(res).deleted ?? 0
    notifications.items = scope === 'all' ? [] : notifications.items.filter((x) => !x.read_at)
    notifications.unread = data(res).unread ?? notifications.unread
    toast.success(n ? `Cleared ${n} notification${n === 1 ? '' : 's'}` : 'Nothing to clear', { duration: 2500 })
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not clear notifications'))
  }
}

export function useNotifications() {
  return { notifications, refreshNotifications, pollNotifications, markRead, markAllRead, removeNotification, clearNotifications, loadMoreNotifications, startNotifications, stopNotifications }
}
