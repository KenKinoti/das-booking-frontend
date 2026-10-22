<template>
  <div class="sp" data-testid="signin-providers">
    <div class="sp-head">
      <div>
        <h2>Sign-in providers</h2>
        <p class="muted">Let people sign in with their Google or Microsoft account. They still need a DASYIN account with the same verified email (or a domain their organisation allows under Settings → Security).</p>
      </div>
    </div>

    <div v-if="loading" class="ui-skeleton" style="height: 220px"></div>
    <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <template v-else>
      <div class="sp-grid">
        <form v-for="p in providers" :key="p.provider" class="sp-card" :data-testid="`provider-${p.provider}`" novalidate autocomplete="off" @submit.prevent="save(p)">
          <div class="sp-card__head">
            <span class="sp-logo"><ProviderLogo :provider="p.provider" /></span>
            <div class="sp-title">
              <h3>{{ p.name }}</h3>
              <span class="ui-badge" :class="p.usable ? 'ui-badge--success' : p.enabled ? 'ui-badge--warning' : 'ui-badge--draft'">{{ p.usable ? 'On' : p.enabled ? 'Needs credentials' : 'Off' }}</span>
              <span v-if="p.test_issuer" class="ui-badge ui-badge--warning" title="SSO_TEST_ISSUERS=1">Test issuer</span>
            </div>
            <label class="ui-switch">
              <input v-model="draft[p.provider].enabled" type="checkbox" :data-testid="`enable-${p.provider}`" />
              <span>Enabled</span>
            </label>
          </div>

          <div v-if="p.configured && !p.enabled" class="ui-alert ui-alert--warning sp-off" role="alert" :data-testid="`off-warning-${p.provider}`">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div class="sp-off__text">
              <strong>{{ p.name }} sign-in is off — the button isn't on the sign-in page.</strong>
              <span>{{ p.switched === 'off' ? 'An administrator switched it off. Saving new credentials keeps it off.' : 'The client ID and secret are saved, but it was never switched on.' }}</span>
            </div>
            <button type="button" class="ui-btn ui-btn--primary ui-btn--sm sp-off__btn" :disabled="!!saving" :data-testid="`turn-on-${p.provider}`" @click="turnOn(p)">
              <i :class="saving === p.provider ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-power-off'"></i> Turn on
            </button>
          </div>

          <section class="sp-status" :data-testid="`status-${p.provider}`" :data-ready="p.status?.ready ? 'yes' : 'no'" aria-label="Status">
            <div class="sp-status__head">
              <div class="sp-shows" :class="p.status?.shows_on_login ? 'is-yes' : 'is-no'" :data-testid="`shows-${p.provider}`">
                <i :class="p.status?.shows_on_login ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'" aria-hidden="true"></i>
                <div>
                  <strong>Shows on the sign-in page: {{ p.status?.shows_on_login ? 'yes' : 'no' }}</strong>
                  <span>{{ reasonText(p) }}</span>
                </div>
              </div>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="checking === p.provider" :data-testid="`check-${p.provider}`" @click="checkNow(p)">
                <i class="fa-solid fa-rotate" :class="{ spin: checking === p.provider }"></i> Check now
              </button>
            </div>
            <ul v-show="!allGood(p) || expanded[p.provider]" :id="`checks-${p.provider}`" class="sp-checks">
              <li v-for="c in p.status?.checks || []" :key="c.id" class="sp-check" :class="`is-${c.state}`" :data-testid="`check-${p.provider}-${c.id}`" :data-state="c.state">
                <i :class="stateIcon(c.state)" aria-hidden="true"></i>
                <div class="sp-check__body">
                  <span class="sp-check__label">{{ c.label }}<span class="sr-only"> — {{ stateText(c.state) }}</span></span>
                  <span class="sp-check__detail">{{ c.detail }}<template v-if="c.at && c.id !== 'discovery'"> · {{ ago(c.at) }}</template></span>
                </div>
              </li>
            </ul>
            <p class="sp-status__foot">
              <button v-if="allGood(p)" type="button" class="sp-toggle" :aria-expanded="expanded[p.provider] ? 'true' : 'false'" :aria-controls="`checks-${p.provider}`" :data-testid="`toggle-checks-${p.provider}`" @click="expanded = { ...expanded, [p.provider]: !expanded[p.provider] }">
                <i :class="expanded[p.provider] ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
                {{ expanded[p.provider] ? 'Hide the checks' : `All ${p.status.checks.length} checks passed — show them` }}
              </button>
              <span>Checked {{ ago(p.status?.checked_at) }}</span>
            </p>
          </section>

          <div class="ui-field">
            <span class="ui-label">Redirect URI <small class="muted">— register exactly this</small></span>
            <div class="sp-copy">
              <input class="ui-input mono" :value="p.redirect_uri" readonly :aria-label="`${p.name} redirect URI`" :data-testid="`redirect-${p.provider}`" @focus="$event.target.select()" />
              <button type="button" class="ui-btn ui-btn--icon" :aria-label="`Copy ${p.name} redirect URI`" :data-testid="`copy-redirect-${p.provider}`" @click="copy(p.redirect_uri)"><i class="fa-regular fa-copy"></i></button>
            </div>
            <dl class="sp-errors" :data-testid="`errors-${p.provider}`">
              <template v-for="e in commonErrors(p.provider)" :key="e.code">
                <dt><code>{{ e.code }}</code></dt>
                <dd>{{ e.text }}</dd>
              </template>
            </dl>
          </div>
          <label class="ui-field">
            <span class="ui-label">Client ID <span v-if="p.client_id_from === 'env' && !draft[p.provider].client_id" class="ui-badge ui-badge--info">from environment</span></span>
            <input v-model.trim="draft[p.provider].client_id" class="ui-input mono" spellcheck="false" :placeholder="p.client_id_from === 'env' ? p.client_id : p.provider === 'google' ? '1234-abc.apps.googleusercontent.com' : 'Application (client) ID'" :data-testid="`client-id-${p.provider}`" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Client secret</span>
            <input v-model="draft[p.provider].client_secret" type="password" class="ui-input mono" autocomplete="new-password" spellcheck="false" :placeholder="p.secret_set ? '•••••••• saved' : 'Paste the client secret'" :data-testid="`client-secret-${p.provider}`" />
            <span class="ui-hint">
              <template v-if="p.secret_set && p.secret_from === 'env'">Set in the server environment. Enter one here to override it.</template>
              <template v-else-if="p.secret_set">Saved encrypted. Leave blank to keep it. <a href="#" @click.prevent="clearSecret(p)">Remove</a></template>
              <template v-else-if="p.secret_unreadable">The saved secret can't be decrypted any more — paste it again.</template>
              <template v-else>Stored encrypted; never shown again. Spaces and line breaks from copying are removed.</template>
            </span>
          </label>
          <label v-if="p.provider === 'microsoft'" class="ui-field">
            <span class="ui-label">Accounts</span>
            <select v-model="draft.microsoft.tenantMode" class="ui-select" data-testid="tenant-mode">
              <option value="common">Work, school and personal Microsoft accounts (common)</option>
              <option value="organizations">Work and school accounts only (organizations)</option>
              <option value="consumers">Personal Microsoft accounts only (consumers)</option>
              <option value="custom">One organisation (tenant ID or domain)</option>
            </select>
            <input v-if="draft.microsoft.tenantMode === 'custom'" v-model.trim="draft.microsoft.tenant" class="ui-input mono sp-tenant" placeholder="contoso.onmicrosoft.com or tenant ID" />
          </label>

          <details class="sp-help">
            <summary>How to set up {{ p.name }}</summary>
            <ol v-if="p.provider === 'google'">
              <li>Google Cloud console → APIs &amp; Services → <strong>OAuth consent screen</strong>: user type External (or Internal for one Workspace), scopes <code>openid</code>, <code>email</code>, <code>profile</code>. While it's in Testing, only the test users you add can sign in — publish it for everyone.</li>
              <li>Credentials → Create credentials → <strong>OAuth client ID</strong> → Web application.</li>
              <li>Authorised redirect URIs: add the redirect URI above. The Gmail expenses connection can use the same client — keep its redirect URI too.</li>
              <li>Copy the client ID and secret here and save — sign-in turns on (or set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET).</li>
            </ol>
            <ol v-else>
              <li>Microsoft Entra admin centre → App registrations → <strong>New registration</strong>. Supported account types: match the choice above (multitenant + personal for "common").</li>
              <li>Redirect URI: platform <strong>Web</strong>, the URI above.</li>
              <li>Certificates &amp; secrets → New client secret; copy the <em>Value</em> (not the Secret ID) here with the Application (client) ID.</li>
              <li>Token configuration → Add optional claim → ID → <code>email</code> and <code>xms_edov</code>. Work accounts without a verified email domain sign in by their user principal name.</li>
            </ol>
          </details>

          <div class="sp-foot">
            <span v-if="footHint(p)" class="sp-foot__hint" :data-testid="`save-hint-${p.provider}`"><i class="fa-solid fa-circle-info"></i> {{ footHint(p) }}</span>
            <span v-else-if="dirty(p)" class="muted small">Unsaved changes</span>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving === p.provider || !dirty(p)" :data-testid="`save-${p.provider}`">
              <i :class="saving === p.provider ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save
            </button>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { ssoApi } from '@/services/sso'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import ProviderLogo from './ProviderLogo.vue'

