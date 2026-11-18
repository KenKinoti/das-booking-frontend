// Undo send (pkg/invoicing hold.go): the "Sending in 28 s · Undo" toast for an email the server is holding.
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

/** Seconds left for a held email-log entry, from the server's count and the time it was fetched. */
export function secondsLeft(hold, fetchedAt, now = Date.now()) {
  if (!hold || hold.state !== 'held') return 0
  const base = typeof hold.seconds_left === 'number' ? hold.seconds_left : 0
  return Math.max(0, Math.ceil(base - (now - (fetchedAt || now)) / 1000))
}

// Open countdown toasts by email-log id (so Undo on the Emails tab settles the toast too).
const open = new Map()

/** Close the countdown of a held email that was undone / sent from elsewhere (the Emails tab). */
export function settleHoldToast(logId, message, type = 'success') {
  const h = open.get(logId)
  if (!h) return false
  h.stop()
  toast.update(h.id, { type, title: '', message })
  return true
}

/**
 * Show the countdown toast for a held send.
 *   hold: { log_id, seconds, seconds_left }   (the send response's `hold`, or a receipt_email result)
 *   opts: { what: 'Invoice' | 'Reminder' | 'Receipt' …, to, onChange() }
 * Undo cancels it (nothing is sent), Send now sends it at once; onChange runs after either and when the time is up.
 */
/** "45 s" under a minute, "1:58" from a minute up (the undo window can be 2 minutes). */
export function countdown(s) {
  const n = Math.max(0, Math.ceil(Number(s) || 0))
  return n >= 60 ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : `${n} s`
}

export function holdToast(docId, hold, { what = 'Email', to = '', onChange } = {}) {
  if (!hold || !hold.log_id) return null
  const started = Date.now()
  const total = (typeof hold.seconds_left === 'number' ? hold.seconds_left : hold.seconds || 0) * 1000
  const who = to ? ` to ${to}` : ''
  let done = false
  let timer = null
  let id = null
  const left = () => Math.max(0, Math.ceil((total - (Date.now() - started)) / 1000))
  const text = () => `${what}${who} — sending in ${countdown(left())}`
  const stop = () => {
    done = true
    clearInterval(timer)
    open.delete(hold.log_id)
  }
  const changed = () => {
    try {
      onChange?.()
    } catch {
      /* the page may have gone */
    }
  }
  const undo = async () => {
    if (done) return
    stop()
    toast.update(id, { type: 'loading', message: 'Undoing…', title: '' })
    try {
      await invoicingApi.undoEmail(docId, hold.log_id)
      toast.update(id, { type: 'success', title: 'Undone', message: `Nothing was sent${who}.` })
    } catch (e) {
      toast.update(id, { type: 'warning', title: 'Too late to undo', message: apiErrorMessage(e, 'It has already gone') })
    }
    changed()
  }
  const sendNow = async () => {
    if (done) return
    stop()
    toast.update(id, { type: 'loading', message: 'Sending…', title: '' })
    try {
      await invoicingApi.sendEmailNow(docId, hold.log_id)
      toast.update(id, { type: 'success', title: '', message: `${what} sent${who}` })
    } catch (e) {
      toast.update(id, { type: 'error', title: 'Not sent', message: apiErrorMessage(e, 'Could not send it') })
    }
    changed()
  }
  id = toast(text(), 'info', {
    key: 'hold-' + hold.log_id,
    title: 'Sending…',
    icon: 'fa-regular fa-clock',
    duration: 0,
    progress: false,
    actions: [
      { label: 'Undo', icon: 'fa-solid fa-rotate-left', run: undo, keepOpen: true },
      { label: 'Send now', icon: 'fa-solid fa-paper-plane', run: sendNow, keepOpen: true }
    ],
    onClose: () => {
      // Closing the toast doesn't cancel anything: the email still goes at its time.
      if (!done) stop()
    }
  })
  open.set(hold.log_id, { id, stop })
  timer = setInterval(() => {
    if (done) return
    if (left() <= 0) {
      stop()
      toast.update(id, { type: 'info', title: '', message: `${what}${who} is going out now.` })
      // The server sends it on its own timer; refresh once it has gone.
      setTimeout(changed, 1500)
      return
    }
    toast.update(id, { message: text() })
  }, 1000)
  return id
}
