/**
 * Football module helpers shared by the pages and charts: formatting, market labels,
 * the maths behind the price check (EV, fractional Kelly, push-aware Asian handicap
 * and quarter-line totals from the model's score matrix) and CSV export.
 *
 * Every probability is 0–1. Odds are decimal. Times from the API are UTC ISO strings and
 * are shown in the organisation's time zone (the API's `timezone`, else Africa/Nairobi).
 */
import { formatMoney } from '@/utils/format'

export const DEFAULT_TZ = 'Africa/Nairobi'

// Backtest facts quoted in the UI (pkg/football/model README, out of sample 2019/20 – Nov 2026,
// five leagues, Pinnacle closing odds de-margined with Shin's method).
export const BACKTEST = {
  source: 'pkg/football/model README — walk-forward backtest, out of sample 2019/20 to 8 Nov 2026',
  leagues: [
    { league: 'Premier League', n: 2760, model: 0.203, market: 0.1971, diff: 0.0059, se: 0.0011, ll: 0.9836, mll: 0.9658, br: 0.5853, mbr: 0.573, ece: 0.009, mece: 0.004 },
    { league: 'Bundesliga', n: 2223, model: 0.2043, market: 0.198, diff: 0.0063, se: 0.0012, ll: 0.9938, mll: 0.9738, br: 0.5929, mbr: 0.5786, ece: 0.011, mece: 0.011 },
    { league: 'La Liga', n: 2779, model: 0.1964, market: 0.1914, diff: 0.005, se: 0.001, ll: 0.9826, mll: 0.9657, br: 0.5851, mbr: 0.5737, ece: 0.011, mece: 0.014 },
    { league: 'Serie A', n: 2770, model: 0.1959, market: 0.1904, diff: 0.0055, se: 0.0009, ll: 0.977, mll: 0.959, br: 0.5815, mbr: 0.5694, ece: 0.007, mece: 0.011 },
    { league: 'Ligue 1', n: 2427, model: 0.2074, market: 0.2017, diff: 0.0057, se: 0.0011, ll: 1.0026, mll: 0.9839, br: 0.5988, mbr: 0.5866, ece: 0.006, mece: 0.006 }
  ],
  // EPL calibration, H/D/A pooled (bin, n, mean forecast, observed, 95% CI)
  eplCalibration: [
    { lo: 0, hi: 0.1, n: 264, mean_p: 0.072, freq: 0.087, ci_lo: 0.059, ci_hi: 0.127 },
    { lo: 0.1, hi: 0.2, n: 1174, mean_p: 0.16, freq: 0.15, ci_lo: 0.131, ci_hi: 0.171 },
    { lo: 0.2, hi: 0.3, n: 3316, mean_p: 0.249, freq: 0.258, ci_lo: 0.243, ci_hi: 0.273 },
    { lo: 0.3, hi: 0.4, n: 1142, mean_p: 0.35, freq: 0.352, ci_lo: 0.325, ci_hi: 0.38 },
    { lo: 0.4, hi: 0.5, n: 945, mean_p: 0.45, freq: 0.425, ci_lo: 0.394, ci_hi: 0.457 },
    { lo: 0.5, hi: 0.6, n: 665, mean_p: 0.547, freq: 0.546, ci_lo: 0.508, ci_hi: 0.583 },
    { lo: 0.6, hi: 0.7, n: 465, mean_p: 0.647, freq: 0.654, ci_lo: 0.609, ci_hi: 0.696 },
    { lo: 0.7, hi: 0.8, n: 237, mean_p: 0.746, freq: 0.738, ci_lo: 0.679, ci_hi: 0.79 },
    { lo: 0.8, hi: 0.9, n: 69, mean_p: 0.837, freq: 0.841, ci_lo: 0.737, ci_hi: 0.909 }
  ],
  bets: [
    { what: 'Model edges ≥ 5% at Pinnacle closing prices (5 leagues)', n: '1,581–2,089 per league', flat: '−5.4% to −12.3%', roi: '−87% to −96%' },
    { what: 'Model edges ≥ 2% at the market-average closing price (EPL)', n: '2,231', flat: '−5.7% ± 3.9%', roi: '−95%' },
    { what: 'Model edges ≥ 2% at the best closing price (EPL)', n: '2,673', flat: '+0.7% ± 3.9%', roi: '−63%' },
    { what: 'No model: Pinnacle fair probability vs the best price (5 leagues)', n: '1,257–1,612 per league', flat: '−0.8% to +3.4%', roi: '−16% to +84%' }
  ]
}

