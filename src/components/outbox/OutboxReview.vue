<template>
  <div class="obr-backdrop" @mousedown.self="close">
    <aside ref="panel" class="obr" role="dialog" aria-modal="true" aria-labelledby="obr-title" data-testid="outbox-review" :data-id="id" :data-status="it ? it.status : ''" tabindex="-1" @keydown="onKey">
      <header class="obr__head">
        <div class="min0">
          <div class="ui-eyebrow obr__eyebrow">
            <i :class="kindIconOf(it)" aria-hidden="true"></i> {{ it ? kindLabelOf(it) : 'Message' }}
            <template v-if="it"> · <i :class="channelIconOf(it.channel)" aria-hidden="true"></i> {{ channelLabelOf(it.channel) }}</template>
          </div>
          <h2 id="obr-title" data-testid="review-title">{{ title }}</h2>
          <div v-if="it" class="obr__badges">
            <span class="ui-badge" :class="statusOf(it.status).badge" data-testid="review-status">{{ it.status_label || statusOf(it.status).label }}</span>
            <span v-if="it.stale" class="ui-badge ui-badge--warning" data-testid="review-stale"><i class="fa-solid fa-hourglass-end"></i> Stale</span>
            <span v-if="it.flag" class="ui-badge" :class="it.blocks ? 'ui-badge--danger' : 'ui-badge--info'" data-testid="review-flag"><i :class="it.blocks ? 'fa-solid fa-lock' : 'fa-regular fa-clock'"></i> {{ it.flag }}</span>
            <span v-if="it.edited" class="ui-badge ui-badge--draft"><i class="fa-regular fa-pen-to-square"></i> Edited</span>
          </div>
        </div>
        <div class="obr__head-btns">
          <span v-if="ids.length > 1 && pos >= 0" class="obr__pos muted small" aria-live="polite">{{ pos + 1 }} of {{ ids.length }}</span>
          <button v-if="ids.length > 1" type="button" class="ui-btn ui-btn--ghost ui-btn--icon obr__hbtn" :disabled="pos <= 0" title="Previous (k)" aria-label="Previous message" data-testid="review-prev" @click="move(-1)"><i class="fa-solid fa-chevron-up"></i></button>
          <button v-if="ids.length > 1" type="button" class="ui-btn ui-btn--ghost ui-btn--icon obr__hbtn" :disabled="pos < 0 || pos >= ids.length - 1" title="Next (j)" aria-label="Next message" data-testid="review-next" @click="move(1)"><i class="fa-solid fa-chevron-down"></i></button>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon obr__hbtn" aria-label="Close" title="Close (Esc)" data-testid="review-close" @click="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>

      <div ref="body" class="obr__body">
        <div v-if="loadError" class="ui-alert ui-alert--danger" data-testid="review-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
        <div v-else-if="!it" class="obr__sk"><div v-for="n in 6" :key="n" class="ui-skeleton" :style="{ height: n === 6 ? '320px' : '22px' }"></div></div>
        <template v-else>
          <!-- What happened / what needs doing -->
          <div v-if="it.status === 'failed'" class="ui-alert ui-alert--danger" data-testid="review-failed">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span><strong>It couldn’t be sent.</strong> {{ it.error || 'The send failed.' }}<template v-if="it.attempts > 1"> ({{ it.attempts }} tries)</template> Check the details, then try again.</span>
          </div>
          <div v-else-if="it.status === 'superseded'" class="ui-alert" data-testid="review-superseded"><i class="fa-solid fa-forward"></i><span><strong>Not sent — it isn’t needed any more.</strong> {{ it.superseded_reason || it.decision_note }}</span></div>
          <div v-else-if="it.status === 'rejected'" class="ui-alert" data-testid="review-rejected"><i class="fa-solid fa-ban"></i><span><strong>Rejected by {{ personName(it.decided_by) }}</strong> {{ when(it.decided_at) }} — nothing was sent.<template v-if="it.decision_note"> “{{ it.decision_note }}”</template></span></div>
          <div v-else-if="it.status === 'sent'" class="ui-alert ui-alert--success" data-testid="review-sent"><i class="fa-solid fa-circle-check"></i><span><strong>Sent {{ when(it.sent_at) }}.</strong> {{ it.result }}<template v-if="it.approved_by"> Approved by {{ personName(it.approved_by) }}.</template></span></div>
          <div v-else-if="it.status === 'approved' || it.status === 'sending'" class="ui-alert" data-testid="review-approved"><i class="fa-regular fa-clock"></i><span><strong>{{ it.status === 'sending' ? 'Sending now…' : 'Approved — it goes ' + when(it.send_at) + '.' }}</strong><template v-if="it.approved_by"> Approved by {{ personName(it.approved_by) }}.</template> Edit it to take it back for review.</span></div>
          <div v-else-if="it.stale" class="ui-alert ui-alert--warning" data-testid="review-stale-note"><i class="fa-solid fa-hourglass-end"></i><span><strong>This has waited a long time.</strong> It is dated{{ it.stale_since ? ' (stale since ' + when(it.stale_since) + ')' : '' }} — check it still makes sense, or reject it.</span></div>
          <div v-if="it.blocks === 'suspension' && it.status === 'pending'" class="ui-alert ui-alert--warning" data-testid="review-blocking"><i class="fa-solid fa-lock"></i><span><strong>{{ it.flag || 'Blocking a suspension' }}.</strong> The suspension waits until this notice is approved and sent — the client always gets the full notice period. Rejecting it lets the suspension go ahead as planned.</span></div>

          <dl class="obr-facts" data-testid="review-facts">
            <div><dt>To</dt><dd data-testid="review-to">{{ it.to_name ? `${it.to_name} <${it.to}>` : it.to || '—' }}</dd></div>
            <div v-if="(it.cc || []).length"><dt>CC</dt><dd>{{ it.cc.join(', ') }}</dd></div>
            <div v-if="(it.bcc || []).length"><dt>BCC</dt><dd>{{ it.bcc.join(', ') }}</dd></div>
            <div v-if="it.record">
              <dt>About</dt>
              <dd>
                <router-link v-if="recordLink" :to="recordLink" data-testid="review-record" @click="close">{{ it.record.label || it.record.number }}</router-link>
                <span v-else>{{ it.record.label }}</span>
                <template v-if="it.amount !== null && it.amount !== undefined"> · <span class="tabular">{{ money(it.amount, it.currency) }}</span></template>
              </dd>
            </div>
            <div v-if="it.customer">
              <dt>Customer</dt>
              <dd>{{ it.customer.name }} <button v-if="it.customer.id" type="button" class="linkish obr-cust" data-testid="review-filter-customer" @click="filterCustomer">All their messages</button></dd>
            </div>
            <div><dt>Why</dt><dd data-testid="review-trigger">{{ it.trigger || '—' }}</dd></div>
            <div><dt>Waiting since</dt><dd>{{ when(it.created_at) }} <span class="muted">({{ waited(it.created_at) }})</span><template v-if="it.created_by"> · queued by {{ it.created_by.name }}</template></dd></div>
            <div v-if="it.send_at"><dt>Meant to go</dt><dd>{{ when(it.send_at) }}<span v-if="future(it.send_at)" class="muted"> — approve for its time, or send it early</span></dd></div>
            <div v-for="c in extraContext" :key="c.label"><dt>{{ c.label }}</dt><dd>{{ c.value }}</dd></div>
          </dl>

          <div ref="tabs" class="ui-tabs obr-tabs" role="tablist" aria-label="Review">
            <button type="button" class="ui-tab" :class="{ 'is-active': tab === 'preview' }" role="tab" :aria-selected="tab === 'preview'" data-testid="review-tab-preview" @click="tab = 'preview'"><i class="fa-regular fa-eye"></i> Client’s view</button>
            <button v-if="canEdit" type="button" class="ui-tab" :class="{ 'is-active': tab === 'edit' }" role="tab" :aria-selected="tab === 'edit'" data-testid="review-tab-edit" @click="openEdit">
              <i class="fa-regular fa-pen-to-square"></i> Edit<span v-if="dirty" class="count dirty" aria-label="unsaved changes">•</span>
            </button>
            <button type="button" class="ui-tab" :class="{ 'is-active': tab === 'history' }" role="tab" :aria-selected="tab === 'history'" data-testid="review-tab-history" @click="tab = 'history'">
              <i class="fa-solid fa-clock-rotate-left"></i> History<span class="count">{{ (it.history || []).length }}</span>
            </button>
          </div>

          <!-- Edit (approvers): the form, with the client's view beside it on wide screens -->
          <section v-if="tab === 'edit' && canEdit" class="obr-edit" data-testid="review-edit">
            <form class="obr-form" @submit.prevent="save">
              <template v-if="it.channel === 'email'">
                <div class="ui-field">
                  <label for="obr_to">To</label>
                  <EmailChips id="obr_to" v-model="form.to" :max="1" primary icon="fa-solid fa-user" placeholder="client@email.com" aria-label="To email address" :disabled="!ed.to" />
                </div>
                <div class="ui-field">
                  <label for="obr_cc">CC</label>
                  <EmailChips id="obr_cc" v-model="form.cc" rows :exclude="form.to" icon="fa-regular fa-user" placeholder="Add CC email addresses" aria-label="CC email addresses" :disabled="!ed.cc" />
                </div>
                <div class="ui-field">
                  <label for="obr_bcc">BCC <span class="muted small">— hidden copies</span></label>
                  <EmailChips id="obr_bcc" v-model="form.bcc" rows :exclude="[...form.to, ...form.cc]" icon="fa-solid fa-user-secret" placeholder="Add BCC email addresses" aria-label="BCC email addresses" :disabled="!ed.bcc" />
                </div>
                <div class="ui-field">
                  <label for="obr_subject">Subject</label>
                  <input id="obr_subject" v-model="form.subject" class="ui-input" maxlength="300" :disabled="!ed.subject" data-testid="review-subject" />
                </div>
                <div class="ui-field">
                  <label for="obr_msg">Message</label>
                  <textarea id="obr_msg" v-model="form.message" class="ui-textarea" rows="10" :disabled="!ed.message" data-testid="review-message"></textarea>
                  <span class="ui-hint">The amounts, links and buttons are already filled in — change the words if you need to. Attachments are made again when it goes, so later edits to the document are included.</span>
                </div>
              </template>
              <template v-else>
                <div class="ui-field">
                  <label for="obr_phone">To ({{ it.channel === 'whatsapp' ? 'WhatsApp number' : 'mobile number' }})</label>
                  <input id="obr_phone" v-model.trim="form.phone" class="ui-input" inputmode="tel" :disabled="!ed.to" data-testid="review-phone" />
                </div>
                <div v-if="it.channel === 'sms'" class="ui-field">
                  <label for="obr_sms">Text message</label>
                  <textarea id="obr_sms" v-model="form.message" class="ui-textarea" rows="5" maxlength="918" :disabled="!ed.message" data-testid="review-sms"></textarea>
                  <span class="ui-hint" data-testid="review-sms-count">{{ smsCount }}</span>
                </div>
                <template v-if="it.channel === 'whatsapp' && it.whatsapp">
                  <div v-if="ed.whatsapp_text" class="ui-field">
                    <label for="obr_wa">WhatsApp text</label>
                    <textarea id="obr_wa" v-model="form.whatsapp_text" class="ui-textarea" rows="5" maxlength="4096" data-testid="review-wa-text"></textarea>
                    <span class="ui-hint">{{ it.whatsapp.mode === 'auto' ? 'Goes as free text if the client wrote in the last 24 hours when it is sent; otherwise the template below is used.' : 'Free text — the client wrote in the last 24 hours.' }}</span>
                  </div>
                  <fieldset v-if="it.whatsapp.template && ed.whatsapp_params" class="obr-params" data-testid="review-wa-params">
                    <legend>Template <code>{{ it.whatsapp.template }}</code><span v-if="it.whatsapp.language" class="muted"> ({{ it.whatsapp.language }})</span></legend>
                    <div v-for="(p, i) in form.whatsapp_params" :key="i" class="ui-field">
                      <label :for="'obr_wp' + i"><code v-text="ph(i + 1)"></code></label>
                      <input :id="'obr_wp' + i" v-model="form.whatsapp_params[i]" class="ui-input" maxlength="1024" />
                    </div>
                    <span class="ui-hint">WhatsApp only lets businesses start a conversation with an approved template — you can change what goes in each blank, not the template’s own words.</span>
                  </fieldset>
                  <p v-if="!ed.whatsapp_text && !ed.whatsapp_params" class="ui-hint">This WhatsApp message can’t be changed here — reject it and send a new one if the wording is wrong.</p>
                </template>
              </template>
              <div v-if="formError" class="ui-alert ui-alert--danger" data-testid="review-form-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
              <div class="obr-form__btns">
                <button type="button" class="ui-btn" :disabled="!dirty || !!busy" @click="resetForm"><i class="fa-solid fa-rotate-left"></i> Undo changes</button>
                <button type="button" class="ui-btn" :disabled="!dirty || !!busy || previewing" data-testid="review-repreview" @click="previewClick"><i :class="previewing ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-eye'"></i> Preview changes</button>
                <button type="submit" class="ui-btn ui-btn--primary" :disabled="!dirty || !!busy" data-testid="review-save"><i :class="busy === 'save' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save changes</button>
              </div>
            </form>
            <div class="obr-side-preview" aria-label="Client’s view">
              <OutboxPreview :item="it" :preview="shownPreview" :draft="!!draftPreview" :busy="previewing" compact @view-file="viewFile" />
            </div>
          </section>

          <section v-else-if="tab === 'history'" class="obr-hist" data-testid="review-history">
            <ol class="obr-tl">
              <li v-for="e in it.history || []" :key="e.id || e.at + e.action" :class="'ev-' + e.action" :data-action="e.action">
                <span class="obr-tl__dot" aria-hidden="true"><i :class="eventIcon(e.action)"></i></span>
                <span class="obr-tl__body">
                  <span class="obr-tl__text">{{ e.text || e.action }}</span>
                  <small class="muted">{{ when(e.at) }}<template v-if="e.by && e.text && !e.text.includes(e.by.name)"> · {{ e.by.name }}</template></small>
                  <ul v-if="e.changes" class="obr-tl__changes">
                    <li v-for="(c, k) in e.changes" :key="k">
                      <strong>{{ fieldLabel(k) }}</strong>
                      <span class="from">{{ short(c.from) }}</span>
                      <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                      <span class="to">{{ short(c.to) }}</span>
                    </li>
                  </ul>
                  <small v-if="e.note" class="obr-tl__note">“{{ e.note }}”</small>
                </span>
              </li>
            </ol>
            <p v-if="!(it.history || []).length" class="muted small">No history yet.</p>
          </section>

          <section v-else class="obr-pv" data-testid="review-preview">
            <OutboxPreview :item="it" :preview="shownPreview" :draft="!!draftPreview" :busy="previewing" @view-file="viewFile" />
          </section>
        </template>
      </div>

      <footer v-if="it" class="obr__foot" data-testid="review-actions">
        <router-link v-if="recordLink" :to="recordLink" class="ui-btn ui-btn--ghost obr__open" data-testid="review-open-record" @click="close"><i class="fa-solid fa-arrow-up-right-from-square"></i> {{ recordActionLabel }}</router-link>
        <template v-if="canApprove">
          <button v-if="acts.reject" type="button" class="ui-btn ui-btn--danger" :disabled="!!busy" data-testid="review-reject" @click="openReject"><i class="fa-solid fa-ban"></i> Reject</button>
          <button v-if="dirty && tab !== 'edit'" type="button" class="ui-btn" :disabled="!!busy" @click="save"><i class="fa-solid fa-check"></i> Save changes</button>
          <button v-if="acts.retry" type="button" class="ui-btn ui-btn--primary" :disabled="!!busy" data-testid="review-retry" @click="retry"><i :class="busy === 'retry' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate-right'"></i> Try again</button>
          <button v-if="acts.approve_scheduled" type="button" class="ui-btn" :disabled="!!busy" data-testid="review-approve-scheduled" @click="approve('scheduled')">
            <i :class="busy === 'scheduled' ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-clock'"></i> Approve for {{ shortWhen(it.send_at) }}
          </button>
          <button v-if="acts.approve_now" type="button" class="ui-btn ui-btn--primary" :disabled="!!busy" data-testid="review-approve-now" @click="approve('now')">
            <i :class="busy === 'now' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-paper-plane'"></i> {{ dirty ? 'Save & send now' : it.status === 'approved' ? 'Send now instead' : 'Approve & send now' }}
          </button>
        </template>
        <p v-else-if="it.status === 'pending'" class="obr__wait muted small" data-testid="review-readonly"><i class="fa-solid fa-user-shield"></i> An owner or admin checks this before it goes to the client.</p>
      </footer>

      <!-- Reject with a note -->
      <div v-if="rejecting" class="obr-reject" role="dialog" aria-modal="true" aria-labelledby="obr-rej-title" data-testid="review-reject-dialog" @keydown.esc.stop="rejecting = false">
        <form class="obr-reject__card" @submit.prevent="reject">
          <h3 id="obr-rej-title">Reject this message?</h3>
          <p class="muted small">Nothing is sent to {{ it.to_name || it.to }}. {{ rejectEffect }}</p>
          <div class="ui-field">
            <label for="obr_note">Note <span class="muted">(optional — kept in the history)</span></label>
            <textarea id="obr_note" ref="note" v-model="rejectNote" class="ui-textarea" rows="3" maxlength="500" placeholder="e.g. Wrong amount — I'll fix the invoice first" data-testid="review-reject-note"></textarea>
          </div>
          <div class="obr-reject__btns">
            <button type="button" class="ui-btn" @click="rejecting = false">Keep it</button>
            <button type="submit" class="ui-btn ui-btn--danger" :disabled="busy === 'reject'" data-testid="review-reject-confirm"><i :class="busy === 'reject' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-ban'"></i> Reject — don’t send</button>
          </div>
        </form>
      </div>
    </aside>
  </div>
