<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal sd" :class="{ 'sd--review': step === 'review' }" data-testid="send-dialog" @submit.prevent="step === 'compose' ? review() : submit()">
      <div class="ui-modal__head">
        <div>
          <h2>{{ title }}</h2>
          <p class="muted small m0">{{ doc.number }} · {{ subtitleAmount }}</p>
        </div>
        <ol class="sd-steps" aria-label="Steps">
          <li :class="{ on: step === 'compose' }"><span>1</span> Compose</li>
          <li :class="{ on: step === 'review' }"><span>2</span> Check &amp; preview</li>
        </ol>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- Step 1: compose -->
      <div v-if="step === 'compose'" class="ui-modal__body grid-form">
        <div v-if="!localEmailEnabled && !loading" class="ui-alert ui-alert--warning span smtp-note" data-testid="smtp-banner">
          <i class="fa-solid fa-circle-info"></i>
          <span>
            <strong>Email sending isn’t set up yet.</strong>
            <template v-if="localSender && localSender.problem"> {{ localSender.problem }}</template>
            “Open in email app” drafts this message in your own email app with the recipients below{{ kind === 'receipt' ? '' : `, and marks the ${docWord} as sent` }}.
            An administrator can connect an email account (e.g. Gmail) under <router-link to="/settings#email">Settings → Outgoing email</router-link>.
          </span>
        </div>
        <div v-else-if="localEmailEnabled && localSender && localSender.from" class="sending-from span" data-testid="sending-from">
          <i class="fa-regular fa-paper-plane"></i>
          <span>Sending from <strong>{{ localSender.from }}</strong></span>
        </div>
        <div class="ui-field span">
          <label for="s_to">To</label>
          <div v-if="loading" class="ui-skeleton" style="height: 40px"></div>
          <EmailChips v-else id="s_to" v-model="send.to" :names="names" :max="1" primary icon="fa-solid fa-user" placeholder="client@email.com" aria-label="To email address" />
          <span v-if="toNote" class="ui-hint">{{ toNote }}</span>
        </div>
        <div class="ui-field span">
          <label for="s_cc">CC <span class="muted small">— removable for this send; add extra addresses if needed</span></label>
          <div v-if="loading" class="ui-skeleton" style="height: 40px"></div>
          <EmailChips v-else id="s_cc" rows v-model="send.cc" :names="names" :exclude="send.to" icon="fa-regular fa-user" placeholder="Add CC email addresses" aria-label="CC email addresses" />
          <span v-if="ccNote" class="ui-hint">{{ ccNote }}</span>
        </div>
        <div v-if="!loading && (send.bcc.length || bccOpen)" class="ui-field span">
          <label for="s_bcc">BCC <span class="muted small">— hidden copies (e.g. your records address)</span></label>
          <EmailChips id="s_bcc" rows v-model="send.bcc" :names="names" :exclude="[...send.to, ...send.cc]" icon="fa-solid fa-user-secret" placeholder="Add BCC email addresses" aria-label="BCC email addresses" />
        </div>
        <div v-else-if="!loading" class="span">
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="bccOpen = true"><i class="fa-solid fa-plus"></i> Add BCC</button>
        </div>
        <div v-if="localEmailEnabled" class="span attach-note" data-testid="send-extras">
          <span class="chip-note"><i class="fa-solid fa-paperclip"></i> {{ attachmentName }} attached</span>
          <span class="chip-note"><i class="fa-regular fa-eye"></i> {{ isQuote ? 'View & accept' : 'View invoice' }} button</span>
          <span v-if="!isQuote && kind !== 'receipt' && onlineEnabled && doc.balance_due > 0" class="chip-note"><i class="fa-solid fa-credit-card"></i> Pay now button</span>
        </div>
        <div class="ui-field span">
          <label for="s_subject">Subject</label>
          <div v-if="loading" class="ui-skeleton" style="height: 40px"></div>
          <input v-else id="s_subject" v-model="send.subject" class="ui-input" />
        </div>
        <div class="ui-field span">
          <label for="s_msg">Message</label>
          <div v-if="loading" class="ui-skeleton" style="height: 150px"></div>
          <textarea v-else id="s_msg" ref="msg" v-model="send.message" class="ui-textarea" rows="8"></textarea>
          <span class="ui-hint">
            Amounts come from the {{ docWord }} ({{ doc.currency }}). To keep them right if the {{ docWord }} changes, use placeholders such as <code v-pre>{{amount_due}}</code>.
            <button type="button" class="linkish" @click="phOpen = !phOpen">{{ phOpen ? 'Hide' : 'Show' }} placeholders</button>
          </span>
          <div v-if="phOpen" class="ph-list" data-testid="placeholders">
            <button v-for="p in placeholders" :key="p.name" type="button" class="ph" :title="p.help + (p.value ? ' — ' + p.value : '')" @click="insert(p.name)">
              <code>{{ tok(p.name) }}</code><small>{{ p.value || p.help }}</small>
            </button>
          </div>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger span"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>

      <!-- Step 2: checks + exact preview -->
      <div v-else class="ui-modal__body sd-review">
        <div v-if="checking" class="sd-checking"><i class="fa-solid fa-circle-notch spin"></i> Checking the {{ docWord }} and rendering the email…</div>
        <template v-else-if="result">
          <div class="sd-verdict" :class="verdict.cls" data-testid="preflight-verdict">
            <i :class="verdict.icon"></i>
            <div>
              <strong>{{ verdict.title }}</strong>
              <span>{{ verdict.text }}</span>
            </div>
          </div>
          <ul class="checks" data-testid="preflight-checks">
            <li v-for="c in shownChecks" :key="c.id" :class="`c-${c.severity}`" :data-check="c.id" :data-severity="c.severity">
              <i :class="checkIcon(c.severity)"></i>
              <span><strong>{{ c.title }}</strong><small v-if="c.detail">{{ c.detail }}</small></span>
            </li>
          </ul>
          <button v-if="passedChecks.length" type="button" class="linkish small" @click="showPassed = !showPassed">
            {{ showPassed ? 'Hide' : 'Show' }} {{ passedChecks.length }} passed check{{ passedChecks.length === 1 ? '' : 's' }}
          </button>

          <section class="pv" data-testid="email-preview">
            <dl class="pv-meta">
              <div v-if="preview.from"><dt>From</dt><dd>{{ preview.from }}</dd></div>
              <div><dt>To</dt><dd>{{ preview.to || '—' }}</dd></div>
              <div v-if="preview.cc.length"><dt>CC</dt><dd>{{ preview.cc.join(', ') }}</dd></div>
              <div v-if="preview.bcc.length"><dt>BCC</dt><dd>{{ preview.bcc.join(', ') }}</dd></div>
              <div v-if="preview.reply_to"><dt>Reply-To</dt><dd>{{ preview.reply_to }}</dd></div>
              <div><dt>Subject</dt><dd class="pv-subject" data-testid="preview-subject">{{ preview.subject }}</dd></div>
              <div v-if="preview.attachments.length">
                <dt>Attached</dt>
                <dd class="pv-att">
                  <span v-for="a in preview.attachments" :key="a.filename" class="chip-note"><i class="fa-solid fa-file-pdf"></i> {{ a.filename }} · {{ kb(a.size) }}</span>
                  <button type="button" class="ui-btn ui-btn--sm" data-testid="view-pdf" :disabled="pdfBusy" @click="viewPdf"><i :class="pdfBusy ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-eye'"></i> View PDF</button>
                </dd>
              </div>
            </dl>
            <div class="pv-tabs" role="tablist">
              <button type="button" role="tab" :aria-selected="mode === 'html'" :class="{ on: mode === 'html' }" @click="mode = 'html'"><i class="fa-regular fa-envelope"></i> Email</button>
              <button type="button" role="tab" :aria-selected="mode === 'text'" :class="{ on: mode === 'text' }" data-testid="preview-text-tab" @click="mode = 'text'"><i class="fa-solid fa-align-left"></i> Plain text</button>
            </div>
            <iframe v-if="mode === 'html'" class="pv-frame" sandbox="" :srcdoc="preview.html" title="Email preview" data-testid="preview-frame"></iframe>
            <pre v-else class="pv-text" data-testid="preview-text">{{ preview.text }}</pre>
          </section>
        </template>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>

      <div class="ui-modal__foot">
        <template v-if="step === 'compose'">
          <button v-if="kind === 'invoice' && doc.status === 'draft'" type="button" class="ui-btn ui-btn--ghost" :disabled="busy" @click="markSent">Just mark as sent</button>
          <button type="button" class="ui-btn" @click="close">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || loading" data-testid="send-review"><i class="fa-solid fa-list-check"></i> Review &amp; {{ localEmailEnabled ? 'send email' : 'open in email app' }}</button>
        </template>
        <template v-else>
          <button type="button" class="ui-btn ui-btn--ghost" :disabled="busy" @click="step = 'compose'"><i class="fa-solid fa-arrow-left"></i> Edit</button>
          <button v-if="localEmailEnabled && result" type="button" class="ui-btn" :disabled="busy || testBusy" data-testid="send-test" @click="sendTest"><i :class="testBusy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-vial'"></i> Send test to me</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || checking || !result || result.errors > 0" data-testid="send-confirm">
            <i :class="busy ? 'fa-solid fa-circle-notch spin' : result && result.errors ? 'fa-solid fa-ban' : localEmailEnabled ? 'fa-solid fa-paper-plane' : 'fa-solid fa-arrow-up-right-from-square'"></i>
            {{ confirmLabel }}
          </button>
        </template>
      </div>
    </form>
  </div>
