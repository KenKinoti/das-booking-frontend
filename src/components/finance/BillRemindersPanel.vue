<template>
  <div class="brp" data-testid="bill-reminders-panel">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="!form" class="ui-skeleton" style="height: 180px"></div>
    <template v-else>
      <div v-if="!emailReady" class="ui-alert ui-alert--warning">
        <i class="fa-solid fa-envelope-circle-check"></i><span>Outgoing email isn't set up yet — reminders appear in the notification bell only until it is (Outgoing email, above).</span>
      </div>
      <fieldset :disabled="!canEdit" class="plain">
        <label class="toggle">
          <span><strong>Bill reminders</strong><small>Email admins before recurring bills are due, on the due date and while overdue — so hosting, domains and subscriptions stay paid and online.</small></span>
          <span class="ui-switch"><input v-model="form.enabled" type="checkbox" aria-label="Bill reminders" data-testid="br-enabled" /></span>
        </label>
        <div class="grid" :class="{ dim: !form.enabled }">
          <label class="ui-field">
            <span class="ui-label">Remind before the due date</span>
            <input v-model="leadText" class="ui-input" placeholder="7, 1" aria-label="Days before the due date" data-testid="br-leads" />
            <span class="ui-hint">Days, comma separated (each bill can override this).</span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Then while overdue, every</span>
            <div class="inline">
              <input v-model.number="form.overdue_every" class="ui-input num" type="number" min="0" max="30" aria-label="Overdue every days" />
              <span class="muted">days, up to</span>
              <input v-model.number="form.overdue_max" class="ui-input num" type="number" min="0" max="10" aria-label="Overdue reminders at most" />
              <span class="muted">times</span>
            </div>
          </label>
          <label class="ui-field">
            <span class="ui-label">Send from</span>
            <select v-model.number="form.send_hour" class="ui-select" aria-label="Send hour">
              <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ hourLabel(h - 1) }}</option>
            </select>
            <span class="ui-hint">{{ tz }} time</span>
          </label>
        </div>
        <label class="toggle">
          <span><strong>On the due date</strong><small>A reminder on the day a bill is due if it's still unpaid.</small></span>
          <span class="ui-switch"><input v-model="form.on_due" type="checkbox" aria-label="Remind on the due date" /></span>
        </label>
        <label class="toggle">
          <span><strong>One-off bills too</strong><small>Also remind about ordinary (non-recurring) unpaid supplier bills.</small></span>
          <span class="ui-switch"><input v-model="form.include_one_off" type="checkbox" aria-label="Remind about one-off bills" /></span>
        </label>
        <label class="toggle">
          <span><strong>Weekly digest</strong><small>Everything due in the next 14 days, overdue bills and low prepaid balances (Synergy runway).</small></span>
          <span class="ui-switch"><input v-model="form.digest" type="checkbox" aria-label="Weekly digest" data-testid="br-digest" /></span>
        </label>
        <div v-if="form.digest" class="grid">
          <label class="ui-field">
            <span class="ui-label">Digest day</span>
            <select v-model.number="form.digest_weekday" class="ui-select" aria-label="Digest day">
              <option v-for="(d, i) in weekdays" :key="d" :value="i">{{ d }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">At</span>
            <select v-model.number="form.digest_hour" class="ui-select" aria-label="Digest hour">
              <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ hourLabel(h - 1) }}</option>
            </select>
          </label>
        </div>
        <label class="toggle">
          <span><strong>In-app notifications</strong><small>Mirror every reminder in the notification bell for admins and managers.</small></span>
          <span class="ui-switch"><input v-model="form.in_app" type="checkbox" aria-label="In-app notifications" /></span>
        </label>

        <h4>Recipients</h4>
        <label class="toggle">
          <span><strong>Organisation admins</strong></span>
          <span class="ui-switch"><input v-model="form.notify_admins" type="checkbox" aria-label="Email organisation admins" /></span>
        </label>
        <label class="toggle">
          <span><strong>Outgoing email “Notification recipients”</strong><small v-if="notifyList.length">{{ notifyList.join(', ') }}</small></span>
          <span class="ui-switch"><input v-model="form.use_notification_recipients" type="checkbox" aria-label="Email the notification recipients" /></span>
        </label>
        <label class="ui-field" style="margin-top: 8px">
          <span class="ui-label">Also send to</span>
          <input v-model="recipientsText" class="ui-input" placeholder="accounts@example.com" aria-label="Extra reminder recipients" data-testid="br-recipients" />
        </label>
        <p class="ui-hint">Currently: {{ preview.length ? preview.join(', ') : 'nobody — add a recipient' }}</p>
      </fieldset>

      <div class="foot">
        <button type="button" class="ui-btn ui-btn--sm" :disabled="sendingDigest || !canEdit" data-testid="br-send-digest" @click="sendDigest">
          <i :class="sendingDigest ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-paper-plane'"></i> Send digest now
        </button>
        <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="saving || !canEdit" data-testid="br-save" @click="save">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save reminders
        </button>
      </div>

      <details v-if="log.length" class="log">
        <summary>Recently sent ({{ log.length }})</summary>
        <ul>
          <li v-for="l in log" :key="l.id">
            <span class="ui-badge" :class="l.status === 'sent' ? 'ui-badge--success' : l.status === 'failed' ? 'ui-badge--danger' : 'ui-badge--draft'">{{ l.status }}</span>
            <span class="log__subj">{{ l.subject || l.kind }}</span>
            <small>{{ fmtDateTime(l.created_at) }}<template v-if="l.error"> · {{ l.error }}</template></small>
          </li>
        </ul>
      </details>
    </template>
  </div>
