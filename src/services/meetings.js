/**
 * Meetings API — scheduled calls, calendar invites (.ics), transcripts.
 * Backend: /api/v1/meetings (pkg/meetings).
 */
import api, { listFrom } from '@/services/api'
import { downloadBlob } from '@/utils/format'

const unwrap = (res) => res?.data?.data ?? res?.data ?? {}

/** When a blob request fails, the JSON error body arrives as a Blob — decode it. */
async function blobError(err) {
  const data = err?.response?.data
  if (data instanceof Blob) {
    try {
      err.response.data = JSON.parse(await data.text())
    } catch {
      /* keep original */
    }
  }
  return err
}

function filenameFrom(res, fallback) {
  const cd = res?.headers?.['content-disposition'] || ''
  const m = /filename="?([^";]+)"?/i.exec(cd)
  return m ? m[1] : fallback
}

async function download(url, fallbackName) {
  try {
    const res = await api.get(url, { responseType: 'blob' })
    const name = filenameFrom(res, fallbackName)
    downloadBlob(res.data, name)
    return name
  } catch (err) {
    throw await blobError(err)
  }
}

export const meetingsApi = {
  async list(params = {}) {
    const res = await api.get('/meetings', { params })
    const data = unwrap(res)
    return { meetings: listFrom(res, 'meetings'), smtpConfigured: !!data.smtp_configured }
  },
  async get(id) {
    const data = unwrap(await api.get(`/meetings/${id}`))
    return { meeting: data.meeting, smtpConfigured: !!data.smtp_configured }
  },
  async create(payload) {
    return unwrap(await api.post('/meetings', payload))
  },
  async update(id, payload) {
    return unwrap(await api.put(`/meetings/${id}`, payload))
  },
  async remove(id) {
    return unwrap(await api.delete(`/meetings/${id}`))
  },
  async cancel(id, notify = true) {
    return unwrap(await api.post(`/meetings/${id}/cancel`, { notify }))
  },
  async start(id) {
    return unwrap(await api.post(`/meetings/${id}/start`))
  },
  async invite(id, emails) {
    return unwrap(await api.post(`/meetings/${id}/invite`, emails?.length ? { emails } : {}))
  },
  async saveTranscript(id, payload) {
    // Summaries can take a while when the Anthropic API is used.
    return unwrap(await api.post(`/meetings/${id}/transcript`, payload, { timeout: 90000 }))
  },
  async getTranscript(id) {
    return unwrap(await api.get(`/meetings/${id}/transcript`)).transcript
  },
  downloadIcs(meeting) {
    return download(`/meetings/${meeting.id}/ics`, 'invite.ics')
  },
  downloadTranscript(meeting) {
    return download(`/meetings/${meeting.id}/transcript.txt`, 'transcript.txt')
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers

export const browserTimezone = (() => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && tz !== 'UTC' && !tz.startsWith('Etc/') ? tz : 'Australia/Sydney'
  } catch {
    return 'Australia/Sydney'
  }
})()

export function timezoneList() {
  let zones = []
  try {
    zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : []
  } catch {
    zones = []
  }
  const common = ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Darwin', 'Australia/Hobart', 'Pacific/Auckland', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Paris', 'Africa/Nairobi', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'UTC']
  const set = new Set([...common, ...zones, browserTimezone])
  return Array.from(set)
}

/** Parts of a date in a given IANA zone: { date: 'YYYY-MM-DD', time: 'HH:MM' } */
export function partsInZone(value, timeZone) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  let parts
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  }
  const get = (t) => parts.find((p) => p.type === t)?.value || ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

export function fmtTime(value, timeZone) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const opts = { hour: 'numeric', minute: '2-digit' }
  if (timeZone) opts.timeZone = timeZone
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(d)
  } catch {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d)
  }
}

export function fmtDay(value, opts = {}) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: opts.year ? 'numeric' : undefined }).format(d)
}

export function fmtRange(m, timeZone) {
  const s = new Date(m.start_at)
  const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...(timeZone ? { timeZone } : {}) }).format(s)
  return `${day}, ${fmtTime(m.start_at, timeZone)} – ${fmtTime(m.end_at, timeZone)}`
}

export function durationLabel(m) {
  const mins = Math.round((new Date(m.end_at) - new Date(m.start_at)) / 60000)
  if (!mins || mins < 0) return ''
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const r = mins % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

export function isPast(m, now = Date.now()) {
  return m.status === 'completed' || new Date(m.end_at).getTime() < now
}

export function isLive(m, now = Date.now()) {
  return m.status !== 'cancelled' && m.status !== 'completed' && new Date(m.start_at).getTime() - 10 * 60000 <= now && new Date(m.end_at).getTime() >= now
}

export function displayStatus(m, now = Date.now()) {
  if (m.status === 'cancelled') return { label: 'Cancelled', cls: 'danger' }
  if (m.status === 'completed') return { label: 'Completed', cls: 'paid' }
  if (m.status === 'in_progress' && new Date(m.end_at).getTime() >= now) return { label: 'In progress', cls: 'info' }
  if (isLive(m, now)) return { label: 'Starting now', cls: 'info' }
  if (new Date(m.end_at).getTime() < now) return { label: 'Ended', cls: 'draft' }
  return { label: 'Scheduled', cls: 'sent' }
}

export function locationLabel(m) {
  if (m.location_type === 'external') {
    try {
      const host = new URL(m.join_url).hostname
      if (/zoom/.test(host)) return 'Zoom'
      if (/teams|microsoft|live\.com/.test(host)) return 'Microsoft Teams'
      if (/meet\.google/.test(host)) return 'Google Meet'
      if (/webex/.test(host)) return 'Webex'
      return host
    } catch {
      return 'External link'
    }
  }
  if (m.location_type === 'physical') return m.location || 'In person'
  return 'In-app room'
}

export function initials(name = '') {
  const parts = String(name).trim().split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

/** Prefilled mailto: link used when SMTP is not configured. */
export function mailtoLink(m, { cancelled = false } = {}) {
  const to = (m.participants || []).map((p) => p.email).filter(Boolean).join(',')
  const when = `${fmtRange(m, m.timezone)} (${m.timezone})`
  const subject = `${cancelled ? 'Cancelled' : 'Invitation'}: ${m.title} @ ${when}`
  const lines = cancelled
    ? [`Hi all,`, '', `The meeting "${m.title}" scheduled for ${when} has been cancelled.`]
    : [
        `Hi all,`,
        '',
        `You're invited to: ${m.title}`,
        `When: ${when}`,
        m.join_url ? `Join: ${m.join_url}` : null,
        m.location ? `Where: ${m.location}` : null,
        m.description ? `\nAgenda:\n${m.description}` : null,
        '',
        'The calendar invitation (.ics) is attached — open it to add the meeting to your calendar.'
      ]
  const body = lines.filter((l) => l !== null).join('\n')
  return `mailto:${encodeURIComponent(to).replace(/%2C/g, ',').replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
