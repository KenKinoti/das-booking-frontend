<template>
  <section id="morning-brief" class="ui-card mbc" data-testid="morning-brief-card">
    <div class="ui-card__head">
      <div>
        <h2><i class="fa-solid fa-mug-hot"></i> Morning brief</h2>
        <p class="sub">A short note every morning: bills to pay, money in, project progress, opportunities worth going for and your day — by email and WhatsApp.</p>
      </div>
      <span v-if="d" class="ui-badge" :class="d.settings.enabled ? 'ui-badge--success' : 'ui-badge--draft'" data-testid="brief-state">{{ d.settings.enabled ? 'On' : 'Off' }}</span>
    </div>

    <div class="ui-card__body">
      <div v-if="loading" class="sk"><div v-for="n in 3" :key="n" class="ui-skeleton" style="height: 42px"></div></div>
      <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

      <template v-else-if="d">
        <!-- Off: one click -->
        <div v-if="!d.settings.enabled && !customise" class="quick" data-testid="brief-quick">
          <div>
            <strong>Get a morning brief at 8:00</strong>
            <span>Every day at 08:00 ({{ d.org_timezone }}), by email{{ waReady && phone ? ' and WhatsApp' : '' }}. Change anything later.</span>
          </div>
          <div class="quick__actions">
            <button class="ui-btn ui-btn--primary" type="button" :disabled="!!busy" data-testid="brief-quick-on" @click="quickOn">
              <i :class="busy === 'quick' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bell'"></i> Get a morning brief at 8:00
            </button>
            <button class="ui-btn ui-btn--ghost" type="button" data-testid="brief-customise" @click="customise = true">Customise</button>
          </div>
        </div>

        <form v-else class="form" novalidate data-testid="brief-form" @submit.prevent="save">
          <label class="mrow master">
            <span>
              <strong>Send me a morning brief</strong>
              <small v-if="d.next_send_at && form.enabled && !dirty" data-testid="brief-next">Next one {{ when(d.next_send_at) }}</small>
              <small v-else>Off — nothing is sent.</small>
            </span>
            <span class="ui-switch"><input v-model="form.enabled" type="checkbox" aria-label="Send me a morning brief" data-testid="brief-enabled" /></span>
          </label>

          <div class="grid3">
            <label class="ui-field">
              <span class="ui-label">Time</span>
              <input v-model="form.time" type="time" step="300" class="ui-input" data-testid="brief-time" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Days</span>
              <select v-model="form.days" class="ui-select" data-testid="brief-days">
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays (Mon–Fri)</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Time zone</span>
              <select v-model="form.timezone" class="ui-select" data-testid="brief-timezone">
                <option value="">Organisation's ({{ d.org_timezone }})</option>
                <option v-for="z in zones" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option>
              </select>
            </label>
          </div>

          <h3 class="h3">Send it by</h3>
          <label class="mrow">
            <span>
              <strong><i class="fa-regular fa-envelope"></i> Email</strong>
              <small>{{ d.email || 'Your account has no email address' }}</small>
              <em v-if="d.email_note" class="lock" data-testid="brief-email-note"><i class="fa-solid fa-triangle-exclamation"></i> {{ d.email_note }}</em>
            </span>
            <span class="ui-switch"><input v-model="form.email" type="checkbox" aria-label="Email" :disabled="!d.email" data-testid="brief-email" /></span>
          </label>
          <label class="mrow">
            <span>
              <strong><i class="fa-brands fa-whatsapp"></i> WhatsApp</strong>
              <small>To your number below{{ d.whatsapp.platform ? ', from DASYIN’s WhatsApp number' : '' }}.</small>
            </span>
            <span class="ui-switch"><input v-model="form.whatsapp" type="checkbox" aria-label="WhatsApp" data-testid="brief-whatsapp" /></span>
          </label>
          <div v-if="form.whatsapp" class="wa">
            <label class="ui-field">
              <span class="ui-label">Your WhatsApp number</span>
              <input v-model.trim="form.phone" type="tel" class="ui-input" placeholder="+254 712 345 678" autocomplete="tel" maxlength="20" data-testid="brief-phone" />
              <span class="ui-hint">With the country code. Saved as your phone number in My profile.</span>
            </label>
            <div v-if="!waReady" class="ui-alert ui-alert--warning" data-testid="brief-wa-note"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ d.whatsapp.note }}</span></div>
          </div>

          <h3 class="h3">What's in it</h3>
          <label v-for="s in d.sections" :key="s.key" class="mrow" :class="{ 'is-locked': !s.allowed }" :data-testid="`brief-sec-${s.key}`">
            <span>
              <strong><i :class="s.icon"></i> {{ s.title }}</strong>
              <small>{{ s.description }}</small>
              <em v-if="!s.allowed" class="lock"><i class="fa-solid fa-lock"></i> {{ s.reason || 'Not available for your role' }}</em>
            </span>
            <span class="ui-switch"><input v-model="form.sections[s.key]" type="checkbox" :aria-label="s.title" :disabled="!s.allowed" :data-testid="`brief-sec-toggle-${s.key}`" /></span>
          </label>

          <label v-if="d.managing" class="mrow">
            <span>
              <strong>Also send the separate daily digests</strong>
              <small>The bill-reminder and client-billing digest emails. Off: you get those bills and subscriptions in your brief only.</small>
            </span>
            <span class="ui-switch"><input v-model="form.also_digests" type="checkbox" aria-label="Also send the separate daily digests" data-testid="brief-also-digests" /></span>
          </label>

          <div v-if="formError" class="ui-alert ui-alert--danger" data-testid="brief-form-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>

          <div v-if="d.last" class="last" data-testid="brief-last">
            Last brief {{ dayLabel(d.last.date) }}:
            <span class="ui-badge" :class="`ui-badge--${statusOf(d.last.status).tone}`">{{ statusOf(d.last.status).label }}</span>
            <router-link :to="`/brief/${d.last.date}`">Open</router-link>
          </div>

          <div class="foot">
            <router-link to="/brief" class="ui-btn ui-btn--ghost" data-testid="brief-open-today"><i class="fa-solid fa-sun"></i> Today's brief</router-link>
            <button class="ui-btn" type="button" :disabled="!!busy" data-testid="brief-preview" @click="openPreview">
              <i :class="busy === 'preview' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-eye'"></i> Preview
            </button>
            <button class="ui-btn" type="button" :disabled="!!busy || dirty || (!d.settings.email && !d.settings.whatsapp)" :title="dirty ? 'Save first' : ''" data-testid="brief-test" @click="sendTest">
              <i :class="busy === 'test' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'"></i> Send me a test now
            </button>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="!!busy || !dirty" data-testid="brief-save">
              <i :class="busy === 'save' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save
            </button>
          </div>
          <div v-if="testResult" class="ui-alert" :class="testResult.ok ? 'ui-alert--success' : 'ui-alert--warning'" data-testid="brief-test-result">
            <i :class="testResult.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
            <span>
              {{ testResult.text }}
              <template v-for="(e, i) in testResult.errors" :key="i"><br />{{ e }}</template>
            </span>
          </div>
        </form>
      </template>
    </div>

    <!-- Preview -->
    <div v-if="preview" class="ui-modal-backdrop" @mousedown.self="preview = null">
      <div class="ui-modal pv" role="dialog" aria-modal="true" aria-label="Preview of your morning brief" data-testid="brief-preview-modal">
        <div class="ui-modal__head">
          <div>
            <h2>Preview</h2>
            <p class="sub">What you'd get now. Figures change until it is sent.</p>
          </div>
          <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="preview = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-tabs pv__tabs" role="tablist">
            <button class="ui-tab" :class="{ 'is-active': pvTab === 'email' }" type="button" role="tab" data-testid="brief-preview-email-tab" @click="pvTab = 'email'"><i class="fa-regular fa-envelope"></i> Email</button>
            <button class="ui-tab" :class="{ 'is-active': pvTab === 'whatsapp' }" type="button" role="tab" data-testid="brief-preview-wa-tab" @click="pvTab = 'whatsapp'"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button>
          </div>
          <div v-if="pvTab === 'email'">
            <p class="pv__meta"><b>To:</b> {{ preview.email.to || '—' }}<br /><b>Subject:</b> <span data-testid="brief-preview-subject">{{ preview.email.subject }}</span></p>
            <iframe class="pv__frame" title="Email preview" sandbox="" :srcdoc="preview.email.html"></iframe>
          </div>
          <div v-else class="wa-pv" data-testid="brief-preview-wa">
            <p class="pv__meta">
              <template v-if="preview.whatsapp.to"><b>To:</b> +{{ preview.whatsapp.to }}<br /></template>
              <template v-if="preview.whatsapp.mode === 'text'">You messaged us in the last 24 hours, so the fuller text goes out.</template>
              <template v-else-if="preview.whatsapp.mode === 'template'">Approved template <code>{{ preview.whatsapp.template || '—' }}</code> ({{ preview.whatsapp.language }}) with an “Open brief” button.</template>
            </p>
            <div v-if="preview.whatsapp.problem" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ preview.whatsapp.problem }}</span></div>
            <div v-if="preview.whatsapp.text" class="bubble">
              <div class="bubble__text">{{ preview.whatsapp.text }}</div>
              <div v-if="preview.whatsapp.mode === 'template'" class="bubble__btn"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open brief</div>
            </div>
          </div>
        </div>
        <div class="ui-modal__foot">
          <router-link to="/brief" class="ui-btn ui-btn--ghost" @click="preview = null">Open in the app</router-link>
          <button class="ui-btn ui-btn--primary" type="button" @click="preview = null">Close</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { briefApi, timeZones, BRIEF_STATUS, CHANNEL_STATUS, dayLabel, whenIn } from '@/services/brief'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'MorningBriefCard',
  emits: ['phone'],
  data() {
    return { d: null, form: null, original: '', loading: true, error: '', busy: '', formError: '', customise: false, preview: null, pvTab: 'email', testResult: null, zones: timeZones() }
  },
  computed: {
    dirty() {
      return !!this.form && JSON.stringify(this.form) !== this.original
    },
    waReady() {
      return !!this.d?.whatsapp?.ready
    },
    phone() {
      return this.d?.phone || ''
    }
  },
  async created() {
    await this.load()
    if (window.location.hash === '#morning-brief') this.$nextTick(() => this.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
  },
  methods: {
    dayLabel,
    statusOf(s) {
      return BRIEF_STATUS[s] || { label: s || '—', tone: 'draft' }
    },
    chanOf(s) {
      return CHANNEL_STATUS[s] || { label: s || '—', tone: 'draft' }
    },
    when(iso) {
      return whenIn(iso, this.d?.timezone)
    },
    apply(d) {
      this.d = d
      const s = d.settings
      const sections = {}
      for (const x of d.sections) sections[x.key] = x.allowed ? x.on : false
      this.form = { enabled: s.enabled, time: s.time, days: s.days, timezone: s.timezone || '', email: s.email, whatsapp: s.whatsapp, phone: d.phone || '', sections, also_digests: s.also_digests }
      this.original = JSON.stringify(this.form)
      this.$emit('phone', d.phone || '')
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.apply(await briefApi.settings())
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load your morning brief settings')
      } finally {
        this.loading = false
      }
    },
    async quickOn() {
      this.busy = 'quick'
      try {
        this.apply(await briefApi.quickOn())
        toast.success(this.d.next_send_at ? `Morning brief on — the next one comes ${this.when(this.d.next_send_at)}` : 'Morning brief on')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not turn it on'))
      } finally {
        this.busy = ''
      }
    },
    async save() {
      this.busy = 'save'
      this.formError = ''
      try {
        const f = this.form
        const body = { enabled: f.enabled, time: f.time, days: f.days, timezone: f.timezone, email: f.email, whatsapp: f.whatsapp, sections: f.sections, also_digests: f.also_digests }
        if (f.phone !== (this.d.phone || '')) body.phone = f.phone
        this.apply(await briefApi.save(body))
        toast.success(this.d.settings.enabled ? 'Morning brief saved' : 'Morning brief turned off')
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not save')
      } finally {
        this.busy = ''
      }
    },
    async openPreview() {
      this.busy = 'preview'
      try {
        this.preview = await briefApi.preview()
        this.pvTab = this.form.whatsapp && !this.form.email ? 'whatsapp' : 'email'
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not build the preview'))
      } finally {
        this.busy = ''
      }
    },
    async sendTest() {
      this.busy = 'test'
      this.testResult = null
      try {
        const r = await briefApi.test()
        const del = r.delivery || {}
        const parts = []
        const errors = []
        if (del.email_status) parts.push(`email ${this.chanOf(del.email_status).label.toLowerCase()}`)
        if (del.whatsapp_status) parts.push(`WhatsApp ${this.chanOf(del.whatsapp_status).label.toLowerCase()}`)
        if (del.email_error) errors.push('Email: ' + del.email_error)
        if (del.whatsapp_error) errors.push('WhatsApp: ' + del.whatsapp_error)
        const ok = del.status === 'sent'
        this.testResult = { ok, text: `Test brief: ${parts.join(', ') || 'nothing sent'}.`, errors }
        if (ok) toast.success('Test brief sent')
      } catch (e) {
        this.testResult = { ok: false, text: apiErrorMessage(e, 'Could not send the test'), errors: [] }
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.ui-card__head h2 i {
  color: var(--accent);
  margin-right: 6px;
}

.sub {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.sk {
  display: grid;
  gap: 10px;
}

.quick {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--accent-soft);
}

.quick > div:first-child {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1 1 260px;
}

.quick span {
  color: var(--text-2);
  font-size: 13px;
}

.quick__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form {
  display: grid;
  gap: 4px;
}

.mrow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.mrow > span:first-child {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.mrow strong i {
  width: 18px;
  color: var(--text-3);
}

.mrow small {
  color: var(--text-3);
  font-size: 13px;
}

.mrow.master {
  border-bottom: 0;
  padding-top: 0;
}

.mrow.is-locked {
  cursor: default;
  opacity: 0.75;
}

.lock {
  font-style: normal;
  font-size: 12px;
  color: var(--warning);
}

.grid3 {
  display: grid;
  grid-template-columns: 140px 1fr 1.4fr;
  gap: 12px;
  margin-bottom: 8px;
}

.h3 {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin: 16px 0 0;
}

.wa {
  display: grid;
  gap: 10px;
  padding: 10px 0 4px;
}

.last {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-2);
  margin-top: 12px;
}

.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.pv {
  max-width: 720px;
}

.pv__tabs {
  margin-bottom: 12px;
}

.pv__meta {
  font-size: 13px;
  color: var(--text-2);
  margin: 0 0 10px;
  overflow-wrap: anywhere;
}

.pv__frame {
  width: 100%;
  height: 60vh;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
}

.wa-pv {
  display: grid;
  gap: 10px;
}

.bubble {
  max-width: 420px;
  background: #dcf8c6;
  color: #111b21;
  border-radius: 10px 10px 10px 2px;
  padding: 10px 12px;
  box-shadow: var(--shadow-xs);
  font-size: 14px;
}

.bubble__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.bubble__btn {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  text-align: center;
  color: #027eb5;
  font-weight: 600;
}

@media (max-width: 640px) {
  .grid3 {
    grid-template-columns: 1fr 1fr;
  }

  .grid3 .ui-field:last-child {
    grid-column: span 2;
  }

  .foot .ui-btn {
    flex: 1 1 auto;
    justify-content: center;
  }

  .quick__actions,
  .quick__actions .ui-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
