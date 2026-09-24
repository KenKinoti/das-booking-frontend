<template>
  <div class="ui-page ui-page--wide an dviz">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Reports</div>
        <h1>{{ title }}</h1>
        <p>
          <template v-if="data">{{ rangeLabel(data.range.from, data.range.to) }} · {{ data.range.days }} days<template v-if="data.compare"> · vs {{ rangeLabel(data.compare.from, data.compare.to) }}</template></template>
          <template v-else>Revenue, receivables, customers, bookings and sales in one place.</template>
        </p>
      </div>
      <div class="ui-actions head-actions">
        <PeriodPicker v-model="period" />
        <select v-model="interval" class="ui-select interval" aria-label="Group by">
          <option value="auto">Auto</option>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
        <button class="ui-btn" type="button" :disabled="!data" @click="exportAll"><i class="fa-solid fa-file-csv"></i> Export all</button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger mb">
      <i class="fa-solid fa-circle-exclamation"></i>
      <div>
        {{ error }}
        <button class="ui-btn ui-btn--sm retry" type="button" @click="load">Try again</button>
      </div>
    </div>

    <div class="kpis" :class="{ busy: loading && data }">
      <KpiCard label="Revenue collected" icon="fa-solid fa-sack-dollar" tone="success" :loading="!data" :value="money(k.revenue?.value)" :meta="`${num(k.revenue?.count)} payments & sales`" :delta="k.revenue?.delta_pct" :show-delta="compare" :show-new="compare" :spark="k.revenue?.spark" />
      <KpiCard label="Invoiced" icon="fa-solid fa-file-invoice-dollar" :loading="!data" :value="money(k.invoiced?.value)" :meta="`${num(k.invoice_count?.value)} invoices`" :delta="k.invoiced?.delta_pct" :show-delta="compare" :show-new="compare" :spark="k.invoiced?.spark" spark-color="var(--viz-3)" />
      <KpiCard label="Collection rate" icon="fa-solid fa-percent" tone="info" :loading="!data" :value="k.collection_rate?.value ? k.collection_rate.value.toFixed(1) + '%' : '—'" meta="Payments ÷ invoiced this period" :delta="k.collection_rate?.delta_pct" delta-unit="pts" :show-delta="compare" />
      <KpiCard label="Average invoice" icon="fa-solid fa-receipt" :loading="!data" :value="money(k.avg_invoice?.value)" :meta="`Across ${num(k.invoice_count?.value)} invoices`" :delta="k.avg_invoice?.delta_pct" :show-delta="compare" :spark="k.avg_invoice?.spark" spark-color="var(--viz-3)" />
      <KpiCard label="Outstanding" icon="fa-solid fa-hourglass-half" tone="warning" :loading="!data" :value="money(k.outstanding?.value)" :meta="`${money(k.overdue?.value)} overdue`" :show-delta="false" />
      <KpiCard label="POS sales" icon="fa-solid fa-cash-register" tone="warning" :loading="!data" :value="money(k.pos_sales?.value)" :meta="`${num(k.pos_transactions?.value)} transactions`" :delta="k.pos_sales?.delta_pct" :show-delta="compare" :show-new="compare" :spark="k.pos_sales?.spark" spark-color="var(--viz-2)" />
      <KpiCard label="Bookings" icon="fa-solid fa-calendar-check" tone="info" :loading="!data" :value="num(k.bookings?.value)" :meta="`${money(k.booking_value?.value, true)} booked value`" :delta="k.bookings?.delta_pct" :show-delta="compare" :show-new="compare" :spark="k.bookings?.spark" />
      <KpiCard label="New customers" icon="fa-solid fa-user-plus" tone="warning" :loading="!data" :value="num(k.new_customers?.value)" meta="Added in this period" :delta="k.new_customers?.delta_pct" :show-delta="compare" :show-new="compare" :spark="k.new_customers?.spark" />
    </div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>{{ metric.label }}</h2>
          <span class="sub">{{ intervalText }}<template v-if="data"> · total {{ metric.fmt(metricTotal) }}</template></span>
        </div>
        <div class="ui-tabs" role="tablist" aria-label="Metric">
          <button v-for="m in metrics" :key="m.key" type="button" class="ui-tab" :class="{ 'is-active': metricKey === m.key }" @click="metricKey = m.key">{{ m.short }}</button>
        </div>
      </div>
      <div class="ui-card__body chart-body">
        <div v-if="!data" class="ui-skeleton" style="height: 320px"></div>
        <div v-else-if="!metricHasData" class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-solid fa-chart-line"></i></div>
          <h3>No {{ metric.label.toLowerCase() }} in this period</h3>
          <p>Try a longer date range.</p>
        </div>
        <template v-else>
          <div class="dviz-legend legend">
            <span><i class="dviz-swatch" :style="{ background: metric.color }"></i>{{ metric.label }}</span>
            <span v-if="metricPrev"><i class="dviz-swatch dviz-swatch--dashed"></i>Previous period</span>
          </div>
          <TimeChart
            :labels="data.series.map((p) => p.date)"
            :series="metricSeries"
            :height="320"
            :format-y="(v) => metric.axis(v)"
            :format-x="(d) => bucketLabel(d, data.range.interval)"
            :format-title="(d) => bucketLabel(d, data.range.interval, true)"
            :format-value="(v) => metric.fmt(v)"
            :aria-label="metric.label + ' over time'"
          />
        </template>
      </div>
    </section>

    <div class="grid-row row-3">
      <section class="ui-card">
        <div class="ui-card__head"><h2>Revenue by source</h2></div>
        <div class="ui-card__body">
          <div v-if="!data" class="ui-skeleton" style="height: 150px"></div>
          <p v-else-if="!k.revenue?.value" class="none">Nothing collected in this period.</p>
          <DonutChart v-else :segments="sourceSegments" :center-value="money(k.revenue?.value, true)" center-label="collected" :format-value="(v) => money(v, true)" aria-label="Revenue by source" />
        </div>
      </section>
      <section class="ui-card">
        <div class="ui-card__head"><h2>Payment methods</h2></div>
        <div class="ui-card__body">
          <div v-if="!data" class="ui-skeleton" style="height: 150px"></div>
          <p v-else-if="!methodSegments.length" class="none">No payments in this period.</p>
          <DonutChart v-else :segments="methodSegments" :center-value="num(methodCount)" center-label="payments" :format-value="(v) => money(v, true)" aria-label="Payment methods" />
        </div>
      </section>
      <section class="ui-card">
        <div class="ui-card__head"><h2>Invoice status</h2></div>
        <div class="ui-card__body">
          <div v-if="!data" class="ui-skeleton" style="height: 150px"></div>
          <p v-else-if="!statusSegments.length" class="none">No invoices issued in this period.</p>
          <DonutChart v-else :segments="statusSegments" :center-value="num(k.invoice_count?.value)" center-label="invoices" :format-value="(v) => money(v, true)" aria-label="Invoices by status" />
        </div>
      </section>
    </div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div class="ui-tabs" role="tablist" aria-label="Breakdown">
          <button v-for="t in tabs" :key="t.key" type="button" class="ui-tab" :class="{ 'is-active': tab === t.key }" @click="tab = t.key">
            {{ t.label }} <span v-if="data" class="count">{{ tableFor(t.key).rows.length }}</span>
          </button>
        </div>
        <button class="ui-btn ui-btn--sm" type="button" :disabled="!data || !table.rows.length" @click="exportTab"><i class="fa-solid fa-download"></i> Export CSV</button>
      </div>
      <div v-if="!data" class="ui-card__body"><div class="ui-skeleton" style="height: 260px"></div></div>
      <div v-else-if="!table.rows.length" class="ui-empty small">
        <div class="ui-empty__icon"><i class="fa-solid fa-table"></i></div>
        <h3>Nothing to show</h3>
        <p>There’s no {{ currentTab.label.toLowerCase() }} data for this period.</p>
      </div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th v-for="(c, i) in table.cols" :key="c.label" :class="{ num: c.num }">
                <button v-if="c.sort !== false" type="button" class="sort" :class="{ on: sortCol === i }" @click="setSort(i)">
                  {{ c.label }}
                  <i v-if="sortCol === i" :class="sortDir > 0 ? 'fa-solid fa-arrow-up-short-wide' : 'fa-solid fa-arrow-down-wide-short'"></i>
                </button>
                <template v-else>{{ c.label }}</template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in sortedRows" :key="ri" :class="{ 'is-clickable': !!r.to }" @click="r.to && $router.push(r.to)">
              <td v-for="(c, i) in table.cols" :key="i" :class="{ num: c.num }">
                <span v-if="c.badge" class="ui-badge" :class="c.badge(r.cells[i])">{{ c.fmt ? c.fmt(r.cells[i]) : r.cells[i] }}</span>
                <template v-else>{{ c.fmt ? c.fmt(r.cells[i]) : r.cells[i] }}</template>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="table.total">
            <tr>
              <td v-for="(c, i) in table.cols" :key="i" :class="{ num: c.num }">
                <strong>{{ table.total[i] === '' || table.total[i] === undefined ? '' : c.fmt && i > 0 ? c.fmt(table.total[i]) : table.total[i] }}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import './dashviz.css'
