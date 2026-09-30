<template>
  <div class="esp">
    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <template v-else-if="!data">
      <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 38px; margin-bottom: 12px"></div>
    </template>
    <template v-else>
      <!-- Effective sender -->
      <div class="esp-status" :class="status.ready ? 'is-ready' : 'is-off'" data-testid="email-status">
        <span class="esp-status__icon"><i :class="status.ready ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i></span>
        <div class="esp-status__main">
          <div class="esp-status__title">
            <strong>{{ status.ready ? 'Ready to send' : 'Email sending isn’t set up' }}</strong>
            <span class="ui-badge" :class="status.ready ? 'ui-badge--success' : 'ui-badge--warning'">{{ sourceLabel(status.source) }}</span>
          </div>
          <div v-if="status.from" class="esp-status__from" data-testid="email-from"><span class="muted">Sending from</span> {{ status.from }}</div>
          <div v-if="status.host" class="esp-status__meta muted">{{ status.host }}:{{ status.port }} · {{ securityLabel(status.security) }}{{ status.auth ? ' · signed in' : '' }}</div>
          <div v-if="status.last_success_at || status.last_error_at" class="esp-status__meta">
            <span v-if="status.last_success_at" class="ok-text"><i class="fa-solid fa-check"></i> Last sent {{ formatDateTime(status.last_success_at) }}</span>
            <span v-if="status.last_error_at && (!status.last_success_at || status.last_error_at > status.last_success_at)" class="err-text" :title="status.last_error"><i class="fa-solid fa-xmark"></i> Last failure {{ formatDateTime(status.last_error_at) }}: {{ status.last_error }}</span>
          </div>
          <p v-if="!status.ready && !status.problem" class="esp-status__meta muted m0">
            Invoices fall back to “Open in email app” until an SMTP account is saved{{ isPlatform ? '' : ' here or a platform default exists' }}.
          </p>
        </div>
      </div>
      <div v-if="status.problem" class="ui-alert ui-alert--danger mt"><i class="fa-solid fa-circle-exclamation"></i><span>{{ status.problem }}</span></div>
      <div v-if="status.note" class="ui-alert ui-alert--warning mt"><i class="fa-solid fa-circle-info"></i><span>{{ status.note }}</span></div>
      <div v-if="isPlatform && scope !== 'platform'" class="ui-alert mt"><i class="fa-solid fa-circle-info"></i><span>This organisation owns the platform, so these settings are also the default sender for every organisation that hasn’t set up its own.</span></div>
      <div v-else-if="!isPlatform && data.fallback && !form.enabled" class="ui-hint mt">Without your own settings, email is sent via the {{ sourceLabel(data.fallback.source).toLowerCase() }}: <strong>{{ data.fallback.from }}</strong>.</div>

      <form class="esp-form" novalidate @submit.prevent="save">
        <fieldset :disabled="!canEdit || saving" class="plain">
          <div class="esp-row">
            <label class="ui-switch"><input v-model="form.enabled" type="checkbox" data-testid="email-enabled" /> {{ isPlatform ? 'Use this account (platform default)' : 'Send from this organisation’s own account' }}</label>
            <div class="esp-presets">
              <span class="muted small">Quick setup:</span>
              <button v-for="(p, k) in presets" :key="k" type="button" class="ui-btn ui-btn--sm" :data-testid="`preset-${k}`" @click="applyPreset(k)"><i :class="k === 'gmail' ? 'fa-brands fa-google' : 'fa-brands fa-microsoft'"></i> {{ k === 'gmail' ? 'Gmail' : 'Outlook' }}</button>
            </div>
          </div>

          <div v-if="isGmail" class="ui-alert ui-alert--warning mt">
            <i class="fa-brands fa-google"></i>
            <span>
              <strong>Gmail needs an App Password.</strong> Turn on 2-Step Verification, then create one at Google Account → Security → App passwords and paste the 16 letters below (spaces are fine).
              The From email must be this Gmail address or a verified “Send mail as” alias.
            </span>
          </div>

          <div class="esp-section">Server</div>
          <div class="esp-grid">
            <div class="ui-field span-2">
              <label for="es-host">SMTP host</label>
              <input id="es-host" v-model.trim="form.smtp_host" class="ui-input" :class="{ 'is-invalid': errors.smtp_host }" placeholder="smtp.gmail.com" autocomplete="off" spellcheck="false" />
              <span v-if="errors.smtp_host" class="field-error">{{ errors.smtp_host }}</span>
            </div>
            <div class="ui-field">
              <label for="es-port">Port</label>
              <input id="es-port" v-model.number="form.smtp_port" type="number" min="1" max="65535" class="ui-input" :class="{ 'is-invalid': errors.smtp_port }" placeholder="587" />
              <span v-if="errors.smtp_port" class="field-error">{{ errors.smtp_port }}</span>
            </div>
            <div class="ui-field">
              <label for="es-sec">Security</label>
              <select id="es-sec" v-model="form.smtp_security" class="ui-select" @change="onSecurity">
                <option value="starttls">STARTTLS (port 587)</option>
                <option value="ssl">SSL/TLS (port 465)</option>
                <option value="none">None — local relay only</option>
              </select>
              <span v-if="errors.smtp_security" class="field-error">{{ errors.smtp_security }}</span>
            </div>
            <div class="ui-field span-2">
              <label for="es-user">Username</label>
              <input id="es-user" v-model.trim="form.smtp_username" class="ui-input" :placeholder="isGmail ? 'you@gmail.com' : 'Usually your email address'" autocomplete="off" spellcheck="false" />
            </div>
            <div class="ui-field span-2">
              <label for="es-pass">{{ isGmail ? 'App Password' : 'Password' }}</label>
              <div class="secret">
                <input id="es-pass" v-model="form.smtp_password" class="ui-input" :class="{ 'is-invalid': errors.smtp_password }" :type="reveal ? 'text' : 'password'" autocomplete="new-password" spellcheck="false" :placeholder="passwordPlaceholder" :disabled="clearPassword" />
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" :aria-label="reveal ? 'Hide password' : 'Show password'" @click="reveal = !reveal"><i :class="reveal ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i></button>
                <button v-if="secret.set" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="toggleClear">{{ clearPassword ? 'Keep' : 'Remove' }}</button>
              </div>
              <span v-if="errors.smtp_password" class="field-error">{{ errors.smtp_password }}</span>
              <span v-else class="ui-hint">{{ clearPassword ? 'Will be removed when you save.' : secret.set ? 'Saved and encrypted. Leave blank to keep it.' : 'Stored encrypted; never shown again.' }}</span>
            </div>
          </div>

          <div class="esp-section">Sender</div>
          <div class="esp-grid">
            <div class="ui-field span-2">
              <label for="es-fname">From name</label>
              <input id="es-fname" v-model="form.from_name" class="ui-input" placeholder="Your business name" />
            </div>
            <div class="ui-field span-2">
              <label for="es-femail">From email</label>
              <input id="es-femail" v-model.trim="form.from_email" type="email" class="ui-input" :class="{ 'is-invalid': errors.from_email }" :placeholder="form.smtp_username && form.smtp_username.includes('@') ? form.smtp_username : 'billing@yourbusiness.com'" />
              <span v-if="errors.from_email" class="field-error">{{ errors.from_email }}</span>
            </div>
            <div class="ui-field span-4">
              <label for="es-reply">Reply-to <span class="muted small">— optional, one address</span></label>
              <input id="es-reply" v-model.trim="form.reply_to_email" type="email" class="ui-input" :class="{ 'is-invalid': errors.reply_to_email }" placeholder="Where client replies should go" />
              <span v-if="errors.reply_to_email" class="field-error">{{ errors.reply_to_email }}</span>
            </div>
          </div>

          <div class="esp-section">Recipients</div>
          <div class="esp-grid">
            <div class="ui-field span-2">
              <label for="es-cc">Always CC</label>
              <EmailChips id="es-cc" v-model="form.always_cc" rows :disabled="!canEdit" icon="fa-regular fa-copy" placeholder="e.g. manager@yourbusiness.com" aria-label="Always CC addresses" />
              <span v-if="errors.always_cc" class="field-error">{{ errors.always_cc }}</span>
              <span v-else class="ui-hint">Copied (visible) on every invoice, quote and reminder email. Shown in the send dialog, removable per send.</span>
            </div>
            <div class="ui-field span-2">
              <label for="es-bcc">Always BCC</label>
              <EmailChips id="es-bcc" v-model="form.always_bcc" rows :disabled="!canEdit" icon="fa-solid fa-user-secret" placeholder="e.g. accounts@yourbusiness.com" aria-label="Always BCC addresses" />
              <span v-if="errors.always_bcc" class="field-error">{{ errors.always_bcc }}</span>
              <span v-else class="ui-hint">Hidden copy for your records — clients don’t see these addresses.</span>
            </div>
            <div class="ui-field span-4">
              <label for="es-notify">Notification recipients</label>
              <EmailChips id="es-notify" v-model="form.notification_recipients" rows :disabled="!canEdit" icon="fa-regular fa-bell" placeholder="e.g. admin@yourbusiness.com" aria-label="Notification recipient addresses" />
              <span v-if="errors.notification_recipients" class="field-error">{{ errors.notification_recipients }}</span>
              <span v-else class="ui-hint">Receive test emails and system notifications. One address per row — paste several separated by commas.</span>
            </div>
          </div>
        </fieldset>

        <div v-if="canEdit" class="esp-test">
          <div class="esp-test__text">
            <strong>Send a test email</strong>
            <span class="muted small">{{ dirty ? 'You have unsaved changes — test them before saving, or save first.' : `Uses the saved settings${form.notification_recipients.length ? ' and goes to the notification recipients' : ''} unless you enter an address.` }}</span>
          </div>
          <div class="esp-test__row">
            <input v-model.trim="testTo" class="ui-input" type="email" :placeholder="testPlaceholder" aria-label="Send test email to" data-testid="test-to" />
            <button type="button" class="ui-btn" :disabled="!!testing" data-testid="verify-btn" @click="verify"><i :class="testing === 'verify' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plug-circle-check'"></i> Check connection</button>
            <button type="button" class="ui-btn ui-btn--primary" :disabled="!!testing" data-testid="test-btn" @click="sendTest"><i :class="testing === 'send' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-paper-plane'"></i> {{ dirty ? 'Test unsaved changes' : 'Send test email' }}</button>
          </div>
          <div v-if="testResult" class="ui-alert mt" :class="testResult.success ? 'ui-alert--success' : 'ui-alert--danger'" data-testid="test-result">
            <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i><span>{{ testResult.message }}</span>
          </div>
        </div>

        <div class="esp-foot">
          <span v-if="!canEdit" class="muted small"><i class="fa-solid fa-lock"></i> Only administrators can change the email settings.</span>
          <span v-else-if="dirty" class="muted small"><span class="dirty-dot"></span> Unsaved changes</span>
          <span v-else-if="data.saved && data.updated_at" class="muted small">Last saved {{ formatDateTime(data.updated_at) }}</span>
          <div v-if="canEdit" class="ui-actions">
            <button type="button" class="ui-btn" :disabled="!dirty || saving" @click="discard">Discard</button>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="!dirty || saving" data-testid="email-save"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save email settings</button>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>

