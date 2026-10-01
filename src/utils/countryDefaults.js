/**
 * Tax and time zone follow the organisation's country (backend: pkg/orgprefs
 * countrydefaults.go). After the country changes, suggestCountryDefaults()
 * asks whether to switch the default tax (e.g. VAT 16% in Kenya) and the time
 * zone; nothing changes without a confirmation and existing invoices keep
 * their tax.
 */
import api from '@/services/api'
import { confirmDialog } from '@/composables/useConfirm'
import { toast } from '@/composables/useToast'
import { refreshOrgPrefs } from '@/composables/useOrgPrefs'

const data = (r) => r.data?.data ?? r.data

export const taxText = (label, rate) => `${label || 'Tax'} ${Number(rate || 0).toString()}%`

export const countryDefaultsApi = {
  prefs: () => api.get('/org/prefs').then(data),
  defaults: (country) => api.get('/org/country-defaults', { params: { country } }).then(data),
  apply: (body) => api.post('/org/prefs/apply-defaults', body).then(data),
  dismiss: (key) => api.post('/org/prefs/dismiss-notice', { key }).then(data)
}

/** Ask to apply the country's tax / time zone after a country change. Returns true if applied. */
export async function suggestCountryDefaults() {
  let p
  try {
    p = await countryDefaultsApi.prefs()
  } catch {
    return false
  }
  const m = p?.mismatch
  if (!m || !p.can_edit) return false
  const d = m.suggested
  const lines = []
  if (m.tax) lines.push(`Default tax: ${taxText(d.tax_label, d.tax_rate)} (now ${taxText(m.current_tax_label, m.current_tax_rate)})`)
  const tz = m.timezone ? d.timezone : ''
  if (m.timezone) lines.push(`Time zone: ${d.timezone.replace(/_/g, ' ')} (now ${m.current_timezone.replace(/_/g, ' ')})${d.timezones?.length > 1 ? ' — you can pick another one in Settings' : ''}`)
  const ok = await confirmDialog({
    title: `Use ${p.country_name}'s tax and time zone?`,
    message: `${lines.join('\n')}\n\nExisting invoices keep their tax.${d.note ? '\n' + d.note : ''}`,
    confirmText: 'Update'
  })
  if (!ok) {
    try {
      await countryDefaultsApi.dismiss(m.key)
    } catch {
      /* ignore */
    }
    return false
  }
  try {
    await countryDefaultsApi.apply({ tax: m.tax, timezone: tz })
    await refreshOrgPrefs()
    toast.success('Tax and time zone updated — existing invoices keep their tax')
    return true
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Could not update the tax and time zone')
    return false
  }
}
