/** Shared helpers for the Bookings module. */

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

/** HH:MM in local time */
export function hhmm(value) {
  const d = value instanceof Date ? value : new Date(value)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatTime(value) {
  const d = value instanceof Date ? value : new Date(value)
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

/** Build a local Date from YYYY-MM-DD and HH:MM */
export function combine(dateIso, time) {
  if (!dateIso || !time) return null
  const [h, m] = time.split(':').map(Number)
  const d = new Date(dateIso + 'T00:00:00')
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Monday of the week containing d */
export function startOfWeek(d = new Date()) {
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

export function sameDay(a, b) {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}
