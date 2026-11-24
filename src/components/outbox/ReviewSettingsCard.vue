<template>
  <!-- Settings → Review before sending (v2.19, pkg/outbox): on/off, admins can send at once, update emails, stale after N days. -->
  <div class="rsc" data-testid="review-settings">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="!form" class="ui-skeleton" style="height: 120px"></div>
    <template v-else>
      <p v-if="!canEdit" class="ui-hint rsc__ro"><i class="fa-solid fa-lock"></i> Only owners and admins can change these.</p>
      <fieldset :disabled="!canEdit || saving" class="plain">
        <label class="toggle">
          <span>
            <strong>Review client messages before they go out</strong>
            <small v-if="form.enabled">Invoices, reminders, receipts, statements, notices and messages to clients wait in <router-link to="/outbox">Pending review</router-link> until an owner or admin approves them. Sign-in emails, your team’s emails and digests are never held.</small>
            <small v-else>Off — client messages go out straight away, as before.<template v-if="s.waiting"> {{ s.waiting }} still {{ s.waiting === 1 ? 'waits' : 'wait' }} in Pending review for a decision.</template></small>
          </span>
          <span class="ui-switch"><input :checked="form.enabled" type="checkbox" aria-label="Review client messages before they go out" data-testid="rs-enabled" @change="toggleEnabled($event)" /></span>
        </label>

        <template v-if="form.enabled">
          <label class="toggle">
            <span>
              <strong>Admins can send at once</strong>
              <small>Owners and admins see “Send now — I’ve reviewed it” in Send dialogs, for a message they have just checked themselves. Staff messages always wait.</small>
            </span>
            <span class="ui-switch"><input v-model="form.admins_can_send_now" type="checkbox" aria-label="Admins can send at once" data-testid="rs-send-now" @change="save('admins_can_send_now')" /></span>
          </label>

          <div class="rsc__group">
            <h3>Update emails to reviewers</h3>
            <label class="toggle">
              <span>
                <strong>Soon after messages start waiting</strong>
                <small>About {{ s.soon_after_minutes || 15 }} minutes after the first new message (so a batch is one email), at most one an hour.</small>
              </span>
              <span class="ui-switch"><input v-model="form.soon_after" type="checkbox" aria-label="Email reviewers soon after messages start waiting" data-testid="rs-soon" @change="save('soon_after')" /></span>
            </label>
            <div class="toggle">
              <span>
                <strong>Daily summary</strong>
                <small>Everything still waiting, oldest first, with stale and time-sensitive messages highlighted — only on days something waits.</small>
              </span>
              <span class="rsc__daily">
                <input v-if="form.daily" v-model="form.daily_time" type="time" step="300" class="ui-input rsc__time" aria-label="Daily summary time" data-testid="rs-daily-time" @change="save('daily_time')" />
                <span class="ui-switch"><input v-model="form.daily" type="checkbox" aria-label="Daily summary email" data-testid="rs-daily" @change="save('daily')" /></span>
              </span>
            </div>
            <p v-if="form.daily" class="ui-hint rsc__tz">Sent at {{ form.daily_time }}, {{ zone }} time.</p>
            <p class="ui-hint rsc__who" data-testid="rs-recipients">
              <i class="fa-regular fa-envelope"></i>
              <template v-if="(s.recipients || []).length">Update emails go to {{ recipientsText }}.</template>
              <template v-else>Nobody gets these emails at the moment.</template>
              <router-link :to="{ path: '/settings', hash: '#who-gets-emails' }" data-testid="rs-who-link">Choose who gets these emails →</router-link>
            </p>
          </div>

          <div class="rsc__row">
            <span>
              <strong>Mark dated messages stale after</strong>
              <small>Payment reminders, overdue and final notices that wait longer are flagged “Stale”, so you can drop them. They still never go without approval.</small>
            </span>
            <span class="rsc__num">
              <input v-model.number="form.stale_days" type="number" min="1" max="60" inputmode="numeric" class="ui-input" aria-label="Stale after how many days" data-testid="rs-stale" @change="save('stale_days')" />
              <span>days</span>
            </span>
          </div>
        </template>
      </fieldset>
      <p v-if="s.source === 'saved' && s.updated_by_name" class="ui-hint rsc__changed">Last changed by {{ s.updated_by_name }}<template v-if="s.updated_at"> on {{ dt(s.updated_at) }}</template>.</p>
    </template>
  </div>
