// Pending review (v2.19, pkg/outbox): every client message waits here for approval. API client + labels.
// Contract: /home/claude/tools/outbox-contract.md (items, counts, settings, the `review` object on send answers).
import api from './api'

const d = (r) => r.data?.data ?? r.data
const base = '/outbox'

export const outboxApi = {
  counts: () => api.get(`${base}/counts`).then(d),
  list: (params) => api.get(`${base}/items`, { params }).then(d),
  get: (id) => api.get(`${base}/items/${id}`, { timeout: 40000 }).then(d),
  update: (id, edits) => api.put(`${base}/items/${id}`, edits, { timeout: 40000 }).then(d),
  /** Preview unsaved edits (optional on the server: 404/405 → null, the caller saves and re-reads instead). */
  preview: (id, edits) =>
    api
      .post(`${base}/items/${id}/preview`, edits, { timeout: 40000 })
      .then(d)
      .catch((e) => {
        const s = e?.response?.status
        if (s === 404 || s === 405) return null
        throw e
      }),
  approve: (id, body) => api.post(`${base}/items/${id}/approve`, body || { when: 'now' }, { timeout: 75000 }).then(d),
  reject: (id, note) => api.post(`${base}/items/${id}/reject`, { note: note || '' }).then(d),
  retry: (id) => api.post(`${base}/items/${id}/retry`, {}, { timeout: 75000 }).then(d),
  bulk: (body) => api.post(`${base}/bulk`, body, { timeout: 180000 }).then(d),
  /** An attachment as it would go now (the API path from preview.attachments[].url), as a Blob. */
  file: (path) => api.get(String(path || '').replace(/^\/api\/v1/, ''), { params: { download: 1, app_url: window.location.origin }, responseType: 'blob', timeout: 45000 }).then((r) => r.data),
  settings: () => api.get(`${base}/settings`).then(d),
  saveSettings: (body) => api.put(`${base}/settings`, body).then(d)
}

/** The list tabs (the API's `tab` groups: waiting = pending + failed, approved = approved + sending, closed = rejected + superseded). */
export const OUTBOX_TABS = [
  {
    value: 'waiting',
    label: 'Waiting',
    empty: 'Nothing is waiting for approval',
    emptyText: 'Every client message has been reviewed. New ones — invoices, reminders, receipts, notices and messages — wait here before they go out.'
  },
  {
    value: 'approved',
    label: 'Approved & scheduled',
    empty: 'Nothing approved for later',
    emptyText: 'Messages you approve for their scheduled time wait here until then.'
  },
  { value: 'sent', label: 'Sent', empty: 'Nothing sent from here yet', emptyText: 'Approved messages show here once they have gone, with who approved them.' },
  {
    value: 'closed',
    label: 'Rejected & superseded',
    empty: 'Nothing rejected or superseded',
    emptyText: 'Messages you rejected, and ones no longer needed (the invoice was paid, the meeting was cancelled …), stay here for 30 days.'
  }
]

export const OUTBOX_KIND_ICONS = {
  invoice_email: 'fa-solid fa-file-invoice-dollar',
  quote_email: 'fa-solid fa-file-signature',
  reminder_email: 'fa-regular fa-bell',
  receipt_email: 'fa-solid fa-receipt',
  notice_email: 'fa-solid fa-link-slash',
  statement: 'fa-solid fa-scale-balanced',
  customer_message: 'fa-regular fa-envelope',
  payment_reminder: 'fa-regular fa-bell',
  subscription_notice: 'fa-solid fa-arrows-rotate',
  meeting_invite: 'fa-solid fa-calendar-plus',
  meeting_cancel: 'fa-regular fa-calendar-xmark',
  whatsapp_reply: 'fa-brands fa-whatsapp',
  whatsapp_template: 'fa-brands fa-whatsapp'
}

// Tones for the kind icon tile (soft background + colour).
export const OUTBOX_KIND_TONES = {
  invoice_email: 'accent',
  quote_email: 'accent',
  reminder_email: 'warning',
  payment_reminder: 'warning',
  statement: 'warning',
  receipt_email: 'success',
  notice_email: 'danger',
  customer_message: 'info',
  subscription_notice: 'info',
  meeting_invite: 'info',
  meeting_cancel: 'info',
  whatsapp_reply: 'success',
  whatsapp_template: 'success'
}

