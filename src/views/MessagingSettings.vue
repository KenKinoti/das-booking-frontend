<template>
  <div class="mp ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Communication</div>
        <h1>Messaging settings</h1>
        <p>Control team chat for your organisation and connect WhatsApp Business.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/messages" class="ui-btn"><i class="fa-regular fa-message"></i> Open messages</router-link>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="grid">
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Team chat</h2>
            <p class="sub">Applies to everyone in your organisation.</p>
          </div>
          <span v-if="savingKey" class="muted small"><i class="fa-solid fa-circle-notch spin"></i> Saving…</span>
        </div>
        <div class="ui-card__body toggles">
          <template v-if="!settings">
            <div v-for="n in 3" :key="n" class="ui-skeleton" style="height: 48px; margin-bottom: 10px"></div>
          </template>
          <template v-else>
            <label v-for="t in toggles" :key="t.key" class="toggle">
              <span>
                <strong>{{ t.label }}</strong>
                <small>{{ t.hint }}</small>
              </span>
              <span class="ui-switch"><input type="checkbox" :checked="settings[t.key]" :disabled="savingKey === t.key" :aria-label="t.label" @change="saveToggle(t.key, $event.target.checked)" /></span>
            </label>
          </template>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2><i class="fa-brands fa-whatsapp wa"></i> WhatsApp Business</h2>
            <p class="sub">Send WhatsApp messages from DASYIN using the Meta Cloud API.</p>
          </div>
          <span class="ui-badge" :class="waConfigured ? 'ui-badge--success' : 'ui-badge--draft'">{{ waConfigured ? 'Configured' : 'Not set up' }}</span>
        </div>
        <form class="ui-card__body" novalidate autocomplete="off" @submit.prevent="saveWhatsApp">
          <div v-if="waError" class="ui-alert ui-alert--danger" style="margin-bottom: 14px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ waError }}</span></div>
          <div v-if="waOk" class="ui-alert ui-alert--success" style="margin-bottom: 14px"><i class="fa-solid fa-circle-check"></i><span>{{ waOk }}</span></div>
          <div class="form-grid">
            <label class="ui-field span-2">
              <span class="ui-label">Phone number ID</span>
              <input v-model.trim="wa.phone" class="ui-input mono" inputmode="numeric" placeholder="e.g. 106540352242922" :disabled="!settings" />
              <span class="ui-hint">From Meta for Developers → WhatsApp → API setup. This is the ID, not the phone number itself.</span>
            </label>
            <label class="ui-field span-2">
              <span class="ui-label">Permanent access token</span>
              <input v-model.trim="wa.token" type="password" class="ui-input mono" autocomplete="new-password" :placeholder="waHasToken ? 'Saved — leave blank to keep' : 'EAAG…'" :disabled="!settings" />
            </label>
          </div>
          <div class="wa-actions">
            <button type="button" class="ui-btn" :disabled="!waConfigured || testing" @click="testWhatsApp"><i :class="testing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-stethoscope'"></i> Test connection</button>
            <button v-if="waConfigured" type="button" class="ui-btn ui-btn--ghost txt-danger" :disabled="waSaving" @click="removeWhatsApp"><i class="fa-regular fa-trash-can"></i> Remove</button>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="waSaving || !settings || (!wa.phone && !wa.token)"><i :class="waSaving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save</button>
          </div>

          <div v-if="waConfigured" class="send-test">
            <h3>Send a test message</h3>
            <div class="send-row">
              <input v-model.trim="testTo" class="ui-input" inputmode="tel" placeholder="Recipient in international format, e.g. 61400000000" aria-label="Recipient number" />
              <button type="button" class="ui-btn" :disabled="!testTo || sending" @click="sendTest"><i :class="sending ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-paper-plane'"></i> Send</button>
            </div>
            <span class="ui-hint">WhatsApp only delivers free-form messages to people who messaged your business in the last 24 hours.</span>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { messagingService } from '@/services/messaging'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'MessagingSettings',
  data() {
    return {
      settings: null,
      loadError: '',
      savingKey: '',
      wa: { phone: '', token: '' },
      waError: '',
      waOk: '',
      waSaving: false,
      testing: false,
      testTo: '',
      sending: false,
      toggles: [
        { key: 'enable_in_app_messaging', label: 'Team chat', hint: 'Let people send messages in Messages. When off, conversations are read-only.' },
        { key: 'enable_group_chats', label: 'Group conversations', hint: 'Allow conversations with more than two people.' },
        { key: 'enable_typing_indicator', label: 'Typing indicators', hint: 'Show when someone is typing a reply.' }
      ]
    }
  },
  computed: {
    waHasToken() {
      return !!(this.settings && this.settings.whatsapp_api_key)
    },
    waConfigured() {
      return this.waHasToken && !!(this.settings && this.settings.whatsapp_phone_number)
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.loadError = ''
      try {
        this.settings = await messagingService.getSettings()
        this.wa = { phone: this.settings.whatsapp_phone_number || '', token: '' }
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load messaging settings')
      }
    },
    async saveToggle(key, value) {
      const before = this.settings[key]
      this.settings[key] = value
      this.savingKey = key
      try {
        this.settings = await messagingService.updateSettings({ [key]: value })
        toast.success('Saved')
      } catch (e) {
        this.settings[key] = before
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.savingKey = ''
      }
    },
    async saveWhatsApp() {
      this.waError = ''
      this.waOk = ''
      if (this.wa.phone && !/^\d{6,20}$/.test(this.wa.phone)) {
        this.waError = 'The phone number ID is a long number (digits only).'
        return
      }
      if (!this.wa.token && !this.waHasToken) {
        this.waError = 'Enter the access token.'
        return
      }
      const body = { whatsapp_phone_number: this.wa.phone }
      if (this.wa.token) body.whatsapp_api_key = this.wa.token
      this.waSaving = true
      try {
        this.settings = await messagingService.updateSettings(body)
        this.wa.token = ''
        toast.success('WhatsApp settings saved')
      } catch (e) {
        this.waError = apiErrorMessage(e, 'Could not save WhatsApp settings')
      } finally {
        this.waSaving = false
      }
    },
    async removeWhatsApp() {
      const okd = await confirmDialog({ title: 'Remove WhatsApp?', message: 'The saved phone number ID and access token are deleted.', confirmText: 'Remove', danger: true })
      if (!okd) return
      this.waSaving = true
      try {
        this.settings = await messagingService.updateSettings({ whatsapp_phone_number: '', whatsapp_api_key: '' })
        this.wa = { phone: '', token: '' }
        this.waOk = ''
        toast.success('WhatsApp removed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove WhatsApp'))
      } finally {
        this.waSaving = false
      }
    },
    async testWhatsApp() {
      this.testing = true
      this.waError = ''
      this.waOk = ''
      try {
        const res = await messagingService.testWhatsAppConnection()
        this.waOk = res.message || 'Connection successful'
      } catch (e) {
        this.waError = apiErrorMessage(e, 'Connection test failed')
      } finally {
        this.testing = false
      }
    },
    async sendTest() {
      const to = this.testTo.replace(/[^\d]/g, '')
      if (to.length < 8) {
        toast.error('Enter the full number with country code')
        return
      }
      this.sending = true
      try {
        await api.post('/messaging/whatsapp/send', { to, message: 'Test message from DASYIN ERP' })
        toast.success('Test message sent')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send the test message'))
      } finally {
        this.sending = false
      }
    }
  }
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: start;
}

.sub {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.wa {
  color: var(--success);
  margin-right: 4px;
}

.mono {
  font-family: var(--font-mono);
  font-size: 13px;
}

.toggles {
  padding-top: 6px;
  padding-bottom: 6px;
}

.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.toggle:last-child {
  border-bottom: 0;
}

.toggle small {
  display: block;
  color: var(--text-3);
  font-size: 13px;
  margin-top: 2px;
}

.wa-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 18px;
}

.send-test {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.send-test h3 {
  font-size: 14px;
  font-weight: 650;
  margin: 0 0 10px;
}

.send-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
