<template>
  <div class="ui-page">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <router-link :to="listPath">Back to list</router-link></span></div>

    <div v-else-if="!doc" class="ui-card ui-card__body">
      <div class="ui-skeleton" style="width: 30%; height: 22px; margin-bottom: 18px"></div>
      <div class="ui-skeleton" style="height: 420px"></div>
    </div>

    <template v-else>
      <header class="ui-page-head no-print">
        <div>
          <router-link :to="listPath" class="back"><i class="fa-solid fa-arrow-left"></i> {{ isQuote ? 'Quotes' : 'Invoices' }}</router-link>
          <h1 class="title-row">
            {{ doc.number }}
            <span class="ui-badge" :class="`ui-badge--${doc.display_status}`">{{ statusLabel }}</span>
            <span v-if="doc.is_recurring" class="ui-badge ui-badge--converted"><i class="fa-solid fa-repeat"></i> {{ recurrenceLabel }}</span>
          </h1>
          <p>
            {{ doc.client_name }} · {{ money(doc.total) }}
            <template v-if="!isQuote && doc.display_status === 'overdue'"> · <span class="txt-danger">{{ doc.days_overdue }} days overdue</span></template>
            <template v-else-if="!isQuote && doc.status !== 'paid' && doc.status !== 'void' && doc.status !== 'draft'"> · due {{ rel(doc.due_date) }}</template>
          </p>
        </div>
        <div class="ui-actions">
          <router-link v-if="canEdit" :to="`${listPath}/${doc.id}/edit`" class="ui-btn"><i class="fa-regular fa-pen-to-square"></i> Edit</router-link>
          <button class="ui-btn" @click="print"><i class="fa-solid fa-print"></i> <span class="hide-sm">Print / PDF</span></button>
          <button v-if="primary" class="ui-btn ui-btn--primary" @click="primary.run">
            <i :class="primary.icon"></i> {{ primary.label }}
          </button>
          <div class="more" ref="more">
            <button class="ui-btn ui-btn--icon" @click="moreOpen = !moreOpen" aria-label="More actions" :aria-expanded="moreOpen"><i class="fa-solid fa-ellipsis"></i></button>
            <div v-if="moreOpen" class="more__pop" role="menu">
              <button v-for="a in moreActions" :key="a.label" class="more__item" :class="{ danger: a.danger }" role="menuitem" @click="moreOpen = false; a.run()">
                <i :class="a.icon"></i> {{ a.label }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="doc.converted_to_id" class="ui-alert no-print banner">
        <i class="fa-solid fa-circle-info"></i>
        <span>This quote was converted to an invoice. <router-link :to="`/invoices/${doc.converted_to_id}`">Open invoice</router-link></span>
      </div>
      <div v-if="doc.converted_from_id" class="ui-alert no-print banner">
        <i class="fa-solid fa-circle-info"></i>
        <span>Created from a quote. <router-link :to="`/quotes/${doc.converted_from_id}`">View original quote</router-link></span>
      </div>

      <div class="layout">
        <div class="doc-col">
          <InvoiceDocument :doc="doc" :business="business" />
        </div>

        <aside class="side-col no-print">
          <section v-if="!isQuote" class="ui-card">
            <div class="ui-card__head">
              <h2>Payments</h2>
              <button v-if="canPay" class="ui-btn ui-btn--sm" @click="openPayment"><i class="fa-solid fa-plus"></i> Record</button>
            </div>
            <div class="ui-card__body pay-body">
              <div class="progress" :title="`${pct}% paid`">
                <div class="progress__bar" :style="{ width: pct + '%' }"></div>
              </div>
              <div class="pay-sum">
                <span><small>Paid</small><strong>{{ money(doc.amount_paid) }}</strong></span>
                <span class="r"><small>Balance</small><strong :class="{ 'txt-danger': doc.display_status === 'overdue' }">{{ money(doc.balance_due) }}</strong></span>
              </div>
              <ul v-if="doc.payments?.length" class="pay-list">
                <li v-for="p in doc.payments" :key="p.id">
                  <span class="pay-ico"><i class="fa-solid fa-arrow-down"></i></span>
                  <span class="pay-main">
                    <strong>{{ money(p.amount) }}</strong>
                    <small>{{ date(p.date) }} · {{ methodLabel(p.method) }}{{ p.reference ? ' · ' + p.reference : '' }}</small>
                  </span>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Remove payment" @click="removePayment(p)"><i class="fa-regular fa-trash-can"></i></button>
                </li>
              </ul>
              <p v-else class="muted small">No payments recorded yet.</p>
            </div>
          </section>

          <section class="ui-card">
            <div class="ui-card__head"><h2>Share</h2></div>
            <div class="ui-card__body share">
              <p class="muted small" v-if="doc.status === 'draft'">Send or mark this {{ isQuote ? 'quote' : 'invoice' }} as sent to activate its client link.</p>
              <template v-else>
                <div class="link-row">
                  <input class="ui-input" :value="publicUrl" readonly @focus="$event.target.select()" aria-label="Client link" />
                  <button class="ui-btn ui-btn--icon" title="Copy link" @click="copyLink"><i class="fa-regular fa-copy"></i></button>
                </div>
                <p class="muted small">Anyone with this link can view{{ isQuote ? ' and accept' : '' }} the document online.<span v-if="doc.viewed_at"> Client viewed it {{ dt(doc.viewed_at) }}.</span></p>
              </template>
            </div>
          </section>

          <section class="ui-card">
            <div class="ui-card__head"><h2>Activity</h2></div>
            <ul class="timeline">
              <li v-for="a in doc.activities" :key="a.id">
                <span class="dot" :class="`t-${a.type}`"></span>
                <span>
                  <span class="t-msg">{{ a.message }}</span>
                  <span v-if="a.recipients && a.recipients.cc && a.recipients.cc.length" class="t-cc"><i class="fa-regular fa-envelope"></i> {{ a.recipients.cc.length }} CC</span>
                  <small>{{ dt(a.created_at) }}</small>
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </template>

    <!-- Record payment -->
    <div v-if="payOpen" class="ui-modal-backdrop" @mousedown.self="payOpen = false">
      <form class="ui-modal" @submit.prevent="submitPayment">
        <div class="ui-modal__head">
          <div>
            <h2>Record payment</h2>
            <p class="muted small m0">{{ doc.number }} · balance {{ money(doc.balance_due) }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" @click="payOpen = false" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body grid-form">
          <div class="ui-field">
            <label for="p_amount">Amount ({{ doc.currency }})</label>
            <input id="p_amount" ref="payAmount" v-model.number="pay.amount" type="number" :step="step" :min="step" :max="doc.balance_due" class="ui-input" required />
            <div class="chips">
              <button type="button" class="chip" @click="pay.amount = doc.balance_due">Full balance</button>
              <button type="button" class="chip" @click="pay.amount = half">50%</button>
            </div>
          </div>
          <div class="ui-field">
            <label for="p_date">Date</label>
            <input id="p_date" v-model="pay.date" type="date" class="ui-input" required />
          </div>
          <div class="ui-field">
            <label for="p_method">Method</label>
            <select id="p_method" v-model="pay.method" class="ui-select">
              <option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="p_ref">Reference</label>
            <input id="p_ref" v-model="pay.reference" class="ui-input" placeholder="Transaction ID, cheque no…" />
          </div>
          <div class="ui-field span">
            <label for="p_notes">Notes</label>
            <textarea id="p_notes" v-model="pay.notes" class="ui-textarea" rows="2"></textarea>
          </div>
          <div v-if="payError" class="ui-alert ui-alert--danger span"><i class="fa-solid fa-circle-exclamation"></i><span>{{ payError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="payOpen = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--success" :disabled="busy"><i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Record payment</button>
        </div>
      </form>
    </div>

    <!-- Send -->
    <div v-if="sendOpen" class="ui-modal-backdrop" @mousedown.self="sendOpen = false">
      <form class="ui-modal wide" @submit.prevent="submitSend">
        <div class="ui-modal__head">
          <div>
            <h2>{{ sendKind === 'reminder' ? 'Send payment reminder' : `Send ${isQuote ? 'quote' : 'invoice'}` }}</h2>
            <p class="muted small m0">{{ doc.number }} · {{ money(isQuote ? doc.total : doc.balance_due) }}{{ sendKind === 'reminder' ? ' outstanding' : '' }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" @click="sendOpen = false" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body grid-form">
          <div v-if="!emailEnabled" class="ui-alert ui-alert--warning span smtp-note">
            <i class="fa-solid fa-circle-info"></i>
            <span>
              <strong>Email sending isn’t set up on this server.</strong>
              “Open in email app” drafts this message in your own email app with the To and CC recipients below, and marks the {{ isQuote ? 'quote' : 'invoice' }} as sent. An administrator can enable direct sending by configuring SMTP.
            </span>
          </div>
          <div class="ui-field span">
            <label for="s_to">To</label>
            <div v-if="recipientsLoading" class="ui-skeleton" style="height: 40px"></div>
            <EmailChips v-else id="s_to" v-model="send.to" :names="recipientNames" :max="1" primary icon="fa-solid fa-user" placeholder="client@email.com" aria-label="To email address" />
            <span v-if="toNote" class="ui-hint">{{ toNote }}</span>
          </div>
          <div class="ui-field span">
            <label for="s_cc">CC <span class="muted small">— removable for this send; add extra addresses if needed</span></label>
            <div v-if="recipientsLoading" class="ui-skeleton" style="height: 40px"></div>
            <EmailChips v-else id="s_cc" rows v-model="send.cc" :names="recipientNames" :exclude="send.to" icon="fa-regular fa-user" placeholder="Add CC email addresses" aria-label="CC email addresses" />
            <span v-if="ccNote" class="ui-hint">{{ ccNote }}</span>
          </div>
          <div class="ui-field span">
            <label for="s_subject">Subject</label>
            <input id="s_subject" v-model="send.subject" class="ui-input" />
          </div>
          <div class="ui-field span">
            <label for="s_msg">Message</label>
            <textarea id="s_msg" v-model="send.message" class="ui-textarea" rows="8"></textarea>
          </div>
          <div v-if="sendError" class="ui-alert ui-alert--danger span"><i class="fa-solid fa-circle-exclamation"></i><span>{{ sendError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button v-if="sendKind !== 'reminder'" type="button" class="ui-btn ui-btn--ghost" @click="markSentOnly" :disabled="busy">Just mark as sent</button>
          <button type="button" class="ui-btn" @click="sendOpen = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || recipientsLoading"><i :class="busy ? 'fa-solid fa-circle-notch spin' : emailEnabled ? 'fa-solid fa-paper-plane' : 'fa-solid fa-arrow-up-right-from-square'"></i> {{ emailEnabled ? (sendKind === 'reminder' ? 'Send reminder' : 'Send email') : 'Open in email app' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import InvoiceDocument from '@/components/invoicing/InvoiceDocument.vue'
import { invoicingApi, STATUS_LABELS, PAYMENT_METHODS, RECURRENCE } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatDate, formatDateTime, relativeDays, isoDate } from '@/utils/format'
import { formatCurrency, currencyStep, currencyDecimals } from '@/utils/currencies'
import EmailChips from '@/components/invoicing/EmailChips.vue'
import { renderTemplate } from '@/utils/invoiceMath'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { useBranding } from '@/composables/useBranding'

export default {
  name: 'InvoiceDetail',
  components: { InvoiceDocument, EmailChips },
  props: { id: { type: String, required: true } },
  setup() {
    return { branding: useBranding().branding }
  },
  data() {
    return {
      doc: null,
      settings: {},
      emailEnabled: false,
      error: null,
      busy: false,
      moreOpen: false,
      payOpen: false,
      pay: {},
      payError: null,
      sendOpen: false,
      send: {},
      sendKind: 'invoice',
      sendError: null,
      recipientsLoading: false,
      recipientNames: {},
      suggested: { to: null, cc: [] },
      methods: PAYMENT_METHODS
    }
  },
  computed: {
    // Business block: invoice settings + the company logo (Settings → Business details).
    business() {
      const s = this.settings || {}
      const b = this.branding
      return {
        ...s,
        business_name: s.business_name || b.orgName || '',
        logo_url: b.loaded ? b.logoUrl : s.logo_url || ''
      }
    },
    isQuote() {
      return this.doc?.doc_type === 'quote'
    },
    listPath() {
      return this.isQuote || this.$route.path.startsWith('/quotes') ? '/quotes' : '/invoices'
    },
    statusLabel() {
      return STATUS_LABELS[this.doc.display_status] || this.doc.display_status
    },
    recurrenceLabel() {
      return RECURRENCE.find((r) => r.value === this.doc.recurrence_interval)?.label || 'Recurring'
    },
    canEdit() {
      return !['void', 'converted'].includes(this.doc.status)
    },
    canPay() {
      return !this.isQuote && ['sent', 'partial', 'draft'].includes(this.doc.status) && this.doc.balance_due > 0
    },
    pct() {
      if (!this.doc.total) return 0
      return Math.min(100, Math.round((this.doc.amount_paid / this.doc.total) * 100))
    },
    step() {
      return currencyStep(this.doc?.currency)
    },
    half() {
      const p = 10 ** currencyDecimals(this.doc.currency)
      return Math.round((this.doc.balance_due / 2) * p) / p
    },
    canRemind() {
      return !this.isQuote && ['sent', 'partial'].includes(this.doc.status) && this.doc.balance_due > 0
    },
    toNote() {
      const t = this.suggested.to
      const cur = this.send.to?.[0]
      if (!t || cur !== t.email) return cur ? '' : 'Add the address this should go to.'
      return t.source === 'primary_billing' ? `Primary billing contact${t.name ? ' — ' + t.name : ''}.` : 'The client’s email on this document.'
    },
    ccNote() {
      const fromContacts = this.suggested.cc.filter((r) => r.source === 'contact' && this.send.cc?.includes(r.email)).length
      const what = this.sendKind === 'reminder' ? 'reminders' : this.isQuote ? 'quotes' : 'invoices'
      if (fromContacts) return `${fromContacts} customer contact${fromContacts > 1 ? 's are' : ' is'} copied on ${what} automatically. Changes here are remembered for this ${this.isQuote ? 'quote' : 'invoice'}.`
      return this.send.cc?.length ? 'These addresses are remembered for future emails about this document.' : ''
    },
    publicUrl() {
      return `${window.location.origin}/i/${this.doc.public_token}`
    },
    primary() {
      const d = this.doc
      if (d.status === 'draft') return { label: 'Send', icon: 'fa-solid fa-paper-plane', run: () => this.openSend() }
      if (!this.isQuote && this.canPay) return { label: 'Record payment', icon: 'fa-solid fa-hand-holding-dollar', run: this.openPayment }
      if (this.isQuote && ['sent', 'accepted'].includes(d.status)) return { label: 'Convert to invoice', icon: 'fa-solid fa-file-invoice-dollar', run: this.convert }
      return null
    },
    moreActions() {
      const d = this.doc
      const a = []
      if (this.canRemind) a.push({ label: 'Send payment reminder', icon: 'fa-regular fa-bell', run: () => this.openSend('reminder') })
      if (d.status !== 'draft' && d.status !== 'void' && d.status !== 'converted') a.push({ label: 'Resend', icon: 'fa-solid fa-paper-plane', run: () => this.openSend() })
      if (d.status === 'draft') a.push({ label: 'Mark as sent', icon: 'fa-solid fa-check', run: this.markSentOnly })
      if (this.isQuote && d.status === 'sent') {
        a.push({ label: 'Mark accepted', icon: 'fa-solid fa-thumbs-up', run: () => this.simple('accept', 'Quote marked as accepted') })
        a.push({ label: 'Mark declined', icon: 'fa-solid fa-thumbs-down', run: () => this.simple('decline', 'Quote marked as declined') })
      }
      if (this.isQuote && d.status === 'draft') a.push({ label: 'Convert to invoice', icon: 'fa-solid fa-file-invoice-dollar', run: this.convert })
      if (d.status !== 'draft') a.push({ label: 'Copy client link', icon: 'fa-regular fa-copy', run: this.copyLink })
      a.push({ label: 'Duplicate', icon: 'fa-regular fa-clone', run: this.duplicate })
      if (d.status !== 'draft') a.push({ label: 'Reset client link', icon: 'fa-solid fa-link-slash', run: this.resetLink })
      if (d.status !== 'void' && d.amount_paid <= 0 && d.status !== 'converted') a.push({ label: 'Void', icon: 'fa-solid fa-ban', run: this.voidDoc, danger: true })
      if (d.status === 'draft' || d.status === 'void' || this.isQuote) a.push({ label: 'Delete', icon: 'fa-regular fa-trash-can', run: this.remove, danger: true })
      return a
    }
  },
  watch: {
    id() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
  },
  methods: {
    money(v) {
      return formatCurrency(v, this.doc?.currency)
    },
    date: formatDate,
    dt: formatDateTime,
    rel: relativeDays,
    methodLabel(m) {
      return PAYMENT_METHODS.find((x) => x.value === m)?.label || m
    },
    onDocClick(e) {
      if (this.moreOpen && !this.$refs.more?.contains(e.target)) this.moreOpen = false
    },
    async load() {
      this.error = null
      try {
        const [inv, s] = await Promise.all([invoicingApi.get(this.id), invoicingApi.getSettings()])
        this.doc = inv
        this.settings = s?.settings || {}
        this.emailEnabled = !!s?.email_enabled
        const expected = inv.doc_type === 'quote' ? '/quotes' : '/invoices'
        if (!this.$route.path.startsWith(expected)) this.$router.replace(`${expected}/${inv.id}`)
        if (this.$route.query.send === '1') {
          this.$router.replace({ query: {} })
          this.openSend()
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load this document')
      }
    },
    async run(fn, successMsg) {
      if (this.busy) return null
      this.busy = true
      try {
        const res = await fn()
        if (successMsg) toast.success(successMsg)
        return res
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Action failed'))
        return null
      } finally {
        this.busy = false
      }
    },
    async simple(action, msg) {
      const res = await this.run(() => invoicingApi[action](this.doc.id), msg)
      if (res) this.doc = res
    },
    openPayment() {
      this.pay = { amount: this.doc.balance_due, date: isoDate(), method: 'bank_transfer', reference: '', notes: '' }
      this.payError = null
      this.payOpen = true
      this.$nextTick(() => this.$refs.payAmount?.select())
    },
    async submitPayment() {
      this.payError = null
      const amt = Number(this.pay.amount)
      if (!(amt > 0)) return (this.payError = 'Enter an amount greater than zero.')
      if (amt > this.doc.balance_due + 0.004) return (this.payError = `That’s more than the balance due (${this.money(this.doc.balance_due)}).`)
      this.busy = true
      try {
        this.doc = await invoicingApi.addPayment(this.doc.id, { ...this.pay, amount: amt })
        this.payOpen = false
        toast.success(this.doc.status === 'paid' ? `${this.doc.number} is fully paid` : 'Payment recorded')
      } catch (e) {
        this.payError = apiErrorMessage(e, 'Could not record payment')
      } finally {
        this.busy = false
      }
    },
    async removePayment(p) {
      const ok = await confirmDialog({ title: 'Remove payment?', message: `Remove the ${this.money(p.amount)} payment from ${this.date(p.date)}? The balance will be updated.`, confirmText: 'Remove', danger: true })
      if (!ok) return
      const res = await this.run(() => invoicingApi.deletePayment(this.doc.id, p.id), 'Payment removed')
      if (res) this.doc = res
    },
    templateVars() {
      const s = this.settings
      return {
        type: this.isQuote ? 'Quote' : 'Invoice',
        type_lower: this.isQuote ? 'quote' : 'invoice',
        number: this.doc.number,
        business: s.business_name || 'us',
        client: this.doc.client_name,
        total: this.money(this.isQuote ? this.doc.total : this.doc.balance_due),
        due_date: this.date(this.doc.due_date),
        link: this.publicUrl
      }
    },
    async openSend(kind = 'invoice') {
      this.sendKind = kind === 'reminder' && this.canRemind ? 'reminder' : 'invoice'
      const v = this.templateVars()
      const s = this.settings
      const reminder = this.sendKind === 'reminder'
      this.send = {
        to: this.doc.client_email ? [this.doc.client_email.toLowerCase()] : [],
        cc: [...(this.doc.cc_emails || [])],
        subject: reminder
          ? renderTemplate('Reminder: {{type}} {{number}} from {{business}}', v)
          : renderTemplate(s.email_subject || '{{type}} {{number}} from {{business}}', v),
        message: reminder
          ? renderTemplate(
              `Hi {{client}},\n\nThis is a friendly reminder that {{type_lower}} {{number}} for {{total}} ${this.doc.display_status === 'overdue' ? 'was due on' : 'is due on'} {{due_date}}.\n\nView and pay it online: {{link}}\n\nIf you've already paid, please ignore this message.\n\nThank you,\n{{business}}`,
              v
            )
          : renderTemplate(
              s.email_message || 'Hi {{client}},\n\nPlease find {{type_lower}} {{number}} for {{total}}, due {{due_date}}.\n\nView it online: {{link}}\n\nThank you,\n{{business}}',
              v
            )
      }
      this.sendError = null
      this.sendOpen = true
      this.recipientsLoading = true
      this.suggested = { to: null, cc: [] }
      try {
        const r = await invoicingApi.recipients(this.doc.id, this.sendKind === 'reminder' ? 'reminder' : this.isQuote ? 'quote' : 'invoice')
        this.suggested = { to: r.to || null, cc: r.cc || [] }
        const names = {}
        for (const x of [r.to, ...(r.cc || [])]) if (x?.name) names[x.email] = x.name
        this.recipientNames = names
        if (r.to?.email) this.send.to = [r.to.email]
        this.send.cc = (r.cc || []).map((x) => x.email)
        if (typeof r.email_enabled === 'boolean') this.emailEnabled = r.email_enabled
      } catch (e) {
        this.sendError = apiErrorMessage(e, 'Could not load the recipients — you can still add them below.')
      } finally {
        this.recipientsLoading = false
      }
    },
    async submitSend() {
      this.sendError = null
      const to = this.send.to[0] || ''
      if (this.emailEnabled && !to) return (this.sendError = 'Add the email address to send this to.')
      this.busy = true
      try {
        const payload = { to, cc: this.send.cc, subject: this.send.subject, message: this.send.message, kind: this.sendKind, mode: this.emailEnabled ? 'email' : 'mailto' }
        const res = await invoicingApi.send(this.doc.id, payload)
        this.doc = res.invoice
        this.sendOpen = false
        const ccText = res.cc?.length ? ` (CC ${res.cc.length})` : ''
        if (res.emailed) {
          toast.success(`${this.sendKind === 'reminder' ? 'Reminder emailed' : 'Emailed'} to ${res.to}${ccText}`)
        } else {
          const q = []
          if (res.cc?.length) q.push(`cc=${encodeURIComponent(res.cc.join(','))}`)
          q.push(`subject=${encodeURIComponent(this.send.subject)}`, `body=${encodeURIComponent(this.send.message)}`)
          window.location.href = `mailto:${encodeURIComponent(res.to || to)}?${q.join('&')}`
          toast.success(this.sendKind === 'reminder' ? 'Reminder recorded — finish sending it in your email app' : `${this.doc.number} marked as sent`)
        }
        if (res.skipped?.length) toast.warning(`Skipped invalid address${res.skipped.length > 1 ? 'es' : ''}: ${res.skipped.join(', ')}`)
      } catch (e) {
        this.sendError = apiErrorMessage(e, 'Could not send')
      } finally {
        this.busy = false
      }
    },
    async markSentOnly() {
      const res = await this.run(() => invoicingApi.markSent(this.doc.id), 'Marked as sent')
      if (res) {
        this.doc = res
        this.sendOpen = false
      }
    },
    async convert() {
      const res = await this.run(() => invoicingApi.convert(this.doc.id), 'Invoice created from quote')
      if (res) this.$router.push(`/invoices/${res.id}`)
    },
    async duplicate() {
      const res = await this.run(() => invoicingApi.duplicate(this.doc.id), 'Duplicated as a new draft')
      if (res) this.$router.push(`${res.doc_type === 'quote' ? '/quotes' : '/invoices'}/${res.id}/edit`)
    },
    async voidDoc() {
      const ok = await confirmDialog({ title: `Void ${this.doc.number}?`, message: 'The document stays on record but can no longer be paid or edited. This cannot be undone.', confirmText: 'Void', danger: true })
      if (!ok) return
      await this.simple('void', `${this.doc.number} voided`)
    },
    async remove() {
      const ok = await confirmDialog({ title: `Delete ${this.doc.number}?`, message: 'This permanently deletes the document and its history.', confirmText: 'Delete', danger: true })
      if (!ok) return
      const res = await this.run(() => invoicingApi.remove(this.doc.id), `${this.doc.number} deleted`)
      if (res) this.$router.push(this.listPath)
    },
    async resetLink() {
      const ok = await confirmDialog({ title: 'Reset client link?', message: 'The current link will stop working. You’ll need to share the new one.', confirmText: 'Reset link' })
      if (!ok) return
      await this.simple('regenerateLink', 'New client link generated')
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(this.publicUrl)
        toast.success('Link copied')
      } catch {
        toast.info(this.publicUrl, { duration: 8000, title: 'Copy this link' })
      }
    },
    print() {
      window.print()
    }
  }
}
</script>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 550;
  color: var(--text-3);
  margin-bottom: 6px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-variant-numeric: tabular-nums;
}

.txt-danger {
  color: var(--danger);
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 12.5px;
}

.m0 {
  margin: 2px 0 0;
}

.r {
  text-align: right;
}

.banner {
  margin-bottom: 16px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.more {
  position: relative;
}

.more__pop {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 40;
  min-width: 210px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
}

.more__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  font: inherit;
  font-size: 13.5px;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.more__item i {
  width: 16px;
  color: var(--text-3);
}

.more__item:hover {
  background: var(--surface-hover);
}

.more__item.danger,
.more__item.danger i {
  color: var(--danger);
}

.pay-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
}

.progress__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--success), #3ccf7e);
  transition: width 0.4s var(--ease);
}

.pay-sum {
  display: flex;
  justify-content: space-between;
}

.pay-sum small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.pay-sum strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.pay-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 4px;
}

.pay-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--border);
}

.pay-ico {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--success-soft);
  color: var(--success);
  font-size: 12px;
}

.pay-main {
  flex: 1;
  min-width: 0;
}

.pay-main small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.share {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.share p {
  margin: 0;
}

.link-row {
  display: flex;
  gap: 6px;
}

.link-row .ui-input {
  font-size: 12.5px;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 14px 20px 18px;
  display: grid;
  gap: 14px;
  max-height: 360px;
  overflow: auto;
}

.timeline li {
  display: flex;
  gap: 12px;
  font-size: 13.5px;
}

.timeline small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: var(--border-strong);
  box-shadow: 0 0 0 3px var(--surface-2);
}

.t-created { background: var(--accent); }
.t-sent { background: var(--info); }
.t-payment, .t-accepted { background: var(--success); }
.t-voided, .t-payment_removed, .t-declined { background: var(--danger); }
.t-viewed { background: var(--warning); }

.wide {
  max-width: 620px;
}

.grid-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.smtp-note {
  margin: 0;
  font-size: 13px;
}

.t-cc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  font-size: 11.5px;
  color: var(--text-3);
}

.grid-form .span {
  grid-column: 1 / -1;
}

.chips {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 999px;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .grid-form {
    grid-template-columns: 1fr;
  }
}

@media print {
  .no-print {
    display: none !important;
  }
  .layout {
    display: block;
  }
}
</style>