// ------------------------------------------------------------------ numbers
const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

export function pct(p, d = 1) {
  const v = num(p)
  return v === null ? '—' : `${(v * 100).toFixed(d)}%`
}
/** Percentage points, signed: +1.5 pts */
export function pts(x, d = 1) {
  const v = num(x)
  if (v === null) return '—'
  const s = (v * 100).toFixed(d)
  return `${v > 0 && Number(s) !== 0 ? '+' : v < 0 && Number(s) !== 0 ? '−' : ''}${Math.abs(Number(s)).toFixed(d)} pts`
}
/** Signed percentage: +4.2% / −3.1% */
export function spct(x, d = 1) {
  const v = num(x)
  if (v === null) return '—'
  const s = Math.abs(v * 100).toFixed(d)
  return `${v > 0 && Number(s) !== 0 ? '+' : v < 0 && Number(s) !== 0 ? '−' : ''}${s}%`
}
export function odds(o) {
  const v = num(o)
  return v === null ? '—' : v.toFixed(2)
}
export function fixed(x, d = 2) {
  const v = num(x)
  return v === null ? '—' : v.toFixed(d)
}
export function money(v, cur) {
  const n = num(v)
  return n === null ? '—' : formatMoney(n, cur || 'KES')
}
export function smoney(v, cur) {
  const n = num(v)
  if (n === null) return '—'
  const s = formatMoney(Math.abs(n), cur || 'KES')
  return n > 0.004 ? `+${s}` : n < -0.004 ? `−${s}` : s
}
/** A line with its sign (+0.25, −0.5, 0). */
export function line(l) {
  const v = num(l)
  if (v === null) return ''
  if (v === 0) return '0'
  return (v > 0 ? '+' : '−') + String(Math.abs(v))
}
export const clamp01 = (x) => Math.max(0, Math.min(1, x))

// ------------------------------------------------------------------ time
export function tzOf(t) {
  try {
    if (t) new Intl.DateTimeFormat('en', { timeZone: t })
    return t || DEFAULT_TZ
  } catch {
    return DEFAULT_TZ
  }
}
/** YYYY-MM-DD of an instant in a time zone. */
export function dayKey(iso, tz) {
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tzOf(tz), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const g = (k) => p.find((x) => x.type === k)?.value
  return `${g('year')}-${g('month')}-${g('day')}`
}
export function addDaysKey(key, n) {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function fmtTime(iso, tz) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { timeZone: tzOf(tz), hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
export function fmtDay(iso, tz, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { timeZone: tzOf(tz), ...opts }).format(new Date(iso))
}
export function fmtDateTime(iso, tz) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { timeZone: tzOf(tz), day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
export function fmtShortDate(iso, tz) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { timeZone: tzOf(tz), day: 'numeric', month: 'short' }).format(new Date(iso))
}
/** "12 min ago", "3 h ago", "2 days ago" relative to `now` (the API's clock). */
export function ago(iso, now) {
  if (!iso) return 'never'
  const ms = new Date(now || Date.now()) - new Date(iso)
  if (!Number.isFinite(ms)) return '—'
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}
/** Freshness of a fetch: fresh (< 6 h), aging (< 24 h), stale. */
export function freshness(iso, now, stale) {
  if (stale) return 'stale'
  if (!iso) return 'stale'
  const h = (new Date(now || Date.now()) - new Date(iso)) / 3600000
  return h < 6 ? 'fresh' : h < 24 ? 'aging' : 'stale'
}

// ------------------------------------------------------------------ fixtures
export const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'])
export const FINISHED = new Set(['FT', 'AET', 'PEN'])
export const isLive = (s) => LIVE.has(s)
export const isFinished = (s) => FINISHED.has(s)
export function statusText(f) {
  if (!f) return ''
  const s = f.status
  if (isLive(s)) return s === 'HT' ? 'Half time' : `${f.elapsed ?? f.minute ?? ''}′`
  if (s === 'FT') return 'Full time'
  if (s === 'AET') return 'After extra time'
  if (s === 'PEN') return 'Penalties'
  if (s === 'PST') return 'Postponed'
  if (s === 'CANC') return 'Cancelled'
  if (s === 'ABD') return 'Abandoned'
  return ''
}

