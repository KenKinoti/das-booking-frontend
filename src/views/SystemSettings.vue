<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>System settings</h1>
        <p>Server configuration and the platform organisation's integration credentials.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="loading" @click="load"><i :class="loading ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Reload</button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 20px">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <section class="ui-card">
      <div class="pf-toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': tab === t.value }" role="tab" :aria-selected="tab === t.value" @click="setTab(t.value)">
            <i :class="t.icon"></i> {{ t.label }}
            <span v-if="t.section && dirty(t.section)" class="dirty-dot" title="Unsaved changes"></span>
          </button>
        </div>
      </div>

      <div v-if="!settings" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 40px; margin-bottom: 14px; max-width: 640px"></div>
      </div>

      <!-- Overview -->
      <div v-else-if="tab === 'overview'" class="ui-card__body">
        <div class="overview">
          <div class="panel">
            <div class="panel__head">
              <span class="panel__icon"><i class="fa-solid fa-paper-plane"></i></span>
              <div>
                <h3>Outgoing email</h3>
                <p class="pf-muted pf-small">Used for invoices, quotes and meeting invitations. Configured on the server with <code>SMTP_*</code> environment variables.</p>
              </div>
              <span class="ui-badge" :class="runtime.smtp.configured ? 'ui-badge--success' : 'ui-badge--warning'">{{ runtime.smtp.configured ? 'Configured' : 'Not configured' }}</span>
            </div>
            <dl class="pf-kv">
              <dt>SMTP server</dt><dd>{{ runtime.smtp.host ? `${runtime.smtp.host}:${runtime.smtp.port}` : '—' }}</dd>
              <dt>From address</dt><dd>{{ runtime.smtp.from || '—' }}</dd>
              <dt>Authentication</dt><dd>{{ runtime.smtp.auth ? 'Username & password' : 'None' }}</dd>
            </dl>
            <form class="test-row" @submit.prevent="sendTestEmail">
              <input v-model.trim="testTo" class="ui-input" type="email" placeholder="you@example.com" aria-label="Send test email to" />
              <button class="ui-btn" type="submit" :disabled="!runtime.smtp.configured || sendingTest">
                <i :class="sendingTest ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-envelope'"></i> Send test email
              </button>
            </form>
            <div v-if="testResult" class="ui-alert" :class="testResult.success ? 'ui-alert--success' : 'ui-alert--danger'" style="margin-top: 12px">
              <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i><span>{{ testResult.message }}</span>
            </div>
          </div>

          <div class="panel">
            <div class="panel__head">
              <span class="panel__icon"><i class="fa-solid fa-server"></i></span>
              <div>
                <h3>Server</h3>
                <p class="pf-muted pf-small">Runtime details reported by the API.</p>
              </div>
            </div>
            <dl class="pf-kv">
              <dt>Environment</dt><dd><span class="ui-badge" :class="runtime.environment === 'production' ? 'ui-badge--success' : 'ui-badge--info'">{{ runtime.environment || 'unknown' }}</span></dd>
              <dt>Session length</dt><dd>{{ runtime.session_hours ? `${runtime.session_hours} hours` : '—' }}</dd>
              <dt>Go runtime</dt><dd>{{ runtime.go_version || '—' }}</dd>
            </dl>
            <router-link to="/database" class="ui-btn ui-btn--sm" style="margin-top: 14px"><i class="fa-solid fa-database"></i> Database health</router-link>
          </div>

          <div class="panel span-2">
            <div class="panel__head">
              <span class="panel__icon"><i class="fa-solid fa-plug"></i></span>
              <div>
                <h3>Stored integrations</h3>
                <p class="pf-muted pf-small">Credentials saved for the platform organisation. Connection tests call the provider live.</p>
              </div>
            </div>
            <ul class="pf-list">
              <li v-for="i in integrationSummary" :key="i.key">
                <div class="pf-cell">
                  <span class="int-icon"><i :class="i.icon"></i></span>
                  <span class="pf-cell__text">
                    <span class="pf-cell__title">{{ i.label }}</span>
                    <span class="pf-cell__sub">{{ i.detail }}</span>
                  </span>
                </div>
                <div class="int-right">
                  <span class="ui-badge" :class="i.enabled ? 'ui-badge--success' : ''">{{ i.enabled ? 'Enabled' : 'Off' }}</span>
                  <span v-if="i.verified !== null" class="ui-badge" :class="i.verified ? 'ui-badge--success' : 'ui-badge--warning'">{{ i.verified ? 'Verified' : i.tested ? 'Test failed' : 'Not tested' }}</span>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="setTab(i.key)">Configure <i class="fa-solid fa-chevron-right"></i></button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Integration forms -->
      <form v-else-if="current" class="ui-card__body form-body" novalidate @submit.prevent="save(current.section)">
        <div class="form-head">
          <div>
            <h2>{{ current.title }}</h2>
            <p class="pf-muted">{{ current.description }}</p>
          </div>
          <label class="ui-switch"><input v-model="draft[current.section].enabled" type="checkbox" /> Enabled</label>
        </div>

        <div class="pf-form-grid form-grid">
          <template v-for="f in current.fields" :key="f.key">
            <div v-if="f.type === 'section'" class="pf-form-section">{{ f.label }}</div>
            <div v-else-if="f.type === 'switch'" class="ui-field" :class="{ 'span-2': f.wide }">
              <label class="ui-switch"><input v-model="draft[current.section][f.key]" type="checkbox" /> {{ f.label }}</label>
              <span v-if="f.hint" class="ui-hint">{{ f.hint }}</span>
            </div>
            <div v-else-if="f.type === 'secret'" class="ui-field" :class="{ 'span-2': f.wide }">
              <label :for="`f-${f.key}`">{{ f.label }}</label>
              <div class="secret-input">
                <input
                  :id="`f-${f.key}`"
                  v-model="draft[current.section][f.key]"
                  class="ui-input"
                  :type="reveal[f.key] ? 'text' : 'password'"
                  autocomplete="new-password"
                  spellcheck="false"
                  :placeholder="secretPlaceholder(current.section, f.key)"
                  :disabled="clearing(current.section, f.key)"
                />
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" :aria-label="reveal[f.key] ? 'Hide' : 'Show'" @click="reveal[f.key] = !reveal[f.key]"><i :class="reveal[f.key] ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i></button>
                <button v-if="secretSet(current.section, f.key)" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="toggleClear(current.section, f.key)">{{ clearing(current.section, f.key) ? 'Keep' : 'Remove' }}</button>
              </div>
              <span class="ui-hint">
                <template v-if="clearing(current.section, f.key)"><span class="pf-danger-text">Will be removed when you save.</span></template>
                <template v-else-if="secretSet(current.section, f.key)">Saved and hidden. Leave blank to keep the current value.</template>
                <template v-else>{{ f.hint || 'Stored securely; never shown again after saving.' }}</template>
              </span>
            </div>
            <div v-else-if="f.type === 'select'" class="ui-field" :class="{ 'span-2': f.wide }">
              <label :for="`f-${f.key}`">{{ f.label }}</label>
              <select :id="`f-${f.key}`" v-model="draft[current.section][f.key]" class="ui-select">
                <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <span v-if="f.hint" class="ui-hint">{{ f.hint }}</span>
            </div>
            <div v-else-if="f.type === 'currency'" class="ui-field" :class="{ 'span-2': f.wide }">
              <label :for="`f-${f.key}`">{{ f.label }}</label>
              <select :id="`f-${f.key}`" v-model="draft[current.section][f.key]" class="ui-select">
                <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                  <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                </optgroup>
              </select>
            </div>
            <div v-else class="ui-field" :class="{ 'span-2': f.wide }">
              <label :for="`f-${f.key}`">{{ f.label }}</label>
              <input
                :id="`f-${f.key}`"
                v-model="draft[current.section][f.key]"
                class="ui-input"
                :type="f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'"
                :placeholder="f.placeholder || ''"
                autocomplete="off"
                spellcheck="false"
              />
              <span v-if="f.hint" class="ui-hint">{{ f.hint }}</span>
            </div>
          </template>
        </div>

        <div v-if="current.test" class="test-box">
          <div class="test-box__text">
            <strong>Connection test</strong>
            <span class="pf-muted pf-small">
              {{ lastTested(current.section) ? `Last tested ${formatDateTime(lastTested(current.section))}` : 'Not tested yet' }}
              <template v-if="verified(current.section) !== null"> · <span :class="verified(current.section) ? 'pf-success-text' : 'pf-danger-text'">{{ verified(current.section) ? 'verified' : 'failed' }}</span></template>
            </span>
          </div>
          <button type="button" class="ui-btn" :disabled="testing" @click="runTest(current)">
            <i :class="testing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plug-circle-check'"></i> {{ dirty(current.section) ? 'Save & test' : 'Test connection' }}
          </button>
        </div>
        <div v-if="testOutcome && testOutcome.section === current.section" class="ui-alert" :class="testOutcome.success ? 'ui-alert--success' : 'ui-alert--danger'" style="margin-top: 12px">
          <i :class="testOutcome.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i><span>{{ testOutcome.message }}</span>
        </div>

        <div class="form-foot">
          <span v-if="dirty(current.section)" class="pf-muted pf-small"><span class="dirty-dot"></span> Unsaved changes</span>
          <span v-else-if="settings.updated_at" class="pf-muted pf-small">Last saved {{ formatDateTime(settings.updated_at) }}</span>
          <div class="ui-actions">
            <button type="button" class="ui-btn" :disabled="!dirty(current.section) || saving" @click="discard(current.section)">Discard</button>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="!dirty(current.section) || saving">
              <i v-if="saving" class="fa-solid fa-circle-notch spin"></i> Save changes
            </button>
          </div>
        </div>
      </form>

      <!-- Activity -->
      <div v-else-if="tab === 'activity'">
        <div v-if="logsLoading" class="ui-card__body"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 20px; margin-bottom: 12px"></div></div>
        <div v-else-if="!logs.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-list-check"></i></div>
          <h3>No integration activity yet</h3>
          <p>Connection tests and test emails are recorded here.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr><th>When</th><th>Integration</th><th>Event</th><th>Result</th><th class="pf-hide-sm">Message</th><th class="num pf-hide-md">Time</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in logs" :key="l.id">
                <td class="pf-nowrap">{{ formatDateTime(l.created_at) }}</td>
                <td class="cap">{{ l.integration }}</td>
                <td>{{ l.event.replace(/_/g, ' ') }}</td>
                <td><span class="ui-badge" :class="l.status === 'success' ? 'ui-badge--success' : l.status === 'error' ? 'ui-badge--danger' : 'ui-badge--warning'">{{ l.status }}</span></td>
                <td class="pf-hide-sm msg">{{ l.message }}</td>
                <td class="num pf-hide-md pf-muted">{{ l.duration_ms }} ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import { currencyGroups } from '@/utils/currencies'