</template>

<script>
import { outboxApi } from '@/services/outbox'
import { ensureOutboxMe, refreshOutboxCounts } from './outboxState'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const LABELS = {
  enabled: (v) => (v ? 'Review before sending is on' : 'Review before sending is off'),
  admins_can_send_now: (v) => (v ? 'Admins can send at once' : 'Every message waits, admins’ too'),
  soon_after: (v) => (v ? 'Soon-after update emails on' : 'Soon-after update emails off'),
  daily: (v) => (v ? 'Daily summary on' : 'Daily summary off'),
  daily_time: (v) => `Daily summary at ${v}`,
  stale_days: (v) => `Stale after ${v} day${v === 1 ? '' : 's'}`
}

export default {
  name: 'ReviewSettingsCard',
  data() {
    return { s: {}, form: null, saving: false, error: '' }
  },
  computed: {
    canEdit() {
      return !!this.s.can_edit
    },
    zone() {
      return (this.s.timezone || '').replace(/_/g, ' ')
    },
    recipientsText() {
      const r = this.s.recipients || []
      const names = r.map((x) => x.name || x.email)
      if (names.length <= 3) return names.join(', ').replace(/, ([^,]*)$/, ' and $1')
      return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
    }
  },
  created() {
    this.load()
  },
  methods: {
    dt: formatDateTime,
    async load() {
      this.error = ''
      try {
        this.apply(await outboxApi.settings())
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the review settings')
      }
    },
    apply(s) {
      this.s = s || {}
      this.form = {
        enabled: s.enabled !== false,
        admins_can_send_now: s.admins_can_send_now !== false,
        soon_after: s.soon_after !== false,
        daily: s.daily !== false,
        daily_time: s.daily_time || '07:30',
        stale_days: s.stale_days || 7
      }
    },
    async toggleEnabled(ev) {
      const on = ev.target.checked
      if (!on) {
        const waiting = this.s.waiting || 0
        const ok = await confirmDialog({
          title: 'Stop reviewing client messages?',
          message: `New invoices, reminders, receipts and messages will go to clients straight away, without anyone checking them.${waiting ? ` The ${waiting} already waiting stay in Pending review until you approve or reject them.` : ''}`,
          confirmText: 'Turn review off',
          danger: true
        })
        if (!ok) {
          ev.target.checked = true
          return
        }
      }
      this.form.enabled = on
      await this.save('enabled')
    },
    async save(key) {
      const f = this.form
      if (key === 'stale_days') {
        const n = Math.round(Number(f.stale_days))
        if (!(n >= 1 && n <= 60)) {
          toast.error('Choose between 1 and 60 days.')
          f.stale_days = this.s.stale_days || 7
          return
        }
        f.stale_days = n
      }
      if (key === 'daily_time' && !/^\d{2}:\d{2}$/.test(f.daily_time || '')) {
        f.daily_time = this.s.daily_time || '07:30'
        return
      }
      this.saving = true
      try {
        const s = await outboxApi.saveSettings({ [key]: f[key] })
        this.apply(s)
        toast.success(LABELS[key] ? LABELS[key](s[key]) : 'Saved')
        await ensureOutboxMe(true)
        refreshOutboxCounts()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
        this.load()
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.rsc {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.plain {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.toggle,
.rsc__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.rsc__row {
  cursor: default;
}
.toggle > span:first-child,
.rsc__row > span:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.toggle strong,
.rsc__row strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.toggle small,
.rsc__row small {
  font-size: 12.5px;
  color: var(--text-3);
}
.rsc__group {
  margin-top: 10px;
}
.rsc__group h3 {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}
.rsc__daily {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: none;
}
.rsc__time {
  width: 120px;
}
.rsc__tz {
  margin: 6px 0 0;
}
.rsc__who {
  margin: 10px 0 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
}
.rsc__num {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  color: var(--text-2);
}
.rsc__num .ui-input {
  width: 84px;
  text-align: right;
}
.rsc__ro {
  margin: 0 0 6px;
}
.rsc__changed {
  margin: 10px 0 0;
}
@media (max-width: 640px) {
  .rsc__row,
  .toggle {
    min-height: 44px;
  }
  .rsc__row {
    flex-wrap: wrap;
  }
  .rsc__time {
    min-height: 44px;
    width: 110px;
  }
  .rsc__num .ui-input {
    min-height: 44px;
  }
  .rsc__who a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
}
</style>
