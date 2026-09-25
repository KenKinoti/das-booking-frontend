<template>
  <div>
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <template v-else>
      <GetStarted v-if="o && !allDone" :checklist="o.checklist" @step="onStep" />

      <div class="ui-kpis">
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-arrow-down"></i></span>Money in · {{ monthName }}</div>
          <div class="ui-kpi__value"><span v-if="!o" class="ui-skeleton sk"></span><template v-else>{{ money(tm.income_net) }}</template></div>
          <div class="ui-kpi__meta"><Delta v-if="o" :now="tm.income_net" :prev="lm.income_net" /> vs {{ money(lm.income_net) }} last month{{ taxNote }}</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-danger"><i class="fa-solid fa-arrow-up"></i></span>Money out · {{ monthName }}</div>
          <div class="ui-kpi__value"><span v-if="!o" class="ui-skeleton sk"></span><template v-else>{{ money(tm.expenses_net) }}</template></div>
          <div class="ui-kpi__meta"><Delta v-if="o" :now="tm.expenses_net" :prev="lm.expenses_net" invert /> vs {{ money(lm.expenses_net) }} last month{{ taxNote }}</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label" title="Money in − money out recorded in the cash book only"><span class="ui-kpi__icon"><i class="fa-solid fa-book"></i></span>Cash book profit · {{ monthName }}</div>
          <div class="ui-kpi__value" :class="{ neg: o && tm.profit < 0 }"><span v-if="!o" class="ui-skeleton sk"></span><template v-else>{{ money(tm.profit) }}</template></div>
          <div class="ui-kpi__meta">{{ money(lm.profit) }} last month{{ taxNote }}</div>
        </div>
        <router-link :to="pnlLink" class="ui-kpi kpi-link" data-testid="hub-business-pnl" title="Invoices, POS, events, bills, payroll and the cash book — counted once">
          <div class="ui-kpi__label"><span class="ui-kpi__icon" :class="pnl && pnl.totals.net_profit < 0 ? 'k-danger' : 'k-success'"><i class="fa-solid fa-scale-balanced"></i></span>Business net profit · {{ monthName }}</div>
          <div class="ui-kpi__value" :class="{ neg: pnl && pnl.totals.net_profit < 0 }">
            <span v-if="!pnlLoaded" class="ui-skeleton sk"></span><template v-else-if="pnl">{{ fmtMajor(pnl.totals.net_profit, pnl.currency) }}</template><template v-else>—</template>
          </div>
          <div class="ui-kpi__meta"><template v-if="pnl">{{ fmtMajor(pnl.totals.revenue, pnl.currency) }} revenue − {{ fmtMajor(pnl.totals.total_expenses, pnl.currency) }} expenses · all sources</template><template v-else>Whole-business profit &amp; loss</template></div>
        </router-link>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-wallet"></i></span>Cash position</div>
          <div class="ui-kpi__value" :class="{ neg: o && o.cash_position < 0 }"><span v-if="!o" class="ui-skeleton sk"></span><template v-else>{{ money(o.cash_position) }}</template></div>
          <div class="ui-kpi__meta">
            <template v-if="otherBalances.length">+ {{ otherBalances.map((b) => fmt(b.balance, b.currency)).join(', ') }}</template>
            <template v-else>Opening balance + all money in − out</template>
          </div>
        </div>
        <router-link v-if="inv" to="/invoices?status=unpaid" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-solid fa-file-invoice-dollar"></i></span>Invoices outstanding</div>
          <div class="ui-kpi__value">{{ fmtMajor(inv.outstanding, inv.currency) }}</div>
          <div class="ui-kpi__meta" :class="{ neg: inv.overdue > 0 }">{{ inv.overdue > 0 ? fmtMajor(inv.overdue, inv.currency) + ' overdue' : 'Nothing overdue' }}</div>
        </router-link>
      </div>

      <div class="grid">
        <section class="ui-card">
          <div class="ui-card__head">
            <h2>Last 6 months <small class="muted">cash book{{ o && o.tax_registered ? ' · excl. ' + o.tax_name : '' }}</small></h2>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="$emit('tab', 'reports')">Reports</button>
          </div>
          <div class="ui-card__body">
            <div v-if="!o" class="ui-skeleton" style="height: 240px"></div>
            <div v-else-if="!hasTrend" class="ui-empty small-empty">
              <div class="ui-empty__icon"><i class="fa-solid fa-chart-column"></i></div>
              <h3>No money in or out yet</h3>
              <p>Record a sale or an expense and your trend will appear here.</p>
            </div>
            <TrendChart v-else :months="o.trend" :currency="cur" />
          </div>
        </section>

        <section class="ui-card">
          <div class="ui-card__head">
            <h2>{{ o ? o.tax_name : 'Tax' }} summary</h2>
            <select v-model="taxPeriod" class="ui-select ui-select--sm" aria-label="Tax period" @change="load">
              <option v-for="p in taxPeriods" :key="p.key" :value="p.key">{{ p.label }}</option>
            </select>
          </div>
          <div class="ui-card__body">
            <div v-if="!o" class="ui-skeleton" style="height: 180px"></div>
            <template v-else>
              <div class="muted small">{{ o.tax.period.label }} · {{ date(o.tax.period.from) }} – {{ date(o.tax.period.to) }}</div>
              <dl class="taxlist">
                <div>
                  <dt>{{ o.tax_name }} collected on sales</dt>
                  <dd>{{ money(o.tax.totals.tax_collected) }}</dd>
                </div>
                <div>
                  <dt>{{ o.tax_name }} paid on purchases</dt>
                  <dd>− {{ money(o.tax.totals.tax_paid) }}</dd>
                </div>
                <div class="total">
                  <dt>{{ o.tax.totals.tax_payable >= 0 ? 'Estimated to pay' : 'Estimated refund' }}</dt>
                  <dd>{{ money(Math.abs(o.tax.totals.tax_payable)) }}</dd>
                </div>
              </dl>
              <p v-if="!o.tax_registered" class="ui-hint">
                Not registered for {{ o.tax_name }}? That's fine — leave it off in your
                <a href="#" @click.prevent="$emit('tab', 'profile')">business profile</a>.
              </p>
            </template>
          </div>
        </section>
      </div>

      <div class="grid">
        <section class="ui-card">
          <div class="ui-card__head">
            <h2>Where the money goes <small class="muted">cash book</small></h2>
            <select v-model="topPeriod" class="ui-select ui-select--sm" aria-label="Spending period" @change="load">
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_quarter">This quarter</option>
              <option value="this_fy">This financial year</option>
            </select>
          </div>
          <div class="ui-card__body">
            <div v-if="!o" class="ui-skeleton" style="height: 180px"></div>
            <div v-else-if="!topCats.length" class="ui-empty small-empty">
              <div class="ui-empty__icon"><i class="fa-solid fa-receipt"></i></div>
              <h3>No expenses in this period</h3>
              <p>Your biggest spending categories will show here.</p>
            </div>
            <ul v-else class="bars" role="list">
              <li v-for="c in topCats" :key="c.category_id" class="bars__row" :title="`${c.name}: ${money(c.amount)} (${c.count} ${c.count === 1 ? 'entry' : 'entries'})`">
                <div class="bars__top">
                  <span>{{ c.name }}</span>
                  <strong>{{ money(c.amount) }}</strong>
                </div>
                <div class="bars__track"><div class="bars__fill" :style="{ width: pct(c.amount) }"></div></div>
              </li>
              <li v-if="otherCats" class="bars__more muted small">+ {{ otherCats.count }} more {{ otherCats.count === 1 ? 'category' : 'categories' }} · {{ money(otherCats.amount) }}</li>
            </ul>
          </div>
        </section>

        <section class="ui-card">
          <div class="ui-card__head">
            <h2>Coming up <span v-if="o && o.overdue_reminders" class="ui-badge ui-badge--overdue">{{ o.overdue_reminders }} overdue</span></h2>
            <div class="head-actions">
              <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="$emit('add-reminder')"><i class="fa-solid fa-plus"></i> Add</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="$emit('tab', 'reminders')">All</button>
            </div>
          </div>
          <div v-if="!o" class="ui-card__body"><div class="ui-skeleton" style="height: 160px"></div></div>
          <div v-else-if="!o.reminders.length" class="ui-empty small-empty">
            <div class="ui-empty__icon ok"><i class="fa-regular fa-bell"></i></div>
            <h3>Nothing due in the next 30 days</h3>
            <p>Add reminders for rent, bills and tax deadlines.</p>
          </div>
          <ul v-else class="list">
            <li v-for="r in o.reminders" :key="r.id" class="list__row">
              <button class="tick" :aria-label="`Mark ${r.title} done`" :disabled="busy === r.id" @click="toggle(r)"><i class="fa-regular fa-circle"></i></button>
              <span class="list__main clickable" @click="$emit('edit-reminder', r)">
                <strong>{{ r.title }}</strong>
                <small :class="{ neg: r.overdue }">{{ dueText(r) }}<template v-if="r.recurrence !== 'none'"> · <i class="fa-solid fa-repeat"></i> {{ r.recurrence }}</template></small>
              </span>
              <span v-if="r.amount_minor" class="list__amt">{{ fmt(r.amount_minor, r.currency) }}</span>
            </li>
          </ul>
        </section>
      </div>

      <div class="grid">
        <section class="ui-card">
          <div class="ui-card__head">
            <h2>Recent entries</h2>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="$emit('tab', 'cashbook')">Open cash book</button>
          </div>
          <div v-if="!o" class="ui-card__body"><div class="ui-skeleton" style="height: 160px"></div></div>
          <div v-else-if="!o.recent.length" class="ui-empty small-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-book"></i></div>
            <h3>Your cash book is empty</h3>
            <p>Use <strong>Quick sale</strong> or <strong>Quick expense</strong> to add your first entry.</p>
          </div>
          <ul v-else class="list">
            <li v-for="e in o.recent" :key="e.id">
              <button class="list__row btnrow" @click="$emit('edit', e)">
                <span class="dot" :class="e.type === 'income' ? 'dot-in' : 'dot-out'"><i :class="e.type === 'income' ? 'fa-solid fa-arrow-down' : 'fa-solid fa-arrow-up'"></i></span>
                <span class="list__main">
                  <strong>{{ e.description || e.category_name || (e.type === 'income' ? 'Money in' : 'Money out') }}</strong>
                  <small>{{ date(e.date) }} · {{ e.category_name || 'Uncategorised' }}<template v-if="e.payment_method"> · {{ e.payment_method }}</template></small>
                </span>
                <span class="list__amt" :class="e.type === 'income' ? 'pos' : ''">{{ e.type === 'income' ? '+' : '−' }}{{ fmt(e.amount_minor, e.currency) }}</span>
              </button>
            </li>
          </ul>
        </section>

        <section class="ui-card">
          <div class="ui-card__head"><h2>Customers & suppliers</h2></div>
          <div class="ui-card__body contacts">
            <p class="muted small">Keep your contacts in one place — the same lists are used by invoicing and purchasing.</p>
            <router-link to="/customers" class="contact-link">
              <span class="ui-kpi__icon"><i class="fa-solid fa-user-group"></i></span>
              <span><strong>Customers</strong><small>People and businesses you sell to</small></span>
              <i class="fa-solid fa-chevron-right"></i>
            </router-link>
            <router-link to="/suppliers" class="contact-link">
              <span class="ui-kpi__icon k-info"><i class="fa-solid fa-truck-field"></i></span>
              <span><strong>Suppliers</strong><small>Who you buy stock and services from</small></span>
              <i class="fa-solid fa-chevron-right"></i>
            </router-link>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script>
