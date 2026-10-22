<template>
  <div class="sp" data-testid="settings-panel">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-if="!f" class="ui-skeleton" style="height: 320px"></div>
    <form v-else class="sp__grid" @submit.prevent="save">
      <section class="ui-card">
        <div class="ui-card__head"><h2>Billing</h2></div>
        <div class="ui-card__body">
          <label class="ui-switch"><input v-model="f.enabled" type="checkbox" :disabled="!canEdit" data-testid="st-enabled" /> <span>Create and email subscription invoices automatically</span></label>
          <p class="ui-hint">Invoices are created this many days before the period starts:</p>
          <div class="ui-grid-3">
            <div class="ui-field">
              <label for="st-lm">Monthly</label>
              <input id="st-lm" v-model.number="f.lead_monthly" class="ui-input num" type="number" min="0" max="27" :disabled="!canEdit" data-testid="st-lead-monthly" />
            </div>
            <div class="ui-field">
              <label for="st-lq">Quarterly</label>
              <input id="st-lq" v-model.number="f.lead_quarterly" class="ui-input num" type="number" min="0" max="60" :disabled="!canEdit" />
            </div>
            <div class="ui-field">
              <label for="st-ly">Yearly</label>
              <input id="st-ly" v-model.number="f.lead_yearly" class="ui-input num" type="number" min="0" max="90" :disabled="!canEdit" data-testid="st-lead-yearly" />
            </div>
          </div>
          <label class="ui-switch"><input v-model="f.auto_send" type="checkbox" :disabled="!canEdit" /> <span>New subscriptions email their invoices (with the View / Pay link)</span></label>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="st-send">Send emails from (local time)</label>
              <select id="st-send" v-model.number="f.send_hour" class="ui-select" :disabled="!canEdit">
                <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ hour(h - 1) }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="st-prefix">Number prefix</label>
              <input id="st-prefix" v-model="f.number_prefix" class="ui-input" maxlength="10" :disabled="!canEdit" />
            </div>
          </div>
          <div class="ui-field">
            <label for="st-margin">Suggested price for Synergy sites without a catalogue service (margin on Synergy's cost, %)</label>
            <input id="st-margin" v-model.number="f.target_margin" class="ui-input num" type="number" min="0" max="90" :disabled="!canEdit" />
          </div>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head"><h2>Reminders and suspension</h2></div>
        <div class="ui-card__body">
          <div class="ui-field">
            <label for="st-client">Reminders to the client (days from the due date; negative = before)</label>
            <input id="st-client" v-model="clientText" class="ui-input" :disabled="!canEdit" placeholder="-3, 0, 3" data-testid="st-client" />
          </div>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="st-grace">Suspend (days after the due date)</label>
              <input id="st-grace" v-model.number="f.grace_days" class="ui-input num" type="number" min="0" max="60" :disabled="!canEdit" data-testid="st-grace" />
              <span class="ui-hint">The default grace period; each subscription can have its own.</span>
            </div>
            <div class="ui-field">
              <label for="st-final">Final notice to the client (days before suspension)</label>
              <input id="st-final" v-model.number="f.final_notice_days" class="ui-input num" type="number" min="0" max="14" :disabled="!canEdit" data-testid="st-final" />
            </div>
          </div>
          <div class="ui-field">
            <label for="st-admin">Admin alerts — “call them” (days before suspension)</label>
            <input id="st-admin" v-model="adminText" class="ui-input" :disabled="!canEdit" placeholder="3, 1" data-testid="st-admin" />
            <span class="ui-hint">The first one is at least {{ minNotice }} days before — a suspension waits until you've had {{ minNotice }} days' notice.</span>
          </div>
          <label class="ui-switch"><input v-model="f.auto_suspend" type="checkbox" :disabled="!canEdit" /> <span>New subscriptions suspend automatically when unpaid</span></label>
          <label class="ui-switch"><input v-model="f.use_synergy_api" type="checkbox" :disabled="!canEdit" data-testid="st-api" /> <span>Suspend and unsuspend Synergy Wholesale hosting through the API</span></label>
          <p class="ui-hint" data-testid="st-api-state">
            <i :class="synergyApi ? 'fa-solid fa-plug-circle-check' : 'fa-solid fa-plug-circle-xmark'"></i>
            {{ synergyApi ? 'The Synergy Wholesale API is connected.' : synergyNote || 'The Synergy Wholesale API is not connected.' }}
            Other providers (hosting.com …) get a task with the exact steps.
            <router-link v-if="!synergyApi" to="/expenses?tab=sources">Connect it</router-link>
          </p>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head"><h2>Admin emails</h2></div>
        <div class="ui-card__body">
          <label class="ui-switch"><input v-model="f.digest" type="checkbox" :disabled="!canEdit" /> <span>Daily digest: due soon, overdue, to be suspended, domains to renew</span></label>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="st-dh">Digest at</label>
              <select id="st-dh" v-model.number="f.digest_hour" class="ui-select" :disabled="!canEdit || !f.digest">
                <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ hour(h - 1) }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="st-domains">Domain renewal reminders (days before expiry)</label>
              <input id="st-domains" v-model="domainText" class="ui-input" :disabled="!canEdit" placeholder="30, 14, 7" />
            </div>
          </div>
          <label class="ui-switch"><input v-model="f.in_app" type="checkbox" :disabled="!canEdit" /> <span>Also in the notification bell</span></label>
          <div class="ui-field">
            <label for="st-rcpt">Also email</label>
            <EmailChips id="st-rcpt" v-model="f.recipients" :disabled="!canEdit" placeholder="accounts@your-business.com" />
          </div>
          <div class="who">
            <span class="lbl">Alerts go to</span>
            <span v-if="recipients.length">{{ recipients.join(', ') }}</span>
            <span v-else class="warn">Nobody — no administrator gets client billing emails.</span>
            <router-link to="/settings#who-gets-emails" class="lnk">Who gets emails</router-link>
          </div>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head"><h2>What happens to an unpaid invoice</h2></div>
        <div class="ui-card__body">
          <p class="ui-hint">An invoice due in 14 days, with these settings:</p>
          <ol class="tl" data-testid="st-timeline">
            <li v-for="s in preview" :key="s.key" :class="`tl--${s.kind}`">
              <span class="tl__day">{{ s.offset === 0 ? 'Due' : s.offset > 0 ? `+${s.offset}` : s.offset }}</span>
              <span class="tl__what">{{ s.label }}</span>
              <span class="tl__date">{{ fmtDate(s.date) }}</span>
            </li>
          </ol>
        </div>
      </section>

      <div v-if="canEdit" class="sp__foot">
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" data-testid="st-save"><i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save settings</button>
      </div>
      <p v-else class="ui-hint">Only administrators can change these settings.</p>
    </form>
  </div>
