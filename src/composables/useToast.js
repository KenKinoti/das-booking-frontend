import { reactive } from 'vue'

let seq = 0
export const toasts = reactive([])

export function dismissToast(id) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i !== -1) toasts.splice(i, 1)
}

/**
 * Show a toast. type: success | error | info | warning
 */
export function toast(message, type = 'info', { duration, title, action } = {}) {
  const id = ++seq
  toasts.push({ id, message: String(message ?? ''), type, title, action })
  if (toasts.length > 4) toasts.shift()
  const ms = duration ?? (type === 'error' ? 6000 : 3800)
  if (ms > 0) setTimeout(() => dismissToast(id), ms)
  return id
}

toast.success = (m, o) => toast(m, 'success', o)
toast.error = (m, o) => toast(m, 'error', o)
toast.info = (m, o) => toast(m, 'info', o)
toast.warning = (m, o) => toast(m, 'warning', o)

export function useToast() {
  return { toast, toasts, dismissToast }
}