const MODES = ['common', 'organizations', 'consumers']

const COMMON_ERRORS = {
  google: [
    { code: 'redirect_uri_mismatch', text: 'Add this exact URI in Google Cloud console → APIs & Services → Credentials → your OAuth client → Authorised redirect URIs (changes can take a few minutes).' },
    { code: 'invalid_client', text: 'The client secret is wrong, or the client ID and secret are from different OAuth clients — copy both again from Credentials.' },
    { code: 'access_denied', text: '“Access blocked” / app is being tested: the OAuth consent screen is in Testing mode — add the people as test users, or publish the app.' }
  ],
  microsoft: [
    { code: 'AADSTS50011', text: 'Redirect URI mismatch: add this exact URI under App registrations → your app → Authentication → Web → Redirect URIs.' },
    { code: 'AADSTS7000215', text: 'Invalid client secret: paste the secret’s Value, not its Secret ID — or create a new secret if it expired.' },
    { code: 'AADSTS50020', text: 'The account type isn’t allowed: the Accounts choice here must match the app’s supported account types.' }
  ]
}

const STATE_ICONS = { ok: 'fa-solid fa-circle-check', warn: 'fa-solid fa-triangle-exclamation', error: 'fa-solid fa-circle-xmark', info: 'fa-solid fa-circle-minus' }
const STATE_TEXT = { ok: 'OK', warn: 'warning', error: 'problem', info: 'not set up' }

