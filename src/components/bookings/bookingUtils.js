/** Shared helpers for the Bookings module. */
import { orgDefaults } from '@/utils/orgDefaults'

export const BOOKING_STATUSES = [
  { value: 'scheduled', label: 'Scheduled', badge: 'info', icon: 'fa-regular fa-calendar' },
  { value: 'confirmed', label: 'Confirmed', badge: 'converted', icon: 'fa-solid fa-circle-check' },
  { value: 'in_progress', label: 'In progress', badge: 'warning', icon: 'fa-solid fa-spinner' },
  { value: 'completed', label: 'Completed', badge: 'success', icon: 'fa-solid fa-flag-checkered' },
  { value: 'cancelled', label: 'Cancelled', badge: 'void', icon: 'fa-solid fa-ban' },
  { value: 'no_show', label: 'No-show', badge: 'danger', icon: 'fa-solid fa-user-slash' }
]

const STATUS_MAP = Object.fromEntries(BOOKING_STATUSES.map((s) => [s.value, s]))

export function statusMeta(status) {
  return STATUS_MAP[status] || { value: status, label: status || 'Unknown', badge: 'draft', icon: 'fa-regular fa-circle' }
}

/** Statuses that still occupy the calendar / count as upcoming work. */
export const ACTIVE_STATUSES = ['scheduled', 'confirmed', 'in_progress']

/** Status transitions offered in the detail drawer. */
export function statusActions(status) {
  switch (status) {
    case 'scheduled':
      return [
        { to: 'confirmed', label: 'Confirm', icon: 'fa-solid fa-check', kind: 'primary' },
        { to: 'in_progress', label: 'Start', icon: 'fa-solid fa-play' },
        { to: 'no_show', label: 'No-show', icon: 'fa-solid fa-user-slash' },
        { to: 'cancelled', label: 'Cancel', icon: 'fa-solid fa-ban', kind: 'danger' }
      ]
    case 'confirmed':
      return [
        { to: 'in_progress', label: 'Start', icon: 'fa-solid fa-play', kind: 'primary' },
        { to: 'no_show', label: 'No-show', icon: 'fa-solid fa-user-slash' },
        { to: 'cancelled', label: 'Cancel', icon: 'fa-solid fa-ban', kind: 'danger' }
      ]
    case 'in_progress':
      return [
        { to: 'completed', label: 'Complete', icon: 'fa-solid fa-flag-checkered', kind: 'success' },
        { to: 'cancelled', label: 'Cancel', icon: 'fa-solid fa-ban', kind: 'danger' }
      ]
    case 'completed':
      return [{ to: 'in_progress', label: 'Reopen', icon: 'fa-solid fa-rotate-left' }]
    case 'cancelled':
    case 'no_show':
      return [{ to: 'scheduled', label: 'Reinstate', icon: 'fa-solid fa-rotate-left' }]
    default:
      return []
  }
}

export function personName(p) {
  if (!p) return ''
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || ''
}

export function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
}

export function vehicleLabel(v) {
  if (!v) return ''
  const main = [v.year || '', v.make, v.model].filter(Boolean).join(' ')
  return v.license_plate ? `${main} · ${v.license_plate}` : main
}

const pad = (n) => String(n).padStart(2, '0')

/*
 * Business time. Bookings are made and shown in the organisation's time zone
 * (Settings → where the business is based), not the browser's: 10:00 typed by
 * an owner travelling in Sydney is 10:00 at the Nairobi shop.
 *
 * Inside the Bookings module every Date object is a "wall" date: its local
 * fields (getHours(), getDate() …) are the business's clock and calendar.
 * Booking times from the API (ISO strings) are real instants: toWall() turns
 * them into wall dates, fromWall() turns a wall date back into the instant to
 * send to the API. Helpers below accept either: strings / numbers are
 * instants, Date objects are wall dates.
 */
const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const zoneOk = {}
/** The business's IANA time zone (the organisation's; the browser's until it is known). */
export function bizZone() {
  const tz = orgDefaults.timezone
  if (tz) {
    if (zoneOk[tz] === undefined) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
        zoneOk[tz] = true
      } catch {
        zoneOk[tz] = false
      }
    }
    if (zoneOk[tz]) return tz
  }
  return browserZone()
}

/** True when the browser's clock is in a different zone than the business. */
export function zoneDiffers() {
  const z = bizZone()
  if (z === browserZone()) return false
  const now = Date.now()
  return offsetMs(z, now) !== -new Date(now).getTimezoneOffset() * 60000
}

const partFmt = {}
function partsIn(tz, ms) {
  if (!partFmt[tz]) {
    partFmt[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  const o = {}
  for (const p of partFmt[tz].formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = Number(p.value)
  if (o.hour === 24) o.hour = 0
  return o
}

/** The zone's offset from UTC (ms) at instant ms. */
function offsetMs(tz, ms) {
  const o = partsIn(tz, ms)
  const asUtc = Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second)
  return asUtc - (ms - (((ms % 1000) + 1000) % 1000))
}

/** An instant (ISO string, ms or Date) → a wall Date showing business time. */
export function toWall(value) {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (Number.isNaN(ms)) return new Date(NaN)
  const o = partsIn(bizZone(), ms)
  return new Date(o.year, o.month - 1, o.day, o.hour, o.minute, o.second, ((ms % 1000) + 1000) % 1000)
}

/** A wall Date (business time) → the real instant (Date). */
export function fromWall(wall) {
  const w = wall instanceof Date ? wall : new Date(wall)
  if (Number.isNaN(w.getTime())) return new Date(NaN)
  const tz = bizZone()
  const guess = Date.UTC(w.getFullYear(), w.getMonth(), w.getDate(), w.getHours(), w.getMinutes(), w.getSeconds(), w.getMilliseconds())
  let ms = guess - offsetMs(tz, guess)
  // Around a daylight-saving change the offset at the result can differ from the guess's.
  const second = guess - offsetMs(tz, ms)
  if (second !== ms) ms = second
  return new Date(ms)
}

/** Now, as a wall Date. */
export function nowWall() {
  return toWall(Date.now())
}

const asWall = (value) => (value instanceof Date ? value : toWall(value))

/** HH:MM in business time (strings are instants, Dates wall dates) */
export function hhmm(value) {
  const d = asWall(value)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatTime(value) {
  const d = asWall(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d)
}

export function formatDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

export function minutesBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 60000)
}

/** Build a wall Date (business time) from YYYY-MM-DD and HH:MM */
export function combine(dateIso, time) {
  if (!dateIso || !time) return null
  const [h, m] = time.split(':').map(Number)
  const d = new Date(dateIso + 'T00:00:00')
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

/** The instant (ISO string) of a business date + time, for the API. */
export function bizInstant(dateIso, time) {
  const w = combine(dateIso, time)
  return w ? fromWall(w).toISOString() : null
}

export function startOfDay(d = nowWall()) {
  const x = new Date(asWall(d))
  x.setHours(0, 0, 0, 0)
  return x
}

/** Monday of the week containing d */
export function startOfWeek(d = nowWall()) {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  return x
}

export function addDaysDate(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Same business day (strings are instants, Dates wall dates). */
export function sameDay(a, b) {
  const x = asWall(a)
  const y = asWall(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}
