/**
 * Source check (football-free-contract.md §1 SourceCheck) → the shape SourceBadge shows:
 * [{ label, status: agree|minor|conflict|none, sources: [{ name, value, agree, when }], note }].
 */
import { providerName, fmtDateTime } from '../fb'

export const STATUS_OF = { agree: 'agree', minor: 'minor', conflict: 'conflict', single: 'none', unchecked: 'none' }

export function fmtValue(key, v, tz) {
  if (v === null || v === undefined || v === '') return '—'
  if (key === 'kickoff' && typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v)) return fmtDateTime(v, tz)
  if (/\.position$/.test(key) && Number.isFinite(Number(v))) return ordinal(Number(v))
  return String(v)
}
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function toChecks(items, tz) {
  return (items || []).map((it) => {
    const off = new Set((it.disagreeing || []).map((d) => d.source))
    return {
      key: it.key,
      label: it.label,
      status: STATUS_OF[it.status] || 'none',
      sources: (it.values || []).map((v) => ({ name: providerName(v.source), value: fmtValue(it.key, v.value, tz), agree: off.has(v.source) ? false : null, when: '' })),
      note: it.note || ''
    }
  })
}

/** Items of one or more sections (standings, results, h2h, kickoff, identity), optionally one side. */
export function checksFor(sc, sections, tz, side) {
  if (!sc || !sc.items) return []
  const want = Array.isArray(sections) ? sections : [sections]
  return toChecks(
    sc.items.filter((i) => want.includes(i.section) && (!side || !i.side || i.side === side)),
    tz
  )
}