</template>

<script>
import EmailChips from '@/components/invoicing/EmailChips.vue'
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/utils/currencies'
import { toast } from '@/composables/useToast'

/**
 * Send an invoice, quote, reminder or payment receipt: compose → server-side
 * pre-send checks + the exact email (HTML / text / PDF) → send. Errors block
 * sending; warnings need an explicit "Send anyway". Every attempt is logged
 * on the server (invoice_email_log).
 */
export default {
  name: 'SendDialog',
  components: { EmailChips },
  props: {
    doc: { type: Object, required: true },
    kind: { type: String, default: 'invoice' }, // invoice | reminder | receipt (quotes use "invoice")
    payment: { type: Object, default: null },
    emailEnabled: { type: Boolean, default: false },
    sender: { type: Object, default: null },
    onlineEnabled: { type: Boolean, default: false }
  },
  emits: ['close', 'sent', 'marked', 'logged'],
  data() {
    return {
      step: 'compose',
      loading: true,
      busy: false,
      checking: false,
      testBusy: false,
      pdfBusy: false,
      error: '',
      send: { to: [], cc: [], bcc: [], subject: '', message: '' },
      names: {},
      suggested: { to: null, cc: [] },
      bccOpen: false,
      phOpen: false,
      placeholders: [],
      result: null,
      showPassed: false,
      mode: 'html',
      localEmailEnabled: this.emailEnabled,
      localSender: this.sender
    }
  },
  computed: {
    isQuote() {
      return this.doc.doc_type === 'quote'
    },
    docWord() {
      return this.isQuote ? 'quote' : 'invoice'
    },
    apiKind() {
      if (this.kind === 'reminder' || this.kind === 'receipt') return this.kind
      return this.isQuote ? 'quote' : 'invoice'
    },
    title() {
      if (this.kind === 'reminder') return 'Send payment reminder'
      if (this.kind === 'receipt') return this.payment?.receipt_number ? `Email receipt ${this.payment.receipt_number}` : 'Email payment receipt'
      return `Send ${this.docWord}`
    },
    subtitleAmount() {
      const m = (v) => formatCurrency(v, this.doc.currency)
      if (this.kind === 'receipt' && this.payment) return `${m(this.payment.amount)} received`
      if (this.isQuote) return m(this.doc.total)
      return `${m(this.doc.balance_due)} ${this.kind === 'reminder' ? 'outstanding' : 'due'}`
    },
    attachmentName() {
      if (this.kind === 'receipt') return this.payment?.receipt_number ? `${this.payment.receipt_number}.pdf` : `Receipt-${this.doc.number}.pdf`
      return `${this.doc.number}.pdf`
    },
    toNote() {
      const t = this.suggested.to
      const cur = this.send.to?.[0]
      if (!t || cur !== t.email) return cur ? '' : 'Add the address this should go to.'
      return t.source === 'primary_billing' ? `Primary billing contact${t.name ? ' — ' + t.name : ''}.` : 'The client’s email on this document.'
    },
    ccNote() {
      const cc = this.send.cc || []
      const fromContacts = this.suggested.cc.filter((r) => r.source === 'contact' && cc.includes(r.email)).length
      const always = this.suggested.cc.filter((r) => r.source === 'settings' && cc.includes(r.email)).length
      const alwaysText = always ? ' “Always CC” from your email settings is included.' : ''
      if (fromContacts) return `${fromContacts} customer contact${fromContacts > 1 ? 's are' : ' is'} copied automatically${this.kind === 'receipt' ? ' (flagged for receipts)' : ''}.${alwaysText}`
      if (always) return alwaysText.trim()
      return cc.length && this.kind !== 'receipt' ? 'These addresses are remembered for future emails about this document.' : ''
    },
    preview() {
      const p = this.result?.preview || {}
      return { cc: [], bcc: [], attachments: [], ...p }
    },
    checks() {
      return this.result?.checks || []
    },
    passedChecks() {
      return this.checks.filter((c) => c.severity === 'ok' || c.severity === 'info')
    },
    shownChecks() {
      const order = { error: 0, warning: 1, info: 2, ok: 3 }
      const list = this.showPassed ? this.checks : this.checks.filter((c) => c.severity === 'error' || c.severity === 'warning')
      return [...list].sort((a, b) => order[a.severity] - order[b.severity])
    },
    verdict() {
      const r = this.result
      if (!r) return {}
      if (r.errors) return { cls: 'is-error', icon: 'fa-solid fa-circle-xmark', title: `${r.errors} problem${r.errors > 1 ? 's' : ''} must be fixed before sending`, text: 'Nothing has been sent. Go back to edit the message, or fix the document.' }
      if (r.warnings) return { cls: 'is-warn', icon: 'fa-solid fa-triangle-exclamation', title: `Ready — ${r.warnings} warning${r.warnings > 1 ? 's' : ''} to review`, text: 'Check them below. You can still send with “Send anyway”.' }
      return { cls: 'is-ok', icon: 'fa-solid fa-circle-check', title: 'All checks passed', text: 'This is exactly what the client will receive.' }
    },
    confirmLabel() {
      const r = this.result
      if (r && r.errors) return 'Fix errors to send'
      if (r && r.warnings) return 'Send anyway'
      if (!this.localEmailEnabled) return 'Open in email app'
      if (this.kind === 'reminder') return 'Send reminder'
      if (this.kind === 'receipt') return 'Send receipt'
      return 'Send email'
    },
  },
  created() {
    this.load()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    tok(name) {
      return '{' + '{' + name + '}' + '}'
    },
    kb(n) {
      return `${Math.max(1, Math.round((n || 0) / 1024))} KB`
    },
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (!this.busy) this.$emit('close')
    },
    checkIcon(sev) {
      return { error: 'fa-solid fa-circle-xmark', warning: 'fa-solid fa-triangle-exclamation', info: 'fa-solid fa-circle-info', ok: 'fa-solid fa-circle-check' }[sev]
    },
    async load() {
      this.loading = true
      const rk = this.apiKind
      const [rec, draft] = await Promise.allSettled([invoicingApi.recipients(this.doc.id, rk), invoicingApi.emailDraft(this.doc.id, this.apiKind, this.payment?.id)])
      if (draft.status === 'fulfilled') {
        this.send.subject = draft.value.subject || ''
        this.send.message = draft.value.message || ''
        this.placeholders = draft.value.placeholders || []
      } else {
        this.error = apiErrorMessage(draft.reason, 'Could not prepare the message')
      }
      this.send.to = this.doc.client_email ? [this.doc.client_email.toLowerCase()] : []
      this.send.cc = this.kind === 'receipt' ? [] : [...(this.doc.cc_emails || [])]
      if (rec.status === 'fulfilled') {
        const r = rec.value
        this.suggested = { to: r.to || null, cc: r.cc || [] }
        const names = {}
        for (const x of [r.to, ...(r.cc || []), ...(r.bcc || [])]) if (x?.name) names[x.email] = x.name
        this.names = names
        if (r.to?.email) this.send.to = [r.to.email]
        this.send.cc = (r.cc || []).map((x) => x.email)
        this.send.bcc = (r.bcc || []).map((x) => x.email)
        if (typeof r.email_enabled === 'boolean') this.localEmailEnabled = r.email_enabled
        if (r.sender) this.localSender = r.sender
      } else if (!this.error) {
        this.error = apiErrorMessage(rec.reason, 'Could not load the recipients — you can still add them below.')
      }
      this.loading = false
    },
    insert(name) {
      const el = this.$refs.msg
      const token = `{{${name}}}`
      if (!el) return (this.send.message += token)
      const s = el.selectionStart ?? this.send.message.length
      const e = el.selectionEnd ?? s
      this.send.message = this.send.message.slice(0, s) + token + this.send.message.slice(e)
      this.$nextTick(() => {
        el.focus()
        el.selectionStart = el.selectionEnd = s + token.length
      })
    },
    payload() {
      return {
        to: this.send.to[0] || '',
        cc: this.send.cc,
        bcc: this.send.bcc,
        subject: this.send.subject,
        message: this.send.message,
        kind: this.apiKind,
        payment_id: this.payment?.id || '',
        mode: this.localEmailEnabled ? 'email' : 'mailto'
      }
    },
    async review() {
      this.error = ''
      if (this.localEmailEnabled && !this.send.to[0]) return (this.error = 'Add the email address to send this to.')
      if (!this.send.subject.trim()) return (this.error = 'Add a subject.')
      this.step = 'review'
      this.mode = 'html'
      this.showPassed = false
      await this.runPreflight()
    },
    async runPreflight() {
      this.checking = true
      this.result = null
      try {
        this.result = await invoicingApi.preflight(this.doc.id, this.payload())
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not check the email')
      } finally {
        this.checking = false
      }
    },
    async viewPdf() {
      const w = window.open('', '_blank')
      this.pdfBusy = true
      try {
        const blob = this.kind === 'receipt' ? await invoicingApi.receipt(this.doc.id, this.payment.id) : await invoicingApi.pdf(this.doc.id)
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        if (w) w.location.href = url
        else window.location.assign(url)
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } catch (e) {
        if (w) w.close()
        toast.error(apiErrorMessage(e, 'Could not open the PDF'))
      } finally {
        this.pdfBusy = false
      }
    },
    async sendTest() {
      this.testBusy = true
      this.error = ''
      try {
        const res = await invoicingApi.sendTest(this.doc.id, this.payload())
        toast.success(`Test email sent to ${res.to}`)
        this.$emit('logged')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not send the test email')
        this.$emit('logged')
      } finally {
        this.testBusy = false
      }
    },
    async submit() {
      if (!this.result || this.result.errors) return
      this.busy = true
      this.error = ''
      const to = this.send.to[0] || ''
      try {
        const res = await invoicingApi.send(this.doc.id, { ...this.payload(), app_url: window.location.origin, accept_warnings: this.result.warnings > 0 })
        const ccText = [res.cc?.length ? `CC ${res.cc.length}` : '', res.bcc?.length ? `BCC ${res.bcc.length}` : ''].filter(Boolean).join(', ')
        const copyNote = ccText ? ` (${ccText})` : ''
        if (res.emailed) {
          const what = this.kind === 'reminder' ? 'Reminder emailed' : this.kind === 'receipt' ? 'Receipt emailed' : 'Emailed'
          toast.success(`${what} to ${res.to}${copyNote}${res.attachment ? ` with ${res.attachment}` : ''}${res.sender?.from ? ` from ${res.sender.from}` : ''}`)
        } else {
          const q = []
          if (res.cc?.length) q.push(`cc=${encodeURIComponent(res.cc.join(','))}`)
          if (res.bcc?.length) q.push(`bcc=${encodeURIComponent(res.bcc.join(','))}`)
          q.push(`subject=${encodeURIComponent(res.subject || this.send.subject)}`, `body=${encodeURIComponent(res.message || this.send.message)}`)
          window.location.href = `mailto:${encodeURIComponent(res.to || to)}?${q.join('&')}`
          toast.success(this.kind === 'invoice' ? `${this.doc.number} marked as sent` : 'Recorded — finish sending it in your email app')
        }
        if (res.skipped?.length) toast.warning(`Skipped invalid address${res.skipped.length > 1 ? 'es' : ''}: ${res.skipped.join(', ')}`)
        this.$emit('sent', res)
      } catch (e) {
        const checks = e?.response?.data?.error?.checks
        if (checks) {
          this.result = { ...this.result, checks, errors: checks.filter((c) => c.severity === 'error').length, warnings: checks.filter((c) => c.severity === 'warning').length }
        }
        this.error = apiErrorMessage(e, 'Could not send')
        this.$emit('logged')
      } finally {
        this.busy = false
      }
    },
    async markSent() {
      this.busy = true
      this.error = ''
      try {
        const doc = await invoicingApi.markSent(this.doc.id)
        toast.success('Marked as sent')
        this.$emit('marked', doc)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not mark as sent')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.sd {
  max-width: 720px;
}
.sd--review {
  max-width: 860px;
}
.ui-modal__head {
  gap: 12px;
}
.sd-steps {
  display: flex;
  gap: 6px;
  margin: 0 0 0 auto;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--text-3);
}
.sd-steps li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  border: 1px solid var(--border);
  white-space: nowrap;
}
.sd-steps li span {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface-2);
  font-weight: 700;
  font-size: 11px;
}
.sd-steps li.on {
  color: var(--text);
  border-color: var(--accent);
  background: var(--accent-soft);
}
.sd-steps li.on span {
  background: var(--accent);
  color: #fff;
}
.grid-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
}
.span {
  grid-column: 1 / -1;
}
.m0 {
  margin: 0;
}
.sending-from {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--text-2);
}
.attach-note {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-2);
}
.linkish {
  background: none;
  border: 0;
  padding: 0;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
.linkish.small {
  font-size: 13px;
  margin: 2px 0 10px;
}
code {
  font-size: 12px;
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--text);
}
.ph-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 6px;
  margin-top: 8px;
}
.ph {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  min-width: 0;
}
.ph:hover {
  background: var(--surface-hover);
}
.ph small {
  color: var(--text-3);
  font-size: 11px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sd-review {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sd-checking {
  padding: 40px 0;
  text-align: center;
  color: var(--text-2);
}
.sd-verdict {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}
.sd-verdict i {
  font-size: 20px;
  margin-top: 2px;
}
.sd-verdict div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sd-verdict span {
  font-size: 13px;
  color: var(--text-2);
}
.sd-verdict.is-ok {
  background: var(--success-soft);
  border-color: var(--success);
}
.sd-verdict.is-ok i {
  color: var(--success);
}
.sd-verdict.is-warn {
  background: var(--warning-soft);
  border-color: var(--warning);
}
.sd-verdict.is-warn i {
  color: var(--warning);
}
.sd-verdict.is-error {
  background: var(--danger-soft);
  border-color: var(--danger);
}
.sd-verdict.is-error i {
  color: var(--danger);
}
.checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.checks li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.checks li span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.checks li small {
  color: var(--text-2);
}
.checks i {
  margin-top: 2px;
}
.c-error i {
  color: var(--danger);
}
.c-warning i {
  color: var(--warning);
}
.c-info i {
  color: var(--info);
}
.c-ok i {
  color: var(--success);
}
.c-error {
  background: var(--danger-soft) !important;
}
.c-warning {
  background: var(--warning-soft) !important;
}
.pv {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.pv-meta {
  margin: 0;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.pv-meta div {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 8px;
}
.pv-meta dt {
  color: var(--text-3);
}
.pv-meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.pv-subject {
  font-weight: 600;
}
.pv-att {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.pv-tabs {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.pv-tabs button {
  border: 0;
  background: none;
  color: var(--text-2);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
}
.pv-tabs button.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.pv-frame {
  display: block;
  width: 100%;
  height: 560px;
  border: 0;
  background: #f3f4f8;
}
.pv-text {
  margin: 0;
  padding: 14px;
  max-height: 560px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text);
  background: var(--surface);
}
.spin {
  animation: sdspin 0.8s linear infinite;
}
@keyframes sdspin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 640px) {
  .grid-form {
    grid-template-columns: 1fr;
  }
  .sd-steps {
    display: none;
  }
  .pv-frame {
    height: 460px;
  }
  .ui-modal__foot {
    flex-wrap: wrap;
  }
}
</style>