// ------------------------------------------------------------------ markets
export const MARKETS = [
  { key: '1x2', label: 'Match result (1X2)', short: '1X2', selections: ['home', 'draw', 'away'], needsLine: false },
  { key: 'dc', label: 'Double chance', short: 'Double chance', selections: ['1x', '12', 'x2'], needsLine: false },
  { key: 'dnb', label: 'Draw no bet', short: 'Draw no bet', selections: ['home', 'away'], needsLine: false },
  { key: 'ou', label: 'Total goals over/under', short: 'Over/under', selections: ['over', 'under'], needsLine: true },
  { key: 'btts', label: 'Both teams to score', short: 'BTTS', selections: ['yes', 'no'], needsLine: false },
  { key: 'ah', label: 'Asian handicap', short: 'Asian handicap', selections: ['home', 'away'], needsLine: true }
]
export const marketLabel = (k) => MARKETS.find((m) => m.key === k)?.label || k

export function selectionLabel(market, sel, ln, home = 'Home', away = 'Away') {
  switch (market) {
    case '1x2':
      return sel === 'home' ? `${home} to win` : sel === 'away' ? `${away} to win` : 'Draw'
    case 'dc':
      return sel === '1x' ? `${home} or draw` : sel === 'x2' ? `Draw or ${away}` : `${home} or ${away}`
    case 'dnb':
      return `${sel === 'home' ? home : away} (draw no bet)`
    case 'ou':
      return `${sel === 'over' ? 'Over' : 'Under'} ${ln} goals`
    case 'btts':
      return sel === 'yes' ? 'Both teams to score' : 'Not both teams to score'
    case 'ah':
      return `${sel === 'home' ? home : away} ${line(ln)}`
    default:
      return `${market} ${sel}`
  }
}

export const OU_LINES = [0.5, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.5, 5.5]
export const AH_LINES = [-1.5, -1.25, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5]
export const ahKey = (l) => (l === 0 ? '0' : (l > 0 ? '+' : '-') + String(Math.abs(l)))

/** Probability of each goal difference (home − away) and each total from the score matrix. */
export function distributions(matrix) {
  const diff = new Map()
  const total = new Map()
  let mass = 0
  ;(matrix || []).forEach((row, h) =>
    (row || []).forEach((p, a) => {
      const v = Number(p) || 0
      mass += v
      diff.set(h - a, (diff.get(h - a) || 0) + v)
      total.set(h + a, (total.get(h + a) || 0) + v)
    })
  )
  return { diff, total, mass }
}

/**
 * Settlement split of a bet whose margin is `x(outcome) + l` (> 0 wins, = 0 pushes, < 0 loses)
 * for a line that may be a quarter line (stake split over the two neighbouring lines).
 * dist: Map value → probability. Returns { win, half_win, push, half_loss, loss }.
 */
export function settleSplit(dist, l, sign = 1) {
  const out = { win: 0, half_win: 0, push: 0, half_loss: 0, loss: 0 }
  const quarter = Math.round(Math.abs(l) * 4) % 2 === 1
  const sgn = (v) => (v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0)
  for (const [x, p] of dist) {
    const m = sign * x
    if (!quarter) {
      const s = sgn(m + l)
      if (s > 0) out.win += p
      else if (s < 0) out.loss += p
      else out.push += p
    } else {
      const t = sgn(m + l - 0.25) + sgn(m + l + 0.25)
      if (t === 2) out.win += p
      else if (t === 1) out.half_win += p
      else if (t === 0) out.push += p
      else if (t === -1) out.half_loss += p
      else out.loss += p
    }
  }
  return out
}
/** Asian handicap split for a side at a line (line from that side's point of view). */
export function ahSplit(matrix, l, side = 'home') {
  return settleSplit(distributions(matrix).diff, l, side === 'home' ? 1 : -1)
}
/** Totals split: over l → margin total − l; under l → l − total. */
export function ouSplit(matrix, l, sel = 'over') {
  const { total } = distributions(matrix)
  const flipped = new Map([...total].map(([t, p]) => [sel === 'over' ? t : -t, p]))
  return settleSplit(flipped, sel === 'over' ? -l : l)
}
/** Push-aware effective probability (the one implied by fair odds): (W + HW/2) / (W + HW/2 + L + HL/2). */
export function effP(s) {
  const w = s.win + s.half_win / 2
  const lo = s.loss + s.half_loss / 2
  return w + lo > 0 ? w / (w + lo) : null
}
/** True EV of a stake of 1 at odds o with a settlement split. */
export function evSplit(s, o) {
  return (s.win + s.half_win / 2) * (o - 1) - (s.loss + s.half_loss / 2)
}

