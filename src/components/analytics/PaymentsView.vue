<template>
  <div data-testid="view-payments">
    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="kpis">
      <KpiCard label="DSO" icon="fa-solid fa-stopwatch" tone="info" :loading="!d" :value="d ? `${num(d.dso, 1)} days` : ''" meta="Days sales outstanding, latest month end" :show-delta="false" data-kpi="dso" />
      <KpiCard label="Days to pay" icon="fa-solid fa-hourglass-half" :loading="!d" :value="d ? `${num(d.avg_days_to_pay, 1)} days` : ''" :meta="`Median ${num(d?.median_days_to_pay, 1)} days · amount-weighted`" :show-delta="false" data-kpi="dtp" />
      <KpiCard label="Paid on time" icon="fa-solid fa-circle-check" tone="success" :loading="!d" :value="pct(d?.on_time_pct, 0)" :meta="`${num(d?.paid_invoices)} paid invoices`" :show-delta="false" data-kpi="ontime" />
      <KpiCard label="Overdue now" icon="fa-solid fa-triangle-exclamation" :tone="overdue > 0 ? 'danger' : 'success'" :loading="!d" :value="m(overdue)" :meta="`${slow} slow-paying client${slow === 1 ? '' : 's'}`" :show-delta="false" data-kpi="overdue" />
    </div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>DSO and days to pay by month</h2>
          <span class="sub">{{ d?.formula }}</span>
        </div>
        <div class="dviz-legend">
          <span><i class="dviz-swatch dviz-swatch--line" style="background: var(--viz-1)"></i>DSO</span>
          <span><i class="dviz-swatch dviz-swatch--line" style="background: var(--viz-3)"></i>Days to pay (invoices issued that month)</span>
        </div>
      </div>
      <div class="ui-card__body">
        <div v-if="!d" class="ui-skeleton" style="height: 260px"></div>
        <div v-else-if="!d.months.length" class="ui-empty small"><p>No invoices in this range.</p></div>
        <TimeChart
          v-else
          :labels="d.months.map((x) => x.month)"
          :series="series"
          :height="260"
          :format-y="(v) => `${Math.round(v)} d`"
          :format-x="(x) => monthLabel(x)"
          :format-title="(x) => monthLabel(x, true)"
          :format-value="(v) => `${num(v, 1)} days`"
          aria-label="DSO and average days to pay by month"
        />
      </div>
    </section>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Payment behaviour by client</h2>
          <span class="sub">Paid invoices issued in the range; open and overdue balances as of today</span>
        </div>
        <div class="ui-tabs" role="tablist" aria-label="Filter">
          <button v-for="f in FILTERS" :key="f.key" type="button" class="ui-tab" :class="{ 'is-active': filter === f.key }" @click="filter = f.key">{{ f.label }}</button>
        </div>
      </div>
      <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 240px"></div></div>
      <div v-else-if="!rows.length" class="ui-empty small"><p>No clients match.</p></div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table" data-testid="pay-clients">
          <thead>
            <tr>
              <th>Client</th>
              <th>Habit</th>
              <th class="num">Avg days</th>
              <th class="num hide-sm">Median</th>
              <th class="num hide-sm">Days late</th>
              <th class="num hide-sm">On time</th>
              <th class="num hide-sm">Trend</th>
              <th class="num">Overdue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in rows" :key="c.key" class="is-clickable" @click="open(c)">
              <td>{{ c.name }} <small class="muted block">{{ c.paid_invoices }} paid<template v-if="c.open_balance"> · {{ m(c.open_balance, true) }} open</template></small></td>
              <td><span class="ui-badge" :class="BADGE[c.behaviour]">{{ LABEL[c.behaviour] }}</span></td>
              <td class="num">{{ c.paid_invoices ? num(c.avg_days_to_pay, 1) : '—' }}</td>
              <td class="num hide-sm">{{ c.paid_invoices ? num(c.median_days_to_pay, 0) : '—' }}</td>
              <td class="num hide-sm">{{ c.paid_invoices ? num(c.avg_days_late, 1) : '—' }}</td>
              <td class="num hide-sm">{{ c.paid_invoices ? pct(c.on_time_pct, 0) : '—' }}</td>
              <td class="num hide-sm" :class="c.trend_days > 0 ? 'down' : c.trend_days < 0 ? 'up' : ''" :title="'Last 3 paid invoices vs earlier ones'">
                {{ c.trend_days == null ? '—' : (c.trend_days > 0 ? '+' : '') + num(c.trend_days, 1) + ' d' }}
              </td>
              <td class="num" :class="{ down: c.overdue_balance > 0 }">
                {{ c.overdue_balance ? m(c.overdue_balance) : '—' }}
                <small v-if="c.oldest_overdue_days" class="muted block">{{ c.oldest_overdue_days }} days</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import TimeChart from '@/components/dashboard/charts/TimeChart.vue'