import { h } from 'vue'
import { smallbizApi, fmtMinor } from '@/services/smallbiz'
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatDate, formatMoney, relativeDays } from '@/utils/format'
import { toast } from '@/composables/useToast'
import TrendChart from '@/components/smallbiz/TrendChart.vue'
import GetStarted from '@/components/smallbiz/GetStarted.vue'
import { fetchPnl, loadBasis } from '@/services/pnl'

const Delta = {
  name: 'Delta',
  props: { now: Number, prev: Number, invert: Boolean },
  computed: {
    pct() {
      if (!this.prev) return null
      return Math.round(((this.now - this.prev) / Math.abs(this.prev)) * 100)
    }
  },
  render() {
    if (this.pct === null || this.pct === 0) return null
    const good = this.pct > 0 !== this.invert
    return h('span', { class: ['delta', good ? 'up' : 'down'] }, [h('i', { class: this.pct > 0 ? 'fa-solid fa-caret-up' : 'fa-solid fa-caret-down' }), `${Math.abs(this.pct)}%`])
  }
}

export default {
  name: 'HubOverview',
  components: { TrendChart, GetStarted, Delta },
  props: {
    settings: { type: Object, required: true },
    refreshKey: { type: Number, default: 0 }
  },
  emits: ['add', 'edit', 'tab', 'add-reminder', 'edit-reminder', 'changed', 'overdue'],
  data() {
    return {
      o: null,
      inv: null,
      pnl: null,
      pnlLoaded: false,
      basis: loadBasis(),
      error: null,
      busy: null,
      taxPeriod: 'this_quarter',
      topPeriod: 'this_month',
      taxPeriods: [
        { key: 'this_quarter', label: 'This quarter' },
        { key: 'last_quarter', label: 'Last quarter' },
        { key: 'this_month', label: 'This month' },
        { key: 'last_month', label: 'Last month' },
        { key: 'this_fy', label: 'This financial year' },
        { key: 'last_fy', label: 'Last financial year' }
      ]
    }
  },
  computed: {
    cur() {
      return this.o?.currency || this.settings.currency
    },
    tm() {
      return this.o?.this_month.totals || {}
    },
    lm() {
      return this.o?.last_month.totals || {}
    },
    pnlLink() {
      return { path: '/reports/profit-loss', query: { range: 'this_month', basis: this.basis } }
    },
    monthName() {
      return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date())
    },
    taxNote() {
      return this.o && this.o.tax_registered ? ` · excl. ${this.o.tax_name}` : ''
    },
    allDone() {
      const c = this.o?.checklist || {}
      return c.profile && c.income && c.expense && c.reminder
    },
    hasTrend() {
      return (this.o?.trend || []).some((m) => m.count > 0)
    },
    topCats() {
      return (this.o?.top_expenses.categories || []).slice(0, 6)
    },
    otherCats() {
      const rest = (this.o?.top_expenses.categories || []).slice(6)
      if (!rest.length) return null
      return { count: rest.length, amount: rest.reduce((s, c) => s + c.amount, 0) }
    },
    otherBalances() {
      return (this.o?.balances || []).filter((b) => b.currency !== this.cur && b.balance !== 0)
    }
  },
  watch: {
    refreshKey() {
      this.load()
      this.loadPnl()
    }
  },
  created() {
    this.load()
    this.loadInvoices()
    this.loadPnl()
  },
  methods: {
    money(v) {
      return fmtMinor(v, this.cur)
    },
    fmt(v, c) {
      return fmtMinor(v, c)
    },
    fmtMajor(v, c) {
      return formatMoney(v, c)
    },
    date: formatDate,
    pct(v) {
      const max = this.topCats[0]?.amount || 1
      return `${Math.max(2, Math.round((v / max) * 100))}%`
    },
    dueText(r) {
      if (r.overdue) return `Overdue · was due ${relativeDays(r.due_date)}`
      return `Due ${relativeDays(r.due_date)} · ${formatDate(r.due_date)}`
    },
    async load() {
      this.error = null
      try {
        this.o = await smallbizApi.overview({ tax_period: this.taxPeriod, top_period: this.topPeriod })
        this.$emit('overdue', this.o.overdue_reminders)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load your overview')
      }
    },
    // Whole-business P&L for this month — the same calculation as the dashboard.
    async loadPnl() {
      try {
        this.pnl = await fetchPnl({ range: 'this_month', basis: this.basis, compare: false, series: false })
      } catch {
        this.pnl = null
      } finally {
        this.pnlLoaded = true
      }
    },
    async loadInvoices() {
      // Invoicing is a separate module; hide the tile if the org doesn't have it.
      try {
        const s = await invoicingApi.stats()
        this.inv = s && (s.outstanding > 0 || s.overdue > 0 || s.invoiced_this_month > 0) ? s : null
      } catch {
        this.inv = null
      }
    },
    onStep(key) {
      if (key === 'profile') this.$emit('tab', 'profile')
      else if (key === 'income') this.$emit('add', 'income')
      else if (key === 'expense') this.$emit('add', 'expense')
      else if (key === 'reminder') this.$emit('add-reminder')
    },
    async toggle(r) {
      this.busy = r.id
      try {
        const res = await smallbizApi.toggleReminder(r.id)
        toast.success(res.next ? `Done — next one due ${formatDate(res.next.due_date)}` : 'Marked as done')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update reminder'))
      } finally {
        this.busy = null
      }
    }
  }
}
</script>