export function ev(p, o) {
  const pp = num(p)
  const oo = num(o)
  if (pp === null || oo === null) return null
  return pp * oo - 1
}
/** Fractional Kelly as in pkg/football/model: fraction × (p·o − 1)/(o − 1), never negative, at most cap. */
export function kelly(p, o, fraction = 0.25, cap = 0.02) {
  const pp = num(p)
  const oo = num(o)
  if (pp === null || oo === null || oo <= 1 || pp <= 0) return 0
  const k = (pp * oo - 1) / (oo - 1)
  if (!(k > 0)) return 0
  return Math.min(cap, Math.max(0, fraction * k))
}
export const fairOdds = (p) => (num(p) && p > 0 ? 1 / p : null)

/**
 * The model's view of one selection, from the analysis payload: { p (push-aware effective), push, split? }.
 * Lines the payload lists directly use its numbers; other lines are computed from the score matrix.
 */
export function modelFor(model, market, sel, ln) {
  if (!model) return null
  const b = model.blend || {}
  switch (market) {
    case '1x2':
      return b[sel] != null ? { p: b[sel], push: 0 } : null
    case 'dc':
      return model.double_chance?.[sel] != null ? { p: model.double_chance[sel], push: 0 } : null
    case 'dnb': {
      const p = model.draw_no_bet?.[sel]
      return p != null ? { p, push: b.draw ?? null } : null
    }
    case 'btts':
      return model.btts?.[sel] != null ? { p: model.btts[sel], push: 0 } : null
    case 'ou': {
      if (ln == null || !model.score_matrix?.length) return null
      const key = String(ln)
      const s = ouSplit(model.score_matrix, Number(ln), sel)
      const listed = model.over_under?.[key]?.[sel]
      return { p: listed != null && Math.abs(ln * 2 - Math.round(ln * 2)) < 1e-9 && Math.round(ln * 2) % 2 === 1 ? listed : effP(s), push: s.push, split: s }
    }
    case 'ah': {
      if (ln == null) return null
      const homeLine = sel === 'home' ? Number(ln) : -Number(ln)
      const listed = model.asian_handicap?.[ahKey(homeLine)]
      const s = model.score_matrix?.length ? ahSplit(model.score_matrix, Number(ln), sel) : null
      let p = listed != null ? (sel === 'home' ? listed : 1 - listed) : s ? effP(s) : null
      return p != null ? { p, push: s ? s.push : null, split: s } : null
    }
  }
  return null
}

/** The market selection (fair price, best price, every book) for a selection. */
export function marketSel(market, m, sel, ln) {
  const key = ln == null ? '' : String(Number(ln))
  return (market?.selections || []).find((s) => s.market === m && s.selection === sel && (s.line == null ? '' : String(Number(s.line))) === key) || null
}

// ------------------------------------------------------------------ form
export const RESULT_LABEL = { W: 'Win', D: 'Draw', L: 'Loss' }

// ------------------------------------------------------------------ CSV
export function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.map((c) => esc(c.label)).join(','), ...rows.map((r) => cols.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))].join('\r\n')
}

/** Nice axis ticks for [lo, hi] (≈ count ticks). */
export function niceTicks(lo, hi, count = 4) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1, ticks: [0, 1] }
  if (hi === lo) {
    hi = lo + 1
    lo = lo - (lo === 0 ? 0 : 1)
  }
  const span = hi - lo
  const raw = span / Math.max(1, count)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag
  const a = Math.floor(lo / step) * step
  const b = Math.ceil(hi / step) * step
  const ticks = []
  for (let v = a; v <= b + step / 1e6; v += step) ticks.push(Math.round(v / step) * step)
  return { lo: a, hi: b, ticks, step }
}

/** Compact axis label: 0 / 1,000 / 10K / 1.2M */
export function compact(v) {
  const n = Number(v) || 0
  const a = Math.abs(n)
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M'
  if (a >= 1e4) return (n / 1e3).toFixed(Number.isInteger(n / 1e3) ? 0 : 1) + 'K'
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
