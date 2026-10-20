// Who gets emails (Settings) and My profile → Email notifications.
// Backend: pkg/emailprefs — one resolver for every internal email.
import api from './api'
import { hasModule } from '@/composables/useEntitlements'
import { term, termLower, hasFeature } from '@/composables/useAccess'

const unwrap = (r) => r.data?.data ?? r.data
const enc = encodeURIComponent

export const emailRecipientsApi = {
  /** { mode, mode_source, business_type, modes, categories, people, counts } */
  get: () => api.get('/email-recipients').then(unwrap),
  setMode: (mode) => api.put('/email-recipients/policy', { mode }).then(unwrap),
  /** body: { all_off?: bool, overrides?: { [category]: bool | null } } → { person, mode } */
  setPerson: (id, body) => api.put(`/email-recipients/users/${enc(id)}`, body).then(unwrap),
  /** { category, label, recipients, enabled, note } */
  preview: (category) => api.get('/email-recipients/preview', { params: { category } }).then(unwrap)
}

export const myEmailPrefsApi = {
  /** { member, mode, categories: [{ key, label, description, on, self_on, locked, reason, reason_text }], all_off, all_locked } */
  get: () => api.get('/me/email-preferences').then(unwrap),
  /** body: { all_off?: bool, categories?: { [category]: bool } } */
  save: (body) => api.put('/me/email-preferences', body).then(unwrap)
}

/** Short hint under a person's switch in the admin table (reason codes from the API). */
export const REASON_HINTS = {
  default: 'Default',
  admin_on: 'Switched on',
  mode: 'Off by the mode',
  admin_off: 'Turned off',
  all_off: 'All off',
  self_off: 'Turned off by them',
  self_all_off: 'Turned off by them',
  not_eligible: 'Not for this role'
}

export const MODE_ICONS = {
  everyone: 'fa-solid fa-users',
  owners_managers: 'fa-solid fa-user-tie',
  owners: 'fa-solid fa-user-shield'
}

/** The module (and business-type feature) an email belongs to: its switch is only shown when they are on. */
const CATEGORY_MODULE = { bookings: 'bookings', agenda: 'bookings', bill_reminders: 'accounting', bar_night_report: 'inventory' }
const CATEGORY_FEATURE = { bar_night_report: 'bar_stock' }

export function categoryShown(c) {
  const m = CATEGORY_MODULE[c.key]
  const f = CATEGORY_FEATURE[c.key]
  return (!m || hasModule(m)) && (!f || hasFeature(f))
}

/** Category names in the organisation's words ("Reservation emails" for a club). */
export function localCategory(c) {
  if (c.key !== 'bookings' && c.key !== 'agenda') return c
  return {
    ...c,
    label: c.key === 'bookings' ? `${term('booking')} emails` : c.label,
    description: (c.description || '').replace(/\bbookings\b/g, termLower('bookings')).replace(/\bbooking\b/g, termLower('booking'))
  }
}
