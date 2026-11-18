<template>
  <div class="sps" data-testid="sms-settings">
    <div class="sps-head">
      <div>
        <h2>SMS</h2>
        <p class="muted m0">Text messages for scheduled reminders, statements and customer messages. Use Africa's Talking (Kenya and Africa) or Twilio.</p>
      </div>
      <span class="ui-badge" :class="status.ready ? 'ui-badge--success' : 'ui-badge--warning'" data-testid="sms-status">{{ status.ready ? (status.provider === 'twilio' ? 'Ready — Twilio' : "Ready — Africa's Talking") : 'Not set up' }}</span>
    </div>
    <div v-if="loading" class="ui-skeleton" style="height: 220px"></div>
    <form v-else class="sps-form" novalidate autocomplete="off" @submit.prevent="save">
      <div class="ui-field">
        <label for="sps_provider">Send SMS with</label>
        <select id="sps_provider" v-model="form.provider" class="ui-select" :disabled="!canEdit" data-testid="sms-provider">
          <option value="">Whichever is set up (Africa's Talking first)</option>
          <option value="africastalking">Africa's Talking</option>
          <option value="twilio">Twilio</option>
        </select>
        <span class="ui-hint">{{ status.note }}</span>
      </div>

      <fieldset class="sps-box">
        <legend>Africa's Talking</legend>
        <div class="sps-grid">
          <div class="ui-field">
            <label for="sps_user">Username</label>
            <input id="sps_user" v-model.trim="form.at_username" class="ui-input" :disabled="!canEdit" placeholder="Your app's username (sandbox for testing)" spellcheck="false" data-testid="at-username" />
          </div>
          <div class="ui-field">
            <label for="sps_sender">Sender ID</label>
            <input id="sps_sender" v-model.trim="form.at_sender_id" class="ui-input" :disabled="!canEdit" maxlength="15" placeholder="e.g. DASYIN (optional)" spellcheck="false" data-testid="at-sender" />
            <span class="ui-hint">The name people see. It must be approved on your Africa's Talking account; leave empty to use their shared one.</span>
          </div>
          <div class="ui-field span-2">
            <label for="sps_key">API key</label>
            <div class="sps-secret">
              <input id="sps_key" v-model="form.at_api_key" class="ui-input" :type="reveal ? 'text' : 'password'" autocomplete="new-password" spellcheck="false" :disabled="!canEdit || clearKey" :placeholder="keySet ? `Saved ${keyHint} — enter a new key to replace it` : 'Not set'" data-testid="at-key" />
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" :aria-label="reveal ? 'Hide' : 'Show'" @click="reveal = !reveal"><i :class="reveal ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i></button>
              <button v-if="keySet && canEdit" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="clearKey = !clearKey">{{ clearKey ? 'Keep' : 'Remove' }}</button>
            </div>
            <span class="ui-hint">{{ clearKey ? 'The key is removed when you save.' : "Africa's Talking dashboard → Settings → API Key. Stored encrypted and never shown again." }}</span>
          </div>
        </div>
        <p class="ui-hint m0">Delivery reports: in the Africa's Talking dashboard (SMS → Callback URLs → Delivery reports) enter <code>{{ deliveryUrl }}</code></p>
      </fieldset>

      <fieldset class="sps-box">
        <legend>Twilio</legend>
        <p class="m0 small">{{ status.twilio_set ? 'Set up — sends from ' + (status.twilio_from || 'your Twilio number') + '.' : 'Not set up.' }} The account SID, auth token and From number are on the Twilio tab.</p>
      </fieldset>

      <div class="sps-test">
        <div class="ui-field">
          <label for="sps_to">Send a test SMS to</label>
          <input id="sps_to" v-model.trim="testTo" class="ui-input" type="tel" placeholder="+254 712 345 678" data-testid="sms-test-to" />
        </div>
        <button type="button" class="ui-btn" :disabled="!status.ready || testing || !testTo || !canEdit" data-testid="sms-test" @click="test"><i :class="testing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-paper-plane'"></i> Send test</button>
      </div>
      <div v-if="lastTest" class="ui-alert" :class="lastTest.ok ? 'ui-alert--success' : 'ui-alert--danger'" data-testid="sms-test-result">
        <i :class="lastTest.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i><span>{{ lastTest.note }}</span>
      </div>

      <div class="sps-foot">
        <span v-if="!canEdit" class="muted small">Only owners and administrators can change SMS settings.</span>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="!canEdit || saving" data-testid="sms-save"><i v-if="saving" class="fa-solid fa-circle-notch spin"></i> Save SMS settings</button>
      </div>
    </form>
  </div>
</template>

<script>
import { schedsendApi } from '@/services/schedsend'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

/** System settings → Integrations → SMS: provider choice and the Africa's Talking account (pkg/schedsend). */
export default {
  name: 'SmsProviderSettings',
  data() {
    return { loading: true, saving: false, testing: false, reveal: false, clearKey: false, testTo: '', s: {}, form: { provider: '', at_username: '', at_sender_id: '', at_api_key: '' } }
  },
  computed: {
    status() {
      return this.s.status || {}
    },
    keySet() {
      return !!this.s.at_key_set
    },
    keyHint() {
      return this.s.at_key_hint || '••••'
    },
    canEdit() {
      return this.s.can_edit !== false
    },
    deliveryUrl() {
      return this.s.delivery_report_url || '/api/v1/public/sms/africastalking/delivery'
    },
    lastTest() {
      return this.s.last_test_at ? { ok: this.s.last_test_ok, note: this.s.last_test_note } : null
    }
  },
  created() {
    this.load()
  },
  methods: {
    apply(s) {
      this.s = s
      this.form = { provider: s.provider || '', at_username: s.at_username || '', at_sender_id: s.at_sender_id || '', at_api_key: '' }
      this.clearKey = false
    },
    async load() {
      this.loading = true
      try {
        this.apply(await schedsendApi.smsSettings())
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the SMS settings'))
      } finally {
        this.loading = false
      }
    },
    async save() {
      this.saving = true
      try {
        const body = { provider: this.form.provider, at_username: this.form.at_username, at_sender_id: this.form.at_sender_id, clear_at_api_key: this.clearKey }
        if (this.form.at_api_key) body.at_api_key = this.form.at_api_key
        const s = await schedsendApi.saveSmsSettings(body)
        this.apply({ ...this.s, ...s, at_key_hint: s.status?.at_key_hint })
        toast.success('SMS settings saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the SMS settings'))
      } finally {
        this.saving = false
      }
    },
    async test() {
      this.testing = true
      try {
        const r = await schedsendApi.testSms(this.testTo)
        r.success ? toast.success(r.message) : toast.error(r.message)
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'The test could not run'))
      } finally {
        this.testing = false
      }
    }
  }
}
</script>

<style scoped>
.sps {
  max-width: 880px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sps-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.sps-head h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 2px;
}
.sps-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sps-box {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px 16px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.sps-box legend {
  font-weight: 650;
  font-size: 14px;
  padding: 0 6px;
}
.sps-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
}
.span-2 {
  grid-column: 1 / -1;
}
.sps-secret {
  display: flex;
  gap: 4px;
  align-items: center;
}
.sps-secret .ui-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
}
.sps-test {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.sps-test .ui-field {
  flex: 1;
  margin: 0;
}
.sps-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}
code {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 13px;
}
.m0 {
  margin: 0;
}
.spin {
  animation: spsspin 0.8s linear infinite;
}
@keyframes spsspin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 720px) {
  .sps-grid {
    grid-template-columns: 1fr;
  }
  .sps-head,
  .sps-test {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
