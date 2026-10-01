import { formatMoney } from '@/utils/format'
import { downloadCsv } from '@/components/dashboard/analytics'

export { downloadCsv }

export function money(v, cur, compact = false) {
  const n = Number(v) || 0
  // Large amounts without cents keep tiles and tables readable.
  if (!compact && Math.abs(n) >= 1000 && cur) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(n)
    } catch {
      /* fall through */
    }
  }
  return formatMoney(n, cur || undefined, { compact })
}

export function axis(v, cur) {
  const n = Number(v) || 0
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD', notation: 'compact', maximumFractionDigits: Math.abs(n) >= 1000 ? 1 : 0 }).format(n)
  } catch {
    return String(Math.round(n))
  }
}

export function num(v, d = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }).format(Number(v) || 0)
}

export function pct(v, d = 1, signed = false) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—'
  const n = Number(v)
  return `${signed && n > 0 ? '+' : ''}${n.toFixed(d)}%`
}

export function day(s) {
  if (!s) return ''
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(s).slice(0, 10) + 'T00:00:00'))
}

/** Sequential single-hue cell colour (0–1 intensity). */
export function heat(t, hue = 'var(--viz-1)') {
  const p = Math.max(0, Math.min(1, t))
  if (p <= 0) return 'transparent'
  return `color-mix(in srgb, ${hue} ${Math.round(8 + p * 62)}%, var(--surface))`
}

export function fileStamp() {
  return new Date().toISOString().slice(0, 10)
}
