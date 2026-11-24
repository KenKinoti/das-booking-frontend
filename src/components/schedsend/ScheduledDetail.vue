<template>
  <div class="drawer-backdrop" @mousedown.self="$emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="ssd-title" data-testid="scheduled-detail">
      <header class="drawer__head">
        <div class="min0">
          <div class="ui-eyebrow"><i :class="kindIcon"></i> {{ kindLabel }}</div>
          <h2 id="ssd-title">{{ m ? m.title : 'Loading…' }}</h2>
          <div v-if="m" class="badges">
            <span class="ui-badge" :class="statusInfo.badge" data-testid="detail-status">{{ statusInfo.label }}</span>
            <span v-if="m.last_result" class="ui-badge" :class="resultInfo(m.last_result).badge" data-testid="detail-result">Last: {{ resultInfo(m.last_result).label }}</span>
            <span v-if="m.marketing" class="ui-badge ui-badge--warning">Marketing</span>
          </div>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div class="drawer__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-else-if="!d" class="pad"><div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 26px; margin-bottom: 12px"></div></div>
        <template v-else>
          <div v-if="actions.length" class="acts" data-testid="detail-actions">
            <button v-for="a in actions" :key="a.key" type="button" class="ui-btn ui-btn--sm" :class="a.cls" :disabled="busy" :data-testid="'act-' + a.key" @click="a.run">
              <i :class="a.icon"></i> {{ a.label }}
            </button>
          </div>

          <dl class="facts">
            <div><dt>To</dt><dd data-testid="detail-to">{{ recipientsText || '—' }}</dd></div>
            <div><dt>Channels</dt><dd><span v-for="c in m.channels" :key="c" class="chan"><i :class="chanIcon(c)"></i> {{ chanLabel(c) }}</span></dd></div>
            <div v-if="m.next_local"><dt>Next send</dt><dd data-testid="detail-next">{{ when(m.next_local) }} <span class="muted">({{ zone(m.timezone) }})</span></dd></div>
            <div><dt>Repeats</dt><dd>{{ d.repeat_text }}<template v-if="m.occurrences"> · {{ m.occurrences }} so far</template></dd></div>
            <div v-if="d.upcoming.length > 1"><dt>Then</dt><dd class="muted">{{ d.upcoming.slice(1).map(when).join(' · ') }}</dd></div>
            <div v-if="m.doc_number"><dt>Document</dt><dd><router-link :to="docLink" @click="$emit('close')">{{ m.doc_number }}</router-link></dd></div>
            <div v-if="m.ended_reason"><dt>Ended</dt><dd>{{ m.ended_reason }}</dd></div>
            <div><dt>Scheduled by</dt><dd>{{ m.created_by_name || '—' }} · {{ dt(m.created_at) }}</dd></div>
            <div v-if="m.reviewed"><dt>Reviewed</dt><dd data-testid="detail-reviewed">{{ m.reviewed_by_name || 'An admin' }}{{ m.reviewed_at ? ' · ' + dt(m.reviewed_at) : '' }} — goes at its time without waiting</dd></div>
            <div v-else-if="waitsForReview"><dt>Review</dt><dd data-testid="detail-review-note">Each send waits in <router-link to="/outbox">Pending review</router-link> until it is approved.</dd></div>
          </dl>

          <section v-if="m.subject || m.body || m.sms_body" class="msg">
            <h3>Message</h3>
            <p v-if="m.subject" class="msg__subj">{{ m.subject }}</p>
            <p v-if="m.body" class="msg__body">{{ m.body }}</p>
            <p v-if="m.sms_body" class="msg__body sms"><i class="fa-solid fa-comment-sms"></i> {{ m.sms_body }}</p>
            <p v-if="m.whatsapp && m.whatsapp.template" class="muted small">WhatsApp template {{ m.whatsapp.template }} for people without an open conversation.</p>
          </section>

          <section class="runs">
            <h3>Results</h3>
            <p v-if="!d.runs.length" class="muted small">Nothing sent yet. Results per person appear here after each send.</p>
            <div v-else class="run-tabs" role="tablist">
              <button v-for="r in d.runs" :key="r.id" type="button" class="run-tab" :class="{ on: d.run && d.run.id === r.id }" role="tab" :data-testid="'run-' + r.status" @click="loadRun(r.id)">
                <span class="ui-badge" :class="resultInfo(r.status).badge">{{ resultInfo(r.status).label }}</span>
                <span>{{ dt(r.finished_at || r.started_at) }}<template v-if="r.manual"> · sent now</template></span>
              </button>
            </div>
            <template v-if="d.run">
              <p class="run-note" data-testid="run-note">{{ d.run.note || '—' }}</p>
              <ul class="dl" data-testid="deliveries">
                <li v-for="x in d.deliveries" :key="x.id" class="dl-item" :data-status="x.status" :data-channel="x.channel">
                  <span class="dl-ico" :class="'s-' + x.status"><i :class="deliveryInfo(x.status).icon"></i></span>
                  <span class="dl-main">
                    <strong>{{ x.name || '—' }}</strong>
                    <small><i :class="chanIcon(x.channel)"></i> {{ x.address || chanLabel(x.channel) }}<template v-if="x.mode"> · {{ x.mode === 'template' ? 'template ' + (x.template || '') : 'free text' }}</template></small>
                    <small v-if="x.reason" class="dl-reason">{{ x.reason }}</small>
                    <router-link v-if="x.status === 'waiting' && x.review_id" :to="{ path: '/outbox', query: { open: x.review_id } }" class="dl-review" data-testid="delivery-review"><i class="fa-solid fa-list-check"></i> Review</router-link>
                  </span>
                  <span class="dl-side">
                    <span class="ui-badge" :class="deliveryInfo(x.status).badge">{{ deliveryInfo(x.status).label }}</span>
                    <small class="muted">{{ dt(x.read_at || x.delivered_at || x.sent_at || x.updated_at) }}</small>
                  </span>
                </li>
              </ul>
              <ul v-if="d.tracking && d.tracking.length" class="trk" data-testid="invoice-tracking">
                <li v-for="t in d.tracking" :key="t.log_id + t.email" :data-email="t.email">
                  <span class="trk-role">{{ t.role.toUpperCase() }}</span>
                  <span class="trk-mail">{{ t.email }}</span>
                  <span class="muted small">{{ t.viewed_at ? 'Viewed ' + dt(t.viewed_at) : t.opened_at ? (t.auto_opened ? 'Opened (automatic) ' : 'Opened ') + dt(t.opened_at) : t.status === 'sent' ? 'Sent' : t.status }}</span>
                </li>
              </ul>
            </template>
          </section>
        </template>
      </div>

      <!-- Send now with Pending review on: the note, and for approvers "Send now — I've reviewed it" -->
      <div v-if="ask" class="ssd-ask" role="dialog" aria-modal="true" aria-labelledby="ssd-ask-title" data-testid="send-now-ask" @keydown.esc.stop="ask = null">
        <div class="ssd-ask__card">
          <h3 id="ssd-ask-title">Send it now?</h3>
          <p class="muted small">{{ ask.text }}</p>
          <OutboxSendNote v-model="ask.sendNow" :thing="'the message'" />
          <div class="ssd-ask__btns">
            <button type="button" class="ui-btn" @click="ask = null">Cancel</button>
            <button type="button" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="send-now-confirm" @click="confirmSendNow"><i :class="ask.sendNow ? 'fa-solid fa-paper-plane' : 'fa-solid fa-inbox'"></i> {{ ask.sendNow ? 'Send now' : 'Prepare for review' }}</button>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script>