import KpiCard from './KpiCard.vue'
import PeriodPicker from './PeriodPicker.vue'
import TimeChart from './charts/TimeChart.vue'
import DonutChart from './charts/DonutChart.vue'
import { fetchOverview, money, moneyAxis, num, bucketLabel, rangeLabel, titleCase, downloadCsv, loadPref, savePref, BOOKING_STATUS } from './analytics'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const PREF = 'analytics.prefs'
const METHOD_COLORS = { card: 'var(--viz-7)', cash: 'var(--viz-4)', bank_transfer: 'var(--viz-5)', eftpos: 'var(--viz-6)', afterpay: 'var(--viz-8)' }
const INVOICE_STATUS = {
  paid: { label: 'Paid', color: 'var(--success)', badge: 'ui-badge--paid' },
  partial: { label: 'Partially paid', color: 'var(--warning)', badge: 'ui-badge--partial' },
  sent: { label: 'Sent', color: 'var(--info)', badge: 'ui-badge--sent' },
  overdue: { label: 'Overdue', color: 'var(--danger)', badge: 'ui-badge--overdue' },
  draft: { label: 'Draft', color: 'var(--text-3)', badge: 'ui-badge--draft' },
  void: { label: 'Void', color: 'var(--border-strong)', badge: 'ui-badge--void' }
}