<script>
import EmailChips from '@/components/invoicing/EmailChips.vue'
import { emailSettingsApi, SOURCE_LABELS, SECURITY_LABELS, PRESETS } from '@/services/emailSettings'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/
const FIELDS = ['enabled', 'provider', 'smtp_host', 'smtp_port', 'smtp_security', 'smtp_username', 'from_name', 'from_email', 'reply_to_email', 'always_cc', 'always_bcc', 'notification_recipients']

function blank() {
  return { enabled: false, provider: 'smtp', smtp_host: '', smtp_port: 587, smtp_security: 'starttls', smtp_username: '', smtp_password: '', from_name: '', from_email: '', reply_to_email: '', always_cc: [], always_bcc: [], notification_recipients: [] }
}

export default {
  name: 'EmailSettingsPanel',
  components: { EmailChips },
  props: {
    // "organisation" (Settings page) or "platform" (System settings, super admin)
    scope: { type: String, default: 'organisation' }
  },
  emits: ['saved', 'dirty'],
  data() {
    return {
      data: null,
      form: blank(),
      original: '',
      clearPassword: false,
      reveal: false,
      saving: false,
      testing: '',
      testTo: '',
      testResult: null,
      errors: {},
      loadError: '',
      presets: PRESETS
    }
  },
  computed: {
    status() {
      return this.data?.status || {}
    },
    isPlatform() {
      return !!this.data?.is_platform
    },
    canEdit() {
      return !!this.data?.can_edit
    },
    secret() {
      return this.data?.secrets?.smtp_password || { set: false, hint: '' }
    },
    isGmail() {
      return /(^|\.)(gmail|googlemail|google)\.com$/i.test(this.form.smtp_host || '')
    },
    passwordPlaceholder() {
      if (this.clearPassword) return 'Will be removed'
      if (this.secret.set) return `Saved ${this.secret.hint} — enter a new one to replace`
      return this.isGmail ? 'abcd efgh ijkl mnop' : 'Not set'
    },
    testPlaceholder() {
      const list = this.form.notification_recipients
      if (list.length) return `${list[0]}${list.length > 1 ? ` +${list.length - 1}` : ''} (notification recipients)`
      return useAuthStore().user?.email || 'you@example.com'
    },
    dirty() {
      return this.snapshot() !== this.original || !!this.form.smtp_password || this.clearPassword
    }
  },
  watch: {
    dirty(v) {
      this.$emit('dirty', v)
    }
  },
  created() {
    this.load()
  },
  methods: {
    formatDateTime,
    sourceLabel(s) {
      return SOURCE_LABELS[s || ''] || s
    },
    securityLabel(s) {
      return SECURITY_LABELS[s] || s
    },
    snapshot() {
      const o = {}
      for (const k of FIELDS) o[k] = this.form[k]
      return JSON.stringify(o)
    },
    apply(res) {
      this.data = res
      const s = res.settings || {}
      const f = blank()
      for (const k of FIELDS) if (s[k] !== undefined && s[k] !== null) f[k] = Array.isArray(s[k]) ? [...s[k]] : s[k]
      if (!f.smtp_port) f.smtp_port = 587
      this.form = f
      this.original = this.snapshot()
      this.clearPassword = false
      this.errors = {}
    },
    async load() {
      this.loadError = ''
      try {
        this.apply(await emailSettingsApi.get(this.scope))
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the email settings')
      }
    },
    discard() {
      this.apply(this.data)
      this.testResult = null
    },
    applyPreset(key) {
      const p = PRESETS[key]
      Object.assign(this.form, { provider: p.provider, smtp_host: p.smtp_host, smtp_port: p.smtp_port, smtp_security: p.smtp_security, enabled: true })
      if (!this.form.from_email && this.form.smtp_username.includes('@')) this.form.from_email = this.form.smtp_username
      this.$nextTick(() => document.getElementById(this.form.smtp_username ? 'es-pass' : 'es-user')?.focus())
    },
    onSecurity() {
      if (this.form.smtp_security === 'ssl' && Number(this.form.smtp_port) === 587) this.form.smtp_port = 465
      if (this.form.smtp_security === 'starttls' && Number(this.form.smtp_port) === 465) this.form.smtp_port = 587
    },
    toggleClear() {
      this.clearPassword = !this.clearPassword
      if (this.clearPassword) this.form.smtp_password = ''
    },
    validate() {
      const e = {}
      const f = this.form
      const port = Number(f.smtp_port)
      if (!Number.isInteger(port) || port < 1 || port > 65535) e.smtp_port = 'Port must be between 1 and 65535'
      if (f.from_email && !EMAIL.test(f.from_email)) e.from_email = 'Enter a valid email address'
      if (f.reply_to_email && !EMAIL.test(f.reply_to_email)) e.reply_to_email = 'Enter a valid email address'
      if (f.enabled) {
        if (!f.smtp_host) e.smtp_host = this.isGmail ? 'Enter smtp.gmail.com' : 'Enter the SMTP host, e.g. smtp.gmail.com'
        if (!f.from_email && !String(f.smtp_username).includes('@')) e.from_email = 'Enter the From email address'
        if (f.smtp_username && !f.smtp_password && (!this.secret.set || this.clearPassword)) e.smtp_password = this.isGmail ? 'Enter your Gmail App Password' : 'Enter the password'
        if (f.smtp_username && f.smtp_security === 'none') e.smtp_security = 'Signing in needs STARTTLS or SSL/TLS'
      }
      this.errors = e
      return Object.keys(e).length === 0
    },
    body() {
      const f = this.form
      const b = {}
      for (const k of FIELDS) b[k] = f[k]
      b.smtp_port = Number(f.smtp_port) || 587
      if (f.smtp_password) b.smtp_password = f.smtp_password
      if (this.clearPassword) b.clear_password = true
      return b
    },
    async save() {
      // Turning the switch on is implied by entering a host the first time.
      if (!this.form.enabled && this.form.smtp_host && !this.data.settings?.smtp_host) this.form.enabled = true
      if (!this.validate()) {
        toast.error(Object.values(this.errors)[0])
        return false
      }
      this.saving = true
      try {
        const res = await emailSettingsApi.save(this.scope, this.body())
        this.apply(res)
        toast.success(res.status?.ready ? `Email settings saved — sending from ${res.status.from}` : 'Email settings saved')
        this.$emit('saved', res)
        return true
      } catch (e) {
        const fields = e?.response?.data?.error?.fields
        if (fields) this.errors = fields
        toast.error(apiErrorMessage(e, 'Could not save the email settings'))
        return false
      } finally {
        this.saving = false
      }
    },
    testBody() {
      const body = {}
      if (this.testTo) body.to = [this.testTo]
      if (this.dirty) body.draft = this.body()
      return body
    },
    async sendTest() {
      if (this.testTo && !EMAIL.test(this.testTo)) {
        this.testResult = { success: false, message: `“${this.testTo}” isn’t a valid email address` }
        return
      }
      if (this.dirty && !this.validate()) return
      this.testing = 'send'
      this.testResult = null
      try {
        const res = await emailSettingsApi.test(this.scope, this.testBody())
        this.testResult = res
        if (res.status && this.data) this.data = { ...this.data, status: res.status }
      } catch (e) {
        this.testResult = { success: false, message: apiErrorMessage(e, 'The test email could not be sent') }
      } finally {
        this.testing = ''
      }
    },
    async verify() {
      if (this.dirty && !this.validate()) return
      this.testing = 'verify'
      this.testResult = null
      try {
        this.testResult = await emailSettingsApi.verify(this.scope, this.dirty ? { draft: this.body() } : {})
      } catch (e) {
        this.testResult = { success: false, message: apiErrorMessage(e, 'The connection check could not run') }
      } finally {
        this.testing = ''
      }
    }
  }
}
</script>