</template>

<script>
import EmailChips from '@/components/invoicing/EmailChips.vue'
import { subscriptionsApi } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate, addDays } from '@/utils/format'

const parseDays = (t) =>
  String(t || '')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n))

export default {
  name: 'SettingsPanel',
  components: { EmailChips },
  emits: ['saved'],
  data() {
    return { f: null, clientText: '', adminText: '', domainText: '', recipients: [], canEdit: false, today: '', minNotice: 3, synergyApi: false, synergyNote: '', saving: false, error: '' }
  },
  computed: {
    /** The same rules as the server (pkg/subscriptions/dunning.go). */
    preview() {
      if (!this.f) return []
      const due = addDays(this.today || new Date().toISOString().slice(0, 10), 14)
      const out = []
      const susp = this.f.auto_suspend ? Math.max(0, Number(this.f.grace_days) || 0) : null
      const fn = susp !== null && Number(this.f.final_notice_days) > 0 ? susp - Number(this.f.final_notice_days) : null
      const finalAt = fn !== null && fn >= 0 && fn < susp ? fn : null
      const seen = new Set()
      for (const d of [...parseDays(this.clientText)].sort((a, b) => a - b)) {
        if (seen.has(d) || (susp !== null && d >= susp) || (finalAt !== null && d >= finalAt)) continue
        seen.add(d)
        out.push({ key: `c${d}`, kind: 'reminder', offset: d, date: addDays(due, d), label: d < 0 ? `Reminder to the client (${-d} day${d === -1 ? '' : 's'} before due)` : d === 0 ? 'Reminder to the client (due today)' : `Reminder to the client (${d} day${d === 1 ? '' : 's'} overdue)` })
      }
      if (susp !== null) {
        const ad = [...new Set(parseDays(this.adminText).filter((n) => n > 0))].sort((a, b) => b - a)
        for (const b of ad) out.push({ key: `a${b}`, kind: 'alert', offset: susp - b, date: addDays(due, susp - b), label: b === 1 ? 'Admin alert: suspended tomorrow — call them' : `Admin alert: suspended in ${b} days — call them` })
        if (finalAt !== null) out.push({ key: 'fn', kind: 'final_notice', offset: finalAt, date: addDays(due, finalAt), label: 'Final notice to the client: service will be suspended' })
        out.push({ key: 'sus', kind: 'suspend', offset: susp, date: addDays(due, susp), label: 'Suspended (at Synergy through the API, or a task for you)' })
      }
      return out.sort((a, b) => a.offset - b.offset)
    }
  },
  created() {
    this.load()
  },
  methods: {
    hour(h) {
      const d = new Date(2026, 0, 1, h)
      return d.toLocaleTimeString([], { hour: 'numeric' })
    },
    fmtDate(d) {
      return formatDate(d, 'short')
    },
    async load() {
      try {
        const r = await subscriptionsApi.settings()
        this.f = { ...r.settings, recipients: [...(r.settings.recipients || [])] }
        this.clientText = (r.settings.client_days || []).join(', ')
        this.adminText = (r.settings.admin_days || []).slice().sort((a, b) => b - a).join(', ')
        this.domainText = (r.settings.domain_days || []).slice().sort((a, b) => b - a).join(', ')
        this.recipients = r.recipients || []
        this.canEdit = !!r.can_edit
        this.today = r.today
        this.minNotice = r.min_notice_days || 3
        this.synergyApi = !!r.synergy_api
        this.synergyNote = r.synergy_api_note || ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the settings')
      }
    },
    async save() {
      this.saving = true
      this.error = ''
      try {
        const f = this.f
        const r = await subscriptionsApi.saveSettings({
          enabled: f.enabled,
          lead_monthly: Number(f.lead_monthly),
          lead_quarterly: Number(f.lead_quarterly),
          lead_yearly: Number(f.lead_yearly),
          auto_send: f.auto_send,
          grace_days: Number(f.grace_days),
          auto_suspend: f.auto_suspend,
          client_days: parseDays(this.clientText),
          final_notice_days: Number(f.final_notice_days),
          admin_days: parseDays(this.adminText),
          digest: f.digest,
          digest_hour: Number(f.digest_hour),
          send_hour: Number(f.send_hour),
          in_app: f.in_app,
          domain_days: parseDays(this.domainText),
          recipients: f.recipients,
          use_synergy_api: f.use_synergy_api,
          target_margin: Number(f.target_margin),
          number_prefix: f.number_prefix
        })
        toast.success('Settings saved')
        this.f = { ...r.settings, recipients: [...(r.settings.recipients || [])] }
        await this.load()
        this.$emit('saved')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the settings')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sp__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.sp__grid .ui-card {
  margin: 0;
}
.sp__foot {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
}
.num {
  font-variant-numeric: tabular-nums;
}
.ui-switch {
  margin: 4px 0 8px;
}
.who {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.who .lbl {
  color: var(--text-3);
}
.who .warn {
  color: var(--warning);
}
.who .lnk {
  margin-left: auto;
}
.tl {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tl li {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 10px;
  padding: 7px 0;
  border-top: 1px solid var(--border);
  font-size: 13.5px;
}
.tl li:first-child {
  border-top: 0;
}
.tl__day {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
}
.tl--alert .tl__day,
.tl--final_notice .tl__day {
  color: var(--warning);
}
.tl--suspend .tl__day,
.tl--suspend .tl__what {
  color: var(--danger);
  font-weight: 600;
}
.tl__date {
  color: var(--text-3);
  white-space: nowrap;
}
@media (max-width: 1000px) {
  .sp__grid {
    grid-template-columns: 1fr;
  }
}
</style>
