<template>
  <div class="ui-page ui-page--wide pl-page dviz">
    <header class="ui-page-head no-print">
      <div>
        <div class="ui-eyebrow">Finance · Reports</div>
        <h1>Profit &amp; loss</h1>
        <p>Income, costs and profit across invoicing, point of sale, online orders, events, the cash book, bills, purchase orders and payroll — counted once.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" type="button" :disabled="!d" data-testid="pnl-csv" @click="exportCsv"><i class="fa-solid fa-file-csv"></i> CSV</button>
        <button class="ui-btn" type="button" :disabled="!d" data-testid="pnl-print" @click="print"><i class="fa-solid fa-print"></i> Print</button>
      </div>
    </header>

    <section class="ui-card toolbar-card no-print">
      <div class="toolbar">
        <label class="ui-field fld">
          <span class="ui-label">Period</span>
          <select v-model="range" class="ui-select" aria-label="Period" @change="onRange">
            <option v-for="p in ranges" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </label>
        <template v-if="range === 'custom'">
          <label class="ui-field fld">
            <span class="ui-label">From</span>
            <input v-model="from" type="date" class="ui-input" :max="to" aria-label="From" @change="apply" />
          </label>
          <label class="ui-field fld">
            <span class="ui-label">To</span>
            <input v-model="to" type="date" class="ui-input" :min="from" aria-label="To" @change="apply" />
          </label>
        </template>
        <label class="ui-field fld">
          <span class="ui-label">Compare with</span>
          <select v-model="compare" class="ui-select" aria-label="Compare with" @change="apply">
            <option value="previous">Previous period</option>
            <option value="year">Same period last year</option>
            <option value="none">No comparison</option>
          </select>
        </label>
        <div class="ui-field fld">
          <span class="ui-label">Basis</span>
          <div class="ui-tabs" role="tablist" aria-label="Basis">
            <button v-for="b in ['accrual', 'cash']" :key="b" type="button" role="tab" class="ui-tab" :class="{ 'is-active': basis === b }" :aria-selected="basis === b" :title="help[b]" :data-basis="b" @click="setBasis(b)">
              {{ labels[b] }}
            </button>
          </div>
        </div>
        <div class="spacer"></div>
        <PnlHow v-if="d" :rules="d.rules" :excluded="d.excluded" :currency="d.currency" />
      </div>
      <p class="ui-hint basis-help">{{ help[basis] }}</p>
    </section>

    <div v-if="error" class="ui-alert ui-alert--danger mb no-print">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <!-- printed header -->
    <div class="print-head print-only">
      <img v-if="branding.logoUrl" :src="branding.logoUrl" :alt="orgName" class="print-logo" />
      <div>
        <div class="print-org">{{ orgName }}</div>
        <h2>Profit &amp; loss</h2>
        <p v-if="d">{{ rangeText }} · {{ labels[basis] }} basis · {{ d.currency }}, excluding {{ d.tax.label }}<template v-if="d.compare"> · compared with {{ compareText }}</template></p>
      </div>
    </div>

    <div class="ui-kpis" :class="{ busy: loading && d }">
      <div class="ui-kpi" data-pnl-kpi="revenue">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-arrow-down"></i></span>Revenue</div>
        <div class="ui-kpi__value"><span v-if="!d" class="ui-skeleton sk"></span><template v-else>{{ money(t.revenue) }}</template></div>
        <div class="ui-kpi__meta"><template v-if="d">excl. {{ d.tax.label }}<template v-if="d.compare"> · <DeltaBadge :value="ch.revenue" :show-new="true" /></template></template></div>
      </div>
      <div class="ui-kpi" data-pnl-kpi="gross">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-layer-group"></i></span>Gross profit</div>
        <div class="ui-kpi__value" :class="{ neg: d && t.gross_profit < 0 }"><span v-if="!d" class="ui-skeleton sk"></span><template v-else>{{ money(t.gross_profit) }}</template></div>
        <div class="ui-kpi__meta"><template v-if="d">{{ money(t.cost_of_sales) }} cost of sales · {{ pctOr(t.gross_margin_pct) }} margin</template></div>
      </div>
      <div class="ui-kpi" data-pnl-kpi="expenses">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-solid fa-arrow-up"></i></span>Total expenses</div>
        <div class="ui-kpi__value"><span v-if="!d" class="ui-skeleton sk"></span><template v-else>{{ money(t.total_expenses) }}</template></div>
        <div class="ui-kpi__meta"><template v-if="d">{{ money(t.operating_expenses) }} operating<template v-if="d.compare"> · <DeltaBadge :value="ch.total_expenses" :positive-is-good="false" :show-new="true" /></template></template></div>
      </div>
      <div class="ui-kpi" data-pnl-kpi="net" :class="d ? (t.net_profit < 0 ? 'k-neg' : 'k-pos') : ''">
        <div class="ui-kpi__label"><span class="ui-kpi__icon" :class="d && t.net_profit < 0 ? 'k-danger' : 'k-success'"><i class="fa-solid fa-scale-balanced"></i></span>{{ d && t.net_profit < 0 ? 'Net loss' : 'Net profit' }}</div>
        <div class="ui-kpi__value" :class="{ neg: d && t.net_profit < 0, pos: d && t.net_profit > 0 }"><span v-if="!d" class="ui-skeleton sk"></span><template v-else>{{ money(t.net_profit) }}</template></div>
        <div class="ui-kpi__meta"><template v-if="d">{{ pctOr(t.net_margin_pct) }} margin<template v-if="d.compare"> · <DeltaBadge :value="ch.net_profit" :show-new="true" /></template></template></div>
      </div>
    </div>

    <section class="ui-card sheet">
      <div class="ui-card__head">
        <div>
          <h2>Statement</h2>
          <span class="sub">{{ d ? `${rangeText} · ${labels[basis]} basis · ${d.currency}` : 'Loading…' }}</span>
        </div>
        <div class="no-print head-actions">
          <button v-if="d" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="toggleExpand">
            <i :class="expanded ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i> {{ expanded ? 'Collapse' : 'Expand' }} breakdowns
          </button>
        </div>
      </div>
      <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 360px"></div></div>
      <div v-else-if="!d.has_data" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-scale-balanced"></i></div>
        <h3>Nothing to report for {{ rangeText }}</h3>
        <p>No invoices, sales, bills, cash-book entries or pay runs fall in this period. Try another period.</p>
      </div>
      <PnlStatement v-else ref="stmt" :d="d" />
    </section>

    <section v-if="d && d.series && d.has_data" class="ui-card trend-card">
      <div class="ui-card__head">
        <div>
          <h2>Last 12 months</h2>
          <span class="sub">Net profit by month · {{ labels[basis] }} basis</span>
        </div>
      </div>
      <div class="ui-card__body">
        <PnlBars :bars="trend" :height="220" :format-y="axis" aria-label="Net profit by month" />
        <div class="ui-table-wrap month-table">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Month</th>
                <th class="num">Revenue</th>
                <th class="num">Expenses</th>
                <th class="num">Net profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in d.series" :key="m.month">
                <td>{{ monthLabel(m.month) }}<small v-if="m.partial" class="muted"> (so far)</small></td>
                <td class="num">{{ money(m.revenue) }}</td>
                <td class="num">{{ money(m.expenses) }}</td>
                <td class="num" :class="{ neg: m.net_profit < 0 }">{{ money(m.net_profit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import '@/components/dashboard/dashviz.css'
import DeltaBadge from '@/components/dashboard/DeltaBadge.vue'
import PnlStatement from '@/components/pnl/PnlStatement.vue'
import PnlBars from '@/components/pnl/PnlBars.vue'
import PnlHow from '@/components/pnl/PnlHow.vue'
import { moneyAxis, rangeLabel, downloadCsv } from '@/components/dashboard/analytics'
import { fetchPnl, loadBasis, saveBasis, pnlMoney, statementCsv, BASIS_LABEL, BASIS_HELP } from '@/services/pnl'
import { apiErrorMessage } from '@/services/api'
import { useBranding } from '@/composables/useBranding'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { isoDate } from '@/utils/format'

const RANGES = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'this_fy', label: 'This financial year' },
  { value: 'last_fy', label: 'Last financial year' },
  { value: 'ytd', label: 'Year to date (calendar)' },
  { value: 'last_year', label: 'Last calendar year' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom dates…' }
]

export default {
  name: 'ProfitLossReport',
  components: { DeltaBadge, PnlStatement, PnlBars, PnlHow },
  setup() {
    const { branding, loadBranding } = useBranding()
    loadBranding()
    return { branding }
  },
  data() {
    const q = this.$route.query
    const custom = !!(q.from && q.to)
    return {
      ranges: RANGES,
      range: custom ? 'custom' : RANGES.some((r) => r.value === q.range) ? q.range : 'this_month',
      from: q.from || isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
      to: q.to || isoDate(),
      compare: ['previous', 'year', 'none'].includes(q.compare) ? q.compare : 'previous',
      basis: q.basis === 'cash' || q.basis === 'accrual' ? q.basis : loadBasis(),
      d: null,
      loading: false,
      error: '',
      expanded: false,
      reqId: 0,
      labels: BASIS_LABEL,
      help: BASIS_HELP
    }
  },
  computed: {
    t() {
      return this.d?.totals || {}
    },
    ch() {
      return this.d?.change_pct || {}
    },
    rangeText() {
      return this.d ? rangeLabel(this.d.period.from, this.d.period.to) : ''
    },
    compareText() {
      return this.d?.compare ? rangeLabel(this.d.compare.from, this.d.compare.to) : ''
    },
    orgName() {
      const u = useAuthStore().user || {}
      return this.d?.organization?.name || this.branding.tradingName || this.branding.orgName || u.organization_name || ''
    },
    trend() {
      const fmt = new Intl.DateTimeFormat(undefined, { month: 'short' })
      return (this.d?.series || []).map((m) => ({
        label: fmt.format(new Date(m.month + '-01T00:00:00')),
        title: this.monthLabel(m.month) + (m.partial ? ' (so far)' : ''),
        start: 0,
        end: m.net_profit,
        color: m.net_profit < 0 ? 'var(--danger)' : 'var(--success)',
        name: m.net_profit < 0 ? 'Net loss' : 'Net profit',
        value: this.money(m.net_profit),
        details: [
          ['Revenue', this.money(m.revenue)],
          ['Expenses', this.money(m.expenses)]
        ]
      }))
    }
  },
  watch: {
    '$route.query'(q, old) {
      if (this.$route.path !== '/reports/profit-loss' || JSON.stringify(q) === JSON.stringify(old)) return
      if (q.from && q.to && (q.from !== this.from || q.to !== this.to)) {
        this.range = 'custom'
        this.from = q.from
        this.to = q.to
        this.load()
      }
    }
  },
  created() {
    this.load()
  },
  methods: {
    params() {
      const p = { basis: this.basis, compare: this.compare }
      if (this.range === 'custom') Object.assign(p, { from: this.from, to: this.to })
      else p.range = this.range
      return p
    },
    syncQuery() {
      const query = { basis: this.basis }
      if (this.range === 'custom') Object.assign(query, { from: this.from, to: this.to })
      else query.range = this.range
      if (this.compare !== 'previous') query.compare = this.compare
      this.$router.replace({ query, hash: this.$route.hash }).catch(() => {})
    },
    async load() {
      const id = ++this.reqId
      this.loading = true
      try {
        const d = await fetchPnl(this.params())
        if (id !== this.reqId) return
        this.d = d
        this.error = ''
        this.$nextTick(() => {
          const h = this.$route.hash
          if (h && ['#income', '#cost-of-sales', '#expenses'].includes(h)) document.querySelector(h)?.scrollIntoView({ block: 'start' })
        })
      } catch (e) {
        if (id !== this.reqId) return
        this.error = apiErrorMessage(e, 'Could not load the profit & loss report.')
      } finally {
        if (id === this.reqId) this.loading = false
      }
    },
    apply() {
      if (this.range === 'custom' && (!this.from || !this.to)) return
      if (this.range === 'custom' && this.from > this.to) {
        toast.warning('The start date must be before the end date')
        return
      }
      this.syncQuery()
      this.load()
    },
    onRange() {
      this.apply()
    },
    setBasis(b) {
      if (b === this.basis) return
      this.basis = b
      saveBasis(b)
      this.apply()
    },
    money(v) {
      return pnlMoney(v, this.d?.currency)
    },
    pctOr(v) {
      return v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`
    },
    axis(v) {
      return moneyAxis(v, this.d?.currency || orgCurrency())
    },
    monthLabel(m) {
      return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(m + '-01T00:00:00'))
    },
    toggleExpand() {
      this.expanded = !this.expanded
      this.$refs.stmt?.expandAll(this.expanded)
    },
    exportCsv() {
      if (!this.d) return
      downloadCsv(`profit-loss-${this.d.period.from}-to-${this.d.period.to}-${this.basis}.csv`, statementCsv(this.d))
      toast.success('CSV downloaded')
    },
    print() {
      this.$refs.stmt?.expandAll(true)
      this.expanded = true
      this.$nextTick(() => window.print())
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.toolbar-card {
  margin-bottom: 16px;
  padding: 14px 16px 10px;
}

.toolbar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.fld {
  margin: 0;
  min-width: 150px;
}

.fld .ui-tabs {
  flex-wrap: nowrap;
}

.spacer {
  flex: 1;
}

.basis-help {
  margin: 8px 0 0;
}

.busy {
  opacity: 0.65;
}

.ui-kpis {
  margin-bottom: 16px;
}

.ui-kpi__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.neg {
  color: var(--danger);
}

.pos {
  color: var(--success);
}

.sheet {
  margin-bottom: 16px;
}

.ui-card__head .sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.month-table {
  margin-top: 14px;
}

.muted {
  color: var(--text-3);
}

.print-only {
  display: none;
}

@media (max-width: 640px) {
  .fld {
    min-width: 0;
    flex: 1 1 140px;
  }

  .spacer {
    display: none;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only {
    display: flex !important;
  }

  .print-head {
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
  }

  .print-logo {
    max-height: 56px;
    max-width: 180px;
    object-fit: contain;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-org {
    font-weight: 700;
    font-size: 14px;
  }

  .print-head h2 {
    margin: 2px 0;
  }

  .print-head p {
    margin: 0;
    color: var(--text-2);
  }

  .trend-card {
    break-before: page;
  }
}
</style>
