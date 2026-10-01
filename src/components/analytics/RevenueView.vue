<template>
  <div class="rv" data-testid="view-revenue">
    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="kpis">
      <KpiCard label="Revenue" icon="fa-solid fa-chart-line" tone="success" :loading="!d" :value="m(d?.total)" :meta="`${num(d?.docs)} documents · excl. tax`" :delta="d?.yoy_pct ?? null" delta-title="vs the same dates a year earlier" :show-new="true" data-kpi="revenue" />
      <KpiCard label="Same period last year" icon="fa-solid fa-clock-rotate-left" :loading="!d" :value="m(d?.prev)" meta="For comparison" :show-delta="false" />
      <KpiCard label="Clients billed" icon="fa-solid fa-users" tone="info" :loading="!d" :value="num(d?.clients)" :meta="topShare" :show-delta="false" data-kpi="clients" />
      <KpiCard label="Average invoice" icon="fa-solid fa-receipt" tone="warning" :loading="!d" :value="m(d?.avg_invoice)" meta="Invoices only, excl. tax" :show-delta="false" />
    </div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Revenue by month</h2>
          <span class="sub">{{ d ? d.conversion.note : 'Invoices minus credit notes, excluding tax' }}</span>
        </div>
        <div class="dviz-legend">
          <span><i class="dviz-swatch" style="background: var(--viz-1)"></i>Revenue</span>
          <span><i class="dviz-swatch dviz-swatch--dashed"></i>Same month last year</span>
        </div>
      </div>
      <div class="ui-card__body">
        <div v-if="!d" class="ui-skeleton" style="height: 300px"></div>
        <div v-else-if="!months.length" class="ui-empty small"><h3>No revenue in this range</h3></div>
        <template v-else>
          <TimeChart
            :labels="months.map((x) => x.month)"
            :series="series"
            :height="280"
            :format-y="(v) => ax(v)"
            :format-x="(x) => monthLabel(x)"
            :format-title="(x) => monthLabel(x, true)"
            :format-value="(v) => m(v)"
            aria-label="Revenue by month and the same month a year earlier"
          />
          <div class="yoy-head">
            <h3>Change vs the same month last year</h3>
            <span>Click a month to see its invoice lines</span>
          </div>
          <SignedBarChart
            :labels="months.map((x) => x.month)"
            :values="months.map((x) => (x.prev_year == null ? 0 : x.revenue - x.prev_year))"
            :colors="months.map((x) => (x.prev_year != null && x.revenue < x.prev_year ? 'var(--viz-2)' : 'var(--viz-1)'))"
            :height="150"
            value-name="Change"
            :format-x="(x) => monthLabel(x)"
            :format-y="(v) => ax(v)"
            :format-title="(x) => monthLabel(x, true)"
            :format-value="(v) => m(v)"
            :detail="(i) => `${m(months[i].revenue)} vs ${months[i].prev_year == null ? '—' : m(months[i].prev_year)} (${pct(months[i].yoy_pct, 1, true)})`"
            aria-label="Year-on-year change by month"
            data-testid="yoy-bars"
            @select="(i) => $emit('drill', { month: months[i].month })"
          />
        </template>
      </div>
    </section>

    <div class="grid2">
      <section class="ui-card">
        <div class="ui-card__head wrap">
          <div>
            <h2>By client</h2>
            <span class="sub">Share of revenue, rank and change vs a year earlier</span>
          </div>
          <span v-if="d" class="ui-badge ui-badge--info">{{ d.by_client.length }} clients</span>
        </div>
        <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 260px"></div></div>
        <div v-else-if="!d.by_client.length" class="ui-empty small"><p>No clients in this range.</p></div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-testid="by-client">
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th class="num">Revenue</th>
                <th class="num hide-sm">Share</th>
                <th class="num hide-sm">YoY</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in clientRows" :key="c.key" class="is-clickable" :class="{ on: filters.client === c.key }" @click="$emit('drill', { client: c.key, clientName: c.name })">
                <td class="muted">{{ c.rank }}</td>
                <td>
                  <div class="nm">{{ c.name }}</div>
                  <div class="bar"><span :style="{ width: Math.max(0, c.share_pct) + '%' }"></span></div>
                </td>
                <td class="num">{{ m(c.revenue) }}</td>
                <td class="num hide-sm">{{ pct(c.share_pct) }}</td>
                <td class="num hide-sm" :class="c.yoy_pct > 0 ? 'up' : c.yoy_pct < 0 ? 'down' : ''">{{ c.prev ? pct(c.yoy_pct, 0, true) : 'new' }}</td>
              </tr>
            </tbody>
          </table>
          <button v-if="d.by_client.length > 12" class="ui-btn ui-btn--ghost ui-btn--sm more" type="button" @click="allClients = !allClients">
            {{ allClients ? 'Show top 12' : `Show all ${d.by_client.length}` }}
          </button>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head wrap">
          <div>
            <h2>By service line</h2>
            <span class="sub">Invoice lines classified by keywords — <router-link :to="{ query: { ...$route.query, view: 'services' } }">edit mapping</router-link></span>
          </div>
        </div>
        <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 260px"></div></div>
        <div v-else-if="!d.by_line.length" class="ui-empty small"><p>No revenue in this range.</p></div>
        <ul v-else class="lines" data-testid="by-line">
          <li v-for="l in d.by_line" :key="l.key" :class="{ on: filters.line === l.key }">
            <button type="button" @click="$emit('drill', { line: l.key })">
              <span class="ln"><i class="dviz-swatch" :style="{ background: LINE_COLORS[l.key] }"></i>{{ l.name }}</span>
              <strong>{{ m(l.revenue) }}</strong>
              <span class="meta">{{ pct(l.share_pct) }} · {{ l.prev ? pct(l.yoy_pct, 0, true) + ' YoY' : 'new' }}</span>
              <span class="bar"><span :style="{ width: Math.max(0, l.share_pct) + '%', background: LINE_COLORS[l.key] }"></span></span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <section v-if="hasDrill" class="ui-card mb" data-testid="drill">
      <div class="ui-card__head wrap">
        <div>
          <h2>Invoice lines</h2>
          <span class="sub">{{ d ? `${d.lines.length} line${d.lines.length === 1 ? '' : 's'} · ${m(drillTotal)}` : '' }}</span>
        </div>
        <button class="ui-btn ui-btn--sm" type="button" :disabled="!d || !d.lines.length" data-testid="drill-csv" @click="exportLines"><i class="fa-solid fa-download"></i> CSV</button>
      </div>
      <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 200px"></div></div>
      <div v-else-if="!d.lines.length" class="ui-empty small"><p>No invoice lines match.</p></div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Document</th>
              <th>Client</th>
              <th class="hide-sm">Line</th>
              <th class="num">{{ d.conversion.currency }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in d.lines.slice(0, 200)" :key="l.invoice_id + i" class="is-clickable" @click="$router.push('/invoices/' + l.invoice_id)">
              <td class="nowrap">{{ day(l.date) }}</td>
              <td class="nowrap">
                {{ l.number }} <span v-if="l.doc_type === 'credit_note'" class="ui-badge ui-badge--void">credit</span>
                <span v-if="l.source === 'zoho'" class="ui-badge ui-badge--info">Zoho</span>
              </td>
              <td>{{ l.client }}</td>
              <td class="hide-sm">
                <div class="desc" :title="l.description">{{ l.description }}</div>
                <small class="muted">{{ LINE_NAMES[l.line] || l.line }}</small>
              </td>
              <td class="num">
                {{ m(l.amount_home) }}
                <small v-if="l.currency !== d.conversion.currency" class="muted block">{{ l.currency }} {{ num(l.amount, 2) }}</small>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="d.lines.length > 200" class="more-note">Showing 200 of {{ d.lines.length }} — export the CSV for all.</p>
      </div>
    </section>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import TimeChart from '@/components/dashboard/charts/TimeChart.vue'
import SignedBarChart from './charts/SignedBarChart.vue'
import { analyticsApi, LINE_COLORS, monthLabel } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { money, axis, num, pct, day, downloadCsv, fileStamp } from './fmt'

const LINE_NAMES = {
  web_dev: 'Web development',
  hosting: 'Hosting',
  domains: 'Domains',
  workspace: 'Google Workspace & email',
  maintenance: 'Maintenance & support',
  software: 'Software & ERP',
  consulting: 'Consulting & training',
  other: 'Other'
}

export default {
  name: 'RevenueView',
  components: { KpiCard, TimeChart, SignedBarChart },
  props: { params: { type: Object, required: true }, filters: { type: Object, required: true } },
  emits: ['drill', 'loaded'],
  data() {
    return { d: null, error: '', req: 0, allClients: false, LINE_COLORS, LINE_NAMES }
  },
  computed: {
    cur() {
      return this.d?.conversion?.currency
    },
    months() {
      return this.d?.months || []
    },
    series() {
      return [
        { key: 'rev', name: 'Revenue', values: this.months.map((x) => x.revenue), color: 'var(--viz-1)', type: 'area' },
        { key: 'prev', name: 'Same month last year', values: this.months.map((x) => x.prev_year || 0), color: 'var(--viz-prev)', type: 'line', dashed: true }
      ]
    },
    clientRows() {
      const l = this.d?.by_client || []
      return this.allClients ? l : l.slice(0, 12)
    },
    topShare() {
      const t = this.d?.by_client?.[0]
      return t ? `Largest: ${t.share_pct}% of revenue` : 'In this range'
    },
    hasDrill() {
      return !!(this.filters.client || this.filters.line || this.filters.month)
    },
    drillTotal() {
      return (this.d?.lines || []).reduce((s, l) => s + l.amount_home, 0)
    },
    key() {
      return JSON.stringify([this.params, this.filters.client, this.filters.line, this.filters.month])
    }
  },
  watch: {
    key() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    monthLabel,
    num,
    pct,
    day,
    m(v, c = false) {
      return money(v, this.cur, c)
    },
    ax(v) {
      return axis(v, this.cur)
    },
    async load() {
      const id = ++this.req
      try {
        const d = await analyticsApi.revenue({ ...this.params, client: this.filters.client, line: this.filters.line, month: this.filters.month })
        if (id !== this.req) return
        this.d = d
        this.error = ''
        this.$emit('loaded', d)
      } catch (e) {
        if (id === this.req) this.error = apiErrorMessage(e, 'Could not load revenue analytics.')
      }
    },
    exportCsv() {
      const d = this.d
      if (!d) return
      const rows = [[`Revenue ${d.from} to ${d.to} (${d.conversion.currency}, excl. tax)`], [d.conversion.note], [], ['Month', 'Revenue', 'Same month last year', 'YoY %', 'Documents']]
      d.months.forEach((x) => rows.push([x.month, x.revenue, x.prev_year ?? '', x.yoy_pct ?? '', x.docs]))
      rows.push([], ['Rank', 'Client', 'Customer ID', 'Revenue', 'Share %', 'Previous year', 'YoY %', 'Documents'])
      d.by_client.forEach((c) => rows.push([c.rank, c.name, c.customer_id || '', c.revenue, c.share_pct, c.prev, c.yoy_pct ?? '', c.docs]))
      rows.push([], ['Service line', 'Revenue', 'Share %', 'Previous year', 'YoY %'])
      d.by_line.forEach((l) => rows.push([l.name, l.revenue, l.share_pct, l.prev, l.yoy_pct ?? '']))
      downloadCsv(`revenue-${fileStamp()}.csv`, rows)
    },
    exportLines() {
      const d = this.d
      const rows = [['Date', 'Number', 'Type', 'Client', 'Customer ID', 'Description', 'Service line', 'Currency', 'Amount', `Amount ${d.conversion.currency}`, 'Source']]
      d.lines.forEach((l) => rows.push([l.date, l.number, l.doc_type, l.client, l.customer_id || '', l.description, l.line, l.currency, l.amount, l.amount_home, l.source]))
      downloadCsv(`revenue-lines-${fileStamp()}.csv`, rows)
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

.yoy-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin: 18px 0 6px;
}

.yoy-head h3 {
  font-size: 13px;
  font-weight: 650;
  margin: 0;
}

.yoy-head span {
  font-size: 12px;
  color: var(--text-3);
}

.grid2 {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.grid2 > .ui-card {
  min-width: 0;
}

.nm {
  font-weight: 550;
}

.bar {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-subtle);
  margin-top: 5px;
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--viz-1);
  border-radius: 2px;
}

tr.on td {
  background: var(--accent-soft);
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

.more {
  margin: 8px 12px 12px;
}

.more-note {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-3);
}

.lines {
  list-style: none;
  margin: 0;
  padding: 8px;
}

.lines li button {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 10px;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.lines li button:hover,
.lines li.on button {
  background: var(--surface-hover);
}

.lines li.on button {
  box-shadow: inset 0 0 0 1px var(--accent);
}

.ln {
  display: inline-flex;
  align-items: center;
  font-weight: 550;
  min-width: 0;
}

.lines strong {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.meta {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--text-3);
}

.lines .bar {
  grid-column: 1 / -1;
}

.desc {
  max-width: 340px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nowrap {
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid2 {
    grid-template-columns: minmax(0, 1fr);
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
