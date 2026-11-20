/**
 * Jackpot analyser helpers (UI side). The API does the real work (de-margining, blending, best-first ticket
 * search, coverage plan); these helpers only format what it returns and recompute the expected value when the
 * person moves the "share with other winners" slider, so the slider answers instantly.
 *
 * Selections are the bookmakers' symbols: "1" home win, "X" draw, "2" away win.
 */

export const SYMS = ['1', 'X', '2']
export const SYM_KEY = { '1': 'home', X: 'draw', '2': 'away' }
export const KEY_SYM = { home: '1', draw: 'X', away: '2', h: '1', d: 'X', a: '2', '1': '1', x: 'X', X: 'X', '2': '2' }

export const BOOKMAKERS = ['SportPesa', 'Betika', 'Odibets', 'Mozzartbet', 'Betway', 'Shabiki', 'SportyBet', '1xBet']

/** "1" | "X" | "2" from anything the API might send (home/draw/away, h/d/a, 1/x/2). */
export const sym = (s) => (s == null ? '' : KEY_SYM[String(s)] || KEY_SYM[String(s).toLowerCase()] || String(s).toUpperCase())

/** A ticket as the bookmakers print it: "1 1 2 X …"; multi-selections joined ("1X"). */
export function ticketText(sels) {
  return (sels || []).map((s) => (Array.isArray(s) ? s.map(sym).join('') : sym(s))).join(' ')
}

/** "about 1 in 160,000" for a probability (rounded to a readable figure). */
export function oneIn(p) {
  if (!(p > 0)) return 'no realistic chance'
  const n = 1 / p
  if (n < 1.05) return 'almost every time'
  const r = n >= 1e6 ? Math.round(n / 1e5) * 1e5 : n >= 1e4 ? Math.round(n / 1e3) * 1e3 : n >= 1000 ? Math.round(n / 100) * 100 : n >= 100 ? Math.round(n / 10) * 10 : n >= 10 ? Math.round(n) : Math.round(n * 10) / 10
  return `about 1 in ${r.toLocaleString('en')}`
}

/** A small percentage with enough digits to read: 0.00062%, 0.031%, 4.2%, 38%. */
export function smallPct(p) {
  if (p == null || !Number.isFinite(Number(p))) return '—'
  const v = Number(p) * 100
  if (v === 0) return '0%'
  if (v >= 10) return v.toFixed(1) + '%'
  if (v >= 1) return v.toFixed(2) + '%'
  return Number(v.toPrecision(2)) + '%'
}

/**
 * Poisson-binomial distribution of the number of correct games, given each game's chance of being right.
 * Returns dist[k] = P(exactly k correct), k = 0..n.
 */
export function poissonBinomial(ps) {
  let dist = [1]
  for (const p of ps) {
    const q = Math.max(0, Math.min(1, Number(p) || 0))
    const next = new Array(dist.length + 1).fill(0)
    for (let k = 0; k < dist.length; k++) {
      next[k] += dist[k] * (1 - q)
      next[k + 1] += dist[k] * q
    }
    dist = next
  }
  return dist
}
export function atLeast(dist, k) {
  let s = 0
  for (let i = k; i < dist.length; i++) s += dist[i]
  return s
}

/**
 * Expected value of one ticket (one combination): the prize when every game is right (divided between the
 * expected number of winners: 1 + others), plus each bonus tier for exactly k right, minus the ticket price.
 *   shareWith: how many OTHER winning tickets you expect to split the top prize with (0 = you alone).
 *   bonuses: [{ correct, amount }] — amount paid for exactly `correct` right (bonuses are usually shared too:
 *   bonusShare applies the same split to them when true).
 */
export function expectedValue({ dist, prize, price, bonuses = [], shareWith = 0, bonusShare = false }) {
  const n = dist.length - 1
  const split = 1 + Math.max(0, Number(shareWith) || 0)
  const top = (dist[n] || 0) * (Number(prize) || 0) / split
  let bonus = 0
  const parts = []
  for (const b of bonuses || []) {
    const k = Number(b.correct)
    const amt = Number(b.amount) || 0
    if (!(k >= 0 && k < n) || !amt) continue
    const v = (dist[k] || 0) * amt / (bonusShare ? split : 1)
    bonus += v
    parts.push({ correct: k, p: dist[k] || 0, amount: amt, value: v })
  }
  const ret = top + bonus
  return { top, bonus, parts, ret, ev: ret - (Number(price) || 0), returnPct: price > 0 ? ret / price : null, split }
}

/** "Mon 24 Nov, 14:00" in the organisation's time zone. */
export function fmtClose(iso, tz) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { timeZone: tz || 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** Copy text to the clipboard; resolves true/false. */
export async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = t
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
