<template>
  <div class="upc" data-testid="upcoming-tab">
    <div class="toolbar">
      <div class="ui-tabs" role="tablist" aria-label="Window">
        <button v-for="d in [30, 60, 90]" :key="d" type="button" class="ui-tab" :class="{ 'is-active': days === d }" role="tab" :aria-selected="days === d" @click="setDays(d)">{{ d }} days</button>
      </div>
      <div class="toolbar__right">
        <router-link to="/settings#bill-reminders" class="ui-btn ui-btn--ghost ui-btn--sm"><i class="fa-regular fa-bell"></i> Reminder settings</router-link>
        <button type="button" class="ui-btn ui-btn--sm" :disabled="running" data-testid="run-now" title="Create due bills and send due reminders now" @click="runNow">
          <i :class="running ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-play'"></i> Run now
        </button>
      </div>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>
    <div v-else-if="!data" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
    <template v-else>
      <div class="stats">
        <div class="stat" :class="{ danger: data.totals.overdue > 0 }">
          <span>Overdue</span><strong>{{ money(data.totals.overdue) }}</strong><small>{{ data.totals.overdue_count }} bill{{ data.totals.overdue_count === 1 ? '' : 's' }}</small>
        </div>
        <div class="stat"><span>Next 30 days</span><strong>{{ money(data.totals.next_30) }}</strong><small>incl. overdue</small></div>
        <div class="stat"><span>Next {{ days }} days</span><strong data-testid="upcoming-window-total">{{ money(data.totals.window) }}</strong><small>{{ data.totals.open_count }} to pay</small></div>
        <div class="months" aria-label="Totals per month">
          <div v-for="m in data.months" :key="m.month" class="month">
            <span class="month__label">{{ monthLabel(m.month) }}</span>
            <span class="month__bar"><span :style="{ width: barWidth(m.total) }"></span></span>
            <strong class="month__amt">{{ money(m.total) }}</strong>
          </div>
          <p v-if="!data.months.length" class="muted small">Nothing due in the next {{ days }} days.</p>
        </div>
      </div>

      <div class="strip" role="list" aria-label="Calendar — next 30 days">
        <button
          v-for="d in strip"
          :key="d.iso"
          type="button"
          role="listitem"
          class="day"
          :class="{ 'is-today': d.today, 'is-selected': day === d.iso, 'has-items': d.count, 'is-weekend': d.weekend, danger: d.overdue }"
          :aria-label="`${d.label}: ${d.count} bill${d.count === 1 ? '' : 's'}`"
          @click="day = day === d.iso ? '' : d.iso"
        >
          <span class="day__wd">{{ d.wd }}</span>
          <span class="day__n">{{ d.n }}</span>
          <span v-if="d.count" class="day__dot">{{ d.count }}</span>
        </button>
      </div>
      <div v-if="day" class="filter-chip">
        <span><i class="fa-regular fa-calendar"></i> Due {{ fmtDate(day) }}</span>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="day = ''">Show all</button>
      </div>

      <div v-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-regular fa-calendar-check"></i></div>
        <h3>{{ day ? 'Nothing due that day' : 'Nothing coming up' }}</h3>
        <p>Recurring bills and unpaid supplier bills due in the next {{ days }} days show here.</p>
      </div>
      <ul v-else class="list" data-testid="upcoming-list">
        <li v-for="it in rows" :key="it.key" class="upc-row" :class="`st-${it.status}`" :data-testid="`upcoming-${it.period || it.bill_id}`">
          <div class="when">
            <span class="when__d">{{ dayNum(it.due_date) }}</span>
            <span class="when__m">{{ monthShort(it.due_date) }}</span>
          </div>
          <div class="what">
            <div class="what__title">
              <strong>{{ it.recurring_name || it.vendor }}</strong>
              <span class="ui-badge" :class="`ui-badge--${statusOf(it).badge}`">{{ statusOf(it).label }}</span>
              <span v-if="it.estimate" class="ui-badge ui-badge--warning">Estimate</span>
              <span v-if="it.auto_pay" class="tag" title="Paid automatically by card / direct debit"><i class="fa-regular fa-credit-card"></i> Auto-pay</span>
              <span v-if="it.recurring_id" class="tag" title="Recurring bill"><i class="fa-solid fa-repeat"></i></span>
            </div>
            <div class="what__sub">
              <span>{{ it.recurring_name ? it.vendor : it.name }}</span>
              <span v-if="it.bill_number" class="mono">{{ it.bill_number }}</span>
              <span v-if="it.service || it.synergy_domain">{{ [it.service, it.synergy_domain].filter(Boolean).join(' · ') }}</span>
              <span :class="{ 'txt-danger': it.days_until_due < 0 && open(it) }">{{ dueText(it) }}</span>
              <span v-if="it.snoozed_until" class="muted"><i class="fa-regular fa-bell-slash"></i> snoozed to {{ fmtDate(it.snoozed_until) }}</span>
              <span v-else-if="it.last_reminder" class="muted"><i class="fa-regular fa-envelope"></i> reminded {{ stage(it.last_reminder) }}</span>
            </div>
          </div>
          <div class="amt">
            <strong>{{ it.status === 'paid' || it.status === 'skipped' ? money(it.total) : money(it.amount) }}</strong>
            <small v-if="it.original_currency && it.original_currency !== data.currency">{{ fmtMoney(it.original_amount, it.original_currency) }}</small>
          </div>
          <div class="acts">
            <template v-if="open(it)">
              <button type="button" class="ui-btn ui-btn--sm ui-btn--success" :disabled="busy === it.key" data-testid="mark-paid" @click="markPaid(it)">
                <i :class="busy === it.key ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Mark paid
              </button>
              <select class="ui-select ui-select--sm more" :aria-label="`More actions for ${it.recurring_name || it.vendor}`" value="" @change="more(it, $event)">
                <option value="" disabled>More…</option>
                <option v-if="it.bill_id" value="view">View bill</option>
                <option v-if="it.recurring_id && !hasPayments(it)" value="skip">Skip this one</option>
                <option value="snooze3">Snooze reminders 3 days</option>
                <option value="snooze7">Snooze reminders 7 days</option>
              </select>
            </template>
            <template v-else-if="it.status === 'skipped'">
              <button type="button" class="ui-btn ui-btn--sm" :disabled="busy === it.key" @click="unskip(it)"><i class="fa-solid fa-rotate-left"></i> Restore</button>
            </template>
            <template v-else-if="it.status === 'projected'">
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy === it.key" data-testid="mark-paid" @click="markPaid(it)"><i class="fa-solid fa-check"></i> Mark paid</button>
              <select class="ui-select ui-select--sm more" :aria-label="`More actions for ${it.recurring_name}`" value="" @change="more(it, $event)">
                <option value="" disabled>More…</option>
                <option value="create">Create the bill now</option>
                <option value="skip">Skip this one</option>
              </select>
            </template>
            <button v-else-if="it.bill_id" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="$emit('open-bill', it.bill_id)">View</button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script>