<style scoped>
.sk {
  display: inline-block;
  width: 120px;
  height: 26px;
}

.k-success { background: var(--success-soft); color: var(--success); }
.k-danger { background: var(--danger-soft); color: var(--danger); }
.k-info { background: var(--info-soft); color: var(--info); }
.k-warning { background: var(--warning-soft); color: var(--warning); }
.neg { color: var(--danger); }
.pos { color: var(--success); }
.muted { color: var(--text-3); font-weight: 400; }
.small { font-size: 12.5px; }

.kpi-link {
  color: inherit;
  text-decoration: none;
}

.kpi-link:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

:deep(.delta) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 650;
  margin-right: 2px;
}

:deep(.delta.up) { color: var(--success); }
:deep(.delta.down) { color: var(--danger); }

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.ui-card__head h2 small {
  font-size: 12.5px;
  margin-left: 6px;
}

.ui-select--sm {
  width: auto;
  height: 32px;
  font-size: 13px;
  padding-top: 0;
  padding-bottom: 0;
}

.head-actions {
  display: flex;
  gap: 4px;
}

.taxlist {
  margin: 14px 0 12px;
}

.taxlist > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.taxlist dt {
  color: var(--text-2);
  font-weight: 450;
}

.taxlist dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.taxlist .total {
  border-bottom: 0;
  font-size: 16px;
}

