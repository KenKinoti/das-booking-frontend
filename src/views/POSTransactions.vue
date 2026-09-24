<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Sales</div>
        <h1>POS Transactions</h1>
        <p>Every sale rung up at the register — look up receipts, reprint or void.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="exporting || !total" @click="exportCsv">
          <i :class="exporting ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i> Export CSV
        </button>
        <router-link to="/pos" class="ui-btn ui-btn--primary"><i class="fa-solid fa-cash-register"></i> Open register</router-link>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-sack-dollar"></i></span>Sales · {{ rangeLabel }}</div>
        <div class="ui-kpi__value">{{ summary ? money(summary.sales_total) : '—' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `${money(summary.tax_total)} tax collected` : 'Completed sales' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-receipt"></i></span>Transactions</div>
        <div class="ui-kpi__value">{{ summary ? summary.sales_count : '—' }}</div>
        <div class="ui-kpi__meta">Completed in period</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-chart-line"></i></span>Average sale</div>
        <div class="ui-kpi__value">{{ summary ? money(summary.average_sale) : '—' }}</div>
        <div class="ui-kpi__meta">Per completed transaction</div>
      </div>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'voided' }" @click="setStatus(status === 'voided' ? '' : 'voided')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-ban"></i></span>Voids</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': summary && summary.voided_count > 0 }">{{ summary ? summary.voided_count : '—' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `${money(summary.voided_amount)} reversed` : 'Voided sales' }}</div>
      </button>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist" aria-label="Status">
          <button v-for="t in statusTabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">{{ t.label }}</button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Receipt #, customer, item or SKU…" aria-label="Search transactions" @input="debouncedLoad" />
          </div>
          <select v-model="method" class="ui-select method" aria-label="Payment method" @change="reload">
            <option value="">All payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="eftpos">EFTPOS</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="voucher">Gift voucher</option>
            <option value="other">Other</option>
            <option value="split">Split payments</option>
          </select>
        </div>
      </div>

      <div class="rangebar">
        <div class="presets" role="group" aria-label="Date range">
          <button v-for="p in presets" :key="p.value" class="chip" :class="{ 'is-active': range === p.value }" @click="setRange(p.value)">{{ p.label }}</button>
        </div>
        <div v-if="range === 'custom'" class="custom">
          <input v-model="from" class="ui-input" type="date" aria-label="From date" :max="to || undefined" @change="reload" />
          <span class="muted">to</span>
          <input v-model="to" class="ui-input" type="date" aria-label="To date" :min="from || undefined" @change="reload" />
        </div>
        <button v-if="hasFilters" class="ui-btn ui-btn--ghost ui-btn--sm" @click="clearFilters"><i class="fa-solid fa-filter-circle-xmark"></i> Clear filters</button>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !rows.length" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="sk-row">
          <div class="ui-skeleton" style="width: 130px"></div>
          <div class="ui-skeleton" style="flex: 1"></div>
          <div class="ui-skeleton" style="width: 90px"></div>
          <div class="ui-skeleton" style="width: 80px"></div>
        </div>
      </div>

      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-receipt"></i></div>
        <h3>{{ hasNarrowing ? 'No transactions match' : `No sales ${range === 'all' ? 'yet' : rangeLabel.toLowerCase()}` }}</h3>
        <p>{{ hasNarrowing ? 'Try a different search or filter.' : range === 'all' ? 'Sales you complete at the register will show up here.' : 'Try a wider date range, or ring up a sale.' }}</p>
        <div class="empty-actions">
          <button v-if="range !== 'all' && !hasNarrowing" class="ui-btn" @click="setRange('30d')">Show last 30 days</button>
          <button v-if="hasNarrowing" class="ui-btn" @click="clearFilters">Clear filters</button>
          <router-link to="/pos" class="ui-btn ui-btn--primary"><i class="fa-solid fa-cash-register"></i> Go to register</router-link>
        </div>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Date</th>
              <th class="hide-md">Customer</th>
              <th class="hide-lg">Items</th>
              <th class="hide-sm">Payment</th>
              <th>Status</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.id" class="is-clickable" tabindex="0" @click="openId = t.id" @keydown.enter="openId = t.id">
              <td><strong class="mono">{{ t.transaction_number }}</strong></td>
              <td class="nowrap">
                {{ shortDate(t.created_at) }} <span class="muted">{{ time(t.created_at) }}</span>
              </td>
              <td class="hide-md">
                <span v-if="t.customer" class="nowrap">{{ name(t.customer) }}</span>
                <span v-else class="muted">Walk-in</span>
              </td>
              <td class="hide-lg items-cell">
                <span class="muted">{{ qty(t) }} ×</span> {{ itemsLabel(t) }}
              </td>
              <td class="hide-sm">
                <span class="pay"><i :class="payIcon(t)"></i> {{ payLabel(t) }}</span>
              </td>
              <td><span class="ui-badge" :class="t.status === 'voided' ? 'ui-badge--void' : 'ui-badge--paid'">{{ t.status === 'voided' ? 'Voided' : 'Completed' }}</span></td>
              <td class="num"><strong :class="{ struck: t.status === 'voided' }">{{ money(t.total_amount) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="total > 0" class="pager">
        <span class="muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}</span>
        <div class="ui-actions">
          <select v-model.number="perPage" class="ui-select per" aria-label="Rows per page" @change="reload">
            <option :value="25">25 / page</option>
            <option :value="50">50 / page</option>
            <option :value="100">100 / page</option>
          </select>
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= total" @click="go(page + 1)">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>
    </section>

    <TransactionDrawer v-if="openId" :transaction-id="openId" :organization="organization" @close="openId = null" @voided="onVoided" />
  </div>
</template>

<script>
import TransactionDrawer from '@/components/pos/TransactionDrawer.vue'
import { posService, PAYMENT_LABELS, paymentSummary, personName } from '@/services/posService'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime, formatDate, isoDate, addDays, downloadBlob } from '@/utils/format'
import { toast } from '@/composables/useToast'

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' }
]

export default {
  name: 'POSTransactions',
  components: { TransactionDrawer },
  data() {
    const qy = this.$route.query
    return {
      rows: [],
      total: 0,
      summary: null,
      page: Number(qy.page) || 1,
      perPage: 25,
      q: qy.q || '',
      status: qy.status || '',
      method: qy.method || '',
      range: PRESETS.some((p) => p.value === qy.range) ? qy.range : 'today',
      from: qy.from || isoDate(),
      to: qy.to || isoDate(),
      presets: PRESETS,
      statusTabs: [
        { value: '', label: 'All' },
        { value: 'completed', label: 'Completed' },
        { value: 'voided', label: 'Voided' }
      ],
      loading: false,
      error: '',
      exporting: false,
      openId: qy.open || null,
      organization: null,
      timer: null,
      reqSeq: 0
    }
  },
  computed: {
    dates() {
      const today = isoDate()
      switch (this.range) {
        case 'today':
          return { start_date: today, end_date: today }
        case 'yesterday': {
          const y = addDays(today, -1)
          return { start_date: y, end_date: y }
        }
        case '7d':
          return { start_date: addDays(today, -6), end_date: today }
        case '30d':
          return { start_date: addDays(today, -29), end_date: today }
        case 'month':
          return { start_date: today.slice(0, 8) + '01', end_date: today }
        case 'custom':
          return { start_date: this.from || undefined, end_date: this.to || undefined }
        default:
          return {}
      }
    },
    rangeLabel() {
      if (this.range === 'custom') {
        if (this.from && this.to) return this.from === this.to ? formatDate(this.from) : `${formatDate(this.from, 'short')} – ${formatDate(this.to, 'short')}`
        return 'Custom range'
      }
      return PRESETS.find((p) => p.value === this.range)?.label || ''
    },
    params() {
      return { ...this.dates, status: this.status, payment_method: this.method, search: this.q.trim() }
    },
    hasNarrowing() {
      return !!(this.q.trim() || this.status || this.method)
    },
    hasFilters() {
      return this.hasNarrowing || this.range !== 'today'
    }
  },
  watch: {
    openId() {
      this.syncQuery()
    }
  },
  created() {
    this.load()
    posService
      .organization()
      .then((o) => (this.organization = o))
      .catch(() => {})
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    money(v) {
      return formatMoney(v)
    },
    dateTime: formatDateTime,
    name: personName,
    shortDate(v) {
      const d = new Date(v)
      const sameYear = d.getFullYear() === new Date().getFullYear()
      return new Intl.DateTimeFormat(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
    },
    time(v) {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(v))
    },
    payLabel: paymentSummary,
    payIcon(t) {
      const ps = t.payments || []
      if (ps.length > 1) return 'fa-solid fa-code-fork'
      const m = ps[0]?.method
      return m === 'cash' ? 'fa-solid fa-money-bill-wave' : m === 'card' || m === 'eftpos' ? 'fa-regular fa-credit-card' : 'fa-solid fa-building-columns'
    },
    qty(t) {
      return (t.items || []).reduce((n, i) => n + i.quantity, 0)
    },
    itemsLabel(t) {
      const names = (t.items || []).map((i) => i.item_name)
      if (names.length <= 2) return names.join(', ')
      return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
    },
    async load() {
      const seq = ++this.reqSeq
      this.loading = true
      this.error = ''
      try {
        const data = await posService.listTransactions({ ...this.params, page: this.page, limit: this.perPage })
        if (seq !== this.reqSeq) return
        this.rows = data.transactions
        this.total = data.total
        this.summary = data.summary
        if (!this.rows.length && this.page > 1 && this.total > 0) {
          this.page = 1
          this.load()
        }
      } catch (e) {
        if (seq === this.reqSeq) this.error = apiErrorMessage(e, 'Could not load transactions')
      } finally {
        if (seq === this.reqSeq) this.loading = false
      }
    },
    reload() {
      this.page = 1
      this.syncQuery()
      this.load()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.reload, 280)
    },
    setStatus(s) {
      this.status = s
      this.reload()
    },
    setRange(r) {
      this.range = r
      if (r === 'custom' && !this.from) {
        this.from = isoDate()
        this.to = isoDate()
      }
      this.reload()
    },
    clearFilters() {
      this.q = ''
      this.status = ''
      this.method = ''
      this.range = 'today'
      this.reload()
    },
    go(p) {
      this.page = p
      this.syncQuery()
      this.load()
    },
    syncQuery() {
      const query = {}
      if (this.q.trim()) query.q = this.q.trim()
      if (this.status) query.status = this.status
      if (this.method) query.method = this.method
      if (this.range !== 'today') query.range = this.range
      if (this.range === 'custom') Object.assign(query, { from: this.from, to: this.to })
      if (this.page > 1) query.page = String(this.page)
      if (this.openId) query.open = this.openId
      this.$router.replace({ query }).catch(() => {})
    },
    onVoided() {
      this.load()
    },
    async exportCsv() {
      this.exporting = true
      try {
        const all = []
        for (let p = 1; p <= 40; p++) {
          const data = await posService.listTransactions({ ...this.params, page: p, limit: 500 })
          all.push(...data.transactions)
          if (all.length >= data.total || !data.transactions.length) break
        }
        const esc = (v) => {
          const s = v === null || v === undefined ? '' : String(v)
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }
        const header = ['Receipt', 'Date', 'Status', 'Customer', 'Cashier', 'Items', 'Quantity', 'Subtotal', 'Discount', 'Tax', 'Tax inclusive', 'Total', 'Payment', 'Tendered', 'Change', 'Void reason']
        const lines = all.map((t) =>
          [
            t.transaction_number,
            new Date(t.created_at).toISOString(),
            t.status,
            personName(t.customer),
            personName(t.cashier),
            (t.items || []).map((i) => `${i.quantity}x ${i.item_name}`).join('; '),
            this.qty(t),
            t.sub_total,
            t.discount_amount,
            t.tax_amount,
            t.tax_inclusive ? 'yes' : 'no',
            t.total_amount,
            (t.payments || []).map((p) => `${PAYMENT_LABELS[p.method] || p.method} ${Number(p.amount).toFixed(2)}`).join('; '),
            t.tender_amount,
            t.change_amount,
            t.void_reason || ''
          ]
            .map(esc)
            .join(',')
        )
        const csv = '﻿' + [header.join(','), ...lines].join('\r\n')
        const suffix = this.dates.start_date ? `${this.dates.start_date}_${this.dates.end_date}` : 'all'
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `pos-transactions-${suffix}.csv`)
        toast.success(`Exported ${all.length} transaction${all.length === 1 ? '' : 's'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      } finally {
        this.exporting = false
      }
    }
  }
}
</script>

<style scoped>
.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}
.kpi-btn.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.kpi-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.kpi-success {
  background: var(--success-soft);
  color: var(--success);
}
.kpi-info {
  background: var(--info-soft);
  color: var(--info);
}
.txt-danger {
  color: var(--danger);
}
.muted {
  color: var(--text-3);
}
.mono {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.nowrap {
  white-space: nowrap;
}
.struck {
  text-decoration: line-through;
  color: var(--text-3);
}
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
  flex-wrap: wrap;
}
.search {
  width: 300px;
}
.method {
  width: 170px;
}
.rangebar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
}
.chip:hover {
  background: var(--surface-hover);
}
.chip.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}
.custom {
  display: flex;
  align-items: center;
  gap: 8px;
}
.custom .ui-input {
  width: 150px;
  height: 32px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}
.items-cell {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pay {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  color: var(--text-2);
}
.pay i {
  color: var(--text-3);
}
.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
}
.is-loading {
  opacity: 0.6;
  transition: opacity 0.2s;
}
.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.per {
  width: 120px;
  height: 32px;
}
tr.is-clickable:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
@media (max-width: 1200px) {
  .hide-lg {
    display: none;
  }
}
@media (max-width: 900px) {
  .hide-md {
    display: none;
  }
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .search,
  .method,
  .toolbar__right {
    width: 100%;
  }
  .presets {
    flex-wrap: nowrap;
    overflow-x: auto;
    width: 100%;
    scrollbar-width: none;
  }
  .chip {
    flex-shrink: 0;
  }
  .custom .ui-input {
    width: auto;
    flex: 1;
  }
  .custom {
    width: 100%;
  }
}
</style>
