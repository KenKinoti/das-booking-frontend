/**
 * App-wide toasts.
 *
 *   import { toast } from '@/composables/useToast'
 *   toast.success('Saved')                              // success | info | warning | error
 *   toast.error('Could not save', { title: 'Error', action: { label: 'Retry', run: save } })
 *   const id = toast.loading('Uploading…')              // spinner, stays until updated
 *   toast.update(id, { type: 'success', message: 'Uploaded' })
 *   await toast.promise(api.post(...), { loading: 'Sending…', success: 'Sent', error: (e) => apiErrorMessage(e) })
 *   toast.dismiss(id)
 *
 * Backward compatible with toast(message, type, { duration, title, action }).
 * Options: title, duration (ms, 0 = sticky), action {label, run, icon?},
 * actions [..], icon (FA class), key (replaces a toast with the same key),
 * dismissible (default true), progress (default true when timed).
 */
import { reactive } from 'vue'

let seq = 0
export const toasts = reactive([])

export const TOAST_TYPES = ['success', 'info', 'warning', 'error', 'loading']
export const MAX_TOASTS = 4

const DEFAULT_MS = { success: 4000, info: 4500, warning: 6500, error: 8000, loading: 0 }
const timers = new Map()

function normType(type) {
  if (type === 'danger') return 'error'
  return TOAST_TYPES.includes(type) ? type : 'info'
}

function clearTimer(id) {
  const t = timers.get(id)
  if (t) clearTimeout(t)
  timers.delete(id)
}

function schedule(t) {
  clearTimer(t.id)
  if (!t.duration || t.paused) return
  t.startedAt = Date.now()
  timers.set(
    t.id,
    setTimeout(() => dismissToast(t.id), Math.max(0, t.remaining))
  )
}

export function dismissToast(id) {
  clearTimer(id)
  const i = toasts.findIndex((t) => t.id === id)
  if (i !== -1) {
    const [t] = toasts.splice(i, 1)
    try {
      t.onClose?.()
    } catch {
      /* ignore */
    }
  }
}

export function dismissAll() {
  ;[...toasts].forEach((t) => dismissToast(t.id))
}

/** Pause the auto-dismiss timer (hover / focus / touch). */
export function pauseToast(id) {
  const t = toasts.find((x) => x.id === id)
  if (!t || t.paused || !t.duration) return
  t.paused = true
  t.remaining = Math.max(0, t.remaining - (Date.now() - (t.startedAt || Date.now())))
  clearTimer(id)
}

export function resumeToast(id) {
  const t = toasts.find((x) => x.id === id)
  if (!t || !t.paused) return
  t.paused = false
  schedule(t)
}

function buildActions(o) {
  const list = []
  if (o.action && o.action.label) list.push(o.action)
  if (Array.isArray(o.actions)) list.push(...o.actions.filter((a) => a && a.label))
  return list.map((a) => ({ label: a.label, icon: a.icon, run: typeof a.run === 'function' ? a.run : typeof a.onClick === 'function' ? a.onClick : () => {}, keepOpen: !!a.keepOpen }))
}

/**
 * Show a toast. type: success | error | info | warning | loading.
 * Returns the toast id.
 */
export function toast(message, type = 'info', opts = {}) {
  const o = opts || {}
  const kind = normType(type)
  if (o.key) {
    const existing = toasts.find((t) => t.key === o.key)
    if (existing) {
      updateToast(existing.id, { message, type: kind, ...o })
      return existing.id
    }
  }
  const id = ++seq
  const duration = o.duration ?? DEFAULT_MS[kind]
  const t = reactive({
    id,
    key: o.key || '',
    type: kind,
    title: o.title ?? '',
    message: String(message ?? ''),
    icon: o.icon || '',
    actions: buildActions(o),
    dismissible: o.dismissible !== false,
    duration,
    remaining: duration,
    startedAt: 0,
    paused: false,
    progress: o.progress !== false && duration > 0,
    link: o.link || '',
    onClose: o.onClose,
    rev: 0
  })
  toasts.push(t)
  // Stacking limit: drop the oldest non-loading toast first.
  while (toasts.length > MAX_TOASTS) {
    const victim = toasts.find((x) => x.type !== 'loading') || toasts[0]
    dismissToast(victim.id)
  }
  schedule(t)
  return id
}

/** Change a toast in place (e.g. loading → success). Restarts its timer. */
export function updateToast(id, patch = {}) {
  const t = toasts.find((x) => x.id === id)
  if (!t) return null
  if (patch.type) t.type = normType(patch.type)
  if ('message' in patch) t.message = String(patch.message ?? '')
  if ('title' in patch) t.title = patch.title ?? ''
  if ('icon' in patch) t.icon = patch.icon || ''
  if ('link' in patch) t.link = patch.link || ''
  if (patch.action || patch.actions) t.actions = buildActions(patch)
  else if (patch.type && patch.type !== 'loading' && !patch.keepActions) t.actions = t.actions.filter(() => false)
  if (patch.type || 'duration' in patch) {
    const d = patch.duration ?? DEFAULT_MS[t.type]
    t.duration = d
    t.remaining = d
    t.progress = patch.progress !== false && d > 0
    t.paused = false
    t.rev++
    schedule(t)
  }
  return id
}

toast.success = (m, o) => toast(m, 'success', o)
toast.error = (m, o) => toast(m, 'error', o)
toast.info = (m, o) => toast(m, 'info', o)
toast.warning = (m, o) => toast(m, 'warning', o)
toast.warn = toast.warning
toast.loading = (m, o) => toast(m, 'loading', { duration: 0, ...(o || {}) })
toast.update = updateToast
toast.dismiss = dismissToast
toast.clear = dismissAll

const resolveMsg = (v, arg, fallback) => {
  if (typeof v === 'function') return v(arg)
  return v ?? fallback
}

/**
 * Show a loading toast while a promise runs, then turn it into a success or
 * error toast. Resolves/rejects like the promise.
 *   toast.promise(p, { loading: 'Saving…', success: 'Saved', error: (e) => apiErrorMessage(e, 'Failed') })
 * success/error may also be objects: { message, title, action }.
 */
toast.promise = async (promise, msgs = {}, opts = {}) => {
  const id = toast.loading(resolveMsg(msgs.loading, undefined, 'Working…'), opts)
  const p = typeof promise === 'function' ? promise() : promise
  try {
    const res = await p
    const out = resolveMsg(msgs.success, res, 'Done')
    if (out === false || out === null) dismissToast(id)
    else updateToast(id, { type: 'success', ...(typeof out === 'object' ? out : { message: out }) })
    return res
  } catch (e) {
    const out = resolveMsg(msgs.error, e, e?.message || 'Something went wrong')
    updateToast(id, { type: 'error', ...(typeof out === 'object' && out !== null ? out : { message: out }) })
    throw e
  }
}

export function useToast() {
  return { toast, toasts, dismissToast, updateToast, pauseToast, resumeToast, dismissAll }
}
