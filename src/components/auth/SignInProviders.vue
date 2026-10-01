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
      <div v-if="!publicApi" class="ui-alert ui-alert--warning sp-warn">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>PUBLIC_API_URL isn't set on the server, so the redirect URIs below are guessed from this request. Set it to the API's public address before registering them.</span>
      </div>

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

          <label class="ui-field">
            <span class="ui-label">Redirect URI <small class="muted">— register exactly this</small></span>
            <div class="sp-copy">
              <input class="ui-input mono" :value="p.redirect_uri" readonly :data-testid="`redirect-${p.provider}`" @focus="$event.target.select()" />
              <button type="button" class="ui-btn ui-btn--icon" :aria-label="`Copy ${p.name} redirect URI`" @click="copy(p.redirect_uri)"><i class="fa-regular fa-copy"></i></button>
            </div>
          </label>
          <label class="ui-field">
            <span class="ui-label">Client ID <span v-if="p.client_id_from === 'env' && !draft[p.provider].client_id" class="ui-badge ui-badge--info">from environment</span></span>
            <input v-model.trim="draft[p.provider].client_id" class="ui-input mono" :placeholder="p.client_id_from === 'env' ? p.client_id : p.provider === 'google' ? '1234-abc.apps.googleusercontent.com' : 'Application (client) ID'" :data-testid="`client-id-${p.provider}`" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Client secret</span>
            <input v-model="draft[p.provider].client_secret" type="password" class="ui-input mono" autocomplete="new-password" :placeholder="p.secret_set ? '•••••••• saved' : 'Paste the client secret'" :data-testid="`client-secret-${p.provider}`" />
            <span class="ui-hint">
              <template v-if="p.secret_set && p.secret_from === 'env'">Set in the server environment. Enter one here to override it.</template>
              <template v-else-if="p.secret_set">Saved encrypted. Leave blank to keep it. <a href="#" @click.prevent="clearSecret(p)">Remove</a></template>
              <template v-else>Stored encrypted; never shown again.</template>
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
              <li>Google Cloud console → APIs &amp; Services → <strong>OAuth consent screen</strong>: user type External (or Internal for one Workspace), scopes <code>openid</code>, <code>email</code>, <code>profile</code>.</li>
              <li>Credentials → Create credentials → <strong>OAuth client ID</strong> → Web application.</li>
              <li>Authorised redirect URIs: add the redirect URI above. The Gmail expenses connection can use the same client — keep its redirect URI too.</li>
              <li>Copy the client ID and secret here (or set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET).</li>
            </ol>
            <ol v-else>
              <li>Microsoft Entra admin centre → App registrations → <strong>New registration</strong>. Supported account types: match the choice above (multitenant + personal for "common").</li>
              <li>Redirect URI: platform <strong>Web</strong>, the URI above.</li>
              <li>Certificates &amp; secrets → New client secret; copy the <em>value</em> here with the Application (client) ID.</li>
              <li>Token configuration → Add optional claim → ID → <code>email</code> and <code>xms_edov</code>. Work accounts without a verified email domain sign in by their user principal name.</li>
            </ol>
          </details>

          <div class="sp-foot">
            <span v-if="dirty(p)" class="muted small">Unsaved changes</span>
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
import ProviderLogo from './ProviderLogo.vue'

const MODES = ['common', 'organizations', 'consumers']

export default {
  name: 'SignInProviders',
  components: { ProviderLogo },
  data() {
    return { loading: true, error: '', providers: [], draft: {}, original: {}, saving: '', publicApi: '' }
  },
  mounted() {
    this.load()
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
    setProvider(p) {
      const i = this.providers.findIndex((x) => x.provider === p.provider)
      if (i >= 0) this.providers.splice(i, 1, p)
      else this.providers.push(p)
      this.draft = { ...this.draft, [p.provider]: this.toDraft(p) }
      this.original = { ...this.original, [p.provider]: JSON.stringify(this.toDraft(p)) }
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const d = await ssoApi.adminProviders()
        this.publicApi = d.public_api_url || ''
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
    body(p, extra = {}) {
      const d = this.draft[p.provider]
      const b = { enabled: d.enabled, client_id: d.client_id, client_secret: d.client_secret, ...extra }
      if (p.provider === 'microsoft') b.tenant = d.tenantMode === 'custom' ? d.tenant : d.tenantMode
      return b
    },
    async save(p, extra = {}) {
      if (p.provider === 'microsoft' && this.draft.microsoft.tenantMode === 'custom' && !this.draft.microsoft.tenant) {
        toast.error('Enter the tenant ID or domain')
        return
      }
      this.saving = p.provider
      try {
        const res = await ssoApi.saveProvider(p.provider, this.body(p, extra))
        this.setProvider(res)
        toast.success(`${p.name} sign-in ${res.usable ? 'is on' : 'saved'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = ''
      }
    },
    async clearSecret(p) {
      const ok = await confirmDialog({ title: `Remove the ${p.name} client secret?`, message: `${p.name} sign-in stops working until a new secret is saved (unless one is set in the server environment).`, confirmText: 'Remove', danger: true })
      if (!ok) return
      this.draft[p.provider].client_secret = ''
      await this.save(p, { clear_secret: true, enabled: this.draft[p.provider].enabled && p.secret_from === 'env' })
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
.sp-warn {
  margin-bottom: 16px;
}
.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 16px;
}
.sp-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
.sp-copy {
  display: flex;
  gap: 8px;
}
.sp-copy .ui-input {
  flex: 1;
  min-width: 0;
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
.sp-help code {
  font-size: 12px;
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
}
.sp-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-top: auto;
}
</style>