</template>

<script>
import EmailChips from '@/components/invoicing/EmailChips.vue'
import OutboxPreview from './OutboxPreview.vue'
import { outboxApi, kindLabel, kindIcon, channelLabel, channelIcon, statusInfo, recordPath, recordAction, waitedFor, whenText } from '@/services/outbox'
import { refreshOutboxCounts } from './outboxState'
import { apiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/utils/currencies'
import { orgDefaults } from '@/utils/orgDefaults'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const EVENT_ICONS = {
  queued: 'fa-solid fa-inbox',
  edited: 'fa-regular fa-pen-to-square',
  approved: 'fa-solid fa-check',
  sending: 'fa-solid fa-paper-plane',
  sent: 'fa-solid fa-circle-check',
  failed: 'fa-solid fa-triangle-exclamation',
  rejected: 'fa-solid fa-ban',
  superseded: 'fa-solid fa-forward',
  retried: 'fa-solid fa-rotate-right',
  stale: 'fa-solid fa-hourglass-end',
  sent_now: 'fa-solid fa-paper-plane'
}
const FIELD_LABELS = { to: 'To', cc: 'CC', bcc: 'BCC', subject: 'Subject', message: 'Message', whatsapp_text: 'WhatsApp text', whatsapp_params: 'Template blanks' }

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * One Pending-review item: the client's-eye preview, edits (To / CC / BCC, subject, message, SMS text, WhatsApp text or
 * template blanks), context and history, and the decision (approve now / for its time, save, reject, retry).
 * Keyboard: j / k next / previous item, e edit, p preview, Esc close.
 */
