<template>
  <div class="cv" data-testid="view-clients">
    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="kpis">
      <KpiCard label="Top client share" icon="fa-solid fa-crown" :tone="(k?.top1_pct || 0) >= 25 ? 'warning' : 'success'" :loading="!d" :value="pct(k?.top1_pct)" :meta="`Top 5: ${pct(k?.top5_pct)} · top 10: ${pct(k?.top10_pct)}`" :show-delta="false" data-kpi="top1" />
      <KpiCard label="HHI" icon="fa-solid fa-scale-unbalanced" :tone="k?.level === 'high' ? 'danger' : k?.level === 'moderate' ? 'warning' : 'success'" :loading="!d" :value="num(k?.hhi)" :meta="`${levelText} · like ${num(k?.effective_clients, 1)} equal clients`" :show-delta="false" data-kpi="hhi" />
      <KpiCard label="Churn rate" icon="fa-solid fa-user-minus" tone="warning" :loading="!d" :value="ch?.churn_rate_pct == null ? '—' : pct(ch.churn_rate_pct)" meta="Clients of the prior 12 months who didn’t buy in the last 12" :show-delta="false" data-kpi="churn" />
      <KpiCard label="Average CLV" icon="fa-solid fa-gem" tone="info" :loading="!d" :value="m(v?.mean)" :meta="`Median ${m(v?.median, true)} · ${num(v?.active_clients)} active clients`" :show-delta="false" data-kpi="clv" />
    </div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Cohort retention</h2>
          <span class="sub">Clients grouped by their first invoice; share still buying in each later {{ grain }}</span>
        </div>
        <div class="ctl">
          <div class="ui-tabs" role="tablist" aria-label="Metric">
            <button type="button" class="ui-tab" :class="{ 'is-active': metric === 'logo' }" @click="metric = 'logo'">Clients</button>
            <button type="button" class="ui-tab" :class="{ 'is-active': metric === 'revenue' }" @click="metric = 'revenue'">Revenue</button>
          </div>
          <select v-model="grain" class="ui-select sm" aria-label="Cohort period" data-testid="cohort-grain">
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>
      <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
      <div v-else-if="!d.cohorts.length" class="ui-empty small"><p>No new clients in this range.</p></div>
      <div v-else class="heat-wrap">
        <table class="heat" data-testid="cohorts">
          <thead>
            <tr>
              <th class="sticky">Cohort</th>
              <th class="num">Clients</th>
              <th v-for="i in periods" :key="i" class="num">{{ i - 1 }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in d.cohorts" :key="c.cohort">
              <th class="sticky">{{ c.cohort }}</th>
              <td class="num">{{ c.size }}</td>
              <td
                v-for="i in periods"
                :key="i"
                class="num cell"
                :style="{ background: cellVal(c, i - 1) < 0 ? 'transparent' : heat(cellVal(c, i - 1) / (metric === 'logo' ? 100 : maxRev)) }"
                :title="cellTitle(c, i - 1)"
              >
                {{ cellVal(c, i - 1) < 0 ? '' : Math.round(cellVal(c, i - 1)) + '%' }}
              </td>
            </tr>
          </tbody>
        </table>
        <p class="foot">
          Column = {{ grain }}s since the first invoice (0 = the first {{ grain }}).
          {{ metric === 'logo' ? 'Cells: % of the cohort’s clients invoiced in that period.' : 'Cells: revenue in that period as % of the cohort’s first-period revenue (net revenue retention).' }}
        </p>
      </div>
    </section>

    <div class="grid2">
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Client concentration</h2>
            <span class="sub">{{ k?.explanation }}</span>
          </div>
        </div>
        <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
        <div v-else class="ui-card__body conc">
          <svg class="lorenz" viewBox="0 0 220 160" role="img" aria-label="Cumulative share of revenue by client rank">
            <line x1="30" y1="140" x2="210" y2="140" class="ax" />
            <line x1="30" y1="10" x2="30" y2="140" class="ax" />
            <line x1="30" y1="140" x2="210" y2="10" class="eq" />
            <polyline :points="lorenzPts" fill="none" stroke="var(--viz-1)" stroke-width="2" stroke-linejoin="round" />
            <text x="30" y="156" class="lbl">top client</text>
            <text x="210" y="156" class="lbl" text-anchor="end">all {{ k.clients }}</text>
            <text x="26" y="14" class="lbl" text-anchor="end">100%</text>
          </svg>
          <div class="top">
            <div v-for="t in k.top.slice(0, 5)" :key="t.key" class="trow">
              <span class="nm">{{ t.rank }}. {{ t.name }}</span><strong>{{ pct(t.share_pct) }}</strong>
            </div>
            <div v-if="k.by_year.length" class="years">
              <div class="mini-h">HHI by year</div>
              <span v-for="y in k.by_year" :key="y.year" class="ui-badge" :class="y.hhi >= 2500 ? 'ui-badge--danger' : y.hhi >= 1500 ? 'ui-badge--warning' : 'ui-badge--success'">{{ y.year }}: {{ num(y.hhi) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Churn</h2>
            <span class="sub">As of {{ day(ch?.as_of) }} · last invoice 6–12 months ago = at risk, over 12 = lapsed</span>
          </div>
        </div>
        <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
        <div v-else class="ui-card__body">
          <div class="churn-figs">
            <div><small>Active</small><strong>{{ ch.active }}</strong></div>
            <div><small>At risk</small><strong class="warn">{{ ch.at_risk }}</strong><span class="hint">{{ m(ch.at_risk_value, true) }}/yr</span></div>
            <div><small>Lapsed</small><strong class="danger">{{ ch.lapsed }}</strong><span class="hint">{{ m(ch.lapsed_value, true) }}/yr</span></div>
          </div>
          <div v-if="ch.by_year.length" class="ui-table-wrap compact">
            <table class="ui-table">
              <thead>
                <tr><th>Year</th><th class="num">Start</th><th class="num">Kept</th><th class="num">New</th><th class="num">Churn</th></tr>
              </thead>
              <tbody>
                <tr v-for="y in ch.by_year.slice(-5)" :key="y.year">
                  <td>{{ y.year }}<small v-if="y.year === thisYear" class="muted"> to date</small></td><td class="num">{{ y.start }}</td><td class="num">{{ y.retained }}</td><td class="num">{{ y.new }}</td><td class="num">{{ y.churn_pct == null ? '—' : pct(y.churn_pct, 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="ch.cancelled_sites.length" class="note"><i class="fa-solid fa-server"></i> {{ ch.cancelled_sites.length }} hosting site{{ ch.cancelled_sites.length === 1 ? '' : 's' }} cancelled: {{ ch.cancelled_sites.map((s) => s.domain).join(', ') }}</p>
        </div>
      </section>
    </div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Clients to win back</h2>
          <span class="sub">At risk and lapsed, by yearly value</span>
        </div>
        <router-link to="/insights?type=winback" class="ui-btn ui-btn--sm">Opportunities</router-link>
      </div>
      <div v-if="d && !ch.clients.length" class="ui-empty small"><p>No lapsed clients — everyone bought in the last 6 months.</p></div>
      <div v-else-if="d" class="ui-table-wrap">
        <table class="ui-table" data-testid="churn-list">
          <thead>
            <tr><th>Client</th><th>Status</th><th class="hide-sm">Last invoice</th><th class="num hide-sm">Invoices</th><th class="num">Yearly value</th><th class="num hide-sm">Lifetime</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in ch.clients.slice(0, 25)" :key="c.key" class="is-clickable" @click="openClient(c)">
              <td>{{ c.name }}</td>
              <td><span class="ui-badge" :class="c.status === 'lapsed' ? 'ui-badge--danger' : 'ui-badge--warning'">{{ c.status === 'lapsed' ? 'Lapsed' : 'At risk' }}</span></td>
              <td class="hide-sm">{{ day(c.last_invoice) }} <small class="muted">({{ c.months_since }} mo)</small></td>
              <td class="num hide-sm">{{ c.invoices }}</td>
              <td class="num">{{ m(c.annual_value) }}</td>
              <td class="num hide-sm">{{ m(c.lifetime_revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Customer lifetime value</h2>
          <span class="sub">{{ v?.formula }} Margin: {{ v?.margin_source }}.</span>
        </div>
      </div>
      <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 200px"></div></div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table" data-testid="clv">
          <thead>
            <tr><th>Client</th><th class="hide-sm">Since</th><th class="num hide-sm">Months</th><th class="num">Yearly value</th><th class="num">CLV</th><th class="num hide-sm">Lifetime so far</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in v.top.slice(0, 20)" :key="c.key" class="is-clickable" @click="openClient(c)">
              <td>{{ c.name }} <span v-if="c.status !== 'active'" class="ui-badge" :class="c.status === 'lapsed' ? 'ui-badge--danger' : 'ui-badge--warning'">{{ c.status === 'lapsed' ? 'lapsed' : 'at risk' }}</span></td>
              <td class="hide-sm">{{ day(c.first_invoice) }}</td>
              <td class="num hide-sm">{{ c.tenure_months }}</td>
              <td class="num">{{ m(c.annual_value) }}</td>
              <td class="num"><strong>{{ m(c.clv) }}</strong></td>
              <td class="num hide-sm">{{ m(c.lifetime_revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { analyticsApi } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { money, num, pct, day, heat, downloadCsv, fileStamp } from './fmt'
import { loadPref, savePref } from '@/components/dashboard/analytics'

export default {
  name: 'ClientsView',
  components: { KpiCard },
  props: { params: { type: Object, required: true }, filters: { type: Object, required: true } },
  emits: ['drill', 'loaded'],
  data() {
    return { d: null, error: '', req: 0, grain: loadPref('an.cohort.grain', 'quarter'), metric: 'logo' }
  },
  computed: {
    cur() {
      return this.d?.conversion?.currency
    },
    k() {
      return this.d?.concentration
    },
    ch() {
      return this.d?.churn
    },
    v() {
      return this.d?.clv
    },
    thisYear() {
      return new Date().getFullYear()
    },
    levelText() {
      return { low: 'Unconcentrated', moderate: 'Moderately concentrated', high: 'Highly concentrated' }[this.k?.level] || ''
    },
    periods() {
      // Show only columns that have data in some cohort.
      const c = this.d?.cohorts || []
      let last = 0
      c.forEach((r) => r.active.forEach((v, i) => v >= 0 && (last = Math.max(last, i))))
      return last + 1
    },
    maxRev() {
      let mx = 100
      ;(this.d?.cohorts || []).forEach((r) => r.net_revenue_retention.forEach((v) => (mx = Math.max(mx, v))))
      return mx
    },
    lorenzPts() {
      const l = this.k?.lorenz || []
      if (!l.length) return ''
      const pts = ['30,140']
      l.forEach((v, i) => pts.push(`${30 + ((i + 1) / l.length) * 180},${140 - (v / 100) * 130}`))
      return pts.join(' ')
    },
    key() {
      return JSON.stringify([this.params, this.grain])
    }
  },
  watch: {
    key() {
      this.load()
    },
    grain(g) {
      savePref('an.cohort.grain', g)
    }
  },
  created() {
    this.load()
  },
  methods: {
    num,
    pct,
    day,
    heat,
    m(v, c = false) {
      return money(v, this.cur, c)
    },
    cellVal(c, i) {
      return this.metric === 'logo' ? c.retention[i] : c.net_revenue_retention[i]
    },
    cellTitle(c, i) {
      if (c.active[i] < 0) return 'Not reached yet'
      return `${c.cohort}, ${this.grain} ${i}: ${c.active[i]} of ${c.size} clients · ${this.m(c.revenue[i])}`
    },
    openClient(c) {
      this.$router.push({ query: { ...this.$route.query, view: 'revenue', range: 'all', client: c.key, client_name: c.name } })
    },
    async load() {
      const id = ++this.req
      try {
        const d = await analyticsApi.clients({ ...this.params, grain: this.grain })
        if (id !== this.req) return
        this.d = d
        this.error = ''
        this.$emit('loaded', d)
      } catch (e) {
        if (id === this.req) this.error = apiErrorMessage(e, 'Could not load client analytics.')
      }
    },
    exportCsv() {
      const d = this.d
      if (!d) return
      const rows = [[`Clients ${d.from} to ${d.to} (${d.conversion.currency})`], [], ['Cohort', 'Clients', ...Array.from({ length: d.periods }, (_, i) => `Retention % ${d.grain} ${i}`)]]
      d.cohorts.forEach((c) => rows.push([c.cohort, c.size, ...c.retention.map((x) => (x < 0 ? '' : x))]))
      rows.push([], ['Concentration', 'Top 1 %', 'Top 5 %', 'Top 10 %', 'HHI', 'Effective clients'], ['', d.concentration.top1_pct, d.concentration.top5_pct, d.concentration.top10_pct, d.concentration.hhi, d.concentration.effective_clients])
      rows.push([], ['Client', 'Status', 'First invoice', 'Last invoice', 'Months', 'Invoices', 'Lifetime revenue', 'Yearly value', 'CLV'])
      d.clv.top.forEach((c) => rows.push([c.name, c.status, c.first_invoice, c.last_invoice, c.tenure_months, c.invoices, c.lifetime_revenue, c.annual_value, c.clv]))
      downloadCsv(`clients-${fileStamp()}.csv`, rows)
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
  max-width: 720px;
}

.ctl {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.ui-select.sm {
  width: auto;
  padding-top: 6px;
  padding-bottom: 6px;
}

.heat-wrap {
  overflow-x: auto;
  padding: 4px 16px 12px;
}

.heat {
  border-collapse: separate;
  border-spacing: 2px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 100%;
}

.heat th,
.heat td {
  padding: 6px 8px;
  white-space: nowrap;
  text-align: right;
  color: var(--text);
}

.heat thead th {
  color: var(--text-3);
  font-weight: 600;
}

.heat .sticky {
  position: sticky;
  left: 0;
  background: var(--surface);
  text-align: left;
  z-index: 1;
}

.cell {
  border-radius: 4px;
  min-width: 42px;
}

.foot {
  font-size: 12px;
  color: var(--text-3);
  margin: 8px 0 0;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.grid2 > .ui-card {
  min-width: 0;
}

.conc {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.lorenz {
  width: 100%;
  max-width: 260px;
}

.lorenz .ax {
  stroke: var(--border-strong);
}

.lorenz .eq {
  stroke: var(--text-3);
  stroke-dasharray: 4 4;
}

.lorenz .lbl {
  fill: var(--text-3);
  font-size: 10px;
}

.trow {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.trow .nm {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trow strong {
  font-variant-numeric: tabular-nums;
}

.years {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mini-h {
  width: 100%;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}

.churn-figs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.churn-figs small {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.churn-figs strong {
  font-size: 20px;
  font-weight: 700;
}

.hint {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.warn {
  color: var(--warning);
}

.danger {
  color: var(--danger);
}

.compact :deep(td),
.compact :deep(th) {
  padding-top: 6px;
  padding-bottom: 6px;
}

.note {
  font-size: 12.5px;
  color: var(--text-2);
  margin: 10px 0 0;
}

.muted {
  color: var(--text-3);
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

  .conc {
    grid-template-columns: minmax(0, 1fr);
  }

  .kpis {
    gap: 10px;
  }
}
</style>