export default {
  name: 'SignInProviders',
  components: { ProviderLogo },
  data() {
    return { loading: true, error: '', providers: [], draft: {}, original: {}, saving: '', checking: '', expanded: {}, now: Date.now(), timer: null }
  },
  mounted() {
    this.load()
    this.timer = setInterval(() => (this.now = Date.now()), 30000)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    toDraft(p) {
      const d = { enabled: !!p.enabled, client_id: p.client_id_from === 'settings' ? p.client_id : '', client_secret: '' }
      if (p.provider === 'microsoft') {
        const t = p.tenant || 'common'
        d.tenantMode = MODES.includes(t) ? t : 'custom'
        d.tenant = MODES.includes(t) ? '' : t
      }
      return d
    },
    /** keepDraft: refresh the server view but keep what the admin is typing. */
    setProvider(p, { keepDraft = false } = {}) {
      const i = this.providers.findIndex((x) => x.provider === p.provider)
      if (i >= 0) this.providers.splice(i, 1, p)
      else this.providers.push(p)
      const fresh = this.toDraft(p)
      const prev = this.draft[p.provider]
      const wasDirty = prev && this.original[p.provider] && JSON.stringify(prev) !== this.original[p.provider]
      const next = keepDraft && prev && wasDirty ? { ...prev, enabled: fresh.enabled } : fresh
      this.draft = { ...this.draft, [p.provider]: next }
      this.original = { ...this.original, [p.provider]: JSON.stringify(fresh) }
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const d = await ssoApi.adminProviders()
        this.providers = []
        for (const p of d.providers || []) this.setProvider(p)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load sign-in providers')
      } finally {
        this.loading = false
      }
    },
    dirty(p) {
      return JSON.stringify(this.draft[p.provider]) !== this.original[p.provider]
    },
    switchChanged(p) {
      const orig = JSON.parse(this.original[p.provider] || '{}')
      return !!this.draft[p.provider]?.enabled !== !!orig.enabled
    },
    body(p, extra = {}) {
      const d = this.draft[p.provider]
      const b = { client_id: d.client_id, client_secret: d.client_secret, ...extra }
      // The switch is sent only when the admin flipped it: otherwise the
      // server turns a never-switched provider on once it has credentials.
      if (this.switchChanged(p) && !('enabled' in extra)) b.enabled = d.enabled
      if (p.provider === 'microsoft') b.tenant = d.tenantMode === 'custom' ? d.tenant : d.tenantMode
      return b
    },
    /** What saving will do to the switch (shown next to Save). */
    footHint(p) {
      const d = this.draft[p.provider]
      if (!d || p.enabled || this.switchChanged(p)) return ''
      const hasId = !!(d.client_id || p.client_id)
      const hasSecret = !!(d.client_secret || p.secret_set)
      if (p.switched === 'off') return this.dirty(p) ? `Saving keeps ${p.name} sign-in off.` : ''
      if (hasId && hasSecret && this.dirty(p)) return `Saving turns ${p.name} sign-in on.`
      return ''
    },
    /** Everything green: the checklist folds away (problems always show). */
    allGood(p) {
      return !!(p.status?.ready && !p.status?.warnings)
    },
    reasonText(p) {
      const r = String(p.status?.reason || '').replace(/^(Yes|No) — /, '')
      return r ? r.charAt(0).toUpperCase() + r.slice(1) : ''
    },
    stateIcon(s) {
      return STATE_ICONS[s] || STATE_ICONS.info
    },
    stateText(s) {
      return STATE_TEXT[s] || s
    },
    commonErrors(provider) {
      return COMMON_ERRORS[provider] || []
    },
    ago(v) {
      if (!v) return ''
      const t = new Date(v).getTime()
      if (Number.isNaN(t)) return ''
      const s = Math.max(0, Math.round((this.now - t) / 1000))
      if (s < 60) return 'just now'
      if (s < 3600) return `${Math.round(s / 60)} min ago`
      if (s < 86400) return `${Math.round(s / 3600)} h ago`
      return formatDateTime(v)
    },
    announce(p, res, { explicit } = {}) {
      const n = p.name
      if (res.auto_enabled || (explicit === true && res.usable)) {
        toast.success(`${n} sign-in is on — the button now shows on the sign-in page`)
      } else if (res.kept_off) {
        toast.warning(`${n} settings saved, but ${n} sign-in is still switched off — the button doesn't show. Use Turn on.`)
      } else if (explicit === false) {
        toast.success(`${n} sign-in is off — the button no longer shows on the sign-in page`)
      } else if (res.usable) {
        toast.success(`${n} sign-in saved — the button shows on the sign-in page`)
      } else {
        toast.warning(`${n} settings saved. ${this.reasonText(res)}`)
      }
    },
    async save(p, extra = {}) {
      if (p.provider === 'microsoft' && this.draft.microsoft.tenantMode === 'custom' && !this.draft.microsoft.tenant) {
        toast.error('Enter the tenant ID or domain')
        return
      }
      const body = this.body(p, extra)
      this.saving = p.provider
      try {
        const res = await ssoApi.saveProvider(p.provider, body)
        this.setProvider(res)
        this.announce(p, res, { explicit: 'enabled' in body ? body.enabled : undefined })
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = ''
      }
    },
    async turnOn(p) {
      this.saving = p.provider
      try {
        const res = await ssoApi.saveProvider(p.provider, { enabled: true })
        this.setProvider(res, { keepDraft: true })
        this.announce(p, res, { explicit: true })
      } catch (e) {
        toast.error(apiErrorMessage(e, `Could not turn on ${p.name} sign-in`))
      } finally {
        this.saving = ''
      }
    },
    async checkNow(p) {
      this.checking = p.provider
      try {
        const res = await ssoApi.providerStatus(p.provider, { refresh: true })
        this.setProvider(res, { keepDraft: true })
        this.now = Date.now()
        const st = res.status || {}
        if (st.ready) toast.success(`${p.name}: everything checks out`)
        else if (st.errors) toast.warning(`${p.name}: ${st.errors} problem${st.errors === 1 ? '' : 's'} found — see the checklist`)
        else toast.info(`${p.name}: ${this.reasonText(res)}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not run the check'))
      } finally {
        this.checking = ''
      }
    },
    async clearSecret(p) {
      const ok = await confirmDialog({ title: `Remove the ${p.name} client secret?`, message: `${p.name} sign-in stops working until a new secret is saved (unless one is set in the server environment).`, confirmText: 'Remove', danger: true })
      if (!ok) return
      this.draft[p.provider].client_secret = ''
      await this.save(p, { clear_secret: true })
    },
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copied')
      } catch {
        toast.info(text)
      }
    }
  }
}
</script>

<style scoped>
.sp-head h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.sp-head p {
  margin: 0 0 16px;
  max-width: 760px;
}
.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 16px;
  align-items: start;
}
.sp-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.sp-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.sp-logo {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.sp-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}
.sp-title h3 {
  margin: 0;
  font-size: 15px;
}

/* switched off but configured */
.sp-off {
  align-items: center;
  flex-wrap: wrap;
  border-color: var(--warning);
}
.sp-off__text {
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sp-off__text span {
  color: var(--text-2);
  font-size: 13px;
}
.sp-off__btn {
  flex-shrink: 0;
}

/* status checklist */
.sp-status {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sp-status__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
.sp-shows {
  flex: 1 1 240px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}
.sp-shows > i {
  font-size: 18px;
  margin-top: 1px;
}
.sp-shows.is-yes > i {
  color: var(--success);
}
.sp-shows.is-no > i {
  color: var(--danger);
}
.sp-shows div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sp-shows strong {
  font-size: 13.5px;
}
.sp-shows span {
  font-size: 13px;
  color: var(--text-2);
}
.sp-checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sp-check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}
.sp-check > i {
  width: 16px;
  margin-top: 2px;
  text-align: center;
  flex-shrink: 0;
  font-size: 13px;
}
.sp-check.is-ok > i {
  color: var(--success);
}
.sp-check.is-warn > i {
  color: var(--warning);
}
.sp-check.is-error > i {
  color: var(--danger);
}
.sp-check.is-info > i {
  color: var(--text-3);
}
.sp-check__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.sp-check__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.sp-check__detail {
  font-size: 12.5px;
  color: var(--text-2);
  overflow-wrap: anywhere;
}
.sp-check.is-error .sp-check__detail {
  color: var(--text);
}
.sp-status__foot {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.sp-toggle {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.sp-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

.sp-copy {
  display: flex;
  gap: 8px;
}
.sp-copy .ui-input {
  flex: 1;
  min-width: 0;
}
.sp-errors {
  margin: 8px 0 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  font-size: 12.5px;
  color: var(--text-2);
}
.sp-errors dt {
  margin: 0;
}
.sp-errors dd {
  margin: 0;
  min-width: 0;
}
.sp-errors code,
.sp-help code {
  font-size: 12px;
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--text);
  white-space: nowrap;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}
.sp-tenant {
  margin-top: 8px;
}
.sp-help {
  font-size: 13px;
  color: var(--text-2);
}
.sp-help summary {
  cursor: pointer;
  color: var(--accent);
  font-weight: 550;
}
.sp-help ol {
  margin: 8px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.sp-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-top: auto;
}
.sp-foot__hint {
  font-size: 12.5px;
  color: var(--text-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
}
.sp-foot__hint i {
  color: var(--info);
}

@media (max-width: 520px) {
  .sp-errors {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .sp-errors dd {
    margin-bottom: 6px;
  }
}
</style>