export default {
  name: 'OutboxReview',
  components: { EmailChips, OutboxPreview },
  props: {
    id: { type: String, required: true },
    ids: { type: Array, default: () => [] } // the list's order, for next / previous
  },
  emits: ['close', 'changed', 'move', 'filter-customer'],
  data() {
    return {
      it: null,
      loadError: '',
      tab: 'preview',
      form: { to: [], cc: [], bcc: [], subject: '', message: '', phone: '', whatsapp_text: '', whatsapp_params: [] },
      original: null,
      formError: '',
      busy: '',
      previewing: false,
      draftPreview: null,
      rejecting: false,
      rejectNote: '',
      lastFocus: null,
      previewSupported: null, // POST /outbox/items/:id/preview (contract v1.1); false after a 404 → preview after saving
      autoTimer: null
    }
  },
  computed: {
    title() {
      const it = this.it
      if (!it) return 'Loading…'
      return it.subject || `${kindLabel(it)} to ${it.to_name || it.to}`
    },
    pos() {
      return this.ids.indexOf(this.id)
    },
    canApprove() {
      return !!this.it?.can_approve
    },
    acts() {
      return this.it?.actions || {}
    },
    ed() {
      return this.it?.editable || {}
    },
    canEdit() {
      return this.canApprove && !!this.acts.edit
    },
    recordLink() {
      return recordPath(this.it?.record)
    },
    recordActionLabel() {
      return recordAction(this.it?.record)
    },
    extraContext() {
      // The API's context lines, minus what the facts above already say.
      const skip = ['why', 'to', 'cc', 'bcc', 'waiting since', 'client', 'customer', 'queued by']
      return (this.it?.context || []).filter((c) => c && c.label && !skip.includes(String(c.label).toLowerCase()))
    },
    tz() {
      return orgDefaults.timezone || undefined
    },
    edits() {
      const it = this.it
      if (!it || !this.original) return {}
      const f = this.form
      const o = this.original
      const e = {}
      if (it.channel === 'email') {
        if (this.ed.to && !same(f.to[0] || '', o.to[0] || '')) e.to = f.to[0] || ''
        if (this.ed.cc && !same(f.cc, o.cc)) e.cc = [...f.cc]
        if (this.ed.bcc && !same(f.bcc, o.bcc)) e.bcc = [...f.bcc]
        if (this.ed.subject && f.subject !== o.subject) e.subject = f.subject
        if (this.ed.message && f.message !== o.message) e.message = f.message
      } else {
        if (this.ed.to && f.phone !== o.phone) e.to = f.phone
        if (it.channel === 'sms' && this.ed.message && f.message !== o.message) e.message = f.message
        if (this.ed.whatsapp_text && f.whatsapp_text !== o.whatsapp_text) e.whatsapp_text = f.whatsapp_text
        if (this.ed.whatsapp_params && !same(f.whatsapp_params, o.whatsapp_params)) e.whatsapp_params = [...f.whatsapp_params]
      }
      return e
    },
    dirty() {
      return Object.keys(this.edits).length > 0
    },
    shownPreview() {
      return this.draftPreview || this.it?.preview || null
    },
    smsCount() {
      const n = (this.form.message || '').length
      const parts = n <= 160 ? 1 : Math.ceil(n / 153)
      return `${n} characters · ${parts} SMS${parts > 1 ? ' messages' : ''}`
    },
    rejectEffect() {
      const it = this.it || {}
      if (it.blocks === 'suspension') return 'The suspension then goes ahead as planned.'
      if (it.module === 'invoicing') return 'The invoice keeps its status — it is not marked as sent.'
      return 'The history keeps a record that it was not sent.'
    }
  },
  watch: {
    id() {
      this.load()
    },
    tab() {
      // Phones: the facts fill the first screen — bring the chosen tab's content into view.
      if (window.innerWidth <= 640) this.$nextTick(() => this.$refs.tabs?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
    },
    form: {
      deep: true,
      handler() {
        // Re-preview while editing (debounced) so the client's view beside the form follows the changes.
        clearTimeout(this.autoTimer)
        if (!this.dirty) {
          this.draftPreview = null
          return
        }
        if (this.tab === 'edit' && this.previewSupported !== false) this.autoTimer = setTimeout(() => this.rePreview({ auto: true }), 900)
      }
    }
  },
  created() {
    this.load()
  },
  mounted() {
    this.lastFocus = document.activeElement
    this.$nextTick(() => this.$refs.panel?.focus({ preventScroll: true }))
    document.documentElement.classList.add('has-sheet-open')
  },
  beforeUnmount() {
    clearTimeout(this.autoTimer)
    document.documentElement.classList.remove('has-sheet-open')
    try {
      this.lastFocus?.focus?.({ preventScroll: true })
    } catch {
      /* the row may be gone */
    }
  },
  methods: {
    kindLabelOf: (it) => kindLabel(it),
    kindIconOf: (it) => kindIcon(it?.kind),
    channelLabelOf: channelLabel,
    channelIconOf: channelIcon,
    statusOf: statusInfo,
    waited: (iso) => waitedFor(iso),
    eventIcon: (a) => EVENT_ICONS[a] || 'fa-regular fa-circle',
    fieldLabel: (k) => FIELD_LABELS[k] || k,
    ph: (n) => '{' + '{' + n + '}' + '}',
    personName: (p) => p?.name || 'someone',
    money: (v, c) => formatCurrency(v, c || undefined),
    when(iso) {
      return whenText(iso, this.tz)
    },
    shortWhen(iso) {
      return whenText(iso, this.tz)
    },
    future(iso) {
      return !!iso && new Date(iso).getTime() > Date.now()
    },
    short(v) {
      if (v === null || v === undefined || v === '') return '(empty)'
      const s = Array.isArray(v) ? v.join(', ') || '(none)' : String(v)
      return s.length > 160 ? s.slice(0, 157) + '…' : s
    },
    async load() {
      this.loadError = ''
      this.draftPreview = null
      this.formError = ''
      this.rejecting = false
      try {
        const it = await outboxApi.get(this.id)
        this.apply(it)
      } catch (e) {
        this.it = null
        this.loadError = apiErrorMessage(e, 'Could not open this message')
      }
    },
    apply(it) {
      clearTimeout(this.autoTimer)
      this.draftPreview = null
      this.it = it
      const wa = it.whatsapp || {}
      const f = {
        to: it.channel === 'email' && it.to ? [String(it.to).toLowerCase()] : [],
        cc: [...(it.cc || [])],
        bcc: [...(it.bcc || [])],
        subject: it.subject || '',
        message: it.message ?? it.sms_text ?? '',
        phone: it.channel !== 'email' ? it.to || '' : '',
        whatsapp_text: wa.text || '',
        whatsapp_params: Array.from({ length: Math.max(wa.param_count || 0, (wa.params || []).length) }, (_, i) => (wa.params || [])[i] || '')
      }
      this.original = JSON.parse(JSON.stringify(f))
      this.form = f
      if (this.tab === 'edit' && !(it.can_approve && it.actions?.edit)) this.tab = 'preview'
    },
    resetForm() {
      if (this.original) this.form = JSON.parse(JSON.stringify(this.original))
      this.formError = ''
      this.draftPreview = null
    },
    openEdit() {
      this.tab = 'edit'
    },
    validate() {
      const it = this.it
      const e = this.edits
      if (it.channel === 'email') {
        if ('to' in e && !e.to) return 'Add the address this should go to.'
        if ('subject' in e && !e.subject.trim()) return 'Add a subject.'
      } else if ('to' in e && !e.to) return 'Add the number this should go to.'
      if (e.whatsapp_params && e.whatsapp_params.some((p) => !String(p).trim())) return 'Fill in every blank of the template.'
      return ''
    },
    async rePreview({ auto = false } = {}) {
      const problem = this.validate()
      if (auto && (problem || this.previewSupported === false || !this.dirty)) return
      this.formError = problem
      if (problem) return
      const id = this.id
      const edits = this.edits
      this.previewing = true
      try {
        const r = await outboxApi.preview(id, edits)
        if (id !== this.id) return
        if (r === null) {
          this.previewSupported = false
          if (auto) return
          // No preview-without-saving on this server: save, then the preview is rebuilt from the saved text.
          await this.save({ quiet: true })
          toast.info('Saved — the preview shows the new version.')
        } else {
          this.previewSupported = true
          if (this.dirty) this.draftPreview = r.preview || r
        }
      } catch (e) {
        if (!auto) this.formError = apiErrorMessage(e, 'Could not preview the changes')
      } finally {
        this.previewing = false
      }
    },
    /** "Preview changes": build it, and on narrow screens (no preview beside the form) show the client's view. */
    async previewClick() {
      await this.rePreview()
      if (!this.formError && window.innerWidth <= 1100) this.tab = 'preview'
    },
    async save(opts = {}) {
      if (!this.dirty) return true
      this.formError = this.validate()
      if (this.formError) {
        this.tab = 'edit'
        return false
      }
      this.busy = 'save'
      try {
        const it = await outboxApi.update(this.id, this.edits)
        this.apply(it)
        if (!opts.quiet) toast.success(it.status === 'pending' ? 'Saved — still waiting for approval' : 'Saved')
        this.$emit('changed', it)
        return true
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not save the changes')
        this.tab = 'edit'
        return false
      } finally {
        this.busy = ''
      }
    },
    async approve(when) {
      if (this.busy) return
      const edits = this.edits
      if (this.dirty) {
        this.formError = this.validate()
        if (this.formError) return (this.tab = 'edit')
      }
      this.busy = when
      try {
        const res = await outboxApi.approve(this.id, { when, ...(this.dirty ? { edits } : {}) })
        if (res?.item) this.apply(res.item)
        this.afterDecision(res?.outcome, res?.message, res?.item)
      } catch (e) {
        const code = e?.response?.data?.error?.code
        const msg = apiErrorMessage(e, 'Could not approve it')
        if (code === 'SEND_FAILED' || code === 'NOT_PENDING' || code === 'BUSY') await this.load()
        if (code === 'VALIDATION_ERROR' || code === 'NOT_EDITABLE') {
          this.formError = msg
          this.tab = 'edit'
        } else toast.error(msg, { title: code === 'SEND_FAILED' ? 'Not sent' : '' })
        this.$emit('changed', this.it)
        refreshOutboxCounts()
      } finally {
        this.busy = ''
      }
    },
    async retry() {
      if (this.busy) return
      this.busy = 'retry'
      try {
        const res = await outboxApi.retry(this.id)
        if (res?.item) this.apply(res.item)
        this.afterDecision(res?.outcome, res?.message, res?.item)
      } catch (e) {
        await this.load()
        toast.error(apiErrorMessage(e, 'It still couldn’t be sent'), { title: 'Not sent' })
        this.$emit('changed', this.it)
      } finally {
        this.busy = ''
      }
    },
    afterDecision(outcome, message, item) {
      const who = item?.to_name || item?.to || ''
      // Short toasts: on phones they sit over the drawer's buttons while the owner moves on to the next message.
      if (outcome === 'sent') toast.success(message || `Sent to ${who}`, { duration: 3500 })
      else if (outcome === 'approved') toast.success(message || `Approved — it goes ${this.when(item?.send_at)}`, { duration: 3500 })
      else if (outcome === 'superseded') toast.info(message || 'Not sent — it isn’t needed any more', { title: 'Not needed any more' })
      else if (outcome === 'failed') toast.error(message || item?.error || 'It couldn’t be sent', { title: 'Not sent' })
      this.$emit('changed', item)
      refreshOutboxCounts()
      if (outcome === 'sent' || outcome === 'approved' || outcome === 'superseded') this.moveOnAfterDecision()
    },
    /** After a decision, go on to the next item of the list (the owner works through the queue), or close. */
    moveOnAfterDecision() {
      const next = this.ids[this.pos + 1] || this.ids[this.pos - 1]
      if (next && next !== this.id) this.$emit('move', next, { after: true })
    },
    async filterCustomer() {
      if (!(await this.confirmLeave())) return
      this.$emit('filter-customer', this.it.customer)
    },
    openReject() {
      this.rejectNote = ''
      this.rejecting = true
      this.$nextTick(() => this.$refs.note?.focus())
    },
    async reject() {
      this.busy = 'reject'
      try {
        const res = await outboxApi.reject(this.id, this.rejectNote.trim())
        if (res?.item) this.apply(res.item)
        this.rejecting = false
        toast.success(`Rejected — nothing was sent${this.it?.to_name || this.it?.to ? ' to ' + (this.it.to_name || this.it.to) : ''}`, { duration: 3500 })
        this.$emit('changed', this.it)
        refreshOutboxCounts()
        this.moveOnAfterDecision()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not reject it'))
        if (e?.response?.data?.error?.code === 'NOT_PENDING') {
          this.rejecting = false
          this.load()
        }
      } finally {
        this.busy = ''
      }
    },
    async viewFile(att) {
      const w = window.open('', '_blank')
      try {
        const blob = await outboxApi.file(att.url)
        const type = att.kind === 'ics' ? 'text/calendar' : 'application/pdf'
        const url = URL.createObjectURL(new Blob([blob], { type }))
        if (w) w.location.href = url
        else window.location.assign(url)
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } catch (e) {
        if (w) w.close()
        toast.error(apiErrorMessage(e, 'Could not open the attachment'))
      }
    },
    async confirmLeave() {
      if (!this.dirty) return true
      return confirmDialog({ title: 'Discard your changes?', message: 'The changes to this message are not saved yet.', confirmText: 'Discard changes', danger: true })
    },
    async close() {
      if (this.busy || this.rejecting) return
      if (!(await this.confirmLeave())) return
      this.$emit('close')
    },
    async move(step) {
      const next = this.ids[this.pos + step]
      if (!next) return
      if (!(await this.confirmLeave())) return
      this.$emit('move', next)
    },
    onKey(e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      if (e.key === 'Escape') {
        if (this.rejecting) return
        e.preventDefault()
        this.close()
        return
      }
      if (typing) return
      if (e.key === 'j') {
        e.preventDefault()
        this.move(1)
      } else if (e.key === 'k') {
        e.preventDefault()
        this.move(-1)
      } else if (e.key === 'e' && this.canEdit) {
        e.preventDefault()
        this.tab = 'edit'
      } else if (e.key === 'p') {
        e.preventDefault()
        this.tab = 'preview'
      }
    }
  }
}
</script>

<style scoped>
.obr-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  justify-content: flex-end;
}
.obr {
  position: relative;
  width: min(1040px, 100vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  outline: none;
  animation: obrslide 0.18s ease-out;
}
@keyframes obrslide {
  from {
    transform: translateX(24px);
    opacity: 0.6;
  }
}
@media (prefers-reduced-motion: reduce) {
  .obr {
    animation: none;
  }
}
.min0 {
  min-width: 0;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.obr__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--border);
  padding-top: max(14px, env(safe-area-inset-top));
}
.obr__eyebrow i {
  margin-right: 2px;
}
.obr__head h2 {
  margin: 4px 0 8px;
  font-size: 19px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.obr__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.obr__head-btns {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  flex: none;
}
.obr__pos {
  align-self: center;
  margin-right: 4px;
  white-space: nowrap;
}
.obr__body {
  flex: 1;
  overflow: auto;
  padding: 16px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overscroll-behavior: contain;
}
.obr__body > * {
  flex-shrink: 0;
}
.obr__sk {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.obr-facts {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
  font-size: 13.5px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.obr-facts > div {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
}
.obr-facts dt {
  color: var(--text-3);
}
.obr-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.obr-tabs {
  align-self: flex-start;
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
.obr-cust {
  margin-left: 6px;
  font-size: 12.5px;
}
.obr-tabs .ui-tab i {
  font-size: 12px;
}
.count.dirty {
  background: var(--warning-soft);
  color: var(--warning);
  font-weight: 800;
}
.obr-edit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.obr-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.obr-form__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.obr-params {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
}
.obr-params legend {
  font-size: 13px;
  font-weight: 600;
  padding: 0 4px;
  width: auto;
  float: none;
  margin: 0;
}
code {
  font-size: 12px;
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--text);
}
.obr-side-preview {
  position: sticky;
  top: 0;
  min-width: 0;
}
.obr-tl {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.obr-tl > li {
  display: flex;
  gap: 12px;
  padding: 8px 4px;
  position: relative;
}
.obr-tl > li + li::before {
  content: '';
  position: absolute;
  left: 18px;
  top: -6px;
  height: 14px;
  width: 2px;
  background: var(--border);
}
.obr-tl__dot {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 12px;
}
.ev-sent .obr-tl__dot,
.ev-approved .obr-tl__dot {
  background: var(--success-soft);
  color: var(--success);
  border-color: transparent;
}
.ev-failed .obr-tl__dot,
.ev-rejected .obr-tl__dot {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: transparent;
}
.ev-stale .obr-tl__dot,
.ev-edited .obr-tl__dot {
  background: var(--warning-soft);
  color: var(--warning);
  border-color: transparent;
}
.obr-tl__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 13.5px;
}
.obr-tl__changes {
  list-style: none;
  margin: 4px 0 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
}
.obr-tl__changes li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  overflow-wrap: anywhere;
}
.obr-tl__changes .from {
  color: var(--text-3);
  text-decoration: line-through;
}
.obr-tl__changes i {
  color: var(--text-3);
  font-size: 10px;
}
.obr-tl__note {
  color: var(--text-2);
  font-style: italic;
}
.obr__foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.obr__open {
  margin-right: auto;
}
.obr__wait {
  margin: 0;
  display: flex;
  gap: 8px;
  align-items: center;
}
.obr-reject {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
}
.obr-reject__card {
  width: min(460px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.obr-reject__card h3 {
  margin: 0;
  font-size: 17px;
}
.obr-reject__card p {
  margin: 0;
}
.obr-reject__btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
@media (max-width: 1100px) {
  .obr-edit {
    grid-template-columns: minmax(0, 1fr);
  }
  .obr-side-preview {
    display: none;
  }
}
@media (max-width: 760px) {
  .obr-facts {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .obr {
    border-left: 0;
  }
  .obr__head {
    padding: 12px 14px 10px;
    padding-top: max(12px, env(safe-area-inset-top));
  }
  .obr__head h2 {
    font-size: 17px;
  }
  .obr__body {
    padding: 14px 16px 20px;
  }
  .obr-facts {
    padding: 10px 12px;
    gap: 6px;
    font-size: 13px;
  }
  .obr-facts > div {
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 8px;
  }
  .obr__hbtn,
  .obr__foot .ui-btn,
  .obr-form__btns .ui-btn,
  .obr-reject__btns .ui-btn,
  .obr-tabs .ui-tab {
    min-height: 44px;
    height: auto;
  }
  .obr__hbtn {
    min-width: 44px;
  }
  .obr__pos {
    display: none;
  }
  .obr-tabs {
    align-self: stretch;
    display: flex;
    flex-wrap: nowrap;
  }
  .obr-tabs .ui-tab {
    flex: 1 1 0;
    justify-content: center;
    padding: 0 8px;
  }
  .obr__foot {
    padding: 10px 14px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
  .obr__foot .ui-btn {
    flex: 1 1 calc(50% - 8px);
  }
  .obr__foot [data-testid='review-approve-now'] {
    flex-basis: 100%;
    order: 9;
  }
  .obr__open {
    margin-right: 0;
  }
  .obr-form__btns .ui-btn {
    flex: 1 1 auto;
  }
}
</style>
