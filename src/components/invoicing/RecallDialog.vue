<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal rc" data-testid="recall-dialog" @submit.prevent="submit">
      <div class="ui-modal__head">
        <div>
          <h2>Recall this email</h2>
          <p class="muted small m0">{{ kindLabel }} {{ doc.number }} · sent {{ sentText }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body rc-body">
        <div v-if="loading" class="ui-skeleton" style="height: 260px"></div>
        <div v-else-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }}</span></div>
        <template v-else-if="p">
          <div class="rc-truth" data-testid="recall-truth">
            <i class="fa-solid fa-circle-info"></i>
            <p><strong>What recall can and can't do.</strong> {{ p.truth }}</p>
          </div>

          <fieldset class="rc-who">
            <legend>Recall it for</legend>
            <label v-for="r in p.recipients" :key="r.role + r.email" class="rc-person" :class="{ off: !!r.skipped || r.recalled }" :data-email="r.email">
              <input v-model="picked" type="checkbox" :value="r.email" :disabled="!!r.skipped || r.recalled" />
              <span class="rc-role">{{ roleLabel(r.role) }}</span>
              <span class="rc-email">{{ r.email }}</span>
              <span v-if="r.recalled" class="ui-badge ui-badge--draft">Already recalled</span>
              <span v-else-if="r.skipped" class="muted small">{{ r.skipped }}</span>
              <span v-else-if="r.viewed" class="ui-badge ui-badge--sent" title="They used their own link">Viewed</span>
              <span v-else-if="r.opened" class="ui-badge ui-badge--sent">Opened</span>
              <span v-else-if="r.auto_opened" class="ui-badge ui-badge--draft" title="Their mail app or a scanner loaded it — may not be a person">Opened automatically</span>
            </label>
          </fieldset>

          <div class="rc-opt">
            <label class="ui-switch is-fixed"><input type="checkbox" checked disabled /> Switch off the links in this email</label>
            <span class="ui-hint">
              Their {{ linkWords }} open a “withdrawn” page instead — no amounts or lines<template v-if="!isQuote && !isReceipt">, and online payment through them is refused</template><template v-if="isQuote">, and the quote can't be accepted through them</template>.
              Anyone with the plain client link can still open the {{ docWord }}; switch off every link below to close that too.
            </span>
          </div>

          <div class="rc-opt">
            <label class="ui-switch" :class="{ 'is-fixed': p.all_links_required }">
              <input v-model="f.all_links" type="checkbox" :disabled="p.all_links_required" data-testid="recall-all-links" />
              Also switch off every link to {{ doc.number }}
            </label>
            <span class="ui-hint">
              <template v-if="p.all_links_required">Needed for this email: it went out as one message without personal links, so its links can only be switched off all together. </template>
              A new link is made — links in other emails, in the PDF and links you shared by hand stop working too. Sending it again issues new links.
            </span>
          </div>

          <div class="rc-opt">
            <label class="ui-switch" :class="{ 'is-fixed': !p.email_enabled }">
              <input v-model="f.notice" type="checkbox" :disabled="!p.email_enabled" data-testid="recall-notice" />
              Send a “please disregard” notice
            </label>
            <span v-if="!p.email_enabled" class="ui-hint">Email sending isn't set up, so no notice can be sent — the links can still be switched off.</span>
            <div v-else-if="f.notice" class="rc-notice">
              <div class="ui-field">
                <label for="rc_reason">Reason <span class="muted">(optional, shown in the notice)</span></label>
                <input id="rc_reason" v-model.trim="f.reason" class="ui-input" maxlength="300" placeholder="e.g. The delivery date was wrong" data-testid="recall-reason" />
              </div>
              <div class="ui-field">
                <label for="rc_repl">Link the corrected version <span class="muted">(optional)</span></label>
                <select id="rc_repl" v-model="f.replacement_id" class="ui-select" data-testid="recall-replacement">
                  <option value="">No link — we'll send it separately</option>
                  <option v-for="d in replacements" :key="d.id" :value="d.id">{{ d.label }} · {{ money(d.total, d.currency) }}</option>
                </select>
                <span class="ui-hint">Only documents that have been sent have a link. Correct and send the new version first if you want it in the notice.</span>
              </div>
              <div class="rc-preview" data-testid="recall-notice-preview">
                <i class="fa-regular fa-envelope"></i>
                <span><strong>{{ p.notice_subject }}</strong> — a short branded email to {{ noticeTo }}, tracked like your other emails.<template v-if="(p.notice_bcc || []).length"> A blind copy goes to {{ p.notice_bcc.join(', ') }}, as on the original.</template></span>
              </div>
              <!-- Pending review (v2.19): the links go off at once; only the notice waits for approval -->
              <OutboxSendNote v-model="sendNow" thing="this notice" compact />
            </div>
          </div>

          <div v-if="p.attachment" class="ui-alert ui-alert--warning" data-testid="recall-attachment">
            <i class="fa-solid fa-paperclip"></i>
            <span>This email had <strong>{{ fileName }}</strong> attached. That copy stays in their inbox and can't be taken back{{ f.notice ? ' — the notice asks them to delete it' : '' }}.</span>
          </div>

          <div v-if="!isReceipt" class="ui-field">
            <label for="rc_after">After recalling</label>
            <select id="rc_after" v-model="f.correct" class="ui-select" data-testid="recall-correct">
              <option value="">Nothing else</option>
              <option value="edit">{{ p.can_edit ? `Open ${doc.number} to correct it` : `Start a corrected copy of ${doc.number}` }}</option>
              <option value="replace" :disabled="!p.can_void">Void {{ doc.number }} and start a corrected copy (new number){{ p.can_void ? '' : ' — not possible with payments' }}</option>
            </select>
          </div>
          <label v-else class="ui-switch"><input v-model="f.editPayment" type="checkbox" data-testid="recall-edit-payment" /> Then open the payment to correct it</label>

          <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        </template>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--danger" :disabled="busy || loading || !p || !picked.length" data-testid="recall-confirm">
          <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-link-slash'"></i>
          {{ f.correct || f.editPayment ? 'Recall and correct' : 'Recall' }}{{ picked.length && p && picked.length < activeCount ? ` (${picked.length})` : '' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/utils/currencies'
import { toast } from '@/composables/useToast'
import OutboxSendNote from '@/components/outbox/OutboxSendNote.vue'
import { outbox, reviewOf, queuedToast } from '@/components/outbox/outboxState'

/**
 * Recall a sent invoice / quote / reminder / receipt email (pkg/invoicing recall.go): switch off its links (per person
 * or every link to the document), optionally send a "please disregard" notice, then optionally correct the document.
 * Says plainly what can't be taken back (the email in their inbox, an attached PDF).
 */
export default {
  name: 'RecallDialog',
  components: { OutboxSendNote },
  props: {
    doc: { type: Object, required: true },
    log: { type: Object, required: true },
    recipient: { type: String, default: '' }, // preselect only this person
    timezone: { type: String, default: '' }
  },
  emits: ['close', 'done'],
  data() {
    return {
      loading: true,
      loadError: '',
      busy: false,
      error: '',
      p: null,
      picked: [],
      f: { all_links: false, notice: true, reason: '', replacement_id: '', correct: '', editPayment: false },
      sendNow: false
    }
  },
  computed: {
    isQuote() {
      return this.doc.doc_type === 'quote'
    },
    isReceipt() {
      return this.log.kind === 'receipt'
    },
    docWord() {
      return this.isQuote ? 'quote' : 'invoice'
    },
    kindLabel() {
      return { invoice: 'Invoice email', quote: 'Quote email', reminder: 'Payment reminder', receipt: 'Receipt email' }[this.log.kind] || 'Email'
    },
    linkWords() {
      if (this.isQuote) return 'View & accept links'
      if (this.isReceipt) return 'View invoice links'
      return 'View and Pay links'
    },
    sentText() {
      try {
        return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(this.timezone ? { timeZone: this.timezone } : {}) }).format(new Date(this.log.created_at))
      } catch {
        return this.log.created_at
      }
    },
    fileName() {
      return (this.p?.attachment || '').split(' ')[0]
    },
    activeCount() {
      return (this.p?.recipients || []).filter((r) => !r.skipped && !r.recalled).length
    },
    noticeTo() {
      const to = (this.p?.recipients || []).filter((r) => this.picked.includes(r.email) && r.role !== 'bcc').map((r) => r.email)
      return to.length ? to.join(', ') : 'the people above'
    },
    replacements() {
      return this.p?.replacements || []
    }
  },
  created() {
    this.load()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (!this.busy) this.$emit('close')
    },
    roleLabel(r) {
      return { to: 'To', cc: 'CC', bcc: 'BCC' }[r] || r
    },
    money(v, cur) {
      return formatCurrency(v, cur || this.doc.currency)
    },
    async load() {
      this.loading = true
      try {
        this.p = await invoicingApi.recallPreview(this.doc.id, this.log.id)
        const open = this.p.recipients.filter((r) => !r.skipped && !r.recalled).map((r) => r.email)
        this.picked = this.recipient && open.includes(this.recipient) ? [this.recipient] : open
        this.f.all_links = !!this.p.all_links_required
        this.f.notice = !!this.p.email_enabled
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'This email can’t be recalled')
      } finally {
        this.loading = false
      }
    },
    async submit() {
      if (!this.p || !this.picked.length || this.busy) return
      this.busy = true
      this.error = ''
      const body = {
        recipients: this.picked.length === this.activeCount ? [] : this.picked,
        all_links: this.f.all_links,
        notice: this.f.notice && this.p.email_enabled,
        reason: this.f.notice ? this.f.reason : '',
        replacement_id: this.f.notice ? this.f.replacement_id : '',
        correct: this.isReceipt ? '' : this.f.correct,
        send_now: !!(this.f.notice && this.sendNow && outbox.me?.can_send_now)
      }
      try {
        const res = await invoicingApi.recallEmail(this.doc.id, this.log.id, body)
        const who = (res.recalled || []).map((r) => r.email).join(', ')
        const parts = [`Links switched off for ${who}.`]
        if (res.all_links) parts.push(`Every link to ${this.doc.number} is off — sending it again issues new ones.`)
        const noticeQueued = reviewOf(res.notice)
        if (noticeQueued) parts.push('The disregard notice waits in Pending review.')
        else if (res.notice?.sent) parts.push('Disregard notice sent.')
        else if (res.notice?.error) parts.push(`No notice sent: ${res.notice.error}`)
        if (res.attachment_note) parts.push(res.attachment_note)
        toast.success(parts.join(' '), { title: 'Email recalled', duration: 9000 })
        if (res.correct_error) toast.warning(res.correct_error)
        if (noticeQueued) queuedToast(noticeQueued, { what: 'The disregard notice', to: this.noticeTo })
        this.$emit('done', { res, editPayment: this.isReceipt && this.f.editPayment, paymentId: this.log.payment_id })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not recall the email')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.rc {
  max-width: 640px;
}
.m0 {
  margin: 0;
}
.rc-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.rc-truth {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--info-soft);
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.5;
}
.rc-truth i {
  color: var(--info);
  margin-top: 3px;
}
.rc-truth p {
  margin: 0;
}
.rc-truth strong {
  color: var(--text);
}
.rc-who {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px 10px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rc-who legend {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  padding: 0 4px;
}
.rc-person {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13.5px;
  cursor: pointer;
  min-width: 0;
}
.rc-person.off {
  color: var(--text-3);
  cursor: default;
}
.rc-role {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  min-width: 26px;
}
.rc-email {
  font-weight: 600;
  overflow-wrap: anywhere;
  min-width: 0;
}
.rc-opt {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rc-opt > .ui-hint {
  padding-left: 46px;
}
.is-fixed {
  opacity: 0.8;
}
.rc-notice {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 6px 0 0 46px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.rc-preview {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12.5px;
  color: var(--text-2);
  overflow-wrap: anywhere;
}
.rc-preview strong {
  color: var(--text);
}
.spin {
  animation: rcspin 0.8s linear infinite;
}
@keyframes rcspin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 640px) {
  .rc-opt > .ui-hint {
    padding-left: 0;
  }
  .rc-notice {
    margin-left: 0;
  }
  .ui-modal__foot {
    flex-wrap: wrap;
  }
}
</style>