import { useAuthStore } from '@/stores/auth'
import { platformAPI, ensurePlatformSession } from '@/services/platform'

const SECTIONS = {
  email: {
    section: 'email_settings',
    title: 'Email (SMTP)',
    description: 'SMTP account stored for the platform organisation.',
    test: 'email',
    fields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [
        { value: 'smtp', label: 'Custom SMTP' }, { value: 'gmail', label: 'Google Workspace / Gmail' }, { value: 'outlook', label: 'Microsoft 365 / Outlook' },
        { value: 'sendgrid', label: 'SendGrid' }, { value: 'mailgun', label: 'Mailgun' }
      ] },
      { key: 'smtp_security', label: 'Security', type: 'select', options: [
        { value: 'tls', label: 'STARTTLS (port 587)' }, { value: 'ssl', label: 'SSL/TLS (port 465)' }, { value: 'none', label: 'None (not recommended)' }
      ] },
      { key: 'smtp_host', label: 'SMTP host', placeholder: 'smtp.example.com' },
      { key: 'smtp_port', label: 'Port', type: 'number', placeholder: '587' },
      { key: 'smtp_username', label: 'Username' },
      { key: 'smtp_password', label: 'Password', type: 'secret' },
      { type: 'section', key: 's1', label: 'Sender' },
      { key: 'from_name', label: 'From name' },
      { key: 'from_email', label: 'From email', type: 'email' },
      { key: 'reply_to_email', label: 'Reply-to email', type: 'email', wide: true }
    ]
  },
  stripe: {
    section: 'stripe_settings',
    title: 'Payments (Stripe)',
    description: 'Stripe keys for card payments.',
    test: 'stripe',
    fields: [
      { key: 'test_mode', label: 'Test mode', type: 'switch', hint: 'Use test keys (pk_test_ / sk_test_) while setting up.', wide: true },
      { key: 'publishable_key', label: 'Publishable key', placeholder: 'pk_live_…', wide: true },
      { key: 'secret_key', label: 'Secret key', type: 'secret', wide: true, hint: 'Starts with sk_ or rk_ (restricted key).' },
      { key: 'webhook_secret', label: 'Webhook signing secret', type: 'secret', wide: true, hint: 'Starts with whsec_.' },
      { key: 'currency', label: 'Default currency', type: 'currency' },
      { key: 'capture_method', label: 'Capture', type: 'select', options: [{ value: 'automatic', label: 'Automatic' }, { value: 'manual', label: 'Manual (authorise, capture later)' }] }
    ]
  },
  twilio: {
    section: 'twilio_settings',
    title: 'SMS (Twilio)',
    description: 'Twilio account for text messages.',
    test: 'twilio',
    fields: [
      { key: 'account_sid', label: 'Account SID', placeholder: 'AC…' },
      { key: 'auth_token', label: 'Auth token', type: 'secret' },
      { key: 'from_phone_number', label: 'From number', placeholder: '+61…' },
      { key: 'messaging_service_sid', label: 'Messaging service SID', placeholder: 'MG… (optional)' },
      { key: 'enable_sms', label: 'SMS', type: 'switch' },
      { key: 'enable_voice', label: 'Voice calls', type: 'switch' }
    ]
  },
  whatsapp: {
    section: 'whatsapp_settings',
    title: 'WhatsApp Business',
    description: 'WhatsApp Cloud API credentials from Meta.',
    test: 'whatsapp',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'secret', wide: true },
      { key: 'phone_number_id', label: 'Phone number ID' },
      { key: 'business_account_id', label: 'Business account ID' },
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://', wide: true },
      { key: 'verify_token', label: 'Webhook verify token', type: 'secret' },
      { key: 'api_version', label: 'Graph API version', placeholder: 'v18.0' }
    ]
  }
}

