// Single sign-on (Sign in with Google / Microsoft) — backend pkg/sso.
import api from './api'
import { API_BASE_URL } from '../config'

const data = (r) => r.data?.data ?? r.data

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const ssoApi = {
  /**
   * Providers the login page offers (enabled + configured). Never cached
   * (the API sends no-store and the service worker never caches /api/).
   * `retries`: try again after a short pause when the request fails (flaky
   * mobile network, a cold server) instead of silently hiding the buttons.
   */
  async providers({ retries = 0, delay = 1200 } = {}) {
    for (let attempt = 0; ; attempt++) {
      try {
        return data(await api.get('/public/sso/providers'))?.providers || []
      } catch (e) {
        if (attempt >= retries) throw e
        await wait(delay)
      }
    }
  },
  /**
   * Browser URL that starts the provider round trip. `startUrl` from the
   * providers list is on the redirect URI's host (PUBLIC_API_URL), so the
   * browser cookie set there comes back with the callback.
   */
  startUrl(provider, redirect, startUrl = '') {
    const base = String(API_BASE_URL || '/api/v1').replace(/\/$/, '')
    const q = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
    return `${startUrl || `${base}/public/sso/${encodeURIComponent(provider)}/start`}${q}`
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
  async adminProviders({ refresh = false } = {}) {
    return data(await api.get('/sso/admin/providers', { params: refresh ? { refresh: 1 } : {} }))
  },
  /** One provider's view with its status checklist (refresh: "Check now"). */
  async providerStatus(provider, { refresh = false } = {}) {
    return data(await api.get(`/sso/admin/providers/${provider}/status`, { params: refresh ? { refresh: 1 } : {} }))
  },
  async saveProvider(provider, body) {
    return data(await api.put(`/sso/admin/providers/${provider}`, body))
  }
}

export const PROVIDER_NAMES = { google: 'Google', microsoft: 'Microsoft' }

const CONSOLE = {
  google: 'Google Cloud console → APIs & Services → Credentials → your OAuth client',
  microsoft: 'Microsoft Entra admin centre → App registrations → your app'
}

/**
 * Friendly text for the error codes the callback sends back:
 * { title, text, admin? } — `admin` is a hint for whoever set sign-in up.
 * Extra values from the error page's URL: provider, email, redirectUri, detail.
 */
export function ssoErrorText(code, { provider, email, redirectUri, detail } = {}) {
  const p = PROVIDER_NAMES[provider] || 'the provider'
  const where = CONSOLE[provider] || 'the provider’s developer console'
  const settings = 'System settings → Sign-in providers'
  switch (code) {
    case 'no_account':
      return {
        title: 'No DASYIN account',
        text: `There's no DASYIN account for ${email || 'this email address'}. Ask your administrator to invite you, then sign in again.`,
        admin: `Invite ${email || 'this person'} from Users (with this exact email), or let everyone at their email domain join under Settings → Security.`
      }
    case 'email_unverified':
      return { title: 'Email not verified', text: `${p} didn't confirm a verified email address for this account, so we can't match it to a DASYIN account. Use an account with a verified email, or sign in with your password.` }
    case 'account_disabled':
      return { title: 'Account disabled', text: 'This DASYIN account has been disabled. Contact your administrator.' }
    case 'org_suspended':
      return { title: 'Workspace suspended', text: 'Your organisation’s workspace is suspended. Contact DASYIN support.' }
    case 'user_limit':
      return { title: 'No seats left', text: 'Your organisation has reached the number of users its plan allows. Ask your administrator to upgrade or invite you.' }
    case 'cancelled':
      return {
        title: 'Sign-in cancelled',
        text: `You cancelled signing in with ${p}, or ${p} didn't allow it (access_denied).`,
        admin:
          provider === 'microsoft'
            ? `If Microsoft asked for admin approval, grant consent for the app in ${where} → API permissions.`
            : `If Google said “Access blocked” or that the app is being tested, the OAuth consent screen is in Testing mode: add this account under OAuth consent screen → Test users, or publish the app.`
      }
    case 'access_blocked':
      return {
        title: 'Sign-in blocked',
        text: `${p} blocked this sign-in for your account.`,
        admin: provider === 'microsoft' ? `Check the app's supported account types and tenant in ${settings}.` : `The OAuth consent screen is set to Internal (only one Google Workspace can sign in), or a Workspace admin policy blocks the app. Use user type External, or allow the app in the Workspace admin console.`
      }
    case 'redirect_uri_mismatch':
      return {
        title: 'Sign-in isn’t set up correctly',
        text: `${p} refused to send you back to DASYIN because this address isn't registered with the app (redirect_uri_mismatch). Sign in with your password for now, and let your administrator know.`,
        admin: `Add this exact redirect URI in ${where} → ${provider === 'microsoft' ? 'Authentication → Web → Redirect URIs' : 'Authorised redirect URIs'}, then save:`,
        value: redirectUri || ''
      }
    case 'invalid_client':
      return {
        title: 'Sign-in isn’t set up correctly',
        text: `${p} didn't accept DASYIN's app credentials (invalid_client), so signing in with ${p} doesn't work right now. Sign in with your password, and let your administrator know.`,
        admin:
          provider === 'microsoft'
            ? `The client secret in ${settings} is wrong or expired. Create a new one under Certificates & secrets and paste its Value (not the Secret ID).`
            : `The client secret (or client ID) in ${settings} is wrong or was reset. Copy the secret from ${where} and save it again.`
      }
    case 'expired':
      return { title: 'Sign-in expired', text: 'That sign-in attempt expired or was already used. Please try again.' }
    case 'browser_mismatch':
      return {
        title: 'Start again',
        text: 'This sign-in was started in a different browser or tab. Please start again from the sign-in page.',
        admin: `If this happens every time, check ${settings}: the redirect URI must be on the same address the app uses to reach the server (PUBLIC_API_URL), and the browser must allow cookies.`
      }
    case 'identity_in_use':
      return { title: 'Already linked', text: `That ${p} account is already linked to another DASYIN user.` }
    case 'provider_disabled':
      return { title: 'Not available', text: `Sign-in with ${p} isn't enabled.`, admin: `Turn it on in ${settings}.` }
    case 'provider_unavailable':
      return { title: 'Provider unavailable', text: `We couldn't reach ${p}. Please try again in a moment.`, admin: `If it keeps happening, open ${settings} and use Check now — the server may not reach ${p}.` }
    case 'invalid_token':
      return { title: 'Sign-in failed', text: `${p} sign-in couldn't be verified. Please try again.`, admin: `${settings} shows the last error. A wrong client ID or a server clock that is far off cause this.` }
    case 'provider_error':
      return {
        title: 'Sign-in failed',
        text: `${p} returned an error${detail ? ` (${detail})` : ''}. Please try again.`,
        admin: `${settings} shows the last error ${p} returned.`
      }
    default:
      return { title: 'Sign-in failed', text: 'Something went wrong signing you in. Please try again.' }
  }
}
