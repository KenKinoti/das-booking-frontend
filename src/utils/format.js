/** Formatting helpers shared by the invoicing module and dashboards. */

export function formatMoney(value, currency = 'AUD', opts = {}) {
  const n = Number(value) || 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'AUD',
      minimumFractionDigits: opts.compact ? 0 : 2,
      maximumFractionDigits: opts.compact ? 0 : 2,
      notation: opts.compact && Math.abs(n) >= 10000 ? 'compact' : 'standard'
    }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

export function formatDate(value, style = 'medium') {
  if (!value) return '—'
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(value.slice(0, 10) + 'T00:00:00') : new Date(value)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900) return '—'
  return new Intl.DateTimeFormat(undefined, style === 'short' ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d)
}

export function relativeDays(value) {
  if (!value) return ''
  const d = new Date(String(value).slice(0, 10) + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`
}

/** YYYY-MM-DD for <input type="date"> in local time */
export function isoDate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(String(value).slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + Number(days || 0))
  return isoDate(d)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