export const OUTBOX_KIND_FALLBACK_LABELS = {
  invoice_email: 'Invoice email',
  quote_email: 'Quote email',
  reminder_email: 'Payment reminder',
  receipt_email: 'Receipt',
  notice_email: 'Disregard notice',
  statement: 'Statement of account',
  customer_message: 'Customer message',
  payment_reminder: 'Payment reminder',
  subscription_notice: 'Subscription notice',
  meeting_invite: 'Meeting invitation',
  meeting_cancel: 'Meeting cancellation',
  whatsapp_reply: 'WhatsApp reply',
  whatsapp_template: 'WhatsApp message'
}

export const OUTBOX_CHANNEL_LABELS = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' }
export const OUTBOX_CHANNEL_ICONS = { email: 'fa-regular fa-envelope', sms: 'fa-solid fa-comment-sms', whatsapp: 'fa-brands fa-whatsapp' }

export const OUTBOX_STATUS = {
  pending: { label: 'Waiting for approval', short: 'Waiting', badge: 'ui-badge--warning', icon: 'fa-regular fa-hourglass-half' },
  approved: { label: 'Approved for its time', short: 'Approved', badge: 'ui-badge--info', icon: 'fa-regular fa-clock' },
  sending: { label: 'Sending', short: 'Sending', badge: 'ui-badge--info', icon: 'fa-solid fa-circle-notch' },
  sent: { label: 'Sent', short: 'Sent', badge: 'ui-badge--success', icon: 'fa-solid fa-check' },
  failed: { label: 'Not sent — it failed', short: 'Failed', badge: 'ui-badge--danger', icon: 'fa-solid fa-triangle-exclamation' },
  rejected: { label: 'Rejected — not sent', short: 'Rejected', badge: 'ui-badge--draft', icon: 'fa-solid fa-ban' },
  superseded: { label: 'Not needed any more — not sent', short: 'Not needed', badge: 'ui-badge--draft', icon: 'fa-solid fa-forward' }
}

export const TRIGGER_LABELS = { manual: 'Sent by a person', automatic: 'Automatic', scheduled: 'Scheduled' }

export const kindLabel = (item, fallback = 'Message') => item?.kind_label || OUTBOX_KIND_FALLBACK_LABELS[item?.kind] || fallback
export const kindIcon = (k) => OUTBOX_KIND_ICONS[k] || 'fa-regular fa-envelope'
export const kindTone = (k) => OUTBOX_KIND_TONES[k] || 'accent'
export const channelLabel = (c) => OUTBOX_CHANNEL_LABELS[c] || c || 'Email'
export const channelIcon = (c) => OUTBOX_CHANNEL_ICONS[c] || 'fa-regular fa-envelope'
export const statusInfo = (s) => OUTBOX_STATUS[s] || { label: s || '—', short: s || '—', badge: 'ui-badge--draft', icon: 'fa-regular fa-circle' }

/** Where an item's Review link goes (router location). */
export const reviewLink = (id) => ({ path: '/outbox', query: id ? { open: id } : {} })

/** "just now", "12 min", "3 h", "4 days" since an ISO time. */
export function waitedFor(iso, now = Date.now()) {
  if (!iso) return ''
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h`
  return `${Math.round(h / 24)} days`
}

/** The record an item belongs to, as a router path (the API gives `record.link`). */
export function recordPath(rec) {
  if (!rec) return ''
  if (rec.link) return rec.link
  if (!rec.id) return ''
  return (
    {
      invoice: `/invoices/${rec.id}`,
      quote: `/quotes/${rec.id}`,
      subscription: `/subscriptions?open=${rec.id}`,
      scheduled_message: `/communication/scheduled?open=${rec.id}`,
      meeting: `/meetings/${rec.id}`,
      customer: `/customers?open=${rec.id}`
    }[rec.type] || ''
  )
}

/** "Open invoice", "Open subscription" … for the linked record. */
export function recordAction(rec) {
  const w = { invoice: 'invoice', quote: 'quote', subscription: 'subscription', scheduled_message: 'schedule', meeting: 'meeting', customer: 'customer' }[rec?.type] || 'record'
  return `Open ${w}`
}

/** Time in the organisation's zone ("Tue 25 Nov, 08:00"). */
export function whenText(iso, tz) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(tz ? { timeZone: tz } : {}) }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString()
  }
}
