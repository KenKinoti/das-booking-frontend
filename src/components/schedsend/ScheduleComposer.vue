<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal sc" role="dialog" aria-modal="true" :aria-label="heading" data-testid="schedule-composer" @submit.prevent="save">
      <div class="ui-modal__head">
        <div class="min0">
          <h2>{{ heading }}</h2>
          <p class="muted small m0">{{ subheading }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body sc-body">
        <div v-if="!meta" class="sc-col">
          <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 44px; margin-bottom: 12px"></div>
        </div>
        <template v-else>
          <div class="sc-col sc-form">
            <!-- What -->
            <section v-if="!fixedKind" class="sc-sec">
              <h3>What</h3>
              <div class="sc-seg" role="radiogroup" aria-label="Kind of message">
                <button v-for="k in kinds" :key="k.value" type="button" class="sc-seg__btn" :class="{ on: form.kind === k.value }" role="radio" :aria-checked="form.kind === k.value" :disabled="!k.allowed" :title="k.allowed ? '' : k.why" :data-testid="'kind-' + k.value" @click="setKind(k.value)">
                  <i :class="k.icon"></i> {{ k.label }}
                </button>
              </div>
            </section>

            <!-- Invoice emails: only the time changes -->
            <section v-if="isInvoiceKind" class="sc-sec">
              <div class="ui-alert"><i class="fa-solid fa-circle-info"></i><span>The {{ kindLabel.toLowerCase() }} goes out exactly as composed in the send dialog{{ message && message.invoice_send && message.invoice_send.to ? ' to ' + message.invoice_send.to : '' }}. To change the wording, cancel this and use “Send later” again.</span></div>
            </section>

            <!-- Who -->
            <section v-if="form.kind === 'customer' || form.kind === 'statement'" class="sc-sec">
              <h3>Who</h3>
              <div class="sc-seg sc-seg--sm" role="radiogroup" aria-label="Recipients">
                <button v-for="m in audienceModes" :key="m.value" type="button" class="sc-seg__btn" :class="{ on: form.audience.mode === m.value }" :disabled="!m.allowed" :title="m.allowed ? '' : 'Managers and above'" :data-testid="'aud-' + m.value" @click="setMode(m.value)">{{ m.label }}</button>
              </div>
              <div v-if="form.audience.mode === 'one'" class="ui-field">
                <CustomerPicker v-model="oneCustomer" placeholder="Search a customer by name or email" @picked="rememberName" />
              </div>
              <div v-else-if="form.audience.mode === 'chosen'" class="ui-field">
                <CustomerPicker v-model="pickerValue" placeholder="Add customers by name or email" @picked="addChosen" />
                <ul v-if="form.audience.customer_ids.length" class="sc-chips" data-testid="chosen-customers">
                  <li v-for="id in form.audience.customer_ids" :key="id" class="sc-chip">
                    {{ names[id] || 'Customer' }}
                    <button type="button" class="sc-chip__x" :aria-label="'Remove ' + (names[id] || 'customer')" @click="removeChosen(id)"><i class="fa-solid fa-xmark"></i></button>
                  </li>
                </ul>
              </div>
              <template v-else>
                <div class="ui-field">
                  <label for="sc_group">Group</label>
                  <select id="sc_group" v-model="form.audience.group" class="ui-select" data-testid="aud-group">
                    <option v-for="g in meta.groups" :key="g.key" :value="g.key">{{ g.label }}</option>
                  </select>
                </div>
                <div v-if="form.audience.group === 'customer_type'" class="ui-field">
                  <label for="sc_type">Customer type</label>
                  <select id="sc_type" v-model="form.audience.group_value" class="ui-select">
                    <option value="business">Businesses (with a company name)</option>
                    <option value="individual">Individuals</option>
                  </select>
                </div>
                <div v-if="form.audience.group === 'country'" class="ui-field">
                  <label for="sc_country">Country</label>
                  <select id="sc_country" v-model="form.audience.group_value" class="ui-select">
                    <option v-for="c in meta.countries" :key="c.key" :value="c.key">{{ c.label }} ({{ c.count }})</option>
                  </select>
                  <span v-if="!meta.countries.length" class="ui-hint">No customer has a country yet.</span>
                </div>
              </template>
              <label v-if="form.kind === 'statement'" class="ui-switch"><input v-model="form.audience.skip_zero_balance" type="checkbox" /> Leave out customers with nothing to pay</label>
            </section>

            <section v-if="form.kind === 'team'" class="sc-sec">
              <h3>Who</h3>
              <div class="sc-seg sc-seg--sm" role="radiogroup" aria-label="Team members">
                <button type="button" class="sc-seg__btn" :class="{ on: teamMode === 'all' }" data-testid="team-all" @click="teamMode = 'all'">Everyone</button>
                <button type="button" class="sc-seg__btn" :class="{ on: teamMode === 'managers' }" @click="teamMode = 'managers'">Managers &amp; owners</button>
                <button type="button" class="sc-seg__btn" :class="{ on: teamMode === 'chosen' }" data-testid="team-chosen" @click="teamMode = 'chosen'">Choose people</button>
              </div>
              <ul v-if="teamMode === 'chosen'" class="sc-people">
                <li v-for="p in staff" :key="p.id">
                  <label class="sc-person">
                    <input v-model="form.audience.user_ids" type="checkbox" :value="p.id" />
                    <span class="min0"><strong>{{ p.name }}</strong><small>{{ p.email }}{{ p.has_phone ? ' · has a phone number' : '' }}</small></span>
                  </label>
                </li>
              </ul>
            </section>

            <!-- How -->
            <section v-if="!isInvoiceKind" class="sc-sec">
              <h3>How</h3>
              <div class="sc-channels">
                <label v-if="form.kind === 'team'" class="sc-chan on is-fixed"><input type="checkbox" checked disabled /> <i class="fa-regular fa-bell"></i> In-app notification</label>
                <label v-for="c in channelOptions" :key="c.value" class="sc-chan" :class="{ on: form.channels.includes(c.value) }" :data-testid="'chan-' + c.value">
                  <input v-model="form.channels" type="checkbox" :value="c.value" />
                  <i :class="c.icon"></i> {{ c.label }}
                  <small :class="c.ready ? 'ok' : 'warn'">{{ c.note }}</small>
                </label>
              </div>
              <label v-if="form.kind === 'customer'" class="ui-switch"><input v-model="form.marketing" type="checkbox" data-testid="marketing" /> This is marketing (offers, promotions)</label>
              <p v-if="form.kind === 'customer'" class="ui-hint m0">{{ form.marketing ? 'Adds an unsubscribe link and skips customers who chose “no marketing messages”.' : 'A service message about their account — sent even to customers who opted out of marketing.' }}</p>
            </section>

            <!-- Message -->
            <section v-if="!isInvoiceKind" class="sc-sec">
              <h3>Message</h3>
              <p v-if="form.kind === 'reminder' && form.channels.includes('email')" class="ui-hint m0" data-testid="reminder-email-note">
                <i class="fa-regular fa-envelope"></i> The email is your usual payment reminder (with the invoice PDF and pay link) — the same as “Send payment reminder”.
              </p>
              <template v-if="needsLong">
                <div class="ui-field">
                  <label for="sc_subject">{{ form.kind === 'team' ? 'Title' : 'Email subject' }}</label>
                  <input id="sc_subject" v-model="form.subject" class="ui-input" maxlength="250" data-testid="sc-subject" @focus="focus = 'subject'" />
                </div>
                <div class="ui-field">
                  <label for="sc_body">{{ form.kind === 'team' ? 'Message' : 'Email message' }}</label>
                  <textarea id="sc_body" ref="body" v-model="form.body" class="ui-textarea" rows="7" data-testid="sc-body" @focus="focus = 'body'"></textarea>
                </div>
              </template>
              <div v-if="needsShort" class="ui-field">
                <label for="sc_sms">{{ shortLabel }}</label>
                <textarea id="sc_sms" v-model="form.sms_body" class="ui-textarea" rows="3" :placeholder="needsLong ? 'Leave empty to use the message above' : ''" data-testid="sc-sms" @focus="focus = 'sms_body'"></textarea>
                <span v-if="form.channels.includes('sms')" class="ui-hint">{{ smsInfo }}</span>
              </div>
              <div class="sc-fields">
                <span class="muted small">Merge fields:</span>
                <button v-for="f in fields" :key="f.name" type="button" class="sc-field" :title="f.help + ' — e.g. ' + f.example" @click="insert(f.name)">{{ '{' + f.name + '}' }}</button>
              </div>
              <WaTemplatePicker v-if="form.channels.includes('whatsapp')" v-model="form.whatsapp" :fields="fields" :message="form.sms_body || form.body" />
            </section>

            <!-- When -->
            <section class="sc-sec">
              <h3>When</h3>
              <SendTimePicker v-model="form.when" :meta="meta" :allow-repeat="!isInvoiceKind && form.kind !== 'reminder'" :reminder="form.kind === 'reminder'" />
            </section>
            <div v-if="error" class="ui-alert ui-alert--danger" data-testid="sc-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
          </div>

          <!-- Preview -->
          <aside v-if="!isInvoiceKind" class="sc-col sc-preview" data-testid="sc-preview">
            <div class="sc-preview__head">
              <h3>Preview</h3>
              <button type="button" class="ui-btn ui-btn--sm" :disabled="previewing" data-testid="sc-refresh" @click="runPreview"><i :class="previewing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Refresh</button>
            </div>
            <p v-if="previewError" class="sc-perr">{{ previewError }}</p>
            <template v-else-if="preview">
              <p class="sc-count" data-testid="sc-recipients"><strong>{{ preview.recipients }}</strong> {{ form.kind === 'team' ? (preview.recipients === 1 ? 'person' : 'people') : preview.recipients === 1 ? 'customer' : 'customers' }}</p>
              <ul class="sc-stats">
                <li v-for="(n, ch) in preview.per_channel" :key="ch"><i :class="chanIcon(ch)"></i> {{ n }} by {{ chanLabel(ch) }}</li>
                <li v-for="(n, why) in preview.skipped" :key="why" class="skip"><i class="fa-solid fa-forward"></i> {{ n }} skipped: {{ why }}</li>
              </ul>
              <ul v-if="preview.warnings.length" class="sc-warn">
                <li v-for="w in preview.warnings" :key="w"><i class="fa-solid fa-triangle-exclamation"></i> {{ w }}</li>
              </ul>
              <div v-if="preview.options.length > 1" class="ui-field">
                <label for="sc_pick">Preview for</label>
                <select id="sc_pick" v-model="pick" class="ui-select" data-testid="sc-pick" @change="runPreview">
                  <option v-for="o in preview.options" :key="o.id" :value="o.id">{{ optName(o) }}</option>
                </select>
              </div>
              <div v-for="s in preview.samples" :key="s.channel" class="sc-sample" :data-channel="s.channel">
                <div class="sc-sample__head">
                  <span><i :class="chanIcon(s.channel)"></i> {{ chanLabel(s.channel) }} → {{ s.address || '—' }}</span>
                  <span v-if="!s.send" class="ui-badge ui-badge--draft">Skipped</span>
                  <span v-else-if="s.mode" class="ui-badge ui-badge--info">{{ s.mode === 'template' ? 'Template' : 'Free text' }}</span>
                </div>
                <p v-if="!s.send" class="sc-skip">{{ s.reason }}</p>
                <template v-else>
                  <p v-if="s.subject" class="sc-subj">{{ s.subject }}</p>
                  <iframe v-if="s.html" class="sc-frame" sandbox="" :srcdoc="s.html" title="Email preview"></iframe>
                  <p v-else-if="s.mode === 'template'" class="sc-bubble">Template <strong>{{ s.template }}</strong><span v-for="(p, i) in s.params" :key="i" class="sc-param"><code v-text="ph(i + 1)"></code> {{ p }}</span></p>
                  <p v-else class="sc-bubble" :class="'b-' + s.channel">{{ s.text }}</p>
                </template>
              </div>
              <p v-if="preview.upcoming.length" class="muted small m0">Next sends: {{ preview.upcoming.map(when).join(' · ') }}</p>
            </template>
            <p v-else class="muted small">Fill in who and what to see the message each person gets.</p>
          </aside>
        </template>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !meta" data-testid="sc-save">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-clock'"></i> {{ message ? 'Save changes' : 'Schedule' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import CustomerPicker from '@/components/subscriptions/CustomerPicker.vue'
import SendTimePicker from './SendTimePicker.vue'
import WaTemplatePicker from './WaTemplatePicker.vue'
import { schedsendApi, KIND_LABELS, CHANNEL_LABELS, CHANNEL_ICONS, localLabel } from '@/services/schedsend'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const STATEMENT_SUBJECT = 'Statement of account — {month}'
const STATEMENT_BODY = "Hi {first_name},\n\nHere is your statement from {business}. You have {open_invoices} unpaid invoice(s) with {balance} still to pay:\n\n{statement}\n\nPay online: {pay_link}\n\nIf you've already paid, thank you — please ignore this message.\n\n{business}"
const REMINDER_TEXT = 'Hi {first_name}, invoice {invoice_number} for {amount_due} was due on {due_date}. You can pay here: {pay_link} — {business}'

/**
 * Compose a scheduled customer, group, statement, team or reminder message:
 * who, how (email / SMS / WhatsApp), the text with merge fields, when (with
 * repeat) and a per-recipient preview from the server. Also edits an
 * existing scheduled message (invoice emails: the time only).
 */
export default {
  name: 'ScheduleComposer',
  components: { CustomerPicker, SendTimePicker, WaTemplatePicker },
  props: {
    message: { type: Object, default: null }, // editing
    kind: { type: String, default: 'customer' },
    fixedKind: { type: Boolean, default: false },
    invoice: { type: Object, default: null }, // reminders
    customerId: { type: String, default: '' }
  },
  emits: ['close', 'saved'],
  data() {
    const m = this.message
    const kind = m?.kind || this.kind
    const aud = m?.audience || {}
    return {
      meta: null,
      staff: [],
      saving: false,
      error: '',
      preview: null,
      previewError: '',
      previewing: false,
      pick: '',
      focus: 'body',
      timer: null,
      names: {},
      pickerValue: '',
      oneCustomer: aud.mode === 'one' ? aud.customer_ids?.[0] || '' : this.customerId,
      teamMode: aud.user_ids?.length ? 'chosen' : aud.levels?.length ? 'managers' : 'all',
      form: {
        kind,
        title: m?.title || '',
        channels: m ? [...(m.channels || [])].filter((c) => c !== 'inapp') : kind === 'reminder' ? ['email'] : kind === 'team' ? [] : ['email'],
        marketing: !!m?.marketing,
        audience: {
          mode: aud.mode || 'one',
          customer_ids: aud.customer_ids ? [...aud.customer_ids] : [],
          group: aud.group || 'all_email',
          group_value: aud.group_value || '',
          user_ids: aud.user_ids ? [...aud.user_ids] : [],
          levels: aud.levels ? [...aud.levels] : [],
          skip_zero_balance: aud.skip_zero_balance ?? true
        },
        subject: m?.subject || (kind === 'statement' ? STATEMENT_SUBJECT : ''),
        body: m?.body || (kind === 'statement' ? STATEMENT_BODY : ''),
        sms_body: m?.sms_body || (kind === 'reminder' ? REMINDER_TEXT : ''),
        whatsapp: { template: '', language: '', params: [], url_button: '', template_only: false, ...(m?.whatsapp || {}) },
        when: {
          local_send_at: m?.local_send_at && m?.next_local ? m.next_local : m?.local_send_at || '',
          timezone: m?.timezone || '',
          repeat: m?.repeat || (kind === 'reminder' ? { freq: 'daily', interval: 7, count: 6, stop_when_paid: true } : { freq: 'none' })
        }
      }
    }
  },
  computed: {
    isInvoiceKind() {
      return this.form.kind === 'invoice' || this.form.kind === 'receipt'
    },
    kindLabel() {
      if (this.form.kind === 'invoice' && this.message?.doc_type === 'quote') return 'Quote email'
      return KIND_LABELS[this.form.kind] || 'Message'
    },
    heading() {
      if (this.message) return 'Edit scheduled ' + this.kindLabel.toLowerCase()
      if (this.form.kind === 'reminder') return 'Schedule payment reminders'
      return 'Schedule a message'
    },
    subheading() {
      if (this.form.kind === 'reminder' && (this.invoice || this.message)) {
        const n = this.invoice?.number || this.message?.doc_number
        return `${n} · ${this.invoice?.client_name || this.message?.customer_name || ''}`
      }
      return 'Email, SMS or WhatsApp — now or on a schedule, in your time zone.'
    },
    perms() {
      return this.meta?.permissions || {}
    },
    kinds() {
      const p = this.perms
      return [
        { value: 'customer', label: 'Customer message', icon: 'fa-regular fa-envelope', allowed: p.single !== false, why: '' },
        { value: 'statement', label: 'Statement of account', icon: 'fa-solid fa-scale-balanced', allowed: !!p.invoices, why: 'You need permission to send invoices' },
        { value: 'team', label: 'Team message', icon: 'fa-solid fa-user-group', allowed: !!p.team, why: 'Managers and above' }
      ]
    },
    audienceModes() {
      const bulk = !!this.perms.bulk
      return [
        { value: 'one', label: 'One customer', allowed: true },
        { value: 'chosen', label: 'Chosen customers', allowed: bulk },
        { value: 'group', label: 'A group', allowed: bulk }
      ]
    },
    channelOptions() {
      const ch = this.meta?.channels || {}
      const list = []
      const email = ch.email || {}
      list.push({ value: 'email', label: 'Email', icon: CHANNEL_ICONS.email, ready: !!email.ready, note: email.ready ? '' : 'Not set up' })
      if (this.form.kind !== 'team') {
        const sms = ch.sms || {}
        list.push({ value: 'sms', label: 'SMS', icon: CHANNEL_ICONS.sms, ready: !!sms.ready, note: sms.ready ? (sms.provider === 'twilio' ? 'Twilio' : "Africa's Talking") : 'Not set up' })
      }
      const wa = ch.whatsapp || {}
      list.push({ value: 'whatsapp', label: 'WhatsApp', icon: CHANNEL_ICONS.whatsapp, ready: !!wa.ready, note: wa.ready ? '' : 'Not set up' })
      return list
    },
    needsLong() {
      // Reminder emails are the invoicing reminder email (wording from Invoice settings).
      return this.form.kind === 'team' || (this.form.kind !== 'reminder' && this.form.channels.includes('email'))
    },
    needsShort() {
      return this.form.channels.includes('sms') || this.form.channels.includes('whatsapp')
    },
    shortLabel() {
      const s = this.form.channels.includes('sms'), w = this.form.channels.includes('whatsapp')
      return s && w ? 'SMS and WhatsApp text' : s ? 'SMS text' : 'WhatsApp text'
    },
    smsInfo() {
      const t = this.form.sms_body || this.form.body || ''
      const parts = Math.max(1, Math.ceil(t.length / 153))
      return `${t.length} characters${t.length > 160 ? ` · about ${parts} SMS each` : ''} (before merge fields are filled)`
    },
    fields() {
      const all = this.meta?.merge_fields || []
      return this.form.kind === 'team' ? all.filter((f) => f.team) : all
    }
  },
  watch: {
    form: {
      deep: true,
      handler() {
        this.schedulePreview()
      }
    },
    oneCustomer(v) {
      if (this.form.audience.mode === 'one') this.form.audience.customer_ids = v ? [v] : []
    },
    teamMode(v) {
      this.form.audience.levels = v === 'managers' ? ['owner', 'manager'] : []
      if (v !== 'chosen') this.form.audience.user_ids = []
    }
  },
  async created() {
    document.addEventListener('keydown', this.onKey)
    if (this.oneCustomer && this.form.audience.mode === 'one') this.form.audience.customer_ids = [this.oneCustomer]
    try {
      this.meta = await schedsendApi.meta()
      if (this.form.kind === 'team' || this.perms.team) this.staff = await schedsendApi.staff().catch(() => [])
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the composer')
    }
    this.schedulePreview()
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
    clearTimeout(this.timer)
  },
  methods: {
    when: localLabel,
    ph(n) {
      return '{' + '{' + n + '}' + '}'
    },
    chanLabel: (c) => CHANNEL_LABELS[c] || c,
    chanIcon: (c) => CHANNEL_ICONS[c] || 'fa-regular fa-message',
    optName(o) {
      const n = [o.first_name, o.last_name].filter(Boolean).join(' ') || o.company || o.email || 'Recipient'
      return o.company && o.company !== n ? `${n} (${o.company})` : n
    },
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    setKind(k) {
      const was = this.form.kind
      this.form.kind = k
      if (k === 'statement' && was !== 'statement') {
        if (!this.form.subject) this.form.subject = STATEMENT_SUBJECT
        if (!this.form.body) this.form.body = STATEMENT_BODY
        this.form.marketing = false
      }
      if (k === 'team') {
        // In-app always; email / WhatsApp are extra (off until ticked).
        this.form.channels = []
        this.form.marketing = false
      } else if (was === 'team' && !this.form.channels.length) {
        this.form.channels = ['email']
      }
      if (was === 'statement' && k !== 'statement') {
        if (this.form.subject === STATEMENT_SUBJECT) this.form.subject = ''
        if (this.form.body === STATEMENT_BODY) this.form.body = ''
      }
    },
    setMode(m) {
      this.form.audience.mode = m
      if (m === 'one') this.form.audience.customer_ids = this.oneCustomer ? [this.oneCustomer] : []
      if (m === 'chosen' && this.oneCustomer && !this.form.audience.customer_ids.length) this.form.audience.customer_ids = [this.oneCustomer]
    },
    rememberName(c) {
      if (c?.id) this.names[c.id] = c.name
    },
    addChosen(c) {
      if (!c?.id) return
      this.names[c.id] = c.name
      if (!this.form.audience.customer_ids.includes(c.id)) this.form.audience.customer_ids.push(c.id)
      this.$nextTick(() => (this.pickerValue = ''))
    },
    removeChosen(id) {
      this.form.audience.customer_ids = this.form.audience.customer_ids.filter((x) => x !== id)
    },
    insert(name) {
      const key = this.focus === 'subject' ? 'subject' : this.focus === 'sms_body' ? 'sms_body' : this.needsLong ? 'body' : 'sms_body'
      const token = '{' + name + '}'
      const el = key === 'body' ? this.$refs.body : null
      if (el && typeof el.selectionStart === 'number') {
        const s = el.selectionStart, e = el.selectionEnd
        this.form.body = this.form.body.slice(0, s) + token + this.form.body.slice(e)
        this.$nextTick(() => {
          el.focus()
          el.selectionStart = el.selectionEnd = s + token.length
        })
      } else {
        this.form[key] = (this.form[key] ? this.form[key] + (/\s$/.test(this.form[key]) ? '' : ' ') : '') + token
      }
    },
    body() {
      const f = this.form
      const m = this.message
      const b = {
        kind: f.kind,
        title: f.title,
        channels: f.kind === 'team' ? ['inapp', ...f.channels] : f.channels,
        marketing: f.kind === 'customer' && f.marketing,
        subject: f.subject,
        body: f.body,
        sms_body: f.sms_body,
        whatsapp: f.channels.includes('whatsapp') ? f.whatsapp : {},
        local_send_at: f.when.local_send_at,
        timezone: f.when.timezone,
        repeat: f.when.repeat
      }
      if (f.kind === 'team') b.audience = { mode: 'staff', user_ids: this.teamMode === 'chosen' ? f.audience.user_ids : [], levels: f.audience.levels }
      else if (f.kind === 'customer' || f.kind === 'statement') b.audience = { ...f.audience, user_ids: [], levels: [] }
      if (f.kind === 'reminder' || this.isInvoiceKind) {
        b.invoice_id = this.invoice?.id || m?.invoice_id
        b.payment_id = m?.payment_id || ''
        if (m?.invoice_send) b.invoice_send = m.invoice_send
      }
      if (this.isInvoiceKind) b.channels = ['email']
      return b
    },
    schedulePreview() {
      if (this.isInvoiceKind) return
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.runPreview(), 700)
    },
    ready() {
      const f = this.form
      if (f.kind === 'customer' || f.kind === 'statement') {
        if (f.audience.mode !== 'group' && !f.audience.customer_ids.length) return false
        if (f.audience.mode === 'group' && ['customer_type', 'country'].includes(f.audience.group) && !f.audience.group_value) return false
      }
      if (f.kind !== 'team' && !f.channels.length) return false
      if (f.kind === 'reminder' && !this.needsShort) return false
      if (this.needsLong && (!f.subject.trim() || !f.body.trim())) return false
      return true
    },
    async runPreview() {
      if (!this.meta || this.isInvoiceKind) return
      if (!this.ready()) {
        this.preview = null
        this.previewError = ''
        return
      }
      this.previewing = true
      try {
        this.preview = await schedsendApi.preview(this.body(), this.pick)
        this.previewError = ''
        if (!this.pick && this.preview.options?.[0]) this.pick = this.preview.options[0].id
      } catch (e) {
        this.previewError = apiErrorMessage(e, 'Could not preview')
        this.preview = null
      } finally {
        this.previewing = false
      }
    },
    async save() {
      this.error = ''
      if (!this.form.when.local_send_at) return (this.error = 'Choose when to send it.')
      this.saving = true
      try {
        const res = this.message ? await schedsendApi.update(this.message.id, this.body()) : await schedsendApi.create(this.body())
        const m = res.message
        toast.success(`${this.message ? 'Saved' : 'Scheduled'} — ${m.next_local ? localLabel(m.next_local) + ' (' + (m.timezone || '').replace(/_/g, ' ') + ')' : 'paused'}`)
        this.$emit('saved', m)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not schedule it')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sc {
  max-width: 1120px;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.sc > .ui-modal__head {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--surface);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.sc > .ui-modal__foot {
  position: sticky;
  bottom: 0;
  z-index: 3;
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding-top: 12px;
  padding-bottom: 14px;
}
.sc-body {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.sc-col {
  min-width: 0;
}
.sc-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.sc-sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sc-sec h3,
.sc-preview h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.sc-seg {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px;
}
.sc-seg--sm {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}
.sc-seg__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.sc-seg__btn.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.sc-seg__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sc-chips {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sc-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 600;
}
.sc-chip__x {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
}
.sc-people {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.sc-people li + li {
  border-top: 1px solid var(--border);
}
.sc-person {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
}
.sc-person small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-channels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
.sc-chan {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: pointer;
  font-weight: 600;
  font-size: 13.5px;
}
.sc-chan.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.sc-chan.is-fixed {
  cursor: default;
}
.sc-chan small {
  flex-basis: 100%;
  font-weight: 500;
  font-size: 11.5px;
}
.sc-chan small.warn {
  color: var(--warning);
}
.sc-chan small.ok {
  color: var(--text-3);
}
.sc-chan small:empty {
  display: none;
}
.sc-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}
.sc-field {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  border-radius: 999px;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  cursor: pointer;
}
.sc-field:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.sc-preview {
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.sc-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sc-count {
  margin: 0;
  font-size: 14px;
}
.sc-count strong {
  font-size: 22px;
}
.sc-stats,
.sc-warn {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.sc-stats .skip {
  color: var(--text-3);
}
.sc-warn li {
  color: var(--warning);
}
.sc-sample {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  overflow: hidden;
}
.sc-sample__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  font-size: 12.5px;
  color: var(--text-2);
  border-bottom: 1px solid var(--border);
  overflow-wrap: anywhere;
}
.sc-subj {
  margin: 0;
  padding: 8px 10px 0;
  font-weight: 600;
  font-size: 13.5px;
}
.sc-skip {
  margin: 0;
  padding: 10px;
  font-size: 13px;
  color: var(--text-3);
}
.sc-frame {
  display: block;
  width: 100%;
  height: 340px;
  border: 0;
  background: #f3f4f8;
}
.sc-bubble {
  margin: 10px;
  padding: 10px 12px;
  border-radius: 14px 14px 14px 4px;
  background: var(--surface-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 13.5px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sc-bubble.b-whatsapp {
  background: rgba(37, 211, 102, 0.14);
}
.sc-param {
  font-size: 12.5px;
  color: var(--text-2);
}
.sc-perr {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}
.min0 {
  min-width: 0;
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
.spin {
  animation: scspin 0.8s linear infinite;
}
@keyframes scspin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 900px) {
  .sc-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .sc-preview {
    position: static;
  }
}
</style>
