/**
 * Pending review (v2.19) — shared state for the shell and every Send dialog (pkg/outbox):
 *
 *   outbox.me      { enabled, can_approve, can_send_now }   from GET /outbox/counts (+ settings for the "send now" switch)
 *   outbox.counts  Counts — { waiting, pending, failed, stale, time_sensitive, approved, oldest_at, … }  (polled every 60 s)
 *
 *   import { outbox, ensureOutboxMe, startOutboxCounts, refreshOutboxCounts, queuedToast, reviewOf } from '@/components/outbox/outboxState'
 *
 * reviewOf(res) reads the `review` object every send answer carries; queuedToast(review) then shows
 * "Waiting for approval — Review" linking to the item. Until the counts answer (or when they fail), review is assumed
 * ON and nobody may skip it — the honest default: the server decides, and the dialogs say what it did.
 */
import { reactive } from 'vue'
import { outboxApi } from '@/services/outbox'
import { toast } from '@/composables/useToast'
import router from '@/router'

const POLL_MS = 60000
const EMPTY = { enabled: true, can_approve: false, waiting: 0, pending: 0, failed: 0, stale: 0, time_sensitive: 0, approved: 0, oldest_at: null, next_send_at: null }

export const outbox = reactive({
  me: null, // { enabled, can_approve, can_send_now }
  meKey: '',
  counts: { ...EMPTY },
  loaded: false,
  tick: 0 // bumps whenever something changed here (pages listen and reload)
})

function sessionKey() {
  try {
    const t = localStorage.getItem('auth_token') || ''
    return t ? t.slice(-24) : ''
  } catch {
    return ''
  }
}

function applyCounts(c, key) {
  if (!c) return
  outbox.counts = { ...EMPTY, ...c }
  outbox.loaded = true
  const prev = outbox.meKey === key ? outbox.me : null
  const sendNowAllowed = typeof c.can_send_now === 'boolean' ? c.can_send_now : prev?.sendNowSetting
  outbox.me = {
    enabled: c.enabled !== false,
    can_approve: !!c.can_approve,
    can_send_now: !!c.can_approve && c.enabled !== false && (typeof c.can_send_now === 'boolean' ? c.can_send_now : sendNowAllowed !== false),
    sendNowSetting: sendNowAllowed
  }
  outbox.meKey = key
}

let inflight = null
/** Load the counts (and with them who may do what) once per session; force re-reads. */
export function ensureOutboxMe(force = false) {
  const key = sessionKey()
  if (!key) return Promise.resolve(null)
  if (!force && outbox.me && outbox.meKey === key) return Promise.resolve(outbox.me)
  if (inflight) return inflight
  inflight = outboxApi
    .counts()
    .then(async (c) => {
      applyCounts(c, key)
      // The "admins can send at once" switch lives in the settings (contract v1 has no can_send_now on the counts yet).
      if (c && typeof c.can_send_now !== 'boolean' && c.can_approve && c.enabled !== false) {
        try {
          const s = await outboxApi.settings()
          outbox.me = { ...outbox.me, sendNowSetting: s?.admins_can_send_now !== false, can_send_now: s?.admins_can_send_now !== false }
        } catch {
          /* keep the default (allowed) — the server ignores the tick when it is off */
        }
      }
      return outbox.me
    })
    .catch(() => {
      if (!outbox.me || outbox.meKey !== key) {
        outbox.me = { enabled: true, can_approve: false, can_send_now: false, unknown: true }
        outbox.meKey = key
      }
      return outbox.me
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Review is on for this organisation (true until we know otherwise). */
export function reviewOn() {
  return !outbox.me || outbox.me.enabled !== false
}

let timer = null
let started = 0
async function poll() {
  const key = sessionKey()
  if (!key) return
  if (!outbox.me || outbox.meKey !== key) return ensureOutboxMe()
  try {
    applyCounts(await outboxApi.counts(), key)
  } catch {
    /* keep the last counts */
  }
}
const onFocus = () => {
  if (document.visibilityState !== 'hidden') poll()
}

/** Re-read the counts now (after a send, approve, reject …) and tell open pages. */
export function refreshOutboxCounts() {
  outbox.tick++
  return poll()
}

export function startOutboxCounts() {
  started++
  if (timer) return
  poll()
  timer = setInterval(() => {
    if (document.visibilityState !== 'hidden') poll()
  }, POLL_MS)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
}

export function stopOutboxCounts() {
  started = Math.max(0, started - 1)
  if (started || !timer) return
  clearInterval(timer)
  timer = null
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onFocus)
}

/** The `review` object of a module's send answer when the message was queued (else null). */
export function reviewOf(res) {
  if (!res || typeof res !== 'object') return null
  const r = res.review
  if (r && r.queued && r.id) return r
  if (res.queued && (res.review_id || res.log_id)) return { queued: true, id: res.review_id || res.log_id, link: `/outbox?open=${res.review_id || res.log_id}` }
  return null
}

/** An approver ticked "Send now — I've reviewed it" and it went (contract §4). */
export function sentNowOf(res) {
  return !!res?.review?.sent_now
}

/**
 * "Waiting for approval — Review": the message was queued, nothing has gone yet.
 *   review: the answer's `review` object ({ id, link, send_at, message })
 *   opts:   { what: 'Invoice INV-0042', to: 'client@x.co.ke', count: n (several items at once) }
 */
export function queuedToast(review, { what = 'The message', to = '', count = 0, text = '' } = {}) {
  const many = count > 1 || (!!text && !review?.id)
  const who = to ? ` to ${to}` : ''
  const message = text || (count > 1 ? `${count} messages are in Pending review. Nothing has been sent yet.` : `${what}${who} is in Pending review. Nothing has been sent yet.`)
  const target = review?.id && !many ? { path: '/outbox', query: { open: review.id } } : { path: '/outbox' }
  refreshOutboxCounts()
  return toast(message, 'info', {
    key: review?.id ? 'queued-' + review.id : 'queued-many',
    title: 'Waiting for approval',
    icon: 'fa-solid fa-inbox',
    duration: 10000,
    actions: [{ label: 'Review', icon: 'fa-solid fa-arrow-right', run: () => router.push(target).catch(() => {}) }]
  })
}