<style scoped>
.esp {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  container-type: inline-size;
}

/* Narrow card (e.g. beside the settings menu on a tablet) */
@container (max-width: 560px) {
  .esp-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .esp-grid .span-2 {
    grid-column: 1 / -1;
  }
}

.plain {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.mt {
  margin-top: 12px;
}

.m0 {
  margin: 0;
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 12.5px;
}

.esp-status {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.esp-status.is-ready {
  border-color: var(--success);
  background: var(--success-soft);
}

.esp-status.is-off {
  border-color: var(--warning);
  background: var(--warning-soft);
}

.esp-status__icon {
  font-size: 18px;
  line-height: 22px;
  color: var(--warning);
}

.is-ready .esp-status__icon {
  color: var(--success);
}

.esp-status__main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
}

.esp-status__title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.esp-status__from {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.esp-status__meta {
  font-size: 12.5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  overflow-wrap: anywhere;
}

.ok-text {
  color: var(--success);
}

.err-text {
  color: var(--danger);
}

.esp-form {
  margin-top: 18px;
}

.esp-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px 16px;
}

.esp-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.esp-section {
  margin: 22px 0 10px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
}

.esp-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 16px;
}

.esp-grid .span-2 {
  grid-column: span 2;
}

.esp-grid .span-4 {
  grid-column: 1 / -1;
}

.secret {
  display: flex;
  gap: 4px;
  align-items: center;
}

.secret .ui-input {
  flex: 1;
  min-width: 0;
}

.field-error {
  font-size: 12.5px;
  color: var(--danger);
}

.esp-test {
  margin-top: 22px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.esp-test__text {
  display: grid;
  gap: 2px;
  margin-bottom: 10px;
}

.esp-test__row {
  display: flex;
  gap: 8px;
}

.esp-test__row .ui-input {
  flex: 1;
  min-width: 0;
}

.esp-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.esp-foot .ui-actions {
  margin-left: auto;
}

.dirty-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
  margin-right: 4px;
  vertical-align: middle;
}

@media (max-width: 720px) {
  .esp-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .esp-grid .span-2 {
    grid-column: 1 / -1;
  }

  .esp-test__row {
    flex-direction: column;
  }

  .esp-foot .ui-actions {
    width: 100%;
  }

  .esp-foot .ui-actions .ui-btn {
    flex: 1;
  }
}
</style>
