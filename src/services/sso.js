// Single sign-on (Sign in with Google / Microsoft) — backend pkg/sso.
import api from './api'
import { API_BASE_URL } from '../config'

const data = (r) => r.data?.data ?? r.data

export const ssoApi = {
  /** Providers the login page offers (enabled + configured). */
  async providers() {
    return data(await api.get('/public/sso/providers'))?.providers || []
  },
  /** Browser URL that starts the provider round trip. */
  startUrl(provider, redirect) {
    const base = String(API_BASE_URL || '/api/v1').replace(/\/$/, '')
    const q = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
    return `${base}/public/sso/${encodeURIComponent(provider)}/start${q}`
  },
  /** Swap the one-time code for a session (single use, 2 minutes). */
  async exchange(code) {
    const r = await api.post('/public/sso/exchange', { code })
    return { session: data(r), redirect: r.data?.redirect || '', provider: r.data?.provider || '' }
  },
  // signed in
  async identities() {
    return data(await api.get('/sso/identities'))
  },
  async link(provider, redirect = '/profile') {
    return data(await api.post(`/sso/${provider}/link`, { redirect }))
  },
  async unlink(id) {
    return data(await api.delete(`/sso/identities/${id}`))
  },
  async domains() {
    return data(await api.get('/sso/domains'))
  },
  async addDomain(domain, role) {
    return data(await api.post('/sso/domains', { domain, role }))
  },
  async deleteDomain(id) {
    return data(await api.delete(`/sso/domains/${id}`))
  },
  // super admin
  async adminProviders() {
    return data(await api.get('/sso/admin/providers'))
  },
  async saveProvider(provider, body) {
    return data(await api.put(`/sso/admin/providers/${provider}`, body))
  }
}

export const PROVIDER_NAMES = { google: 'Google', microsoft: 'Microsoft' }

/** Friendly text for the error codes the callback sends back. */
export function ssoErrorText(code, { provider, email } = {}) {
  const p = PROVIDER_NAMES[provider] || 'the provider'
  switch (code) {
    case 'no_account':
      return { title: 'No DASYIN account', text: `There's no DASYIN account for ${email || 'this email address'}. Ask your administrator to invite you, then sign in again.` }
    case 'email_unverified':
      return { title: 'Email not verified', text: `${p} didn't confirm a verified email address for this account, so we can't match it to a DASYIN account. Use an account with a verified email, or sign in with your password.` }
    case 'account_disabled':
      return { title: 'Account disabled', text: 'This DASYIN account has been disabled. Contact your administrator.' }
    case 'org_suspended':
      return { title: 'Workspace suspended', text: 'Your organisation’s workspace is suspended. Contact DASYIN support.' }
    case 'user_limit':
      return { title: 'No seats left', text: 'Your organisation has reached the number of users its plan allows. Ask your administrator to upgrade or invite you.' }
    case 'cancelled':
      return { title: 'Sign-in cancelled', text: `You cancelled signing in with ${p}.` }
    case 'expired':
      return { title: 'Sign-in expired', text: 'That sign-in attempt expired or was already used. Please try again.' }
    case 'browser_mismatch':
      return { title: 'Start again', text: 'This sign-in was started in a different browser or tab. Please start again from the sign-in page.' }
    case 'identity_in_use':
      return { title: 'Already linked', text: `That ${p} account is already linked to another DASYIN user.` }
    case 'provider_disabled':
      return { title: 'Not available', text: `Sign-in with ${p} isn't enabled.` }
    case 'provider_unavailable':
      return { title: 'Provider unavailable', text: `We couldn't reach ${p}. Please try again in a moment.` }
    case 'invalid_token':
    case 'provider_error':
      return { title: 'Sign-in failed', text: `${p} sign-in couldn't be verified. Please try again.` }
    default:
      return { title: 'Sign-in failed', text: 'Something went wrong signing you in. Please try again.' }
  }
}