export default {
  name: 'SystemSettings',
  data() {
    return {
      settings: null,
      draft: {},
      original: {},
      clear: [],
      reveal: {},
      loading: false,
      saving: false,
      testing: false,
      error: '',
      tab: ['overview', 'email', 'stripe', 'twilio', 'whatsapp', 'activity'].includes(this.$route.query.tab) ? this.$route.query.tab : 'overview',
      testTo: useAuthStore().user?.email || '',
      sendingTest: false,
      testResult: null,
      testOutcome: null,
      logs: [],
      logsLoading: false,
      currencyGroups: currencyGroups(),
      tabs: [
        { value: 'overview', label: 'Overview', icon: 'fa-solid fa-gauge' },
        { value: 'email', label: 'Email', icon: 'fa-solid fa-envelope', section: 'email_settings' },
        { value: 'stripe', label: 'Payments', icon: 'fa-solid fa-credit-card', section: 'stripe_settings' },
        { value: 'twilio', label: 'SMS', icon: 'fa-solid fa-comment-sms', section: 'twilio_settings' },
        { value: 'whatsapp', label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', section: 'whatsapp_settings' },
        { value: 'activity', label: 'Activity', icon: 'fa-solid fa-list-check' }
      ]
    }
  },
  computed: {
    current() {
      return SECTIONS[this.tab] || null
    },
    runtime() {
      return this.settings?.runtime || { smtp: {} }
    },
    integrationSummary() {
      const s = this.settings || {}
      const e = s.email_settings || {}
      const st = s.stripe_settings || {}
      const tw = s.twilio_settings || {}
      const wa = s.whatsapp_settings || {}
      return [
        { key: 'email', label: 'Email (SMTP)', icon: 'fa-solid fa-envelope', enabled: e.enabled, verified: null, tested: !!e.last_tested_at, detail: e.smtp_host ? `${e.smtp_host}:${e.smtp_port}` : 'No SMTP server saved' },
        { key: 'stripe', label: 'Stripe', icon: 'fa-solid fa-credit-card', enabled: st.enabled, verified: !!st.connection_verified, tested: !!st.last_tested_at, detail: st.publishable_key ? `${st.test_mode ? 'Test' : 'Live'} mode · ${st.currency}` : 'No keys saved' },
        { key: 'twilio', label: 'Twilio SMS', icon: 'fa-solid fa-comment-sms', enabled: tw.enabled, verified: !!tw.connection_verified, tested: !!tw.last_tested_at, detail: tw.account_sid ? `From ${tw.from_phone_number || '—'}` : 'No account saved' },
        { key: 'whatsapp', label: 'WhatsApp Business', icon: 'fa-brands fa-whatsapp', enabled: wa.enabled, verified: !!wa.connection_verified, tested: !!wa.last_tested_at, detail: wa.phone_number_id ? `Phone number ID ${wa.phone_number_id}` : 'No credentials saved' }
      ]
    }
  },
  created() {
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    this.load()
    if (this.tab === 'activity') this.loadLogs()
  },
  async beforeRouteLeave() {
    const dirty = Object.values(SECTIONS).some((s) => this.dirty(s.section))
    if (!dirty) return true
    return confirmDialog({ title: 'Leave without saving?', message: 'You have unsaved settings on this page.', confirmText: 'Leave', danger: true })
  },
  methods: {
    formatDateTime,
    apply(res) {
      this.settings = res
      const draft = {}
      const original = {}
      for (const s of Object.values(SECTIONS)) {
        draft[s.section] = { ...(res[s.section] || {}) }
        original[s.section] = JSON.stringify(this.editable(s, res[s.section] || {}))
      }
      this.draft = draft
      this.original = original
      this.clear = []
    },
    editable(sec, obj) {
      const out = { enabled: !!obj.enabled }
      for (const f of sec.fields) if (f.type !== 'section') out[f.key] = obj[f.key] ?? ''
      return out
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.apply(await platformAPI.integrations())
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load settings')
      } finally {
        this.loading = false
      }
    },
    async loadLogs() {
      this.logsLoading = true
      try {
        const res = await platformAPI.integrationLogs()
        this.logs = res.logs || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load activity'))
      } finally {
        this.logsLoading = false
      }
    },
    setTab(t) {
      this.tab = t
      this.testOutcome = null
      this.$router.replace({ query: { ...this.$route.query, tab: t === 'overview' ? undefined : t } })
      if (t === 'activity') this.loadLogs()
    },
    sectionDef(section) {
      return Object.values(SECTIONS).find((s) => s.section === section)
    },
    dirty(section) {
      const def = this.sectionDef(section)
      if (!def || !this.draft[section]) return false
      if (this.clear.some((k) => k.startsWith(section + '.'))) return true
      return JSON.stringify(this.editable(def, this.draft[section])) !== this.original[section]
    },
    discard(section) {
      this.draft[section] = { ...(this.settings[section] || {}) }
      this.clear = this.clear.filter((k) => !k.startsWith(section + '.'))
    },
    secretInfo(section, key) {
      return this.settings?.secrets?.[`${section}.${key}`] || { set: false, hint: '' }
    },
    secretSet(section, key) {
      return this.secretInfo(section, key).set
    },
    secretPlaceholder(section, key) {
      const s = this.secretInfo(section, key)
      if (this.clearing(section, key)) return 'Will be removed'
      return s.set ? `Saved ${s.hint} — enter a new value to replace` : 'Not set'
    },
    clearing(section, key) {
      return this.clear.includes(`${section}.${key}`)
    },
    toggleClear(section, key) {
      const k = `${section}.${key}`
      if (this.clear.includes(k)) this.clear = this.clear.filter((x) => x !== k)
      else {
        this.clear = [...this.clear, k]
        this.draft[section][key] = ''
      }
    },
    lastTested(section) {
      return this.settings?.[section]?.last_tested_at || null
    },
    verified(section) {
      const s = this.settings?.[section]
      if (!s || !s.last_tested_at || !('connection_verified' in s)) return null
      return !!s.connection_verified
    },
    validate(section) {
      const d = this.draft[section]
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (section === 'email_settings') {
        const port = Number(d.smtp_port)
        if (d.smtp_port !== '' && (!Number.isInteger(port) || port < 1 || port > 65535)) return 'SMTP port must be a number between 1 and 65535'
        if (d.from_email && !email.test(d.from_email)) return 'From email is not a valid address'
        if (d.reply_to_email && !email.test(d.reply_to_email)) return 'Reply-to email is not a valid address'
      }
      if (section === 'stripe_settings') {
        if (d.publishable_key && !String(d.publishable_key).startsWith('pk_')) return 'The publishable key should start with pk_'
        if (d.secret_key && !/^(sk|rk)_/.test(d.secret_key)) return 'The secret key should start with sk_ or rk_'
      }
      return ''
    },
    async save(section, quiet = false) {
      const msg = this.validate(section)
      if (msg) {
        toast.error(msg)
        return false
      }
      const def = this.sectionDef(section)
      const body = { ...this.editable(def, this.draft[section]) }
      if (section === 'email_settings') body.smtp_port = Number(body.smtp_port) || 0
      body.enabled = !!this.draft[section].enabled
      for (const f of def.fields) if (f.type === 'switch') body[f.key] = !!body[f.key]
      this.saving = true
      try {
        const res = await platformAPI.saveIntegrations({ [section]: body, clear_secrets: this.clear.filter((k) => k.startsWith(section + '.')) })
        // Keep unsaved edits in other sections.
        const keep = {}
        for (const s of Object.values(SECTIONS)) if (s.section !== section && this.dirty(s.section)) keep[s.section] = this.draft[s.section]
        const keepClear = this.clear.filter((k) => !k.startsWith(section + '.'))
        this.apply({ ...res, runtime: this.settings.runtime })
        Object.assign(this.draft, keep)
        this.clear = keepClear
        if (!quiet) toast.success(`${def.title} saved`)
        return true
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save settings'))
        return false
      } finally {
        this.saving = false
      }
    },
    async runTest(def) {
      if (this.dirty(def.section) && !(await this.save(def.section, true))) return
      this.testing = true
      this.testOutcome = null
      try {
        const res = await platformAPI.testIntegration(def.test)
        this.testOutcome = { section: def.section, success: res.success, message: res.message }
        const fresh = await platformAPI.integrations()
        const keep = {}
        for (const s of Object.values(SECTIONS)) if (this.dirty(s.section)) keep[s.section] = this.draft[s.section]
        this.apply(fresh)
        Object.assign(this.draft, keep)
      } catch (e) {
        this.testOutcome = { section: def.section, success: false, message: apiErrorMessage(e, 'The test could not run') }
      } finally {
        this.testing = false
      }
    },
    async sendTestEmail() {
      this.sendingTest = true
      this.testResult = null
      try {
        this.testResult = await platformAPI.sendTestEmail(this.testTo)
      } catch (e) {
        this.testResult = { success: false, message: apiErrorMessage(e, 'Could not send the test email') }
      } finally {
        this.sendingTest = false
      }
    }
  }
}
</script>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  background: var(--surface);
}

