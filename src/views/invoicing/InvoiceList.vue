<template>
  <div class="ui-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Sales & Invoicing</div>
        <h1>{{ isQuote ? 'Quotes' : 'Invoices' }}</h1>
        <p>{{ isQuote ? 'Estimates you can send, get accepted and turn into invoices.' : 'Create, send and get paid for your work.' }}</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="exportCsv" :disabled="exporting">
          <i :class="exporting ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i> Export
        </button>
        <router-link :to="isQuote ? '/quotes/new' : '/invoices/new'" class="ui-btn ui-btn--primary">
          <i class="fa-solid fa-plus"></i> New {{ isQuote ? 'quote' : 'invoice' }}
        </router-link>
      </div>
    </header>

    <div v-if="!isQuote && stats" class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'unpaid' }" @click="setStatus('unpaid')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-hourglass-half"></i></span>Outstanding</div>
        <div class="ui-kpi__value">{{ money(stats.outstanding, stats.currency) }}</div>
        <div class="ui-kpi__meta">{{ stats.outstanding_count }} sent and part-paid invoice{{ stats.outstanding_count === 1 ? '' : 's' }}<template v-if="otherNote"> · {{ otherNote }}</template></div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'overdue' }" @click="setStatus('overdue')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>Overdue</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': stats.overdue > 0 }">{{ money(stats.overdue, stats.currency) }}</div>
        <div class="ui-kpi__meta">{{ stats.overdue_count }} past their due date</div>
      </button>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-circle-check"></i></span>Paid this month</div>
        <div class="ui-kpi__value">{{ money(stats.paid_this_month, stats.currency) }}</div>
        <div class="ui-kpi__meta">Payments received since the 1st (incl. part payments)</div>
      </div>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'draft' }" @click="setStatus('draft')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-neutral"><i class="fa-solid fa-pen-ruler"></i></span>Drafts</div>
        <div class="ui-kpi__value">{{ money(stats.drafts, stats.currency) }}</div>
        <div class="ui-kpi__meta">{{ stats.drafts_count }} not yet sent</div>
      </button>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">
            {{ t.label }}<span v-if="countOf(t.value) !== null" class="tab-count">{{ countOf(t.value) }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" :placeholder="`Search ${isQuote ? 'quotes' : 'invoices'}…`" @input="debouncedLoad" />
          </div>
          <select v-model="sort" class="ui-select sort" @change="load" aria-label="Sort">
            <option value="">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due_date">Due date</option>
            <option value="total">Amount</option>
            <option value="client">Client</option>
          </select>
        </div>
      </div>

      <div v-if="extraFilter" class="filter-chips">
        <span class="chip">
          <i class="fa-solid fa-filter"></i> {{ extraFilter }} · {{ total }} {{ isQuote ? 'quote' : 'invoice' }}{{ total === 1 ? '' : 's' }}
          <button type="button" class="chip__x" aria-label="Clear filter" @click="clearExtra"><i class="fa-solid fa-xmark"></i></button>
        </span>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !rows.length" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="sk-row">
          <div class="ui-skeleton" style="width: 90px"></div>
          <div class="ui-skeleton" style="flex: 1"></div>
          <div class="ui-skeleton" style="width: 80px"></div>
          <div class="ui-skeleton" style="width: 100px"></div>
        </div>
      </div>

      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i :class="isQuote ? 'fa-solid fa-file-signature' : 'fa-solid fa-file-invoice-dollar'"></i></div>
        <h3>{{ q || status !== 'all' ? 'Nothing matches your filters' : `No ${isQuote ? 'quotes' : 'invoices'} yet` }}</h3>
        <p>{{ q || status !== 'all' ? 'Try a different search or filter.' : `Create your first ${isQuote ? 'quote' : 'invoice'} in under a minute.` }}</p>
        <router-link v-if="!q && status === 'all'" :to="isQuote ? '/quotes/new' : '/invoices/new'" class="ui-btn ui-btn--primary" style="margin-top: 12px">
          <i class="fa-solid fa-plus"></i> New {{ isQuote ? 'quote' : 'invoice' }}
        </router-link>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Client</th>
              <th class="hide-md">Issued</th>
              <th>{{ isQuote ? 'Valid until' : 'Due' }}</th>
              <th>Status</th>
              <th class="num">Total</th>
              <th v-if="!isQuote" class="num hide-sm">Balance</th>
              <th style="width: 44px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in rows" :key="inv.id" class="is-clickable" @click="open(inv)">
              <td>
                <div class="num-cell">
                  <strong>{{ inv.number }}</strong>
                  <i v-if="inv.is_recurring" class="fa-solid fa-repeat recurring" title="Recurring"></i>
                </div>
              </td>
              <td>
                <div class="client-cell">
                  <span class="avatar">{{ initials(inv.client_name) }}</span>
                  <span>
                    <span class="client-name">{{ inv.client_name }}</span>
                    <small v-if="inv.title || inv.reference">{{ inv.title || inv.reference }}</small>
                  </span>
                </div>
              </td>
              <td class="hide-md muted">{{ date(inv.issue_date) }}</td>
              <td>
                <span :class="{ 'txt-danger': inv.display_status === 'overdue' }">{{ date(inv.due_date) }}</span>
                <small v-if="inv.display_status === 'overdue'" class="due-note">{{ inv.days_overdue }}d late</small>
              </td>
              <td><span class="ui-badge" :class="`ui-badge--${inv.display_status}`">{{ label(inv.display_status) }}</span></td>
              <td class="num"><strong>{{ money(inv.total, inv.currency) }}</strong></td>
              <td v-if="!isQuote" class="num hide-sm" :class="{ muted: inv.balance_due <= 0 }">{{ money(inv.balance_due, inv.currency) }}</td>
              <td @click.stop>
                <router-link :to="`${basePath}/${inv.id}`" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Open ${inv.number}`"><i class="fa-solid fa-chevron-right"></i></router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="total > perPage" class="pager">
        <span class="muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= total" @click="go(page + 1)">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script>
import { invoicingApi, STATUS_LABELS } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatDate, downloadBlob, isoDate } from '@/utils/format'
import { formatCurrency, currencyDecimals } from '@/utils/currencies'
import { toast } from '@/composables/useToast'

export default {
  name: 'InvoiceList',
  props: { docType: { type: String, default: 'invoice' } },
  data() {
    return {
      rows: [],
      total: 0,
      page: 1,
      perPage: 25,
      status: this.$route.query.status || 'all',
      q: this.$route.query.q || '',
      // Optional issue-date range (e.g. from an analytics drill-down).
      from: this.$route.query.from || '',
      to: this.$route.query.to || '',
      // Optional payment-date range (cash-basis drill-down from Profit & loss).
      paidFrom: this.$route.query.paid_from || '',
      paidTo: this.$route.query.paid_to || '',
      sort: '',
      loading: false,
      exporting: false,
      error: null,
      stats: null,
      timer: null
    }
  },
  computed: {
    isQuote() {
      return this.docType === 'quote'
    },
    extraFilter() {
      const parts = []
      const extraStatus = { due: 'Unpaid, not yet due', open: 'Open', sent: 'Sent', partial: 'Partially paid', accepted: 'Accepted', converted: 'Invoiced', expired: 'Expired', declined: 'Declined', void: 'Void' }
      if (!this.tabs.some((t) => t.value === this.status)) parts.push(extraStatus[this.status] || this.status)
      if (this.from || this.to) parts.push(`Issued ${this.from ? formatDate(this.from) : '…'} – ${this.to ? formatDate(this.to) : '…'}`)
      if (this.paidFrom || this.paidTo) parts.push(`Paid ${this.paidFrom ? formatDate(this.paidFrom) : '…'} – ${this.paidTo ? formatDate(this.paidTo) : '…'}`)
      return parts.join(' · ')
    },
    otherNote() {
      const o = this.stats?.other_currencies || []
      if (!o.length) return ''
      const amt = (v, c) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: currencyDecimals(c), maximumFractionDigits: currencyDecimals(c) })
      return 'excl. ' + o.map((x) => `${x.currency} ${amt(x.outstanding, x.currency)}`).join(', ')
    },
    basePath() {
      return this.isQuote ? '/quotes' : '/invoices'
    },
    tabs() {
      return this.isQuote
        ? [
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'converted', label: 'Invoiced' },
            { value: 'expired', label: 'Expired' },
            { value: 'declined', label: 'Declined' }
          ]
        : [
            { value: 'all', label: 'All' },
            { value: 'draft', label: 'Draft' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'paid', label: 'Paid' },
            { value: 'recurring', label: 'Recurring' },
            { value: 'void', label: 'Void' }
          ]
    }
  },
  created() {
    this.load()
    this.loadStats()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    money: formatCurrency,
    date: formatDate,
    /** Number of documents behind a tab, from the server-side stats (null = unknown). */
    countOf(tab) {
      const c = this.stats?.counts
      if (!c) return null
      const t = this.docType
      const n = (k) => c[`${t}:${k}`] || 0
      switch (tab) {
        case 'all':
          return Object.keys(c).filter((k) => k.startsWith(`${t}:`)).reduce((sum, k) => sum + c[k], 0)
        case 'unpaid':
          return n('sent') + n('partial') + n('overdue')
        case 'open':
          return n('sent') + n('accepted')
        case 'recurring':
          return null
        default:
          return n(tab)
      }
    },
    label(s) {
      return STATUS_LABELS[s] || s
    },
    initials(name = '') {
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    },
    async load() {
      this.loading = true
      this.error = null
      try {
        const data = await invoicingApi.list({ type: this.docType, status: this.status, q: this.q || undefined, sort: this.sort || undefined, from: this.from || undefined, to: this.to || undefined, paid_from: this.paidFrom || undefined, paid_to: this.paidTo || undefined, page: this.page, per_page: this.perPage })
        this.rows = data.invoices || []
        this.total = data.total || 0
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load documents')
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        this.stats = await invoicingApi.stats()
      } catch {
        this.stats = null
      }
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.page = 1
        this.syncQuery()
        this.load()
      }, 280)
    },
    clearExtra() {
      if (!this.tabs.some((t) => t.value === this.status)) this.status = 'all'
      this.from = ''
      this.to = ''
      this.paidFrom = ''
      this.paidTo = ''
      this.page = 1
      this.syncQuery()
      this.load()
    },
    setStatus(s) {
      this.status = this.status === s && s !== 'all' ? 'all' : s
      this.page = 1
      this.syncQuery()
      this.load()
    },
    syncQuery() {
      const query = {}
      if (this.status !== 'all') query.status = this.status
      if (this.q) query.q = this.q
      if (this.from) query.from = this.from
      if (this.to) query.to = this.to
      if (this.paidFrom) query.paid_from = this.paidFrom
      if (this.paidTo) query.paid_to = this.paidTo
      this.$router.replace({ query })
    },
    go(p) {
      this.page = p
      this.load()
    },
    open(inv) {
      this.$router.push(`${this.basePath}/${inv.id}`)
    },
    async exportCsv() {
      this.exporting = true
      try {
        const blob = await invoicingApi.exportCsv(this.docType)
        downloadBlob(blob, `${this.docType}s-${isoDate()}.csv`)
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
.filter-chips {
  padding: 10px 16px 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 500;
}

.chip__x {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
}

.chip__x:hover {
  background: var(--surface-hover);
}

.tab-count {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.kpi-btn.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.kpi-danger { background: var(--danger-soft); color: var(--danger); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-neutral { background: var(--neutral-soft); color: var(--text-2); }
.txt-danger { color: var(--danger); }
.muted { color: var(--text-3); }

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
  width: 260px;
}

.sort {
  width: 150px;
}

.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}

.num-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.recurring {
  font-size: 11px;
  color: var(--accent);
}

.client-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
}

.client-cell small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-name {
  font-weight: 550;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.due-note {
  display: block;
  font-size: 11.5px;
  color: var(--danger);
}

.is-loading {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

@media (max-width: 1100px) {
  .hide-md { display: none; }
}

@media (max-width: 700px) {
  .hide-sm { display: none; }
  .search,
  .sort { width: 100%; }
  .toolbar__right { width: 100%; }
}
</style>
