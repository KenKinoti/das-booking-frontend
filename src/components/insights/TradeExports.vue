<template>
  <div data-testid="trade">
    <div class="bar">
      <p class="lead">
        Your foreign trade from your own invoices: where revenue comes from, what foreign-currency money is owed and what it is worth today, and how far your foreign costs offset your foreign income.
        <template v-if="d">Amounts in {{ d.currency }}, excluding tax, at the rate locked on each invoice.</template>
      </p>
      <div class="actions">
        <div class="seg" role="group" aria-label="Period">
          <button v-for="p in PRESETS" :key="p.key" type="button" class="seg__btn" :class="{ on: preset === p.key }" :data-preset="p.key" @click="setPreset(p.key)">{{ p.label }}</button>
        </div>
        <select v-model="csv" class="ui-select csv" aria-label="Table to download" data-testid="trade-csv-select">
          <option v-for="x in CSVS" :key="x.key" :value="x.key">{{ x.label }}</option>
        </select>
        <button class="ui-btn ui-btn--sm" type="button" :disabled="downloading" data-testid="trade-csv" @click="download(csv)"><i :class="downloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i> CSV</button>
      </div>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="kpis">
      <KpiCard label="Export share" icon="fa-solid fa-earth-africa" tone="info" :loading="!d" :value="t.export_pct == null ? '—' : pct(t.export_pct)" :meta="shareMeta" :show-delta="false" data-kpi="export_share" />
      <KpiCard label="Export revenue" icon="fa-solid fa-plane-departure" tone="success" :loading="!d" :value="m(t.export)" :meta="`${t.export_clients || 0} clients in ${t.export_markets || 0} countries`" :delta="t.export_yoy_pct" delta-title="Against the same period a year earlier" data-kpi="export" />
      <KpiCard label="Domestic revenue" icon="fa-solid fa-house" :loading="!d" :value="m(t.domestic)" :meta="d ? d.home_country_name || 'Home country not set' : ''" :show-delta="false" data-kpi="domestic" />
      <KpiCard
        label="Unrealised FX"
        icon="fa-solid fa-scale-balanced"
        :tone="rc.unrealised < 0 ? 'danger' : 'success'"
        :loading="!d"
        :value="d ? signed(rc.unrealised) : ''"
        :meta="d ? (rc.invoices ? `${rc.invoices} open foreign invoice${rc.invoices === 1 ? '' : 's'} at today's rates` : 'No open foreign invoices') : ''"
        :show-delta="false"
        data-kpi="unrealised"
      />
    </div>

    <ul v-if="d && flags.length" class="flags" data-testid="trade-notes">
      <li v-for="(n, i) in flags" :key="i"><i class="fa-solid fa-circle-info"></i> {{ n }}</li>
    </ul>

    <div v-if="d && !t.docs && !t.revenue" class="ui-card mb">
      <div class="ui-empty small">
        <div class="ui-empty__icon"><i class="fa-solid fa-earth-africa"></i></div>
        <h3>No invoices in this period</h3>
        <p>Choose a longer period, or send your first invoice. Set each client's country (Customers) so their revenue is filed correctly.</p>
      </div>
    </div>

    <div v-if="d" class="grid2">
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Domestic vs export</h2>
            <span class="sub">Revenue by month · {{ range }}</span>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" type="button" data-testid="trend-table-toggle" @click="trendTable = !trendTable"><i :class="trendTable ? 'fa-solid fa-chart-column' : 'fa-solid fa-table'"></i> {{ trendTable ? 'Chart' : 'Table' }}</button>
        </div>
        <div class="ui-card__body">
          <template v-if="!trendTable">
            <div class="dviz-legend lg">
              <span><i class="dviz-swatch" style="background: var(--viz-1)"></i>Domestic</span>
              <span><i class="dviz-swatch" style="background: var(--viz-2)"></i>Export</span>
            </div>
            <StackedBarChart :labels="d.months.map((x) => x.month)" :series="trendSeries" :height="230" :format-y="(v) => axis(v, d.currency)" :format-x="(v) => monthLabel(v)" :format-title="(v) => monthLabel(v, true)" :format-value="(v) => m(v)" aria-label="Domestic and export revenue by month" />
          </template>
          <div v-else class="ui-table-wrap scroll">
            <table class="ui-table" data-testid="trend-table">
              <thead><tr><th>Month</th><th class="num">Domestic</th><th class="num">Export</th><th class="num">Export share</th></tr></thead>
              <tbody>
                <tr v-for="x in d.months" :key="x.month" :data-month="x.month">
                  <td>{{ monthLabel(x.month, true) }}</td>
                  <td class="num">{{ m(x.domestic) }}</td>
                  <td class="num">{{ m(x.export) }}</td>
                  <td class="num">{{ x.export_pct == null ? '—' : pct(x.export_pct) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>By currency</h2>
            <span class="sub">What you invoiced in each currency</span>
          </div>
        </div>
        <div v-if="!d.currencies.length" class="ui-empty small"><p>No invoices in this period.</p></div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-testid="trade-currencies">
            <thead><tr><th>Currency</th><th class="num">Invoiced</th><th class="num hide-sm">In {{ d.currency }}</th><th class="num">Share</th></tr></thead>
            <tbody>
              <tr v-for="c in d.currencies" :key="c.currency" class="is-clickable" :data-currency="c.currency" @click="openDocs({ currency: c.currency }, `Documents in ${c.currency}`)">
                <td><strong>{{ c.currency }}</strong><small class="muted block">{{ c.docs }} document{{ c.docs === 1 ? '' : 's' }}</small></td>
                <td class="num">{{ m(c.amount, c.currency) }}</td>
                <td class="num hide-sm">{{ m(c.home) }}</td>
                <td class="num"><span class="share"><i :style="{ width: Math.max(0, Math.min(100, c.share_pct)) + '%' }"></i></span>{{ pct(c.share_pct) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section v-if="d" class="ui-card mb">
      <div class="ui-card__head">
        <div>
          <h2>Revenue by client country</h2>
          <span class="sub">{{ d.formulas.country }}</span>
        </div>
      </div>
      <div v-if="!d.countries.length" class="ui-empty small"><p>No invoices in this period.</p></div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table" data-testid="trade-countries">
          <thead>
            <tr>
              <th>Country</th><th class="num">Revenue</th><th class="num">Share</th><th class="num hide-sm">vs year earlier</th><th class="num hide-sm">Invoices</th><th class="num hide-sm">Clients</th>
              <th class="num hide-sm">Average invoice</th><th class="num">Days to pay</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in d.countries" :key="c.country" class="is-clickable" :data-country="c.country" @click="openDocs({ country: c.country || 'none' }, `${c.name} — documents`)">
              <td>
                <strong>{{ c.name }}</strong>
                <span class="ui-badge" :class="c.domestic ? 'ui-badge--draft' : 'ui-badge--info'">{{ c.domestic ? 'Domestic' : 'Export' }}</span>
                <small v-if="c.inferred_docs" class="muted block">{{ c.inferred_docs }} document{{ c.inferred_docs === 1 ? '' : 's' }} without a client country</small>
              </td>
              <td class="num">{{ m(c.revenue) }}</td>
              <td class="num"><span class="share"><i :style="{ width: Math.max(0, Math.min(100, c.share_pct)) + '%' }"></i></span>{{ pct(c.share_pct) }}</td>
              <td class="num hide-sm" :class="c.yoy_pct == null ? '' : c.yoy_pct >= 0 ? 'good' : 'bad'">{{ c.yoy_pct == null ? '—' : pct(c.yoy_pct, 1, true) }}</td>
              <td class="num hide-sm">{{ c.invoices }}</td>
              <td class="num hide-sm">{{ c.clients }}</td>
              <td class="num hide-sm">{{ m(c.avg_invoice) }}</td>
              <td class="num">{{ c.avg_days_to_pay == null ? '—' : num(c.avg_days_to_pay, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="d && d.top_export_clients.length" class="ui-card mb">
      <div class="ui-card__head">
        <div>
          <h2>Top export clients</h2>
          <span class="sub">Clients outside {{ d.home_country_name || 'your country' }} · {{ range }}</span>
        </div>
      </div>
      <div class="ui-table-wrap">
        <table class="ui-table" data-testid="trade-clients">
          <thead><tr><th>Client</th><th class="hide-sm">Country</th><th class="hide-sm">Currency</th><th class="num">Revenue</th><th class="num">Of exports</th><th class="num hide-sm">Invoices</th></tr></thead>
          <tbody>
            <tr v-for="c in d.top_export_clients" :key="c.name + c.country" :class="{ 'is-clickable': c.customer_id }" @click="c.customer_id && $router.push(`/customers?customer=${c.customer_id}`)">
              <td><strong>{{ c.name }}</strong><small class="muted block show-sm">{{ c.country_name }}</small></td>
              <td class="hide-sm">{{ c.country_name }}</td>
              <td class="hide-sm">{{ c.currencies }}</td>
              <td class="num">{{ m(c.revenue) }}</td>
              <td class="num">{{ pct(c.share_pct) }}</td>
              <td class="num hide-sm">{{ c.invoices }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <template v-if="d">
      <div class="sec">
        <h2>Foreign-currency position</h2>
        <span>Receivables as of {{ day(d.today) }}; payments and costs in {{ range }}</span>
      </div>
      <div class="stack">
        <section class="ui-card">
          <div class="ui-card__head">
            <div>
              <h2>Open receivables at today's rates</h2>
              <span class="sub">What unpaid foreign-currency invoices were worth when issued, and now</span>
            </div>
          </div>
          <div v-if="!rc.rows.length" class="ui-empty small">
            <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
            <p>No unpaid invoices in a foreign currency.</p>
          </div>
          <div v-else class="ui-table-wrap">
            <table class="ui-table" data-testid="trade-receivables">
              <thead>
                <tr><th>Currency</th><th class="num">Owed</th><th class="num hide-sm">At invoice rate</th><th class="num hide-sm">Today's rate</th><th class="num hide-sm">At today's rate</th><th class="num">Gain / loss</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in rc.rows" :key="r.currency" class="is-clickable" :data-currency="r.currency" @click="openDocs({ currency: r.currency, open: 1 }, `Open ${r.currency} invoices`)">
                  <td>
                    <strong>{{ r.currency }}</strong>
                    <small class="muted block">{{ r.invoices }} invoice{{ r.invoices === 1 ? '' : 's' }}<template v-if="r.no_locked_rate"> · {{ r.no_locked_rate }} without a locked rate</template></small>
                  </td>
                  <td class="num">{{ m(r.balance, r.currency) }}</td>
                  <td class="num hide-sm">{{ r.locked_balance ? m(r.locked_home) : '—' }}</td>
                  <td class="num hide-sm">{{ r.today_rate ? num(r.today_rate, r.today_rate < 10 ? 4 : 2) : 'no rate' }}</td>
                  <td class="num hide-sm">{{ r.today_home == null ? '—' : m(r.today_home) }}</td>
                  <td class="num fx" :class="tone(r.unrealised)">
                    <template v-if="r.unrealised != null"><i :class="r.unrealised < 0 ? 'fa-solid fa-arrow-trend-down' : 'fa-solid fa-arrow-trend-up'"></i> {{ signed(r.unrealised) }}<small v-if="r.unrealised_pct != null">{{ pct(r.unrealised_pct, 1, true) }}</small></template>
                    <template v-else>—</template>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr data-total="receivables">
                  <td><strong>Total</strong></td><td></td>
                  <td class="num hide-sm"><strong>{{ m(rc.locked_home) }}</strong></td><td class="hide-sm"></td>
                  <td class="num hide-sm"><strong>{{ m(rc.today_home) }}</strong></td>
                  <td class="num fx" :class="tone(rc.unrealised)"><strong>{{ signed(rc.unrealised) }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p class="formula"><i class="fa-solid fa-calculator"></i> {{ rc.formula }}</p>
        </section>

        <section class="ui-card">
          <div class="ui-card__head">
            <div>
              <h2>Realised on paid invoices</h2>
              <span class="sub">Payments received on foreign-currency invoices</span>
            </div>
          </div>
          <div v-if="!re.rows.length" class="ui-empty small"><p>{{ re.note || 'No payments on foreign-currency invoices in this period.' }}</p></div>
          <template v-else>
            <div class="ui-table-wrap">
              <table class="ui-table" data-testid="trade-realised">
                <thead><tr><th>Currency</th><th class="num">Received</th><th class="num hide-sm">At invoice rate</th><th class="num hide-sm">At payment rate</th><th class="num">Gain / loss</th></tr></thead>
                <tbody>
                  <tr v-for="r in re.rows" :key="r.currency" :data-currency="r.currency">
                    <td><strong>{{ r.currency }}</strong><small class="muted block">{{ r.payments }} payment{{ r.payments === 1 ? '' : 's' }}<template v-if="r.skipped"> · {{ r.skipped }} not counted</template></small></td>
                    <td class="num">{{ m(r.amount, r.currency) }}</td>
                    <td class="num hide-sm">{{ m(r.at_invoice_rate) }}</td>
                    <td class="num hide-sm">{{ m(r.at_payment_rate) }}</td>
                    <td class="num fx" :class="tone(r.gain)">{{ signed(r.gain) }}</td>
                  </tr>
                </tbody>
                <tfoot><tr data-total="realised"><td><strong>Total</strong></td><td></td><td class="hide-sm"></td><td class="hide-sm"></td><td class="num fx" :class="tone(re.gain)"><strong>{{ signed(re.gain) }}</strong></td></tr></tfoot>
              </table>
            </div>
            <p v-if="re.note" class="warn"><i class="fa-solid fa-triangle-exclamation"></i> {{ re.note }}</p>
          </template>
          <p class="formula"><i class="fa-solid fa-calculator"></i> {{ re.formula }}</p>
        </section>
      </div>

      <section class="ui-card mb">
        <div class="ui-card__head">
          <div>
            <h2>Natural hedge</h2>
            <span class="sub">What you earn and spend in each foreign currency · {{ range }}</span>
          </div>
          <router-link to="/expenses" class="ui-btn ui-btn--ghost ui-btn--sm">Expenses</router-link>
        </div>
        <div v-if="!d.hedge.length" class="ui-empty small"><p>No revenue or costs in a foreign currency in this period.</p></div>
        <div v-else class="ui-card__body hedge" data-testid="trade-hedge">
          <article v-for="h in d.hedge" :key="h.currency" class="hrow" :data-currency="h.currency">
            <div class="hrow__head">
              <strong>{{ h.currency }}</strong>
              <span class="io"><small>In</small>{{ m(h.in, h.currency) }}</span>
              <span class="io"><small>Out</small>{{ m(h.out, h.currency) }}</span>
              <span class="io"><small>{{ h.net >= 0 ? 'Exposed' : 'To buy' }}</small>{{ m(Math.abs(h.net), h.currency) }}</span>
            </div>
            <div v-if="h.in > 0" class="meter" role="img" :aria-label="`${h.currency} costs cover ${h.cover_pct}% of ${h.currency} income`">
              <i :style="{ width: Math.min(100, h.cover_pct || 0) + '%' }"></i>
              <span>{{ pct(h.cover_pct, 0) }} of {{ h.currency }} income covered by {{ h.currency }} costs</span>
            </div>
            <p class="note">{{ h.summary }}</p>
            <ul v-if="costsOf(h.currency).length" class="vendors">
              <li v-for="v in costsOf(h.currency)" :key="v.name"><span>{{ v.name }}</span><span>{{ m(v.amount, h.currency) }} <small class="muted">≈ {{ m(v.home) }}</small></span></li>
            </ul>
          </article>
          <p class="formula flat"><i class="fa-solid fa-calculator"></i> {{ d.formulas.hedge }}</p>
        </div>
      </section>
    </template>

    <TargetMarkets :currency="d ? d.currency : ''" />

    <!-- Drill-down -->
    <div v-if="docs" class="ui-modal-backdrop" @mousedown.self="docs = null">
      <div class="ui-modal" style="max-width: 920px" role="dialog" aria-modal="true" aria-labelledby="td-title" data-testid="trade-docs">
        <div class="ui-modal__head">
          <h2 id="td-title">{{ docs.title }}</h2>
          <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="docs = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="docs.loading" class="ui-skeleton" style="height: 200px"></div>
          <div v-else-if="docs.error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ docs.error }}</span></div>
          <div v-else-if="!docs.rows.length" class="ui-empty small"><p>No documents.</p></div>
          <template v-else>
            <p class="ui-hint">{{ docs.rows.length }} document{{ docs.rows.length === 1 ? '' : 's' }}<template v-if="docs.capped"> (first 500)</template> · total {{ m(docs.rows.reduce((s, x) => s + x.net_home, 0)) }}{{ docs.params.open ? ' net; balances at today\'s rates in the last columns' : '' }}</p>
            <div class="ui-table-wrap scroll">
              <table class="ui-table">
                <thead>
                  <tr>
                    <th>Document</th><th>Date</th><th>Client</th><th class="hide-sm">Country</th><th class="num">Net</th><th class="num">In {{ d.currency }}</th>
                    <th v-if="docs.params.open" class="num">Owed</th><th v-if="docs.params.open" class="num">Gain / loss</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="x in docs.rows" :key="x.id" class="is-clickable" @click="$router.push((x.doc_type === 'quote' ? '/quotes/' : '/invoices/') + x.id)">
                    <td><strong>{{ x.number }}</strong><small class="muted block">{{ x.doc_type === 'credit_note' ? 'Credit note' : x.status }}</small></td>
                    <td class="nowrap">{{ day(x.date) }}</td>
                    <td>{{ x.client }}</td>
                    <td class="hide-sm">{{ x.country_name }}<small v-if="x.country_basis !== 'client'" class="muted block">{{ x.country_basis === 'currency' ? 'from the currency' : 'assumed' }}</small></td>
                    <td class="num">{{ m(x.net, x.currency) }}</td>
                    <td class="num">{{ m(x.net_home) }}</td>
                    <td v-if="docs.params.open" class="num">{{ m(x.balance, x.currency) }}</td>
                    <td v-if="docs.params.open" class="num fx" :class="tone(x.unrealised)">{{ x.unrealised == null ? '—' : signed(x.unrealised) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
        <div class="ui-modal__foot">
          <button v-if="docs.rows.length" class="ui-btn" type="button" data-testid="docs-csv" @click="download('documents', docs.params)"><i class="fa-solid fa-download"></i> CSV</button>
          <button class="ui-btn ui-btn--primary" type="button" @click="docs = null">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import StackedBarChart from '@/components/analytics/charts/StackedBarChart.vue'
import TargetMarkets from './TargetMarkets.vue'
import { tradeApi, monthLabel, presetRange } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { downloadBlob } from '@/utils/format'
import { money, axis, num, pct, day } from '@/components/analytics/fmt'

const PRESETS = [
  { key: '12m', label: '12 months' },
  { key: 'ytd', label: 'This year' },
  { key: '24m', label: '24 months' },
  { key: 'all', label: 'All' }
]
const CSVS = [
  { key: 'countries', label: 'By country' },
  { key: 'months', label: 'By month' },
  { key: 'currencies', label: 'By currency' },
  { key: 'export_clients', label: 'Export clients' },
  { key: 'receivables', label: 'Open receivables & FX' },
  { key: 'realised', label: 'Realised FX' },
  { key: 'costs', label: 'Foreign costs' },
  { key: 'hedge', label: 'Natural hedge' },
  { key: 'documents', label: 'All documents' }
]

export default {
  name: 'TradeExports',
  components: { KpiCard, StackedBarChart, TargetMarkets },
  data() {
    return { d: null, error: '', preset: '12m', csv: 'countries', downloading: false, trendTable: false, docs: null, seq: 0, PRESETS, CSVS }
  },
  computed: {
    t() {
      return this.d?.totals || {}
    },
    rc() {
      return this.d?.receivables || { rows: [], unrealised: 0, invoices: 0 }
    },
    re() {
      return this.d?.realised || { rows: [] }
    },
    rangeParams() {
      return presetRange(this.preset)
    },
    range() {
      return this.d ? `${day(this.d.from)} – ${day(this.d.to)}` : ''
    },
    shareMeta() {
      if (!this.d) return ''
      const p = this.t.prev_export_pct
      return p == null ? 'of revenue in the period' : `of revenue · ${pct(p)} a year earlier`
    },
    flags() {
      // Everything except the generic conversion note (shown in the lead).
      return (this.d?.notes || []).slice(0, -1)
    },
    trendSeries() {
      return [
        { key: 'domestic', name: 'Domestic', color: 'var(--viz-1)', values: this.d.months.map((x) => x.domestic) },
        { key: 'export', name: 'Export', color: 'var(--viz-2)', values: this.d.months.map((x) => x.export) }
      ]
    }
  },
  created() {
    this.load()
  },
  methods: {
    num,
    pct,
    day,
    axis,
    monthLabel,
    m(v, cur) {
      return money(v, cur || this.d?.currency)
    },
    signed(v) {
      const n = Number(v) || 0
      return (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n), this.d?.currency)
    },
    tone(v) {
      return v == null || v === 0 ? '' : v > 0 ? 'good' : 'bad'
    },
    costsOf(cur) {
      return (this.d.costs.find((c) => c.currency === cur) || {}).vendors || []
    },
    setPreset(p) {
      this.preset = p
      this.load()
    },
    async load() {
      // The period can change while a request is in flight: only the latest answer is shown.
      const seq = ++this.seq
      try {
        const d = await tradeApi.get(this.rangeParams)
        if (seq !== this.seq) return
        this.d = d
        this.error = ''
      } catch (e) {
        if (seq === this.seq) this.error = apiErrorMessage(e, 'Could not load the trade figures.')
      }
    },
    async openDocs(params, title) {
      this.docs = { title, params, loading: true, rows: [], error: '', capped: false }
      try {
        const r = await tradeApi.documents({ ...this.rangeParams, ...params })
        this.docs = { ...this.docs, loading: false, rows: r.documents, capped: r.capped }
      } catch (e) {
        this.docs = { ...this.docs, loading: false, error: apiErrorMessage(e, 'Could not load the documents.') }
      }
    },
    async download(key, extra = {}) {
      this.downloading = true
      try {
        const blob = await tradeApi.exportCsv(key, { ...this.rangeParams, ...extra })
        downloadBlob(blob, `trade_${key}_${this.d.from}_${this.d.to}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not download the CSV'))
      } finally {
        this.downloading = false
      }
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.bar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.lead {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  max-width: 720px;
}

.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface);
}

.seg__btn {
  padding: 6px 11px;
  border: 0;
  border-left: 1px solid var(--border);
  background: transparent;
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
}

.seg__btn:first-child {
  border-left: 0;
}

.seg__btn.on {
  background: var(--accent-soft);
  color: var(--text);
}

.csv {
  width: auto;
  min-width: 0;
  max-width: 190px;
  padding-top: 5px;
  padding-bottom: 5px;
  font-size: 12.5px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.flags {
  list-style: none;
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--info-soft);
  font-size: 12.5px;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flags i {
  color: var(--info);
  margin-right: 4px;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.lg {
  margin-bottom: 8px;
}

.scroll {
  max-height: 420px;
  overflow: auto;
}

.muted {
  color: var(--text-3);
}

.block {
  display: block;
}

.show-sm {
  display: none;
}

.nowrap {
  white-space: nowrap;
}

.ui-table .ui-badge {
  margin-left: 6px;
}

.share {
  display: inline-block;
  width: 54px;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-subtle);
  margin-right: 8px;
  vertical-align: middle;
  overflow: hidden;
}

.share i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--viz-1);
}

.good {
  color: var(--success);
}

.bad {
  color: var(--danger);
}

.fx {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.fx small {
  display: block;
  font-size: 11px;
  color: var(--text-3);
}

.fx i {
  font-size: 11px;
}

.formula {
  margin: 0;
  padding: 10px 16px 14px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.formula.flat {
  padding: 0;
}

.formula i {
  margin-right: 4px;
}

.warn {
  margin: 0;
  padding: 8px 16px 0;
  font-size: 12px;
  color: var(--warning);
}

.sec {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin: 22px 0 10px;
}

.sec h2 {
  margin: 0;
  font-size: 16px;
}

.sec span {
  font-size: 12.5px;
  color: var(--text-3);
}

.hedge {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hrow {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.hrow__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 22px;
  margin-bottom: 8px;
}

.hrow__head strong {
  font-size: 15px;
  min-width: 44px;
}

.io {
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}

.io small {
  display: block;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

/* Meter: the fill and its track are steps of the same hue. */
.meter {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--viz-1) 18%, var(--surface));
  margin-bottom: 22px;
  max-width: 520px;
}

.meter i {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--viz-1);
  min-width: 2px;
}

.meter span {
  position: absolute;
  left: 0;
  top: 11px;
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}

.note {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}

.vendors {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  font-size: 12.5px;
  max-width: 520px;
}

.vendors li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
  border-top: 1px solid var(--border);
  color: var(--text-2);
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .hide-sm {
    display: none;
  }

  .show-sm {
    display: block;
  }

  .share {
    display: none;
  }

  .meter span {
    white-space: normal;
  }

  .meter {
    margin-bottom: 34px;
  }

  .actions {
    width: 100%;
  }

  .seg {
    flex: 1 1 100%;
  }

  .seg__btn {
    flex: 1;
    padding: 6px 4px;
  }
}
</style>
