<template>
  <div>
    <div class="toolbar no-print">
      <div class="ui-tabs" role="tablist" aria-label="Report">
        <button v-for="r in reports" :key="r.value" class="ui-tab" :class="{ 'is-active': report === r.value }" role="tab" :aria-selected="report === r.value" @click="setReport(r.value)">
          <i :class="r.icon"></i> {{ r.label }}
        </button>
      </div>
      <div class="toolbar__right">
        <template v-if="report === 'pl'">
          <select v-model="preset" class="ui-select preset" aria-label="Period" @change="applyPreset">
            <option v-for="p in presets" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <input v-model="start" type="date" class="ui-input date" aria-label="Start date" @change="custom" />
          <span class="to">to</span>
          <input v-model="end" type="date" class="ui-input date" aria-label="End date" @change="custom" />
        </template>
        <template v-else>
          <label class="asof">As of</label>
          <input v-model="asOf" type="date" class="ui-input date" aria-label="As of date" @change="load" />
        </template>
        <button class="ui-btn" :disabled="!data" @click="exportCsv"><i class="fa-solid fa-download"></i> <span>CSV</span></button>
        <button class="ui-btn" :disabled="!data" @click="print"><i class="fa-solid fa-print"></i> <span>Print</span></button>
      </div>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>

    <div v-else-if="loading && !data" class="ui-card__body">
      <div v-for="n in 8" :key="n" class="ui-skeleton" style="margin: 14px 0"></div>
    </div>

    <div v-else-if="data" class="statement" :class="{ 'is-loading': loading }">
      <header class="st-head">
        <div class="st-org">{{ orgName }}</div>
        <h2>{{ currentReport.label }}</h2>
        <div class="st-period">{{ periodLabel }}</div>
      </header>

      <!-- Profit & Loss -->
      <template v-if="report === 'pl'">
        <div v-if="isEmptyPL" class="ui-empty compact">
          <div class="ui-empty__icon"><i class="fa-solid fa-chart-line"></i></div>
          <h3>No income or expenses in this period</h3>
          <p>Approved bills, categorised bank transactions and posted journals will appear here.</p>
        </div>
        <template v-else>
          <section class="st-sec">
            <h3>Revenue</h3>
            <div v-for="l in data.revenue" :key="l.account_id" class="st-line" @click="drill(l)">
              <span><span class="code">{{ l.account_code }}</span>{{ l.account_name }}</span><span class="amt">{{ money(l.amount) }}</span>
            </div>
            <div v-if="!data.revenue.length" class="st-line muted"><span>No revenue</span><span class="amt">{{ money(0) }}</span></div>
            <div class="st-total"><span>Total revenue</span><span class="amt">{{ money(data.total_revenue) }}</span></div>
          </section>
          <section v-if="data.cost_of_sales.length" class="st-sec">
            <h3>Cost of sales</h3>
            <div v-for="l in data.cost_of_sales" :key="l.account_id" class="st-line" @click="drill(l)">
              <span><span class="code">{{ l.account_code }}</span>{{ l.account_name }}</span><span class="amt">{{ money(l.amount) }}</span>
            </div>
            <div class="st-total"><span>Total cost of sales</span><span class="amt">{{ money(data.total_cost_of_sales) }}</span></div>
          </section>
          <div v-if="data.cost_of_sales.length" class="st-grand sub"><span>Gross profit</span><span class="amt">{{ money(data.gross_profit) }}</span></div>
          <section class="st-sec">
            <h3>Operating expenses</h3>
            <div v-for="l in data.expenses" :key="l.account_id" class="st-line" @click="drill(l)">
              <span><span class="code">{{ l.account_code }}</span>{{ l.account_name }}</span><span class="amt">{{ money(l.amount) }}</span>
            </div>
            <div v-if="!data.expenses.length" class="st-line muted"><span>No expenses</span><span class="amt">{{ money(0) }}</span></div>
            <div class="st-total"><span>Total operating expenses</span><span class="amt">{{ money(data.total_expenses) }}</span></div>
          </section>
          <div class="st-grand" :class="data.net_income >= 0 ? 'pos' : 'neg'">
            <span>Net {{ data.net_income >= 0 ? 'profit' : 'loss' }}</span><span class="amt">{{ money(data.net_income) }}</span>
          </div>
        </template>
      </template>

      <!-- Balance sheet -->
      <template v-else-if="report === 'bs'">
        <div v-if="!data.total_assets && !data.total_liabilities_equity" class="ui-empty compact">
          <div class="ui-empty__icon"><i class="fa-solid fa-scale-balanced"></i></div>
          <h3>Nothing on the balance sheet yet</h3>
          <p>Add a bank account with an opening balance or post a journal to get started.</p>
        </div>
        <template v-else>
          <section class="st-sec">
            <h3>Assets</h3>
            <template v-if="data.assets.current.length">
              <h4>Current assets</h4>
              <div v-for="l in data.assets.current" :key="l.account_id" class="st-line" @click="drill(l)">
                <span><span class="code">{{ l.account_code }}</span>{{ l.account_name }}</span><span class="amt">{{ money(l.amount) }}</span>
              </div>
            </template>
            <template v-if="data.assets.non_current.length">
              <h4>Non-current assets</h4>
              <div v-for="l in data.assets.non_current" :key="l.account_id" class="st-line" @click="drill(l)">
                <span><span class="code">{{ l.account_code }}</span>{{ l.account_name }}</span><span class="amt">{{ money(l.amount) }}</span>
              </div>
            </template>
            <div class="st-grand sub"><span>Total assets</span><span class="amt">{{ money(data.total_assets) }}</span></div>
          </section>
          <section class="st-sec">
            <h3>Liabilities</h3>
            <div v-for="l in data.liabilities.current.concat(data.liabilities.non_current)" :key="l.account_id" class="st-line" @click="drill(l)">
              <span><span class="code">{{ l.account_code }}</span>{{ l.account_name }}</span><span class="amt">{{ money(l.amount) }}</span>
            </div>
            <div v-if="!data.liabilities.current.length && !data.liabilities.non_current.length" class="st-line muted"><span>No liabilities</span><span class="amt">{{ money(0) }}</span></div>
            <div class="st-total"><span>Total liabilities</span><span class="amt">{{ money(data.liabilities.total) }}</span></div>
          </section>
          <section class="st-sec">
            <h3>Equity</h3>
            <div v-for="(l, i) in data.equity.current" :key="l.account_id || i" class="st-line" :class="{ static: !l.account_id }" @click="drill(l)">
              <span><span class="code">{{ l.account_code }}</span>{{ l.account_name }}</span><span class="amt">{{ money(l.amount) }}</span>
            </div>
            <div class="st-total"><span>Total equity</span><span class="amt">{{ money(data.equity.total) }}</span></div>
          </section>
          <div class="st-grand"><span>Total liabilities & equity</span><span class="amt">{{ money(data.total_liabilities_equity) }}</span></div>
          <div class="check" :class="data.balanced ? 'ok' : 'bad'">
            <i :class="data.balanced ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
            {{ data.balanced ? 'Assets equal liabilities plus equity.' : 'The balance sheet does not balance — check for unusual postings.' }}
          </div>
        </template>
      </template>

      <!-- Trial balance -->
      <template v-else>
        <div v-if="!data.rows.length" class="ui-empty compact">
          <div class="ui-empty__icon"><i class="fa-solid fa-table-list"></i></div>
          <h3>No posted balances</h3>
          <p>The trial balance lists every account with a posted balance.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table tb">
            <thead>
              <tr>
                <th style="width: 80px">Code</th>
                <th>Account</th>
                <th class="hide-sm">Type</th>
                <th class="num">Debit</th>
                <th class="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in data.rows" :key="r.account_id" class="is-clickable" @click="drill(r)">
                <td class="code-cell">{{ r.account_code }}</td>
                <td>{{ r.account_name }}</td>
                <td class="hide-sm muted">{{ r.account_type }}</td>
                <td class="num">{{ r.debit_balance ? money(r.debit_balance) : '' }}</td>
                <td class="num">{{ r.credit_balance ? money(r.credit_balance) : '' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td><strong>Totals</strong></td>
                <td class="hide-sm"></td>
                <td class="num"><strong>{{ money(data.total_debit) }}</strong></td>
                <td class="num"><strong>{{ money(data.total_credit) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div v-if="data.rows.length" class="check" :class="data.balanced ? 'ok' : 'bad'">
          <i :class="data.balanced ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
          {{ data.balanced ? 'Debits equal credits — the ledger is in balance.' : 'Debits and credits differ — the ledger is out of balance.' }}
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { financeApi } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, isoDate, downloadBlob } from '@/utils/format'

function fyStart(d) {
  // Australian financial year: 1 July – 30 June
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1
  return new Date(y, 6, 1)
}

export default {
  name: 'ReportsTab',
  props: {
    currency: { type: String, default: 'AUD' },
    orgName: { type: String, default: '' }
  },
  emits: ['ledger'],
  data() {
    const now = new Date()
    return {
      report: 'pl',
      preset: 'this_month',
      start: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: isoDate(now),
      asOf: isoDate(now),
      data: null,
      loading: false,
      error: ''
    }
  },
  computed: {
    reports() {
      return [
        { value: 'pl', label: 'Profit & loss', icon: 'fa-solid fa-chart-line' },
        { value: 'bs', label: 'Balance sheet', icon: 'fa-solid fa-scale-balanced' },
        { value: 'tb', label: 'Trial balance', icon: 'fa-solid fa-table-list' }
      ]
    },
    currentReport() {
      return this.reports.find((r) => r.value === this.report)
    },
    presets() {
      return [
        { value: 'this_month', label: 'This month' },
        { value: 'last_month', label: 'Last month' },
        { value: 'this_quarter', label: 'This quarter' },
        { value: 'this_fy', label: 'This financial year' },
        { value: 'last_fy', label: 'Last financial year' },
        { value: 'ytd', label: 'Calendar year to date' },
        { value: 'custom', label: 'Custom range' }
      ]
    },
    periodLabel() {
      if (this.report === 'pl') return `${formatDate(this.start)} – ${formatDate(this.end)}`
      return `As of ${formatDate(this.asOf)}`
    },
    isEmptyPL() {
      const d = this.data
      return d && !d.revenue?.length && !d.expenses?.length && !d.cost_of_sales?.length
    }
  },
  created() {
    this.load()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    setReport(r) {
      this.report = r
      this.data = null
      this.load()
    },
    applyPreset() {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth()
      let s
      let e = now
      switch (this.preset) {
        case 'this_month':
          s = new Date(y, m, 1)
          break
        case 'last_month':
          s = new Date(y, m - 1, 1)
          e = new Date(y, m, 0)
          break
        case 'this_quarter':
          s = new Date(y, Math.floor(m / 3) * 3, 1)
          break
        case 'this_fy':
          s = fyStart(now)
          break
        case 'last_fy': {
          const fs = fyStart(now)
          s = new Date(fs.getFullYear() - 1, 6, 1)
          e = new Date(fs.getFullYear(), 5, 30)
          break
        }
        case 'ytd':
          s = new Date(y, 0, 1)
          break
        default:
          return
      }
      this.start = isoDate(s)
      this.end = isoDate(e)
      this.load()
    },
    custom() {
      this.preset = 'custom'
      if (this.start && this.end) this.load()
    },
    async load() {
      if (this.report === 'pl' && this.end < this.start) {
        this.error = 'The end date must be on or after the start date.'
        return
      }
      this.loading = true
      this.error = ''
      try {
        if (this.report === 'pl') this.data = await financeApi.profitLoss({ start_date: this.start, end_date: this.end })
        else if (this.report === 'bs') this.data = await financeApi.balanceSheet({ as_of_date: this.asOf })
        else this.data = await financeApi.trialBalance({ as_of_date: this.asOf })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the report')
      } finally {
        this.loading = false
      }
    },
    drill(line) {
      if (line.account_id) this.$emit('ledger', line.account_id)
    },
    print() {
      window.print()
    },
    exportCsv() {
      const d = this.data
      const rows = [[this.currentReport.label], [this.periodLabel], []]
      const add = (section, lines) => {
        rows.push([section])
        lines.forEach((l) => rows.push([l.account_code || '', l.account_name, (l.amount ?? 0).toFixed(2)]))
      }
      if (this.report === 'pl') {
        add('Revenue', d.revenue)
        rows.push(['', 'Total revenue', d.total_revenue.toFixed(2)])
        if (d.cost_of_sales.length) {
          add('Cost of sales', d.cost_of_sales)
          rows.push(['', 'Gross profit', d.gross_profit.toFixed(2)])
        }
        add('Operating expenses', d.expenses)
        rows.push(['', 'Total operating expenses', d.total_expenses.toFixed(2)])
        rows.push(['', 'Net profit', d.net_income.toFixed(2)])
      } else if (this.report === 'bs') {
        add('Assets', d.assets.current.concat(d.assets.non_current))
        rows.push(['', 'Total assets', d.total_assets.toFixed(2)])
        add('Liabilities', d.liabilities.current.concat(d.liabilities.non_current))
        rows.push(['', 'Total liabilities', d.liabilities.total.toFixed(2)])
        add('Equity', d.equity.current)
        rows.push(['', 'Total equity', d.equity.total.toFixed(2)])
        rows.push(['', 'Total liabilities & equity', d.total_liabilities_equity.toFixed(2)])
      } else {
        rows.push(['Code', 'Account', 'Type', 'Debit', 'Credit'])
        d.rows.forEach((r) => rows.push([r.account_code, r.account_name, r.account_type, r.debit_balance.toFixed(2), r.credit_balance.toFixed(2)]))
        rows.push(['', 'Totals', '', d.total_debit.toFixed(2), d.total_credit.toFixed(2)])
      }
      const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const name = { pl: 'profit-loss', bs: 'balance-sheet', tb: 'trial-balance' }[this.report]
      downloadBlob(new Blob([csv], { type: 'text/csv' }), `${name}-${this.report === 'pl' ? this.end : this.asOf}.csv`)
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
  align-items: center;
  flex-wrap: wrap;
}
.preset {
  width: 190px;
}
.date {
  width: 150px;
}
.to,
.asof {
  color: var(--text-3);
  font-size: 13px;
}
.statement {
  max-width: 820px;
  margin: 0 auto;
  padding: 28px 24px 36px;
}
.is-loading {
  opacity: 0.6;
}
.st-head {
  text-align: center;
  margin-bottom: 24px;
}
.st-org {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
  font-weight: 600;
}
.st-head h2 {
  font-size: 22px;
  margin: 4px 0 2px;
  letter-spacing: -0.02em;
}
.st-period {
  color: var(--text-3);
  font-size: 13.5px;
}
.st-sec {
  margin-bottom: 18px;
}
.st-sec h3 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  margin: 0 0 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.st-sec h4 {
  font-size: 13px;
  color: var(--text-2);
  margin: 10px 0 2px;
  font-weight: 600;
}
.st-line,
.st-total,
.st-grand {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 8px;
  font-size: 14px;
}
.st-line {
  border-radius: 6px;
  cursor: pointer;
}
.st-line:hover {
  background: var(--surface-hover);
}
.st-line.static,
.st-line.muted {
  cursor: default;
  color: var(--text-3);
}
.st-line.static:hover,
.st-line.muted:hover {
  background: none;
}
.code {
  display: inline-block;
  min-width: 52px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
}
.amt {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.st-total {
  border-top: 1px solid var(--border);
  font-weight: 650;
  margin-top: 4px;
}
.st-grand {
  border-top: 2px solid var(--border-strong);
  border-bottom: 2px solid var(--border-strong);
  font-weight: 700;
  font-size: 15.5px;
  padding: 10px 8px;
  margin: 8px 0 18px;
}
.st-grand.sub {
  border-bottom: 0;
  font-size: 14.5px;
  margin-top: 0;
}
.st-grand.pos .amt {
  color: var(--success);
}
.st-grand.neg .amt {
  color: var(--danger);
}
.check {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: var(--radius);
  margin-top: 14px;
}
.check.ok {
  background: var(--success-soft);
  color: var(--success);
}
.check.bad {
  background: var(--danger-soft);
  color: var(--danger);
}
.code-cell {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-2);
}
.tb tfoot td {
  border-top: 2px solid var(--border-strong);
  padding-top: 12px;
}
.muted {
  color: var(--text-3);
}
.compact {
  padding: 32px 16px;
}
@media (max-width: 700px) {
  .toolbar__right {
    width: 100%;
  }
  .date,
  .preset {
    flex: 1 1 130px;
    width: auto;
  }
  .statement {
    padding: 20px 12px 28px;
  }
  .hide-sm {
    display: none;
  }
}
@media print {
  .no-print {
    display: none !important;
  }
  .statement {
    max-width: none;
    padding: 0;
  }
  .st-line:hover {
    background: none;
  }
}
</style>