</template>

<script>
import { recurringApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { ensureEntitlements, hasModule } from '@/composables/useEntitlements'

export default {
  name: 'BillRemindersPanel',
  props: { canEdit: { type: Boolean, default: true } },
  data() {
    return {
      form: null,
      leadText: '',
      recipientsText: '',
      preview: [],
      notifyList: [],
      emailReady: true,
      tz: '',
      log: [],
      saving: false,
      sendingDigest: false,
      error: '',
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }
  },
  async created() {
    // Bill reminders are part of Accounting (the API answers 402 without it).
    await Promise.resolve(ensureEntitlements()).catch(() => {})
    if (!hasModule('accounting')) {
      this.error = 'Bill reminders are part of the Accounting module, which isn’t in your plan.'
      return
    }
    this.load()
  },
  methods: {
    fmtDateTime: formatDateTime,
    hourLabel(h) {
      return `${String(h).padStart(2, '0')}:00`
    },
    apply(d) {
      const s = d.settings
      this.form = { ...s }
      this.leadText = (s.lead_days || []).join(', ')
      this.recipientsText = (s.recipients || []).join(', ')
      this.preview = d.recipients_preview || []
      if (d.notification_recipients) this.notifyList = d.notification_recipients
      if (d.email_ready !== undefined) this.emailReady = d.email_ready
      if (d.timezone) this.tz = d.timezone
    },
    async load() {
      this.error = ''
      try {
        this.apply(await recurringApi.settings())
        this.log = ((await recurringApi.log(20).catch(() => [])) || []).slice(0, 20)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load bill reminder settings')
      }
    },
    async save() {
      const leads = this.leadText
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((x) => parseInt(x, 10))
      if (leads.some((n) => Number.isNaN(n) || n < 1 || n > 60)) {
        toast.error('Reminder days must be numbers from 1 to 60')
        return
      }
      this.saving = true
      try {
        const f = this.form
        this.apply(
          await recurringApi.saveSettings({
            enabled: f.enabled,
            lead_days: leads,
            on_due: f.on_due,
            overdue_every: Number(f.overdue_every) || 0,
            overdue_max: Number(f.overdue_max) || 0,
            include_one_off: f.include_one_off,
            digest: f.digest,
            digest_weekday: f.digest_weekday,
            digest_hour: f.digest_hour,
            send_hour: f.send_hour,
            notify_admins: f.notify_admins,
            use_notification_recipients: f.use_notification_recipients,
            recipients: this.recipientsText.split(/[\s,;]+/).filter(Boolean),
            in_app: f.in_app
          })
        )
        toast.success('Bill reminder settings saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the settings'))
      } finally {
        this.saving = false
      }
    },
    async sendDigest() {
      this.sendingDigest = true
      try {
        await recurringApi.sendDigest()
        toast.success(`Digest sent to ${this.preview.join(', ') || 'the recipients'}`)
        this.log = ((await recurringApi.log(20).catch(() => [])) || []).slice(0, 20)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send the digest'))
      } finally {
        this.sendingDigest = false
      }
    }
  }
}
</script>

<style scoped>
.plain {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.toggle small {
  display: block;
  color: var(--text-3);
  font-size: 13px;
  margin-top: 2px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.grid.dim {
  opacity: 0.6;
}
.inline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.inline .ui-input {
  width: 64px;
}
.muted {
  color: var(--text-3);
  font-size: 13px;
}
.num {
  font-variant-numeric: tabular-nums;
}
h4 {
  margin: 16px 0 6px;
  font-size: 13px;
  color: var(--text-2);
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 4px 0;
  color: var(--text);
  overflow-wrap: anywhere;
}
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.log {
  margin-top: 14px;
  font-size: 13px;
}
.log summary {
  cursor: pointer;
  color: var(--text-2);
  min-height: 40px;
  display: flex;
  align-items: center;
}
.log ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.log li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 8px;
}
.log__subj {
  min-width: 0;
  overflow-wrap: anywhere;
}
.log small {
  color: var(--text-3);
  width: 100%;
}
</style>