import { analyticsApi, monthLabel } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { money, num, pct, downloadCsv, fileStamp } from './fmt'

const LABEL = { prompt: 'Prompt', ok: 'On terms', slow: 'Slow', very_slow: 'Very slow', new: 'No history' }
const BADGE = { prompt: 'ui-badge--success', ok: 'ui-badge--info', slow: 'ui-badge--warning', very_slow: 'ui-badge--danger', new: 'ui-badge--draft' }
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'slow', label: 'Slow payers' }
]

export default {
  name: 'PaymentsView',
  components: { KpiCard, TimeChart },
  props: { params: { type: Object, required: true }, filters: { type: Object, required: true } },
  emits: ['drill', 'loaded'],
  data() {
    return { d: null, error: '', req: 0, filter: 'all', LABEL, BADGE, FILTERS }
  },
  computed: {
    cur() {
      return this.d?.conversion?.currency
    },
    series() {
      const ms = this.d?.months || []
      return [
        { key: 'dso', name: 'DSO', values: ms.map((x) => x.dso), color: 'var(--viz-1)', type: 'line' },
        { key: 'dtp', name: 'Days to pay', values: ms.map((x) => x.avg_days_to_pay), color: 'var(--viz-3)', type: 'line' }
      ]
    },
    overdue() {
      return (this.d?.clients || []).reduce((s, c) => s + (c.overdue_balance || 0), 0)
    },
    slow() {
      return (this.d?.clients || []).filter((c) => c.behaviour === 'slow' || c.behaviour === 'very_slow').length
    },
    rows() {
      const l = this.d?.clients || []
      if (this.filter === 'overdue') return l.filter((c) => c.overdue_balance > 0)
      if (this.filter === 'slow') return l.filter((c) => c.behaviour === 'slow' || c.behaviour === 'very_slow')
      return l
    }
  },
  watch: {
    params: {
      deep: true,
      handler() {
        this.load()
      }
    }
  },
  created() {
    this.load()
  },
  methods: {
    monthLabel,
    num,
    pct,
    m(v, c = false) {
      return money(v, this.cur, c)
    },
    open(c) {
      this.$router.push({ path: '/invoices', query: { q: c.name, status: c.overdue_balance > 0 ? 'overdue' : undefined } })
    },
    async load() {
      const id = ++this.req
      try {
        const d = await analyticsApi.payments(this.params)
        if (id !== this.req) return
        this.d = d
        this.error = ''
        this.$emit('loaded', d)
      } catch (e) {
        if (id === this.req) this.error = apiErrorMessage(e, 'Could not load payment analytics.')
      }
    },
    exportCsv() {
      const d = this.d
      if (!d) return
      const rows = [[`Payments ${d.from} to ${d.to} (${d.conversion.currency})`], [d.formula], [], ['Month', 'Receivables', 'Invoiced 90 days', 'DSO', 'Avg days to pay', 'Paid invoices']]
      d.months.forEach((x) => rows.push([x.month, x.receivables, x.sales_90d, x.dso, x.avg_days_to_pay, x.paid_invoices]))
      rows.push([], ['Client', 'Customer ID', 'Habit', 'Paid invoices', 'Avg days to pay', 'Median', 'Avg days late', 'On time %', 'Trend days', 'Open', 'Overdue', 'Oldest overdue days'])
      d.clients.forEach((c) => rows.push([c.name, c.customer_id || '', c.behaviour, c.paid_invoices, c.avg_days_to_pay, c.median_days_to_pay, c.avg_days_late, c.on_time_pct, c.trend_days ?? '', c.open_balance, c.overdue_balance, c.oldest_overdue_days]))
      downloadCsv(`payments-${fileStamp()}.csv`, rows)
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
  gap: 8px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.muted {
  color: var(--text-3);
}

.block {
  display: block;
}

.up {
  color: var(--success);
}

.down {
  color: var(--danger);
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .hide-sm {
    display: none;
  }

  .kpis {
    gap: 10px;
  }
}
</style>