import { recurringApi, UPCOMING_STATUS, stageLabel } from '@/services/recurringBills'
import { financeApi } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, isoDate, addDays } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'UpcomingTab',
  props: {
    currency: { type: String, required: true },
    refreshKey: { type: Number, default: 0 }
  },
  emits: ['pay', 'open-bill', 'edit-bill', 'changed'],
  data() {
    return { data: null, error: '', days: 90, day: '', running: false, busy: '' }
  },
  computed: {
    rows() {
      const list = this.data?.items || []
      return this.day ? list.filter((i) => i.due_date === this.day) : list
    },
    strip() {
      const out = []
      const today = this.data?.today || isoDate() // the organisation's date
      const by = {}
      for (const it of this.data?.items || []) {
        if (!this.open(it) && it.status !== 'projected') continue
        const k = it.due_date < today ? today : it.due_date
        by[k] = by[k] || { count: 0, overdue: false }
        by[k].count++
        if (it.due_date < today) by[k].overdue = true
      }
      for (let i = 0; i < 30; i++) {
        const iso = addDays(today, i)
        const d = new Date(`${iso}T00:00:00`)
        out.push({
          iso,
          n: d.getDate(),
          wd: d.toLocaleDateString(undefined, { weekday: 'short' }),
          label: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
          weekend: d.getDay() === 0 || d.getDay() === 6,
          today: i === 0,
          count: by[iso]?.count || 0,
          overdue: !!by[iso]?.overdue
        })
      }
      return out
    },
    maxMonth() {
      return Math.max(1, ...(this.data?.months || []).map((m) => m.total))
    }
  },
  watch: {
    refreshKey() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    fmtMoney: formatMoney,
    fmtDate: formatDate,
    stage: stageLabel,
    statusOf(it) {
      return UPCOMING_STATUS[it.status] || { label: it.status, badge: 'draft' }
    },
    open(it) {
      return ['draft', 'unpaid', 'partial', 'overdue', 'awaiting'].includes(it.status)
    },
    hasPayments(it) {
      return it.status === 'partial'
    },
    dayNum(iso) {
      return Number(String(iso).slice(8, 10))
    },
    monthShort(iso) {
      return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })
    },
    monthLabel(m) {
      return new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    },
    barWidth(v) {
      return `${Math.max(4, Math.round((v / this.maxMonth) * 100))}%`
    },
    dueText(it) {
      const d = it.days_until_due
      if (it.status === 'paid') return `paid · was due ${formatDate(it.due_date)}`
      if (it.status === 'skipped') return 'skipped'
      if (d === 0) return 'due today'
      if (d === 1) return 'due tomorrow'
      if (d > 1) return `due in ${d} days`
      return `${-d} day${d === -1 ? '' : 's'} overdue`
    },
    setDays(d) {
      this.days = d
      this.load()
    },
    async load() {
      this.error = ''
      try {
        this.data = await recurringApi.upcoming(this.days)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load upcoming bills')
      }
    },
    async runNow() {
      this.running = true
      try {
        const r = await recurringApi.run()
        const parts = []
        if (r.generated?.created) parts.push(`${r.generated.created} bill${r.generated.created === 1 ? '' : 's'} created`)
        if (r.generated?.matched) parts.push(`${r.generated.matched} matched`)
        parts.push(`${r.reminders_sent} reminder${r.reminders_sent === 1 ? '' : 's'} sent`)
        if (r.reminders_failed) parts.push(`${r.reminders_failed} failed`)
        ;(r.reminders_failed ? toast.warning : toast.success)(parts.join(' · '))
        if (r.errors?.length && r.reminders_failed) toast.error(r.errors[0])
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not run the scheduler'))
      } finally {
        this.running = false
      }
    },
    async billFor(it) {
      if (it.bill_id) return financeApi.bill(it.bill_id)
      return recurringApi.generate(it.recurring_id, it.period)
    },
    async markPaid(it) {
      // A schedule whose invoices come from Expenses: no bill to pay here.
      if (!it.bill_id && it.mode === 'track') {
        const ok = await confirmDialog({
          title: `Mark ${it.recurring_name} as paid?`,
          message: `The ${formatDate(it.due_date)} payment is recorded as paid without a bill — the supplier's invoice still arrives through Expenses. Reminders stop.`,
          confirmText: 'Mark as paid'
        })
        if (!ok) return
        return this.act(it, () => recurringApi.markPaid(it.recurring_id, it.period), 'Marked as paid')
      }
      this.busy = it.key
      try {
        let bill = await this.billFor(it)
        if (bill.status === 'draft') {
          if (it.estimate || (it.recurring_id && bill.notes && bill.notes.includes('Estimated amount'))) {
            toast.info('Confirm the estimated amount, approve the bill, then record the payment.')
            this.$emit('edit-bill', bill)
            return
          }
          const ok = await confirmDialog({ title: `Approve ${bill.bill_number}?`, message: `It's a draft. Approve it for ${this.money(bill.total)} and record the payment?`, confirmText: 'Approve & pay' })
          if (!ok) return
          bill = await financeApi.approveBill(bill.id)
        }
        this.$emit('pay', bill)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not open the bill'))
      } finally {
        this.busy = ''
        this.load()
      }
    },
    async act(it, fn, msg) {
      this.busy = it.key
      try {
        await fn()
        if (msg) toast.success(msg)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Something went wrong'))
      } finally {
        this.busy = ''
      }
    },
    async more(it, ev) {
      const v = ev.target.value
      ev.target.value = ''
      if (v === 'view') return this.$emit('open-bill', it.bill_id)
      if (v === 'create') {
        return this.act(
          it,
          async () => {
            const b = await recurringApi.generate(it.recurring_id, it.period)
            toast.success(`${b.bill_number} created${b.status === 'draft' ? ' as a draft' : ''}`)
          },
          ''
        )
      }
      if (v === 'skip') {
        const ok = await confirmDialog({
          title: 'Skip this bill?',
          message: it.bill_id ? `${it.bill_number} for ${this.money(it.amount)} will be deleted and no reminders sent for ${formatDate(it.due_date)}. The schedule continues.` : `No bill or reminders for ${formatDate(it.due_date)}. The schedule continues with the next one.`,
          confirmText: 'Skip',
          danger: !!it.bill_id
        })
        if (!ok) return
        return this.act(it, () => recurringApi.skip(it.recurring_id, it.period), 'Skipped')
      }
      if (v === 'snooze3' || v === 'snooze7') {
        const days = v === 'snooze3' ? 3 : 7
        const p = it.bill_id ? { bill_id: it.bill_id, days } : { recurring_id: it.recurring_id, period: it.period, days }
        return this.act(it, () => recurringApi.snooze(p), `Reminders snoozed for ${days} days`)
      }
    },
    unskip(it) {
      return this.act(it, () => recurringApi.unskip(it.recurring_id, it.period), 'Restored — it will be created on the next run')
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 160px)) minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  min-width: 0;
}
.stat span {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.stat strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.stat small {
  font-size: 12px;
  color: var(--text-3);
}
.stat.danger strong {
  color: var(--danger);
}
.months {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  min-width: 0;
}
.month {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  font-size: 12.5px;
}
.month__label {
  color: var(--text-2);
}
.month__bar {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
}
.month__bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}
.month__amt {
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
}
.strip {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  scrollbar-width: thin;
}
.day {
  flex: 0 0 auto;
  width: 44px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-sm);
  padding: 6px 0 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: pointer;
  color: var(--text-2);
  font: inherit;
  position: relative;
}
.day.is-weekend {
  background: var(--bg-subtle);
}
.day.is-today {
  border-color: var(--accent);
}
.day.is-selected {
  background: var(--accent-soft);
  border-color: var(--accent);
}
.day__wd {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}
.day__n {
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
}
.day__dot {
  min-width: 18px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
.day.danger .day__dot {
  background: var(--danger);
}
.day:not(.has-items) .day__n {
  color: var(--text-3);
}
.filter-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-2);
  background: var(--info-soft);
  border-bottom: 1px solid var(--border);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.upc-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.upc-row:last-child {
  border-bottom: 0;
}
.upc-row.st-paid,
.upc-row.st-skipped {
  opacity: 0.65;
}
.when {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  padding: 4px 0;
}
.st-overdue .when {
  background: var(--danger-soft);
  color: var(--danger);
}
.when__d {
  font-weight: 700;
  font-size: 17px;
  line-height: 1.1;
}
.when__m {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-3);
}
.what {
  min-width: 0;
}
.what__title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.what__sub {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12.5px;
  color: var(--text-3);
  margin-top: 2px;
}
.tag {
  font-size: 11.5px;
  color: var(--text-3);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.amt {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.amt small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
.acts {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
}
.more {
  width: auto;
  min-width: 92px;
  height: 32px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 13px;
}
.mono {
  font-family: var(--font-mono);
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
  margin: 0;
}
.txt-danger {
  color: var(--danger);
}
@media (max-width: 900px) {
  .stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .months {
    grid-column: 1 / -1;
  }
}
@media (max-width: 640px) {
  .stats {
    grid-template-columns: 1fr 1fr;
  }
  .stat strong {
    font-size: 16px;
  }
  .upc-row {
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 10px;
  }
  .acts {
    grid-column: 2 / -1;
    justify-content: flex-start;
  }
  .more {
    height: 40px;
  }
}
</style>
