<template>
  <div class="reports">
    <div class="toolbar no-print">
      <div class="ui-tabs" role="tablist" aria-label="Report">
        <button class="ui-tab" :class="{ 'is-active': report === 'business' }" data-report="business" @click="report = 'business'"><i class="fa-solid fa-scale-balanced"></i> Business P&amp;L</button>
        <button class="ui-tab" :class="{ 'is-active': report === 'pnl' }" data-report="pnl" @click="report = 'pnl'"><i class="fa-solid fa-book"></i> Cash book P&amp;L</button>
        <button class="ui-tab" :class="{ 'is-active': report === 'tax' }" @click="report = 'tax'"><i class="fa-solid fa-percent"></i> {{ settings.tax_name }} summary</button>
      </div>
      <select v-if="report === 'pnl'" v-model="fy" class="ui-select fsel" aria-label="Financial year" @change="loadPnl">
        <option v-for="y in years" :key="y.year" :value="y.year">{{ y.label }}</option>
      </select>
      <template v-else-if="report === 'business'">
        <select v-model="bizRange" class="ui-select fsel" aria-label="Period" @change="loadBiz">
          <option v-for="p in bizRanges" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
        <div class="ui-tabs" role="tablist" aria-label="Basis">
          <button v-for="b in ['accrual', 'cash']" :key="b" type="button" class="ui-tab" :class="{ 'is-active': bizBasis === b }" :title="basisHelp[b]" @click="setBizBasis(b)">{{ basisLabel[b] }}</button>
        </div>
      </template>
      <template v-else>
        <select v-model="taxPeriod" class="ui-select fsel" aria-label="Tax period" @change="onTaxPeriod">
          <option v-for="p in taxPeriods" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
        <template v-if="taxPeriod === 'custom'">
          <input v-model="taxFrom" type="date" class="ui-input date" aria-label="From" @change="loadTax" />
          <input v-model="taxTo" type="date" class="ui-input date" aria-label="To" @change="loadTax" />
        </template>
      </template>
      <div class="spacer"></div>
      <button class="ui-btn" :disabled="downloading" @click="downloadCsv"><i :class="downloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-file-csv'"></i> CSV</button>
      <button class="ui-btn" @click="print"><i class="fa-solid fa-print"></i> Print</button>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

    <!-- Business P&L: the same statement as Reports → Profit & loss -->
    <section v-if="report === 'business'" class="ui-card sheet">
      <div class="sheet__head">
        <div>
          <img v-if="branding.logoUrl" :src="branding.logoUrl" :alt="biz" class="sheet__logo print-only" />
          <div class="ui-eyebrow">{{ biz }}</div>
          <h2>Business profit &amp; loss</h2>
          <p v-if="bizPnl">{{ date(bizPnl.period.from) }} – {{ date(bizPnl.period.to) }} · {{ basisLabel[bizBasis] }} basis · {{ bizPnl.currency }}, excl. {{ bizPnl.tax.label }}</p>
          <p class="no-print muted-note">Invoices, point of sale, events, bills, purchase orders, payroll and this cash book — counted once. <router-link :to="bizLink">Open the full report</router-link></p>
        </div>
        <div v-if="bizPnl" class="headline">
          <span>{{ bizPnl.totals.net_profit < 0 ? 'Net loss' : 'Net profit' }}</span>
          <strong :class="{ neg: bizPnl.totals.net_profit < 0, pos: bizPnl.totals.net_profit > 0 }">{{ fmtMajor(bizPnl.totals.net_profit, bizPnl.currency) }}</strong>
        </div>
      </div>
      <div v-if="!bizPnl" class="ui-card__body"><div class="ui-skeleton" style="height: 280px"></div></div>
      <div v-else-if="!bizPnl.has_data" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-scale-balanced"></i></div>
        <h3>Nothing to report in this period</h3>
        <p>Record sales and expenses, or issue invoices, and your profit &amp; loss builds itself.</p>
      </div>
      <PnlStatement v-else :d="bizPnl" />
    </section>

    <!-- Cash book profit & loss -->
    <section v-else-if="report === 'pnl'" class="ui-card sheet">
      <div class="sheet__head">
        <div>
          <img v-if="branding.logoUrl" :src="branding.logoUrl" :alt="biz" class="sheet__logo print-only" />
          <div class="ui-eyebrow">{{ biz }}</div>
          <h2>Cash book profit &amp; loss · {{ pnl ? pnl.label : '…' }}</h2>
          <p v-if="pnl">{{ date(pnl.from) }} – {{ date(pnl.to) }} · {{ pnl.currency }}<template v-if="settings.tax_registered"> · amounts exclude {{ pnl.tax_name }}</template></p>
          <p class="no-print muted-note">Money in and out recorded in this cash book only. For the whole business see <a href="#" @click.prevent="report = 'business'">Business P&amp;L</a>.</p>
        </div>
        <div v-if="pnl" class="headline">
          <span>Net profit</span>
          <strong :class="{ neg: pnl.totals.profit < 0, pos: pnl.totals.profit > 0 }">{{ money(pnl.totals.profit) }}</strong>
        </div>
      </div>
      <div v-if="!pnl" class="ui-card__body"><div class="ui-skeleton" style="height: 280px"></div></div>
      <div v-else-if="!pnl.totals.count" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-chart-line"></i></div>
        <h3>Nothing recorded in {{ pnl.label }}</h3>
        <p>Once you add money in and out, your monthly profit &amp; loss builds itself.</p>
      </div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table pnl">
          <thead>
            <tr>
              <th class="sticky">Category</th>
              <th v-for="m in pnl.months" :key="m.month" class="num">{{ mlabel(m.month) }}</th>
              <th class="num total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section"><td class="sticky" :colspan="1">Income</td><td :colspan="pnl.months.length + 1"></td></tr>
            <tr v-for="r in pnl.income" :key="'i' + r.category_id">
              <td class="sticky">{{ r.name }}</td>
              <td v-for="(v, i) in r.months" :key="i" class="num">{{ cell(v) }}</td>
              <td class="num total-col">{{ money(r.total) }}</td>
            </tr>
            <tr v-if="!pnl.income.length"><td class="sticky muted">No income</td><td :colspan="pnl.months.length + 1"></td></tr>
            <tr class="subtotal">
              <td class="sticky">Total income</td>
              <td v-for="m in pnl.months" :key="m.month" class="num">{{ cell(m.income_net) }}</td>
              <td class="num total-col">{{ money(pnl.totals.income_net) }}</td>
            </tr>
            <tr class="section"><td class="sticky">Expenses</td><td :colspan="pnl.months.length + 1"></td></tr>
            <tr v-for="r in pnl.expenses" :key="'e' + r.category_id">
              <td class="sticky">{{ r.name }}</td>
              <td v-for="(v, i) in r.months" :key="i" class="num">{{ cell(v) }}</td>
              <td class="num total-col">{{ money(r.total) }}</td>
            </tr>
            <tr v-if="!pnl.expenses.length"><td class="sticky muted">No expenses</td><td :colspan="pnl.months.length + 1"></td></tr>
            <tr class="subtotal">
              <td class="sticky">Total expenses</td>
              <td v-for="m in pnl.months" :key="m.month" class="num">{{ cell(m.expenses_net) }}</td>
              <td class="num total-col">{{ money(pnl.totals.expenses_net) }}</td>
            </tr>
            <tr class="grand">
              <td class="sticky">Net profit</td>
              <td v-for="m in pnl.months" :key="m.month" class="num" :class="{ neg: m.profit < 0 }">{{ m.count ? money(m.profit) : '—' }}</td>
              <td class="num total-col" :class="{ neg: pnl.totals.profit < 0 }">{{ money(pnl.totals.profit) }}</td>
            </tr>
            <tr class="taxrow">
              <td class="sticky">{{ pnl.tax_name }} collected</td>
              <td v-for="m in pnl.months" :key="m.month" class="num">{{ cell(m.tax_collected) }}</td>
              <td class="num total-col">{{ money(pnl.totals.tax_collected) }}</td>
            </tr>
            <tr class="taxrow">
              <td class="sticky">{{ pnl.tax_name }} paid</td>
              <td v-for="m in pnl.months" :key="m.month" class="num">{{ cell(m.tax_paid) }}</td>
              <td class="num total-col">{{ money(pnl.totals.tax_paid) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Tax summary -->
    <section v-else class="ui-card sheet">
      <div class="sheet__head">
        <div>
          <img v-if="branding.logoUrl" :src="branding.logoUrl" :alt="biz" class="sheet__logo print-only" />
          <div class="ui-eyebrow">{{ biz }}<template v-if="tax && tax.tax_number"> · {{ tax.tax_number }}</template></div>
          <h2>{{ settings.tax_name }} summary · {{ tax ? tax.period.label : '…' }}</h2>
          <p v-if="tax">{{ date(tax.period.from) }} – {{ date(tax.period.to) }} · {{ tax.currency }}</p>
        </div>
        <div v-if="tax" class="headline">
          <span>{{ tax.totals.tax_payable >= 0 ? 'Estimated to pay' : 'Estimated refund' }}</span>
          <strong>{{ money(Math.abs(tax.totals.tax_payable)) }}</strong>
        </div>
      </div>
      <div v-if="!tax" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
      <template v-else>
        <div class="taxgrid">
          <div class="taxbox">
            <span>Sales (incl. {{ tax.tax_name }})</span>
            <strong>{{ money(tax.totals.income) }}</strong>
            <small>{{ tax.tax_name }} collected <b>{{ money(tax.totals.tax_collected) }}</b></small>
          </div>
          <div class="taxbox">
            <span>Purchases (incl. {{ tax.tax_name }})</span>
            <strong>{{ money(tax.totals.expenses) }}</strong>
            <small>{{ tax.tax_name }} paid <b>{{ money(tax.totals.tax_paid) }}</b></small>
          </div>
          <div class="taxbox strong">
            <span>Net {{ tax.tax_name }}</span>
            <strong :class="{ neg: tax.totals.tax_payable < 0 }">{{ money(tax.totals.tax_payable) }}</strong>
            <small>{{ tax.totals.tax_payable >= 0 ? 'Collected minus paid — owed to the tax office' : 'You paid more than you collected' }}</small>
          </div>
        </div>
        <div v-if="!tax.rates.length" class="ui-empty small-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-percent"></i></div>
          <h3>No entries in this period</h3>
          <p>Choose another period, or record some sales and expenses first.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Rate</th>
                <th class="num">Sales</th>
                <th class="num">{{ tax.tax_name }} collected</th>
                <th class="num">Purchases</th>
                <th class="num">{{ tax.tax_name }} paid</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in tax.rates" :key="r.rate">
                <td>{{ r.rate ? rate(r.rate) + '%' : 'No tax (0%)' }}</td>
                <td class="num">{{ money(r.sales) }}</td>
                <td class="num">{{ money(r.tax_collected) }}</td>
                <td class="num">{{ money(r.purchases) }}</td>
                <td class="num">{{ money(r.tax_paid) }}</td>
              </tr>
              <tr class="subtotal">
                <td>Total</td>
                <td class="num">{{ money(tax.totals.income) }}</td>
                <td class="num">{{ money(tax.totals.tax_collected) }}</td>
                <td class="num">{{ money(tax.totals.expenses) }}</td>
                <td class="num">{{ money(tax.totals.tax_paid) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="ui-hint note">This is an estimate from your cash book to help you prepare your return — check it with your accountant or tax office.</p>
      </template>
    </section>
  </div>
</template>

<script>
import { smallbizApi, fmtMinor, monthLabel } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { formatDate, downloadBlob, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { useBranding } from '@/composables/useBranding'
import PnlStatement from '@/components/pnl/PnlStatement.vue'
import { fetchPnl, loadBasis, saveBasis, statementCsv, BASIS_LABEL, BASIS_HELP } from '@/services/pnl'
import { downloadCsv as saveCsv } from '@/components/dashboard/analytics'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'HubReports',
  components: { PnlStatement },
  props: {
    settings: { type: Object, required: true },
    refreshKey: { type: Number, default: 0 }
  },
  setup() {
    const { branding, loadBranding } = useBranding()
    loadBranding()
    return { branding }
  },
  data() {
    return {
      report: ['tax', 'pnl'].includes(this.$route.query.report) ? this.$route.query.report : 'business',
      bizPnl: null,
      bizRange: 'this_fy',
      bizBasis: loadBasis(),
      basisLabel: BASIS_LABEL,
      basisHelp: BASIS_HELP,
      bizRanges: [
        { key: 'this_fy', label: 'This financial year' },
        { key: 'last_fy', label: 'Last financial year' },
        { key: 'this_quarter', label: 'This quarter' },
        { key: 'last_quarter', label: 'Last quarter' },
        { key: 'this_month', label: 'This month' },
        { key: 'last_month', label: 'Last month' }
      ],
      pnl: null,
      tax: null,
      fy: null,
      years: [],
      taxPeriod: 'this_quarter',
      taxFrom: '',
      taxTo: '',
      error: null,
      downloading: false,
      taxPeriods: [
        { key: 'this_quarter', label: 'This quarter' },
        { key: 'last_quarter', label: 'Last quarter' },
        { key: 'this_month', label: 'This month' },
        { key: 'last_month', label: 'Last month' },
        { key: 'this_fy', label: 'This financial year' },
        { key: 'last_fy', label: 'Last financial year' },
        { key: 'custom', label: 'Custom range…' }
      ]
    }
  },
  computed: {
    bizLink() {
      return { path: '/reports/profit-loss', query: { range: this.bizRange, basis: this.bizBasis } }
    },
    cur() {
      return this.settings.currency
    },
    biz() {
      return this.settings.trading_name || this.branding.orgName || 'Business hub'
    }
  },
  watch: {
    report(v) {
      this.$router.replace({ query: { ...this.$route.query, report: v === 'business' ? undefined : v } })
      if (v === 'tax' && !this.tax) this.loadTax()
      if (v === 'pnl' && !this.pnl) this.loadPnl()
      if (v === 'business' && !this.bizPnl) this.loadBiz()
    },
    refreshKey() {
      this.loadCurrent()
    }
  },
  created() {
    this.loadCurrent()
    if (this.report === 'tax') this.loadYears()
  },
  methods: {
    money(v) {
      return fmtMinor(v, this.cur)
    },
    cell(v) {
      return v ? fmtMinor(v, this.cur) : '—'
    },
    rate(r) {
      return Number(r).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    date: formatDate,
    mlabel(m) {
      return monthLabel(m) + (m.endsWith('-01') ? ' ' + m.slice(2, 4) : '')
    },
    loadCurrent() {
      if (this.report === 'tax') this.loadTax()
      else if (this.report === 'pnl') this.loadPnl()
      else this.loadBiz()
    },
    fmtMajor(v, c) {
      return formatCurrency(v, c)
    },
    async loadBiz() {
      this.error = null
      try {
        this.bizPnl = await fetchPnl({ range: this.bizRange, basis: this.bizBasis, compare: 'previous', series: false })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the business profit & loss')
      }
    },
    setBizBasis(b) {
      if (b === this.bizBasis) return
      this.bizBasis = b
      saveBasis(b)
      this.loadBiz()
    },
    pnlParams() {
      return this.fy ? { fy: this.fy } : {}
    },
    taxParams() {
      if (this.taxPeriod === 'custom') return { from: this.taxFrom || undefined, to: this.taxTo || undefined }
      return { period: this.taxPeriod }
    },
    async loadYears() {
      try {
        const d = await smallbizApi.pnl({})
        this.years = d.years
        this.fy = d.fy
      } catch {
        /* the P&L tab reports its own errors */
      }
    },
    async loadPnl() {
      this.error = null
      try {
        const d = await smallbizApi.pnl(this.pnlParams())
        this.pnl = d
        this.years = d.years
        this.fy = d.fy
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load profit & loss')
      }
    },
    onTaxPeriod() {
      if (this.taxPeriod === 'custom') {
        const now = new Date()
        if (!this.taxFrom) this.taxFrom = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
        if (!this.taxTo) this.taxTo = isoDate()
      }
      this.loadTax()
    },
    async loadTax() {
      this.error = null
      try {
        this.tax = await smallbizApi.tax(this.taxParams())
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load tax summary')
      }
    },
    async downloadCsv() {
      if (this.report === 'business') {
        if (!this.bizPnl) return
        saveCsv(`business-profit-loss-${this.bizPnl.period.from}-to-${this.bizPnl.period.to}.csv`, statementCsv(this.bizPnl))
        toast.success('CSV downloaded')
        return
      }
      this.downloading = true
      try {
        const res = this.report === 'pnl' ? await smallbizApi.pnlCsv(this.pnlParams()) : await smallbizApi.taxCsv(this.taxParams())
        const cd = res.headers?.['content-disposition'] || ''
        downloadBlob(res.data, /filename="([^"]+)"/.exec(cd)?.[1] || `${this.report}-report.csv`)
        toast.success('CSV downloaded')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not download CSV'))
      } finally {
        this.downloading = false
      }
    },
    print() {
      window.print()
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.fsel {
  width: auto;
  min-width: 170px;
}

.date {
  width: 160px;
}

.spacer {
  flex: 1;
}

.sheet__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.muted-note {
  font-size: 12.5px;
  color: var(--text-3);
  margin: 4px 0 0;
}

/* Company logo on printed reports (Settings → Business details) */
.sheet__logo {
  display: none;
  max-width: 200px;
  max-height: 48px;
  width: auto;
  height: auto;
  object-fit: contain;
  margin-bottom: 10px;
}

.sheet__head h2 {
  margin: 2px 0 0;
  font-size: 20px;
}

.sheet__head p {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.headline {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.headline span {
  font-size: 12.5px;
  color: var(--text-3);
}

.headline strong {
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.pos { color: var(--success); }
.neg { color: var(--danger); }
.muted { color: var(--text-3); }

.pnl {
  font-size: 13px;
}

.pnl th,
.pnl td {
  padding: 9px 12px;
  white-space: nowrap;
}

.sticky {
  position: sticky;
  left: 0;
  background: var(--surface);
  z-index: 1;
  min-width: 160px;
}

thead .sticky {
  background: var(--surface-2);
}

.section td {
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  background: var(--surface-2);
}

.section .sticky {
  background: var(--surface-2);
}

.subtotal td {
  font-weight: 650;
  border-top: 1px solid var(--border-strong);
}

.grand td {
  font-weight: 750;
  font-size: 14px;
  border-top: 2px solid var(--border-strong);
  background: var(--accent-soft);
}

.grand .sticky {
  background: var(--accent-soft);
}

.taxrow td {
  color: var(--text-3);
  font-size: 12.5px;
}

.total-col {
  font-weight: 650;
  background: var(--surface-2);
}

.taxgrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px 20px;
}

.taxbox {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.taxbox.strong {
  background: var(--accent-soft);
  border-color: transparent;
}

.taxbox span {
  font-size: 12.5px;
  color: var(--text-3);
  font-weight: 550;
}

.taxbox strong {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.taxbox small {
  color: var(--text-3);
  font-size: 12.5px;
}

.taxbox b {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.note {
  padding: 12px 20px 18px;
  margin: 0;
}

.small-empty {
  padding: 28px 20px;
}

@media (max-width: 760px) {
  .taxgrid {
    grid-template-columns: 1fr;
  }
  .headline {
    text-align: left;
  }
  .fsel {
    flex: 1;
  }
  .sticky {
    min-width: 120px;
  }
}

@media print {
  .no-print {
    display: none !important;
  }
  .sheet__logo.print-only {
    display: block;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    border: 0 !important;
    box-shadow: none !important;
  }
  .ui-table-wrap {
    overflow: visible !important;
  }
  .pnl {
    font-size: 9pt;
  }
  .pnl th,
  .pnl td {
    padding: 4px 5px;
  }
  .sticky {
    position: static;
    min-width: 0;
  }
  .sheet,
  .sheet * {
    color: #000 !important;
    background: transparent !important;
  }
  .grand td,
  .subtotal td {
    border-top: 1px solid #000 !important;
  }
}
</style>
