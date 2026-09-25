/** Shared helpers for the dashboard and analytics pages. */
import api from '@/services/api'
import { formatMoney } from '@/utils/format'
import { orgCurrency } from '@/utils/orgDefaults'

export const PERIODS = [
  { value: '7d', label: '7D', long: 'Last 7 days' },
  { value: '30d', label: '30D', long: 'Last 30 days' },
  { value: '90d', label: '90D', long: 'Last 90 days' },
  { value: '12m', label: '12M', long: 'Last 12 months' },
  { value: 'custom', label: 'Custom', long: 'Custom range' }
]

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** GET /analytics/overview → data object */
export async function fetchOverview({ range = '30d', from, to, compare = true, interval, limit } = {}) {
  const params = { tz: browserTimeZone(), compare: compare ? 'previous' : 'none' }
  if (range === 'custom' && from && to) {
    params.from = from
    params.to = to
  } else {
    params.range = range === 'custom' ? '30d' : range
  }
  if (interval && interval !== 'auto') params.interval = interval
  if (limit) params.limit = limit
  const res = await api.get('/analytics/overview', { params })
  return res.data?.data || res.data
}

/** GET /market/overview → data object */
export async function fetchMarket(base) {
  const res = await api.get('/market/overview', { params: base ? { base } : {} })
  return res.data?.data || res.data
}

export function money(v, cur = orgCurrency(), compact = false) {
  return formatMoney(v || 0, cur, { compact })
}

/** Compact currency for axes: $12.4k */
export function moneyAxis(v, cur = orgCurrency()) {
  const n = Number(v) || 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      notation: 'compact',
      maximumFractionDigits: Math.abs(n) >= 1000 ? 1 : 0
    }).format(n)
  } catch {
    return String(Math.round(n))
  }
}

export function num(v, digits = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(v) || 0)
}

export function pct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—'
  const n = Number(v)
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
}

function parseDay(s) {
  return new Date(String(s).slice(0, 10) + 'T00:00:00')
}

/** Label for a bucket start date given the series interval */
export function bucketLabel(s, interval, long = false) {
  if (!s) return ''
  const d = parseDay(s)
  if (interval === 'month') return new Intl.DateTimeFormat(undefined, { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' }).format(d)
  if (interval === 'week' && long) {
    const e = new Date(d)
    e.setDate(e.getDate() + 6)
    const f = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
    return `Week of ${f.format(d)} – ${f.format(e)}`
  }
  return new Intl.DateTimeFormat(undefined, long ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).format(d)
}

export function rangeLabel(from, to) {
  if (!from || !to) return ''
  const f = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f.format(parseDay(from))} – ${f.format(parseDay(to))}`
}

export function timeAgo(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} d ago`
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function titleCase(s) {
  return String(s || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Status → house badge / colour token */
export const BOOKING_STATUS = {
  completed: { label: 'Completed', color: 'var(--success)', badge: 'ui-badge--success' },
  confirmed: { label: 'Confirmed', color: 'var(--info)', badge: 'ui-badge--info' },
  scheduled: { label: 'Scheduled', color: 'var(--accent)', badge: 'ui-badge--sent' },
  in_progress: { label: 'In progress', color: 'var(--warning)', badge: 'ui-badge--warning' },
  no_show: { label: 'No-show', color: 'var(--text-3)', badge: 'ui-badge--draft' },
  cancelled: { label: 'Cancelled', color: 'var(--danger)', badge: 'ui-badge--danger' }
}

export const AGING_COLORS = {
  current: 'var(--success)',
  '1_30': 'var(--warning)',
  '31_60': 'var(--danger)',
  '61_90': 'var(--danger)',
  '90_plus': 'var(--danger)'
}

/** Build and download a CSV file from rows (array of arrays). */
export function downloadCsv(filename, rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Safe localStorage helpers for per-viewer preferences */
export function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}

export function savePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** "nice" axis maximum and ticks */
export function niceScale(max, ticks = 4) {
  if (!max || max <= 0) return { max: 1, step: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1] }
  const raw = max / ticks
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const top = Math.ceil(max / step) * step
  const out = []
  for (let v = 0; v <= top + step / 2; v += step) out.push(Number(v.toFixed(10)))
  return { max: top, step, ticks: out }
}