export default {
  name: 'AnalyticsReport',
  components: { KpiCard, PeriodPicker, TimeChart, DonutChart },
  props: {
    title: { type: String, default: 'Analytics' }
  },
  data() {
    const prefs = loadPref(PREF, {})
    return {
      data: null,
      loading: false,
      error: '',
      period: prefs.period || { range: '90d', compare: true },
      interval: prefs.interval || 'auto',
      metricKey: prefs.metric || 'revenue',
      tab: prefs.tab || 'series',
      sortCol: null,
      sortDir: -1,
      reqId: 0
    }
  },
  computed: {
    k() {
      return this.data?.kpis || {}
    },
    compare() {
      return !!this.period.compare
    },
    currency() {
      return this.data?.currency || 'AUD'
    },
    intervalText() {
      const i = this.data?.range?.interval
      return i === 'month' ? 'By month' : i === 'week' ? 'By week' : 'By day'
    },
    metrics() {
      const m = (v) => this.money(v)
      const ax = (v) => moneyAxis(v, this.currency)
      const n = (v) => num(v)
      return [
        { key: 'revenue', short: 'Revenue', label: 'Revenue collected', field: 'revenue', prev: 'prev_revenue', color: 'var(--viz-1)', fmt: m, axis: ax },
        { key: 'invoiced', short: 'Invoiced', label: 'Invoiced', field: 'invoiced', prev: 'prev_invoiced', color: 'var(--viz-3)', fmt: m, axis: ax },
        { key: 'collected', short: 'Payments', label: 'Invoice payments', field: 'collected', color: 'var(--viz-1)', fmt: m, axis: ax },
        { key: 'pos', short: 'POS', label: 'POS sales', field: 'pos', color: 'var(--viz-2)', fmt: m, axis: ax },
        { key: 'bookings', short: 'Bookings', label: 'Bookings', field: 'bookings', color: 'var(--viz-1)', fmt: n, axis: n },
        { key: 'customers', short: 'Customers', label: 'New customers', field: 'new_customers', color: 'var(--viz-1)', fmt: n, axis: n }
      ]
    },
    metric() {
      return this.metrics.find((m) => m.key === this.metricKey) || this.metrics[0]
    },
    metricPrev() {
      return !!(this.metric.prev && this.data?.compare && this.data.series.some((p) => p[this.metric.prev] !== undefined && p[this.metric.prev] !== null))
    },
    metricSeries() {
      const s = this.data?.series || []
      const out = [{ key: 'cur', name: this.metric.label, values: s.map((p) => p[this.metric.field] || 0), color: this.metric.color, type: 'area' }]
      if (this.metricPrev) {
        out.push({
          key: 'prev',
          name: 'Previous period',
          values: s.map((p) => p[this.metric.prev] || 0),
          color: 'var(--viz-prev)',
          type: 'line',
          dashed: true,
          tipName: (i) => (s[i]?.prev_date ? `Previous (${bucketLabel(s[i].prev_date, this.data.range.interval)})` : 'Previous period')
        })
      }
      return out
    },
    metricTotal() {
      return (this.data?.series || []).reduce((a, p) => a + (Number(p[this.metric.field]) || 0), 0)
    },
    metricHasData() {
      return (this.data?.series || []).some((p) => p[this.metric.field] || (this.metric.prev && p[this.metric.prev]))
    },
    sourceSegments() {
      const color = { invoices: 'var(--viz-1)', pos: 'var(--viz-2)' }
      return (this.data?.revenue_by_source || []).map((s) => ({ name: s.name, value: s.amount, color: color[s.id] || 'var(--viz-4)' }))
    },
    methodSegments() {
      return (this.data?.payment_methods || []).map((m) => ({ name: titleCase(m.name), value: m.amount, color: METHOD_COLORS[m.name] || 'var(--text-3)' }))
    },
    methodCount() {
      return (this.data?.payment_methods || []).reduce((a, m) => a + m.count, 0)
    },
    statusSegments() {
      return (this.data?.invoice_status || []).map((s) => ({ name: (INVOICE_STATUS[s.name] || {}).label || titleCase(s.name), value: s.amount, color: (INVOICE_STATUS[s.name] || {}).color || 'var(--text-3)' }))
    },
    tabs() {
      return [
        { key: 'series', label: 'Time series' },
        { key: 'customers', label: 'Customers' },
        { key: 'services', label: 'Services' },
        { key: 'products', label: 'Products' },
        { key: 'invoices', label: 'Invoices' },
        { key: 'payments', label: 'Payments' },
        { key: 'bookings', label: 'Bookings' },
        { key: 'aging', label: 'Receivables' }
      ]
    },
    currentTab() {
      return this.tabs.find((t) => t.key === this.tab) || this.tabs[0]
    },
    table() {
      return this.tableFor(this.tab)
    },
    sortedRows() {
      const rows = [...this.table.rows]
      if (this.sortCol === null) return rows
      const i = this.sortCol
      return rows.sort((a, b) => {
        const x = a.cells[i]
        const y = b.cells[i]
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * this.sortDir
        return String(x).localeCompare(String(y)) * this.sortDir
      })
    }
  },
  watch: {
    period: {
      deep: true,
      handler() {
        this.persist()
        this.load()
      }
    },
    interval() {
      this.persist()
      this.load()
    },
    metricKey() {
      this.persist()
    },
    tab() {
      this.sortCol = null
      this.persist()
    }
  },
  created() {
    this.load()
  },
  methods: {
    bucketLabel,
    rangeLabel,
    num,
    money(v, compact = false) {
      return money(v, this.currency, compact)
    },
    persist() {
      savePref(PREF, { period: this.period, interval: this.interval, metric: this.metricKey, tab: this.tab })
    },
    async load() {
      const id = ++this.reqId
      this.loading = true
      try {
        const d = await fetchOverview({ ...this.period, interval: this.interval, limit: 50 })
        if (id !== this.reqId) return
        this.data = d
        this.error = ''
      } catch (e) {
        if (id !== this.reqId) return
        this.error = apiErrorMessage(e, 'Could not load analytics.')
      } finally {
        if (id === this.reqId) this.loading = false
      }
    },
    setSort(i) {
      if (this.sortCol === i) this.sortDir = -this.sortDir
      else {
        this.sortCol = i
        this.sortDir = -1
      }
    },
    tableFor(key) {
      const d = this.data
      const m = (v) => this.money(v)
      const n = (v) => num(v, v % 1 ? 2 : 0)
      const sum = (rows, i) => Math.round(rows.reduce((a, r) => a + (Number(r.cells[i]) || 0), 0) * 100) / 100
      if (!d) return { cols: [], rows: [] }
      if (key === 'series') {
        const interval = d.range.interval
        const cols = [
          { label: interval === 'month' ? 'Month' : interval === 'week' ? 'Week starting' : 'Date', fmt: (v) => bucketLabel(v, interval, interval !== 'week'), sort: false },
          { label: 'Invoiced', num: true, fmt: m },
          { label: 'Invoice payments', num: true, fmt: m },
          { label: 'POS sales', num: true, fmt: m },
          { label: 'Revenue collected', num: true, fmt: m },
          { label: 'Bookings', num: true, fmt: n },
          { label: 'New customers', num: true, fmt: n }
        ]
        const rows = d.series.map((p) => ({ cells: [p.date, p.invoiced, p.collected, p.pos, p.revenue, p.bookings, p.new_customers] }))
        const total = ['Total', ...[1, 2, 3, 4, 5, 6].map((i) => sum(rows, i))]
        return { cols, rows, total, csv: (r) => r }
      }
      if (key === 'customers') {
        const cols = [
          { label: 'Customer' },
          { label: 'Invoices', num: true, fmt: n },
          { label: 'Invoiced', num: true, fmt: m },
          { label: 'Paid', num: true, fmt: m },
          { label: 'Balance', num: true, fmt: m },
          { label: 'POS', num: true, fmt: m },
          { label: 'Total', num: true, fmt: m }
        ]
        const rows = d.top_customers.map((c) => ({ cells: [c.name, c.invoices, c.invoiced, c.paid, c.balance, c.pos, c.total], to: c.id ? '/customers' : '' }))
        return { cols, rows, total: ['Total', ...[1, 2, 3, 4, 5, 6].map((i) => sum(rows, i))] }
      }
      if (key === 'services' || key === 'products') {
        const list = key === 'services' ? d.top_services : d.top_products
        const cols = [{ label: key === 'services' ? 'Service' : 'Product' }, { label: 'Quantity', num: true, fmt: n }, { label: 'Booked', num: true, fmt: n }, { label: 'Revenue', num: true, fmt: m }, { label: 'Sources' }]
        const rows = list.map((it) => ({ cells: [it.name, it.quantity, it.bookings, it.revenue, it.sources] }))
        return { cols, rows, total: ['Total', sum(rows, 1), sum(rows, 2), sum(rows, 3), ''] }
      }
      if (key === 'invoices') {
        const cols = [
          { label: 'Status', fmt: (v) => (INVOICE_STATUS[v] || {}).label || titleCase(v), badge: (v) => (INVOICE_STATUS[v] || {}).badge || 'ui-badge--draft' },
          { label: 'Invoices', num: true, fmt: n },
          { label: 'Total', num: true, fmt: m },
          { label: 'Balance due', num: true, fmt: m }
        ]
        const rows = d.invoice_status.map((s) => ({ cells: [s.name, s.count, s.amount, s.extra || 0], to: `/invoices?status=${s.name}` }))
        return { cols, rows, total: ['Total', sum(rows, 1), sum(rows, 2), sum(rows, 3)] }
      }
      if (key === 'payments') {
        const cols = [{ label: 'Method', fmt: titleCase }, { label: 'Payments', num: true, fmt: n }, { label: 'Amount', num: true, fmt: m }]
        const rows = d.payment_methods.map((s) => ({ cells: [s.name, s.count, s.amount] }))
        return { cols, rows, total: ['Total', sum(rows, 1), sum(rows, 2)] }
      }
      if (key === 'bookings') {
        const cols = [
          { label: 'Status', fmt: (v) => (BOOKING_STATUS[v] || {}).label || titleCase(v), badge: (v) => (BOOKING_STATUS[v] || {}).badge || 'ui-badge--draft' },
          { label: 'Bookings', num: true, fmt: n },
          { label: 'Value', num: true, fmt: m }
        ]
        const rows = d.booking_status.map((s) => ({ cells: [s.name, s.count, s.amount], to: '/bookings' }))
        return { cols, rows, total: ['Total', sum(rows, 1), sum(rows, 2)] }
      }
      // aging
      const cols = [{ label: 'Age', sort: false }, { label: 'Invoices', num: true, fmt: n }, { label: 'Amount', num: true, fmt: m }, { label: 'Share', num: true, fmt: (v) => `${v}%` }]
      const out = d.kpis.outstanding.value || 0
      const rows = d.aging.map((a) => ({ cells: [a.key === 'current' ? a.label : `${a.label} overdue`, a.count, a.amount, out ? Math.round((a.amount / out) * 1000) / 10 : 0], to: a.key === 'current' ? '/invoices?status=unpaid' : '/invoices?status=overdue' }))
      return { cols, rows: out ? rows : [], total: ['Total', sum(rows, 1), sum(rows, 2), out ? 100 : 0] }
    },
    csvRows(key, sorted = false) {
      const t = this.tableFor(key)
      const rows = sorted ? this.sortedRows : t.rows
      const plain = (c, v) => (c.num ? v : c.fmt && !c.badge && key !== 'series' ? c.fmt(v) : v)
      const out = [t.cols.map((c) => c.label)]
      for (const r of rows) out.push(r.cells.map((v, i) => plain(t.cols[i], v)))
      if (t.total) out.push(t.total)
      return out
    },
    fileBase() {
      return `analytics_${this.data.range.from}_${this.data.range.to}`
    },
    exportTab() {
      downloadCsv(`${this.fileBase()}_${this.tab}.csv`, this.csvRows(this.tab, true))
      toast.success(`Exported ${this.currentTab.label.toLowerCase()} (${this.currency})`)
    },
    exportAll() {
      const d = this.data
      const rows = [
        ['Analytics report', `${d.range.from} to ${d.range.to}`],
        ['Currency', this.currency],
        ['Generated', new Date().toISOString()],
        [],
        ['KPI', 'Value', 'Previous', 'Change %']
      ]
      const labels = { revenue: 'Revenue collected', collected: 'Invoice payments', invoiced: 'Invoiced', pos_sales: 'POS sales', avg_invoice: 'Average invoice', new_customers: 'New customers', bookings: 'Bookings', collection_rate: 'Collection rate %', outstanding: 'Outstanding (today)', overdue: 'Overdue (today)', stock_value: 'Stock value at cost' }
      for (const [key, label] of Object.entries(labels)) {
        const kp = d.kpis[key] || {}
        rows.push([label, kp.value ?? '', kp.previous ?? '', kp.delta_pct ?? ''])
      }
      for (const t of this.tabs) {
        rows.push([], [t.label.toUpperCase()])
        rows.push(...this.csvRows(t.key))
      }
      downloadCsv(`${this.fileBase()}_all.csv`, rows)
      toast.success('Exported the full analytics report')
    }
  }
}
</script>

<style scoped>
.head-actions {
  flex-wrap: wrap;
}

.interval {
  width: auto;
  height: 36px;
  padding-top: 0;
  padding-bottom: 0;
}

.mb {
  margin-bottom: 16px;
}

.retry {
  margin-left: 10px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  transition: opacity 0.2s;
}

.busy {
  opacity: 0.65;
}

.grid-row {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}

.row-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-row > .ui-card {
  min-width: 0;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
}

.ui-card__head .sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.chart-body {
  padding: 14px 20px 12px;
}

.legend {
  margin-bottom: 10px;
}

.small {
  padding: 32px 20px;
}

.none {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.sort {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sort.on {
  color: var(--text);
}

tfoot td {
  border-top: 1px solid var(--border-strong);
  font-variant-numeric: tabular-nums;
}

td.num {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .row-3 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 520px) {
  .kpis {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
