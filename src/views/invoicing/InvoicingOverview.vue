<template>
  <div class="ui-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Sales & Invoicing</div>
        <h1>Invoicing overview</h1>
        <p>Cash flow at a glance — what’s owed, what’s late and what’s been paid.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/quotes/new" class="ui-btn"><i class="fa-solid fa-file-signature"></i> New quote</router-link>
        <router-link to="/invoices/new" class="ui-btn ui-btn--primary"><i class="fa-solid fa-plus"></i> New invoice</router-link>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <template v-else>
      <div class="ui-kpis">
        <router-link to="/invoices?status=unpaid" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-hourglass-half"></i></span>Outstanding</div>
          <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.outstanding) }}</template></div>
          <div class="ui-kpi__meta">{{ unpaidCount }} unpaid invoice{{ unpaidCount === 1 ? '' : 's' }}<template v-if="otherNote"> · {{ otherNote }}</template></div>
        </router-link>
        <router-link to="/invoices?status=overdue" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>Overdue</div>
          <div class="ui-kpi__value" :class="{ danger: s && s.overdue > 0 }"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.overdue) }}</template></div>
          <div class="ui-kpi__meta">{{ overdueCount }} past due</div>
        </router-link>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-sack-dollar"></i></span>Collected this month</div>
          <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.paid_this_month) }}</template></div>
          <div class="ui-kpi__meta">Invoiced {{ s ? money(s.invoiced_this_month) : '…' }} this month</div>
        </div>
        <router-link to="/quotes?status=open" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-file-signature"></i></span>Open quotes</div>
          <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.open_quotes) }}</template></div>
          <div class="ui-kpi__meta">Sent or accepted, not yet invoiced</div>
        </router-link>
      </div>

      <div class="grid">
        <section class="ui-card chart-card">
          <div class="ui-card__head">
            <h2>Invoiced vs collected</h2>
            <div class="legend">
              <span><i class="sw sw-a"></i>Invoiced</span>
              <span><i class="sw sw-b"></i>Collected</span>
            </div>
          </div>
          <div class="ui-card__body">
            <div v-if="!s" class="ui-skeleton" style="height: 240px"></div>
            <div v-else class="chart" role="img" :aria-label="chartSummary">
              <div class="chart__grid">
                <div v-for="t in ticks" :key="t" class="chart__tick"><span>{{ money(t, true) }}</span></div>
              </div>
              <div class="chart__bars">
                <div v-for="m in s.monthly" :key="m.month" class="chart__col" @mouseenter="hover = m" @mouseleave="hover = null">
                  <div class="chart__pair">
                    <div class="bar bar-a" :style="{ height: h(m.invoiced) }"></div>
                    <div class="bar bar-b" :style="{ height: h(m.paid) }"></div>
                  </div>
                  <div class="chart__label">{{ monthLabel(m.month) }}</div>
                  <div v-if="hover === m" class="chart__tip">
                    <strong>{{ monthLabel(m.month, true) }}</strong>
                    <span><i class="sw sw-a"></i>{{ money(m.invoiced) }}</span>
                    <span><i class="sw sw-b"></i>{{ money(m.paid) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="ui-card">
          <div class="ui-card__head"><h2>Receivables aging</h2></div>
          <div class="ui-card__body aging">
            <div v-for="b in agingBuckets" :key="b.key" class="aging__row">
              <div class="aging__top">
                <span>{{ b.label }}</span>
                <strong>{{ s ? money(s.aging[b.key]) : '…' }}</strong>
              </div>
              <div class="aging__track"><div class="aging__fill" :class="b.cls" :style="{ width: agingPct(b.key) }"></div></div>
            </div>
          </div>
        </section>
      </div>

      <div class="grid grid-2">
        <section class="ui-card">
          <div class="ui-card__head">
            <h2>Needs attention</h2>
            <router-link to="/invoices?status=overdue" class="ui-btn ui-btn--ghost ui-btn--sm">View all</router-link>
          </div>
          <div v-if="attention === null" class="ui-card__body"><div class="ui-skeleton" style="height: 120px"></div></div>
          <div v-else-if="!attention.length" class="ui-empty small-empty">
            <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
            <h3>All caught up</h3>
            <p>No overdue invoices right now.</p>
          </div>
          <ul v-else class="list">
            <li v-for="inv in attention" :key="inv.id">
              <router-link :to="`/invoices/${inv.id}`" class="list__row">
                <span class="list__main">
                  <strong>{{ inv.client_name }}</strong>
                  <small>{{ inv.number }} · {{ inv.days_overdue }} days overdue</small>
                </span>
                <span class="list__amt danger">{{ fmt(inv.balance_due, inv.currency) }}</span>
              </router-link>
            </li>
          </ul>
        </section>

        <section class="ui-card">
          <div class="ui-card__head">
            <h2>Recent invoices</h2>
            <router-link to="/invoices" class="ui-btn ui-btn--ghost ui-btn--sm">View all</router-link>
          </div>
          <div v-if="recent === null" class="ui-card__body"><div class="ui-skeleton" style="height: 120px"></div></div>
          <div v-else-if="!recent.length" class="ui-empty small-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
            <h3>No invoices yet</h3>
            <p>Your latest invoices will show here.</p>
            <router-link to="/invoices/new" class="ui-btn ui-btn--primary ui-btn--sm" style="margin-top: 10px">Create an invoice</router-link>
          </div>
          <ul v-else class="list">
            <li v-for="inv in recent" :key="inv.id">
              <router-link :to="`/invoices/${inv.id}`" class="list__row">
                <span class="list__main">
                  <strong>{{ inv.client_name }}</strong>
                  <small>{{ inv.number }} · {{ date(inv.issue_date) }}</small>
                </span>
                <span class="ui-badge" :class="`ui-badge--${inv.display_status}`">{{ label(inv.display_status) }}</span>
                <span class="list__amt">{{ fmt(inv.total, inv.currency) }}</span>
              </router-link>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<script>
import { invoicingApi, STATUS_LABELS } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatDate } from '@/utils/format'
import { formatCurrency, currencyDecimals } from '@/utils/currencies'

export default {
  name: 'InvoicingOverview',
  data() {
    return { s: null, recent: null, attention: null, error: null, hover: null }
  },
  computed: {
    max() {
      if (!this.s) return 1
      const m = Math.max(...this.s.monthly.map((x) => Math.max(x.invoiced, x.paid)), 0)
      if (m <= 0) return 100
      const mag = Math.pow(10, Math.floor(Math.log10(m)))
      return Math.ceil(m / mag) * mag
    },
    ticks() {
      return [this.max, (this.max * 2) / 3, this.max / 3, 0]
    },
    // Counts follow the amounts: invoices in the organisation's currency only.
    unpaidCount() {
      return this.s?.outstanding_count || 0
    },
    overdueCount() {
      return this.s?.overdue_count || 0
    },
    otherNote() {
      const o = this.s?.other_currencies || []
      if (!o.length) return ''
      const amt = (v, c) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: currencyDecimals(c), maximumFractionDigits: currencyDecimals(c) })
      return 'excl. ' + o.map((x) => `${x.currency} ${amt(x.outstanding, x.currency)}`).join(', ')
    },
    agingBuckets() {
      return [
        { key: 'current', label: 'Not yet due', cls: 'f-ok' },
        { key: '1_30', label: '1–30 days late', cls: 'f-warn' },
        { key: '31_60', label: '31–60 days late', cls: 'f-warn2' },
        { key: '61_90', label: '61–90 days late', cls: 'f-bad' },
        { key: '90_plus', label: '90+ days late', cls: 'f-bad2' }
      ]
    },
    chartSummary() {
      if (!this.s) return ''
      return this.s.monthly.map((m) => `${this.monthLabel(m.month, true)}: invoiced ${this.money(m.invoiced)}, collected ${this.money(m.paid)}`).join('; ')
    }
  },
  created() {
    this.load()
  },
  methods: {
    money(v, compact) {
      return formatCurrency(v, this.s?.currency || 'AUD', { compact })
    },
    date: formatDate,
    fmt(v, cur) {
      return formatCurrency(v, cur || this.s?.currency || 'AUD')
    },
    label(s) {
      return STATUS_LABELS[s] || s
    },
    h(v) {
      return `${Math.max(v > 0 ? 2 : 0, (v / this.max) * 100)}%`
    },
    monthLabel(key, long) {
      const [y, m] = key.split('-').map(Number)
      return new Intl.DateTimeFormat(undefined, long ? { month: 'long', year: 'numeric' } : { month: 'short' }).format(new Date(y, m - 1, 1))
    },
    agingPct(k) {
      if (!this.s || !this.s.outstanding) return '0%'
      return `${Math.round((this.s.aging[k] / this.s.outstanding) * 100)}%`
    },
    async load() {
      this.error = null
      try {
        const [s, recent, overdue] = await Promise.all([
          invoicingApi.stats(),
          invoicingApi.list({ type: 'invoice', per_page: 6 }),
          invoicingApi.list({ type: 'invoice', status: 'overdue', sort: 'due_date', per_page: 6 })
        ])
        this.s = s
        this.recent = recent.invoices || []
        this.attention = overdue.invoices || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load invoicing data')
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

.kpi-link {
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.kpi-link:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
  color: inherit;
}

.k-danger { background: var(--danger-soft); color: var(--danger); }
.k-success { background: var(--success-soft); color: var(--success); }
.k-info { background: var(--info-soft); color: var(--info); }
.danger { color: var(--danger); }

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.grid-2 {
  grid-template-columns: 1fr 1fr;
}

.legend {
  display: flex;
  gap: 14px;
  font-size: 12.5px;
  color: var(--text-3);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.sw-a { background: var(--accent); }
.sw-b { background: #22c3a6; }

.chart {
  position: relative;
  height: 260px;
  padding-left: 56px;
}

.chart__grid {
  position: absolute;
  inset: 0 0 26px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.chart__tick {
  border-top: 1px dashed var(--border);
  position: relative;
  height: 0;
}

.chart__tick span {
  position: absolute;
  left: 0;
  top: -9px;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.chart__bars {
  position: absolute;
  inset: 0 0 0 56px;
  display: flex;
  gap: 6px;
}

.chart__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
}

.chart__pair {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  padding-bottom: 0;
  border-radius: 8px;
  transition: background 0.15s;
}

.chart__col:hover .chart__pair {
  background: var(--surface-hover);
}

.bar {
  width: min(14px, 38%);
  border-radius: 5px 5px 2px 2px;
  transition: height 0.5s var(--ease);
}

.bar-a { background: var(--accent); }
.bar-b { background: #22c3a6; }

.chart__label {
  height: 26px;
  line-height: 26px;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-3);
}

.chart__tip {
  position: absolute;
  bottom: calc(100% - 20px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--text);
  color: var(--bg);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 5;
  pointer-events: none;
  box-shadow: var(--shadow-lg);
}

.chart__tip span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.aging {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.aging__top {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
  margin-bottom: 6px;
}

.aging__top span {
  color: var(--text-2);
}

.aging__top strong {
  font-variant-numeric: tabular-nums;
}

.aging__track {
  height: 8px;
  background: var(--bg-subtle);
  border-radius: 999px;
  overflow: hidden;
}

.aging__fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.5s var(--ease);
}

.f-ok { background: var(--success); }
.f-warn { background: #f5c451; }
.f-warn2 { background: var(--warning); }
.f-bad { background: #f07c62; }
.f-bad2 { background: var(--danger); }

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
}

.list__row:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.list__main {
  flex: 1;
  min-width: 0;
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

.list__amt {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  min-width: 90px;
  text-align: right;
}

.small-empty {
  padding: 32px 20px;
}

.ok {
  background: var(--success-soft);
  color: var(--success);
}

@media (max-width: 1100px) {
  .grid,
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
