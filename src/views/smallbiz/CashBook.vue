<template>
  <div>
    <div class="summary">
      <div class="sum">
        <span class="sum__label"><i class="fa-solid fa-arrow-down pos"></i> Money in</span>
        <strong class="pos">{{ money(baseTotals.income) }}</strong>
      </div>
      <div class="sum">
        <span class="sum__label"><i class="fa-solid fa-arrow-up neg"></i> Money out</span>
        <strong>{{ money(baseTotals.expenses) }}</strong>
      </div>
      <div class="sum">
        <span class="sum__label"><i class="fa-solid fa-equals"></i> Net</span>
        <strong :class="{ neg: baseTotals.net_cash < 0 }">{{ money(baseTotals.net_cash) }}</strong>
      </div>
      <div class="sum">
        <span class="sum__label"><i class="fa-solid fa-percent"></i> {{ settings.tax_name }} in / out</span>
        <strong class="sm">{{ money(baseTotals.tax_collected) }} / {{ money(baseTotals.tax_paid) }}</strong>
      </div>
      <div v-if="otherTotals.length" class="sum sum--other">
        <span class="sum__label">Other currencies</span>
        <span v-for="t in otherTotals" :key="t.currency" class="sm">{{ t.currency }} net {{ fmt(t.net_cash, t.currency) }}</span>
      </div>
    </div>

    <section class="ui-card">
      <div class="ui-card__head">
        <h2>Cash book <small class="muted">{{ periodLabel }}</small></h2>
        <div class="head-actions">
          <button class="ui-btn ui-btn--ghost" title="Manage categories" @click="$emit('manage-categories')"><i class="fa-solid fa-tags"></i><span class="hide-sm"> Categories</span></button>
          <button class="ui-btn" :disabled="exporting" @click="exportCsv"><i :class="exporting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-file-csv'"></i><span class="hide-sm"> Export CSV</span></button>
          <button class="ui-btn ui-btn--primary" @click="$emit('add', filters.type || 'expense')"><i class="fa-solid fa-plus"></i> New entry</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="ui-tabs" role="tablist" aria-label="Type">
          <button v-for="t in types" :key="t.key" class="ui-tab" :class="{ 'is-active': filters.type === t.key }" @click="setFilter('type', t.key)">{{ t.label }}</button>
        </div>
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="search" class="ui-input" type="search" placeholder="Search description, reference, amount…" aria-label="Search entries" @input="debouncedSearch" />
        </div>
        <select v-model="filters.period" class="ui-select fsel" aria-label="Period" @change="onPeriod">
          <option v-for="p in periods" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
        <select v-model="filters.category_id" class="ui-select fsel" aria-label="Category" @change="reload">
          <option value="">All categories</option>
          <optgroup v-if="filters.type !== 'expense'" label="Money in">
            <option v-for="c in incomeCats" :key="c.id" :value="c.id">{{ c.name }}</option>
          </optgroup>
          <optgroup v-if="filters.type !== 'income'" label="Money out">
            <option v-for="c in expenseCats" :key="c.id" :value="c.id">{{ c.name }}</option>
          </optgroup>
          <option value="none">Uncategorised</option>
        </select>
      </div>
      <div v-if="filters.period === 'custom'" class="custom">
        <label class="ui-field"><span class="ui-label">From</span><input v-model="filters.from" type="date" class="ui-input" @change="reload" /></label>
        <label class="ui-field"><span class="ui-label">To</span><input v-model="filters.to" type="date" class="ui-input" @change="reload" /></label>
      </div>
      <div v-if="activeFilterCount" class="chips">
        <span class="muted">{{ total }} {{ total === 1 ? 'entry' : 'entries' }} · {{ periodLabel }}</span>
        <button class="linkish" @click="clearFilters">Clear filters</button>
      </div>

      <div v-if="error" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="reload">Try again</a></span></div></div>
      <div v-else-if="loading && !entries.length" class="ui-card__body"><div class="ui-skeleton" style="height: 260px"></div></div>
      <div v-else-if="!entries.length" class="ui-empty">
        <div class="ui-empty__icon"><i :class="activeFilterCount ? 'fa-solid fa-filter-circle-xmark' : 'fa-solid fa-book-open'"></i></div>
        <template v-if="activeFilterCount">
          <h3>No entries match</h3>
          <p>Try a different period, category or search.</p>
          <button class="ui-btn ui-btn--sm" style="margin-top: 10px" @click="clearFilters">Clear filters</button>
        </template>
        <template v-else>
          <h3>{{ filters.period === 'all' ? 'Your cash book is empty' : `Nothing recorded in ${periodLabel || 'this period'}` }}</h3>
          <p>Every sale and expense you record lands here, with a running balance.</p>
          <div class="empty-actions">
            <button class="ui-btn ui-btn--success ui-btn--sm" @click="$emit('add', 'income')"><i class="fa-solid fa-arrow-down"></i> Add money in</button>
            <button class="ui-btn ui-btn--sm" @click="$emit('add', 'expense')"><i class="fa-solid fa-arrow-up"></i> Add money out</button>
            <button v-if="filters.period !== 'all'" class="ui-btn ui-btn--ghost ui-btn--sm" @click="setFilter('period', 'all')">Show all time</button>
          </div>
        </template>
      </div>
      <div v-else class="ui-table-wrap" :class="{ dim: loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th class="hide-md">Category</th>
              <th class="hide-md">Paid by</th>
              <th class="num hide-md">{{ settings.tax_name }}</th>
              <th class="num">Amount</th>
              <th class="num hide-sm" title="Cash balance after this entry">Balance</th>
              <th class="actions"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in entries" :key="e.id" class="is-clickable" tabindex="0" @click="$emit('edit', e)" @keydown.enter="$emit('edit', e)">
              <td class="nowrap">{{ shortDate(e.date) }}</td>
              <td class="desc">
                <strong>{{ e.description || e.category_name || (e.type === 'income' ? 'Money in' : 'Money out') }}</strong>
                <small>
                  <span class="show-md">{{ e.category_name || 'Uncategorised' }}</span>
                  <template v-if="e.reference"><span class="show-md"> · </span>Ref {{ e.reference }}</template>
                  <i v-if="e.has_attachment" class="fa-solid fa-paperclip clip" title="Receipt attached"></i>
                  <span v-if="e.link_type" class="ui-badge ui-badge--info linked" :title="'Not counted in Profit & loss: ' + linkLabel(e.link_type)"><i class="fa-solid fa-link"></i> {{ linkLabel(e.link_type) }}</span>
                </small>
              </td>
              <td class="hide-md"><span class="ui-badge" :class="e.category_name ? 'ui-badge--draft' : 'ui-badge--warning'">{{ e.category_name || 'Uncategorised' }}</span></td>
              <td class="hide-md muted">{{ e.payment_method || '—' }}</td>
              <td class="num hide-md muted">{{ e.tax_minor ? fmt(e.tax_minor, e.currency) : '—' }}</td>
              <td class="num amount" :class="e.type === 'income' ? 'pos' : ''">
                {{ e.type === 'income' ? '+' : '−' }}{{ fmt(e.amount_minor, e.currency) }}
                <small v-if="e.currency !== settings.currency" class="cur">{{ e.currency }}</small>
              </td>
              <td class="num hide-sm" :class="{ neg: e.balance_minor < 0 }">{{ e.balance_minor !== undefined ? fmt(e.balance_minor, e.currency) : '' }}</td>
              <td class="actions" @click.stop>
                <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Delete ${e.description || 'entry'}`" @click="remove(e)"><i class="fa-regular fa-trash-can"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="pages > 1" class="pager">
        <button class="ui-btn ui-btn--sm" :disabled="page <= 1 || loading" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i></button>
        <span>Page {{ page }} of {{ pages }}</span>
        <button class="ui-btn ui-btn--sm" :disabled="page >= pages || loading" @click="go(page + 1)"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
    </section>
  </div>
</template>

<script>
import { smallbizApi, fmtMinor, PERIODS, LINK_TYPES } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { formatDate, downloadBlob, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const PER_PAGE = 50

export default {
  name: 'CashBook',
  props: {
    settings: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    refreshKey: { type: Number, default: 0 }
  },
  emits: ['add', 'edit', 'changed', 'manage-categories'],
  data() {
    // Optional filters from the URL (drill-down from Profit & loss):
    // ?type=income|expense&from=YYYY-MM-DD&to=YYYY-MM-DD&category=<id>
    const q = this.$route.query
    const custom = !!(q.from && q.to)
    return {
      entries: [],
      totals: [],
      total: 0,
      page: 1,
      period: null,
      loading: false,
      exporting: false,
      error: null,
      search: '',
      timer: null,
      filters: {
        type: ['income', 'expense'].includes(q.type) ? q.type : '',
        period: custom ? 'custom' : 'this_month',
        category_id: q.category || '',
        from: custom ? q.from : '',
        to: custom ? q.to : '',
        q: ''
      },
      types: [
        { key: '', label: 'All' },
        { key: 'income', label: 'Money in' },
        { key: 'expense', label: 'Money out' }
      ],
      periods: PERIODS
    }
  },
  computed: {
    incomeCats() {
      return this.categories.filter((c) => c.type === 'income')
    },
    expenseCats() {
      return this.categories.filter((c) => c.type === 'expense')
    },
    baseTotals() {
      return this.totals.find((t) => t.currency === this.settings.currency) || { income: 0, expenses: 0, net_cash: 0, tax_collected: 0, tax_paid: 0 }
    },
    otherTotals() {
      return this.totals.filter((t) => t.currency !== this.settings.currency)
    },
    pages() {
      return Math.max(1, Math.ceil(this.total / PER_PAGE))
    },
    activeFilterCount() {
      const f = this.filters
      return (f.type ? 1 : 0) + (f.category_id ? 1 : 0) + (f.q ? 1 : 0) + (f.period !== 'this_month' ? 1 : 0)
    },
    periodLabel() {
      return this.period?.label || ''
    }
  },
  watch: {
    refreshKey() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    money(v) {
      return fmtMinor(v, this.settings.currency)
    },
    fmt(v, c) {
      return fmtMinor(v, c)
    },
    date: formatDate,
    linkLabel(t) {
      return (LINK_TYPES.find((x) => x.value === t) || {}).short || t
    },
    shortDate(d) {
      return String(d).slice(0, 4) === String(new Date().getFullYear()) ? formatDate(d, 'short') : formatDate(d)
    },
    params() {
      const f = this.filters
      const p = { period: f.period === 'custom' ? undefined : f.period, type: f.type || undefined, category_id: f.category_id || undefined, q: f.q || undefined }
      if (f.period === 'custom') {
        p.from = f.from || undefined
        p.to = f.to || undefined
      }
      return p
    },
    async load() {
      this.loading = true
      this.error = null
      try {
        const d = await smallbizApi.entries({ ...this.params(), page: this.page, per_page: PER_PAGE })
        this.entries = d.entries || []
        this.totals = d.totals || []
        this.total = d.total || 0
        this.period = d.period
        if (!this.entries.length && this.page > 1) {
          this.page = 1
          return this.load()
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the cash book')
      } finally {
        this.loading = false
      }
    },
    reload() {
      this.page = 1
      this.load()
    },
    go(p) {
      this.page = p
      this.load()
    },
    setFilter(k, v) {
      this.filters[k] = v
      if (k === 'type' && this.filters.category_id && this.filters.category_id !== 'none') {
        const c = this.categories.find((x) => x.id === this.filters.category_id)
        if (c && v && c.type !== v) this.filters.category_id = ''
      }
      this.reload()
    },
    onPeriod() {
      if (this.filters.period === 'custom') {
        if (!this.filters.from) this.filters.from = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
        if (!this.filters.to) this.filters.to = isoDate()
      }
      this.reload()
    },
    debouncedSearch() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.filters.q = this.search.trim()
        this.reload()
      }, 300)
    },
    clearFilters() {
      this.search = ''
      this.filters = { type: '', period: 'this_month', category_id: '', from: '', to: '', q: '' }
      this.reload()
    },
    async exportCsv() {
      this.exporting = true
      try {
        const res = await smallbizApi.exportEntries(this.params())
        const cd = res.headers?.['content-disposition'] || ''
        const name = /filename="([^"]+)"/.exec(cd)?.[1] || `cash-book-${isoDate()}.csv`
        downloadBlob(res.data, name)
        toast.success('CSV downloaded')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not export CSV'))
      } finally {
        this.exporting = false
      }
    },
    async remove(e) {
      const ok = await confirmDialog({
        title: 'Delete this entry?',
        message: `${e.description || (e.type === 'income' ? 'Money in' : 'Money out')} · ${fmtMinor(e.amount_minor, e.currency)} on ${formatDate(e.date)}`,
        confirmText: 'Delete',
        danger: true
      })
      if (!ok) return
      try {
        await smallbizApi.deleteEntry(e.id)
        toast.success('Entry deleted')
        this.$emit('changed')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not delete entry'))
      }
    }
  }
}
</script>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.sum {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sum__label {
  font-size: 12.5px;
  color: var(--text-3);
  font-weight: 550;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sum strong {
  font-size: 19px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.sum .sm {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.pos { color: var(--success); }
.neg { color: var(--danger); }
.muted { color: var(--text-3); }

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.search {
  flex: 1 1 220px;
  max-width: 380px;
}

.head-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ui-card__head h2 small {
  font-size: 13px;
  font-weight: 450;
  margin-left: 6px;
}

.fsel {
  width: auto;
  min-width: 150px;
}

.spacer {
  flex: 1;
}

.custom {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.custom .ui-field {
  width: 170px;
}

.chips {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.linkish {
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.dim {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.nowrap {
  white-space: nowrap;
}

.desc strong {
  display: block;
  font-weight: 600;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc small {
  color: var(--text-3);
  font-size: 12.5px;
}

.clip {
  margin-left: 6px;
  color: var(--text-3);
}

.amount {
  font-weight: 650;
}

.cur {
  display: block;
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
}

.actions {
  width: 44px;
  text-align: right;
  position: relative;
}

.show-md {
  display: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
  flex-wrap: wrap;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-3);
}

@media (max-width: 900px) {
  .hide-md {
    display: none;
  }
  .show-md {
    display: inline;
  }
}

@media (max-width: 640px) {
  .ui-card__head {
    flex-wrap: wrap;
    gap: 10px;
  }
  .head-actions {
    width: 100%;
  }
  .head-actions .ui-btn--primary {
    flex: 1;
    justify-content: center;
  }
  .hide-sm {
    display: none;
  }
  .search {
    max-width: none;
    flex-basis: 100%;
    order: 5;
  }
  .toolbar .ui-tabs {
    flex: 1 1 100%;
  }
  .toolbar .ui-tab {
    flex: 1;
    justify-content: center;
  }
  .fsel {
    flex: 1;
    min-width: 0;
  }
  .spacer {
    display: none;
  }
  .ui-table td,
  .ui-table th {
    padding-left: 10px;
    padding-right: 10px;
  }
  .desc strong {
    max-width: 150px;
  }
}

.linked {
  margin-left: 6px;
  font-size: 10.5px;
}
</style>