.taxlist .total dt {
  color: var(--text);
  font-weight: 650;
}

.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bars__top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13.5px;
  margin-bottom: 6px;
}

.bars__top span {
  color: var(--text-2);
}

.bars__top strong {
  font-variant-numeric: tabular-nums;
}

.bars__track {
  height: 8px;
  background: var(--bg-subtle);
  border-radius: 999px;
  overflow: hidden;
}

.bars__fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.5s var(--ease);
}

.list {
  list-style: none;
  padding: 6px;
  margin: 0;
}

.list__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--text);
  width: 100%;
}

.btnrow {
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.btnrow:hover {
  background: var(--surface-hover);
}

.list__main {
  flex: 1;
  min-width: 0;
}

.clickable {
  cursor: pointer;
}

.list__main strong {
  display: block;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list__main small {
  color: var(--text-3);
  font-size: 12.5px;
}

.list__main small.neg {
  color: var(--danger);
  font-weight: 550;
}

.list__amt {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.dot {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 12px;
  flex-shrink: 0;
}

.dot-in { background: var(--success-soft); color: var(--success); }
.dot-out { background: var(--danger-soft); color: var(--danger); }

.tick {
  border: 0;
  background: none;
  color: var(--text-3);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 26px;
}

.tick:hover {
  color: var(--success);
}

.small-empty {
  padding: 28px 20px;
}

.ok {
  background: var(--success-soft);
  color: var(--success);
}

.contacts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contacts p {
  margin: 0 0 4px;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  text-decoration: none;
}

.contact-link:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
  color: var(--text);
}

.contact-link > span:nth-child(2) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.contact-link small {
  color: var(--text-3);
  font-size: 12.5px;
}

.contact-link > i {
  color: var(--text-3);
  font-size: 12px;
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