import { schedsendApi, KIND_LABELS, KIND_ICONS, CHANNEL_LABELS, CHANNEL_ICONS, RESULT_LABELS, STATUS_LABELS, DELIVERY_LABELS, localLabel, zoneLabel } from '@/services/schedsend'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import OutboxSendNote from '@/components/outbox/OutboxSendNote.vue'
import { outbox, ensureOutboxMe, reviewOn, refreshOutboxCounts, queuedToast } from '@/components/outbox/outboxState'

/** One scheduled message: facts, actions and per-recipient results of each send. */
export default {
  name: 'ScheduledDetail',
  components: { OutboxSendNote },
  props: { id: { type: String, required: true } },
  emits: ['close', 'changed', 'edit'],
  data() {
    return { d: null, recipientsText: '', error: '', busy: false, poll: null, ask: null }
  },
  computed: {
    m() {
      return this.d?.message || null
    },
    kindLabel() {
      if (!this.m) return 'Scheduled message'
      if (this.m.kind === 'invoice' && this.m.doc_type === 'quote') return KIND_LABELS.quote
      return KIND_LABELS[this.m.kind] || 'Message'
    },
    kindIcon() {
      return KIND_ICONS[this.m?.kind] || 'fa-regular fa-clock'
    },
    statusInfo() {
      return STATUS_LABELS[this.m?.status] || { label: this.m?.status, badge: '' }
    },
    /** Pending review (v2.19): client messages wait for approval (team messages never do). */
    waitsForReview() {
      return !!this.m && this.m.kind !== 'team' && reviewOn()
    },
    docLink() {
      return (this.m.doc_type === 'quote' ? '/quotes/' : '/invoices/') + this.m.invoice_id
    },
    actions() {
      const m = this.m
      if (!m) return []
      const a = []
      const live = m.status === 'scheduled' || m.status === 'paused'
      if (live) a.push({ key: 'send-now', label: 'Send now', icon: 'fa-solid fa-paper-plane', cls: 'ui-btn--primary', run: this.sendNow })
      if (live) a.push({ key: 'edit', label: 'Edit', icon: 'fa-regular fa-pen-to-square', run: () => this.$emit('edit', m) })
      if (m.status === 'scheduled') a.push({ key: 'pause', label: 'Pause', icon: 'fa-solid fa-pause', run: () => this.act('pause', 'Paused') })
      if (m.status === 'paused') a.push({ key: 'resume', label: 'Resume', icon: 'fa-solid fa-play', run: () => this.act('resume', 'Resumed') })
      a.push({ key: 'duplicate', label: 'Duplicate', icon: 'fa-regular fa-clone', run: this.duplicate })
      if (live) a.push({ key: 'cancel', label: 'Cancel', icon: 'fa-solid fa-ban', cls: 'danger', run: this.cancel })
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
    ensureOutboxMe()
  },
  beforeUnmount() {
    clearTimeout(this.poll)
  },
  methods: {
    when: localLabel,
    zone: zoneLabel,
    dt: formatDateTime,
    chanLabel: (c) => CHANNEL_LABELS[c] || c,
    chanIcon: (c) => CHANNEL_ICONS[c] || 'fa-regular fa-message',
    resultInfo: (s) => RESULT_LABELS[s] || { label: s, badge: '' },
    deliveryInfo: (s) => DELIVERY_LABELS[s] || { label: s, badge: '', icon: 'fa-regular fa-circle' },
    async load(run) {
      try {
        const r = await schedsendApi.get(this.id, run || this.d?.run?.id)
        this.d = r.detail
        this.recipientsText = r.recipients_text
        this.error = ''
        clearTimeout(this.poll)
        const busy = this.m.status === 'running' || (this.d.run && this.d.run.status === 'sending')
        if (busy) this.poll = setTimeout(() => this.load(), 2000)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load it')
      }
    },
    loadRun(id) {
      this.load(id)
    },
    async act(action, msg, body) {
      this.busy = true
      try {
        const r = await schedsendApi.act(this.id, action, body)
        if (action === 'send-now' && this.waitsForReview && !body?.send_now) {
          queuedToast(r?.review || null, { text: `The messages for “${this.m.title || 'this schedule'}” are in Pending review. Nothing has been sent yet.` })
        } else toast.success(msg)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'That did not work'))
      } finally {
        this.busy = false
      }
    },
    async sendNow() {
      const repeat = this.m.repeat && this.m.repeat.freq !== 'none'
      const text = repeat ? 'It is sent once now; the schedule stays as it is.' : 'It is sent now instead of at the scheduled time.'
      if (this.waitsForReview) {
        // Pending review: the messages wait for approval unless an approver ticks "Send now — I've reviewed it".
        this.ask = { text, sendNow: false }
        return
      }
      const ok = await confirmDialog({ title: 'Send it now?', message: text, confirmText: 'Send now' })
      if (!ok) return
      this.d = { ...this.d, run: null }
      await this.act('send-now', 'Sending now…')
    },
    async confirmSendNow() {
      const sendNow = !!(this.ask?.sendNow && outbox.me?.can_send_now)
      this.ask = null
      this.d = { ...this.d, run: null }
      await this.act('send-now', 'Sending now…', { send_now: sendNow })
      refreshOutboxCounts()
    },
    async cancel() {
      const ok = await confirmDialog({ title: 'Cancel this scheduled send?', message: 'Nothing more is sent. You can duplicate it later.', confirmText: 'Cancel send', danger: true })
      if (ok) await this.act('cancel', 'Cancelled')
    },
    async duplicate() {
      this.busy = true
      try {
        const r = await schedsendApi.act(this.id, 'duplicate')
        toast.success('Copied — check it and resume it when it is ready')
        this.$emit('changed')
        this.$emit('edit', r.message)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not duplicate it'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: min(640px, 100vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: ssdslide 0.18s ease-out;
}
@keyframes ssdslide {
  from {
    transform: translateX(24px);
    opacity: 0.6;
  }
}
@media (prefers-reduced-motion: reduce) {
  .drawer {
    animation: none;
  }
}
.drawer__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}
.drawer__head h2 {
  margin: 2px 0 6px;
  font-size: 19px;
  overflow-wrap: anywhere;
}
.drawer__body {
  flex: 1;
  overflow: auto;
  padding: 16px 18px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.acts .danger {
  color: var(--danger);
}
.facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13.5px;
}
.facts > div {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 10px;
}
.facts dt {
  color: var(--text-3);
}
.facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.chan {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  margin-right: 10px;
}
h3 {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.msg__subj {
  margin: 0 0 6px;
  font-weight: 600;
}
.msg__body {
  margin: 0 0 8px;
  white-space: pre-wrap;
  font-size: 13.5px;
  color: var(--text-2);
  padding: 10px 12px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  overflow-wrap: anywhere;
}
.run-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.run-tab {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}
.run-tab.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.run-note {
  margin: 10px 0;
  font-size: 13px;
  color: var(--text-2);
}
.dl,
.trk {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.dl-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
}
.dl-item + .dl-item,
.trk li + li {
  border-top: 1px solid var(--border);
}
.dl-ico {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 12px;
}
.dl-ico.s-sent,
.dl-ico.s-delivered,
.dl-ico.s-read {
  background: var(--success-soft);
  color: var(--success);
}
.dl-ico.s-failed {
  background: var(--danger-soft);
  color: var(--danger);
}
.dl-ico.s-retry {
  background: var(--warning-soft);
  color: var(--warning);
}
.dl-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dl-main small {
  color: var(--text-3);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.dl-main .dl-reason {
  color: var(--text-2);
}
.dl-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex: none;
}
.trk {
  margin-top: 10px;
}
.trk li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
}
.trk-role {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-3);
}
.trk-mail {
  overflow-wrap: anywhere;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
}
.min0 {
  min-width: 0;
}
.pad {
  padding: 4px 0;
}
.dl-review {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  margin-top: 2px;
}
.drawer {
  position: relative;
}
.ssd-ask {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
}
.ssd-ask__card {
  width: min(480px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ssd-ask__card h3 {
  margin: 0;
  font-size: 17px;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text);
  padding: 0;
}
.ssd-ask__card p {
  margin: 0;
}
.ssd-ask__btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
@media (max-width: 520px) {
  .ssd-ask__btns .ui-btn,
  .dl-review {
    min-height: 44px;
  }
  .facts > div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .dl-item {
    flex-wrap: wrap;
  }
  .dl-side {
    flex-direction: row;
    align-items: center;
    width: 100%;
    padding-left: 38px;
    justify-content: space-between;
  }
}
</style>