.panel.span-2 {
  grid-column: 1 / -1;
}

.panel__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.panel__head > div {
  flex: 1;
  min-width: 0;
}

.panel__head h3 {
  font-size: 15px;
  font-weight: 650;
  margin: 0 0 2px;
}

.panel__head p {
  margin: 0;
}

.panel__head code {
  font-size: 12px;
}

.panel__icon,
.int-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.int-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.test-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.test-row .ui-input {
  flex: 1;
  min-width: 0;
}

.form-body {
  max-width: 880px;
}

.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.form-head h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 2px;
}

.form-head p {
  margin: 0;
}

.secret-input {
  display: flex;
  gap: 4px;
  align-items: center;
}

.secret-input .ui-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
}

.test-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.test-box__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.form-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.form-foot .ui-actions {
  margin-left: auto;
}

.dirty-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
  margin-left: 2px;
  vertical-align: middle;
}

.cap {
  text-transform: capitalize;
}

.msg {
  max-width: 420px;
  color: var(--text-2);
}

@media (max-width: 900px) {
  .overview {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .form-head,
  .test-box {
    flex-direction: column;
    align-items: stretch;
  }

  .test-row {
    flex-direction: column;
  }

  .panel {
    padding: 16px;
  }

  .panel__head {
    flex-wrap: wrap;
  }

  .int-right .ui-btn {
    display: none;
  }
}
</style>
