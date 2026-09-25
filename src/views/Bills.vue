<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Finance</div>
        <h1>Bills</h1>
        <p>Track what you owe suppliers, pay on time and keep your books up to date.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="!bills.length" @click="exportCsv"><i class="fa-solid fa-download"></i> Export</button>
        <button class="ui-btn ui-btn--primary" @click="newBill()"><i class="fa-solid fa-plus"></i> New bill</button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': view === 'bills' && status === 'unpaid' }" @click="setStatus('unpaid')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-hourglass-half"></i></span>Outstanding</div>
        <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.payables_outstanding) }}</template></div>
        <div class="ui-kpi__meta">{{ s ? `${s.open_bills} bill${s.open_bills === 1 ? '' : 's'} awaiting payment` : '…' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': view === 'bills' && status === 'overdue' }" @click="setStatus('overdue')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>Overdue</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': s && s.payables_overdue > 0 }"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.payables_overdue) }}</template></div>
        <div class="ui-kpi__meta">{{ s ? `${s.overdue_count} past due` : '…' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': view === 'bills' && status === 'due_soon' }" @click="setStatus('due_soon')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-regular fa-calendar"></i></span>Due in 7 days</div>
        <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.due_soon) }}</template></div>
        <div class="ui-kpi__meta">{{ s ? `${s.due_soon_count} bill${s.due_soon_count === 1 ? '' : 's'} coming up` : '…' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': view === 'bills' && status === 'paid' }" @click="setStatus('paid')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-circle-check"></i></span>Paid this month</div>
        <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.paid_this_month) }}</template></div>
        <div class="ui-kpi__meta">Payments to suppliers</div>
      </button>
    </div>

    <section class="ui-card">
      <div class="card-tabs" role="tablist" aria-label="Bills sections">
        <button class="card-tab" :class="{ 'is-active': view === 'bills' }" role="tab" :aria-selected="view === 'bills'" @click="setView('bills')">
          <i class="fa-solid fa-file-invoice"></i> Bills
        </button>
        <button class="card-tab" :class="{ 'is-active': view === 'vendors' }" role="tab" :aria-selected="view === 'vendors'" @click="setView('vendors')">
          <i class="fa-solid fa-truck-field"></i> Vendors <span class="count">{{ activeVendors.length }}</span>
        </button>
      </div>

      <VendorsTab
        v-if="view === 'vendors'"
        :vendors="vendors"
        :accounts="accounts"
        :loading="vendorsLoading"
        :currency="currency"
        @changed="loadVendors(); loadSummary()"
        @reload="(all) => loadVendors(all)"
        @new-bill="(v) => newBill(v)"
        @show-bills="showVendorBills"
      />

      <template v-else>
        <div class="toolbar">
          <div class="ui-tabs" role="tablist" aria-label="Bill status">
            <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value, true)">
              {{ t.label }} <span v-if="counts[t.value]" class="count">{{ counts[t.value] }}</span>
            </button>
          </div>
          <div class="toolbar__right">
            <div class="ui-input-group search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="q" class="ui-input" type="search" placeholder="Search bills…" aria-label="Search bills" />
            </div>
            <select v-model="vendorId" class="ui-select vendor" aria-label="Filter by vendor">
              <option value="">All vendors</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
        </div>

        <div v-if="dateText" class="date-chip">
          <span><i class="fa-regular fa-calendar"></i> {{ dateText }}</span>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="clearDates">Clear dates</button>
        </div>

        <div v-if="error" class="ui-card__body">
          <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="loadBills">Try again</a></span></div>
        </div>

        <div v-else-if="loading && !bills.length" class="ui-card__body">
          <div v-for="n in 6" :key="n" class="sk-row">
            <div class="ui-skeleton" style="width: 90px"></div>
            <div class="ui-skeleton" style="flex: 1"></div>
            <div class="ui-skeleton" style="width: 80px"></div>
            <div class="ui-skeleton" style="width: 100px"></div>
          </div>
        </div>

        <div v-else-if="!rows.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-file-invoice"></i></div>
          <h3>{{ filtered ? 'No bills match your filters' : 'No bills yet' }}</h3>
          <p>{{ filtered ? 'Try a different search, vendor or status.' : 'Enter supplier bills to track what you owe and when it’s due.' }}</p>
          <button v-if="filtered" class="ui-btn" style="margin-top: 12px" @click="clearFilters">Clear filters</button>
          <button v-else class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="newBill()"><i class="fa-solid fa-plus"></i> New bill</button>
        </div>

        <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Vendor</th>
                <th class="hide-md">Bill date</th>
                <th>Due</th>
                <th>Status</th>
                <th class="num">Total</th>
                <th class="num hide-sm">Amount due</th>
                <th style="width: 120px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in rows" :key="b.id" class="is-clickable" @click="openDetail(b)">
                <td>
                  <strong class="mono">{{ b.bill_number }}</strong>
                  <small v-if="b.reference" class="sub">{{ b.reference }}</small>
                </td>
                <td>
                  <div class="v-cell">
                    <span class="avatar">{{ initials(b.vendor_name) }}</span>
                    <span class="v-name">{{ b.vendor_name || '—' }}</span>
                  </div>
                </td>
                <td class="hide-md muted">{{ date(b.bill_date) }}</td>
                <td class="nowrap">
                  <span :class="{ 'txt-danger': b.display_status === 'overdue' }">{{ date(b.due_date) }}</span>
                  <small v-if="b.display_status === 'overdue'" class="due-note">{{ b.days_overdue }}d late</small>
                  <small v-else-if="b.amount_due > 0 && b.status !== 'draft' && isSoon(b)" class="soon-note">{{ rel(b.due_date) }}</small>
                </td>
                <td><span class="ui-badge" :class="`ui-badge--${badge(b)}`">{{ statusLabel(b) }}</span></td>
                <td class="num"><strong>{{ money(b.total) }}</strong></td>
                <td class="num hide-sm" :class="{ muted: b.amount_due <= 0 }">{{ money(b.amount_due) }}</td>
                <td class="row-actions" @click.stop>
                  <button v-if="b.status === 'draft'" class="ui-btn ui-btn--sm" @click="approve(b)"><i class="fa-solid fa-check"></i> Approve</button>
                  <button v-else-if="b.amount_due > 0" class="ui-btn ui-btn--sm ui-btn--success" @click="pay(b)"><i class="fa-solid fa-money-bill-wave"></i> Pay</button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${b.bill_number}`" title="Edit" @click="editBill(b)"><i class="fa-solid fa-pen"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
          <footer v-if="rows.length > 1" class="list-foot">
            <span>{{ rows.length }} bills</span>
            <span>Total <strong>{{ money(sum(rows, 'total')) }}</strong></span>
            <span>Due <strong>{{ money(sum(rows, 'amount_due')) }}</strong></span>
          </footer>
        </div>
      </template>
    </section>

    <BillModal
      v-if="editing"
      :bill="editing.bill"
      :vendor-id="editing.vendorId || ''"
      :vendors="activeVendorsFor(editing.bill)"
      :accounts="accounts"
      :currency="currency"
      @close="editing = null"
      @saved="onSaved"
      @vendor-created="loadVendors()"
    />
    <BillDetailModal
      v-if="detail"
      :bill="detail"
      :accounts="accounts"
      :currency="currency"
      @close="detail = null"
      @edit="editBill"
      @pay="pay"
      @approve="approve"
      @delete="remove"
      @changed="onDetailChanged"
    />
    <PaymentModal v-if="paying" :bill="paying" :banks="banks" :currency="currency" @close="paying = null" @saved="onPaid" />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import BillModal from '@/components/finance/BillModal.vue'
import BillDetailModal from '@/components/finance/BillDetailModal.vue'
import PaymentModal from '@/components/finance/PaymentModal.vue'
import VendorsTab from '@/components/finance/VendorsTab.vue'
import { financeApi, BILL_STATUS_LABELS, BILL_BADGE, toCents } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, relativeDays, isoDate, addDays, downloadBlob } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const STATUSES = ['all', 'draft', 'unpaid', 'due_soon', 'overdue', 'paid']

export default {
  name: 'Bills',
  components: { BillModal, BillDetailModal, PaymentModal, VendorsTab },
  data() {
    const qs = this.$route.query
    return {
      view: qs.view === 'vendors' ? 'vendors' : 'bills',
      status: STATUSES.includes(qs.status) ? qs.status : 'all',
      q: '',
      vendorId: qs.vendor || '',
      // Optional date range (drill-down from Profit & loss): bill date or payment date.
      dates: { from: qs.from || '', to: qs.to || '', paid_from: qs.paid_from || '', paid_to: qs.paid_to || '' },
      bills: [],
      loading: false,
      error: '',
      s: null,
      vendors: [],
      vendorsLoading: false,
      accounts: [],
      banks: [],
      editing: null,
      detail: null,
      paying: null
    }
  },
  computed: {
    currency() {
      return orgCurrency()
    },
    tabs() {
      return [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Draft' },
        { value: 'unpaid', label: 'Awaiting payment' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'paid', label: 'Paid' }
      ]
    },
    activeVendors() {
      return this.vendors.filter((v) => v.is_active)
    },
    counts() {
      const c = { all: this.bills.length, draft: 0, unpaid: 0, overdue: 0, paid: 0 }
      for (const b of this.bills) {
        if (b.status === 'draft') c.draft++
        else if (b.status === 'paid') c.paid++
        else {
          c.unpaid++
          if (b.display_status === 'overdue') c.overdue++
        }
      }
      return c
    },
    filtered() {
      return !!(this.q || this.vendorId || this.status !== 'all' || this.dateText)
    },
    dateText() {
      const d = this.dates
      const f = (v) => (v ? formatDate(v) : '…')
      const parts = []
      if (d.from || d.to) parts.push(`Bill date ${f(d.from)} – ${f(d.to)}`)
      if (d.paid_from || d.paid_to) parts.push(`Paid ${f(d.paid_from)} – ${f(d.paid_to)}`)
      return parts.join(' · ')
    },
    rows() {
      const q = this.q.trim().toLowerCase()
      const today = isoDate()
      const soon = addDays(today, 7)
      return this.bills.filter((b) => {
        if (this.vendorId && b.vendor_id !== this.vendorId) return false
        switch (this.status) {
          case 'draft':
            if (b.status !== 'draft') return false
            break
          case 'unpaid':
            if (!['unpaid', 'partial'].includes(b.status)) return false
            break
          case 'overdue':
            if (b.display_status !== 'overdue') return false
            break
          case 'due_soon': {
            const d = isoDate(b.due_date)
            if (!['unpaid', 'partial'].includes(b.status) || d < today || d > soon) return false
            break
          }
          case 'paid':
            if (b.status !== 'paid') return false
            break
        }
        if (q && !`${b.bill_number} ${b.vendor_name} ${b.reference} ${b.notes}`.toLowerCase().includes(q)) return false
        return true
      })
    }
  },
  created() {
    this.loadBills()
    this.loadSummary()
    this.loadVendors()
    this.loadRefs()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    date: formatDate,
    rel: relativeDays,
    sum(list, key) {
      return list.reduce((s, b) => s + toCents(b[key]), 0) / 100
    },
    initials(name = '') {
      return (name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    },
    badge(b) {
      return BILL_BADGE[b.display_status] || 'draft'
    },
    statusLabel(b) {
      return BILL_STATUS_LABELS[b.display_status] || b.display_status
    },
    isSoon(b) {
      const d = isoDate(b.due_date)
      return d >= isoDate() && d <= addDays(isoDate(), 7)
    },
    activeVendorsFor(bill) {
      // include the bill's own vendor even if archived
      return this.vendors.filter((v) => v.is_active || (bill && v.id === bill.vendor_id))
    },
    syncQuery() {
      const query = {}
      if (this.view === 'vendors') query.view = 'vendors'
      if (this.status !== 'all') query.status = this.status
      if (this.vendorId) query.vendor = this.vendorId
      for (const [k, v] of Object.entries(this.dates)) if (v) query[k] = v
      this.$router.replace({ query })
    },
    setView(v) {
      this.view = v
      this.syncQuery()
    },
    setStatus(s, fromTab = false) {
      this.view = 'bills'
      this.status = !fromTab && this.status === s ? 'all' : s
      this.syncQuery()
    },
    clearFilters() {
      this.q = ''
      this.vendorId = ''
      this.status = 'all'
      const hadDates = !!this.dateText
      this.dates = { from: '', to: '', paid_from: '', paid_to: '' }
      this.syncQuery()
      if (hadDates) this.loadBills()
    },
    clearDates() {
      this.dates = { from: '', to: '', paid_from: '', paid_to: '' }
      this.syncQuery()
      this.loadBills()
    },
    showVendorBills(v) {
      this.vendorId = v.id
      this.status = 'all'
      this.view = 'bills'
      this.syncQuery()
    },
    async loadBills() {
      this.loading = true
      this.error = ''
      try {
        const params = {}
        for (const [k, v] of Object.entries(this.dates)) if (v) params[k] = v
        this.bills = (await financeApi.bills(params)) || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load bills')
      } finally {
        this.loading = false
      }
    },
    async loadSummary() {
      try {
        this.s = await financeApi.summary()
      } catch {
        this.s = null
      }
    },
    async loadVendors(includeInactive = true) {
      this.vendorsLoading = true
      try {
        this.vendors = (await financeApi.vendors({ include_inactive: includeInactive ? 'true' : undefined })) || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load vendors'))
      } finally {
        this.vendorsLoading = false
      }
    },
    async loadRefs() {
      try {
        const [accounts, banks] = await Promise.all([financeApi.accounts(), financeApi.bankAccounts()])
        this.accounts = accounts || []
        this.banks = banks || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load accounts'))
      }
    },
    refresh() {
      this.loadBills()
      this.loadSummary()
      this.loadVendors()
    },
    newBill(vendor) {
      this.detail = null
      this.editing = { bill: null, vendorId: vendor ? vendor.id : this.vendorId || '' }
    },
    async openDetail(b) {
      this.detail = b
      try {
        this.detail = await financeApi.bill(b.id)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the bill'))
      }
    },
    async editBill(b) {
      try {
        const full = b.payments ? b : await financeApi.bill(b.id)
        this.detail = null
        this.editing = { bill: full }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the bill'))
      }
    },
    onSaved(bill) {
      this.editing = null
      this.refresh()
      if (bill && bill.id) this.detail = bill
    },
    pay(b) {
      if (!this.banks.length) this.loadRefs()
      this.detail = null
      this.paying = b
    },
    onPaid(bill) {
      this.paying = null
      this.refresh()
      this.loadRefs()
      this.detail = bill
    },
    onDetailChanged(bill) {
      this.detail = bill
      this.refresh()
      this.loadRefs()
    },
    async approve(b) {
      try {
        const updated = await financeApi.approveBill(b.id)
        toast.success(`${b.bill_number} approved`)
        if (this.detail) this.detail = updated
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not approve the bill'))
      }
    },
    async remove(b) {
      const ok = await confirmDialog({
        title: `Delete ${b.bill_number}?`,
        message: b.paid_amount > 0 ? 'This bill has payments. Remove the payments first, then delete the bill.' : `The bill from ${b.vendor_name} for ${this.money(b.total)} will be deleted and its journal reversed.`,
        confirmText: 'Delete bill',
        danger: true
      })
      if (!ok) return
      try {
        await financeApi.deleteBill(b.id)
        toast.success(`${b.bill_number} deleted`)
        this.detail = null
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the bill'))
      }
    },
    exportCsv() {
      const head = ['Bill', 'Reference', 'Vendor', 'Bill date', 'Due date', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid', 'Amount due']
      const lines = this.rows.map((b) => [
        b.bill_number,
        b.reference,
        b.vendor_name,
        isoDate(b.bill_date),
        isoDate(b.due_date),
        this.statusLabel(b),
        b.subtotal.toFixed(2),
        b.tax_amount.toFixed(2),
        b.total.toFixed(2),
        b.paid_amount.toFixed(2),
        b.amount_due.toFixed(2)
      ])
      const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      downloadBlob(new Blob([csv], { type: 'text/csv' }), `bills-${isoDate()}.csv`)
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
.sk {
  display: inline-block;
  width: 120px;
  height: 26px;
}
.k-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.k-warning {
  background: var(--warning-soft);
  color: var(--warning);
}
.k-success {
  background: var(--success-soft);
  color: var(--success);
}
.txt-danger {
  color: var(--danger);
}
.card-tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}
.card-tab {
  border: 0;
  background: none;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-3);
  padding: 14px 12px 12px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.card-tab:hover {
  color: var(--text);
}
.card-tab.is-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.card-tab .count {
  font-size: 11px;
  background: var(--neutral-soft);
  color: var(--text-3);
  padding: 1px 7px;
  border-radius: 999px;
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
  width: 240px;
}
.vendor {
  width: 190px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}
.mono {
  font-family: var(--font-mono);
  font-size: 13px;
  white-space: nowrap;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.v-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}
.v-name {
  font-weight: 550;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.muted {
  color: var(--text-3);
}
.nowrap {
  white-space: nowrap;
}
.due-note {
  display: block;
  font-size: 11.5px;
  color: var(--danger);
}
.soon-note {
  display: block;
  font-size: 11.5px;
  color: var(--warning);
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.row-actions .ui-btn + .ui-btn {
  margin-left: 4px;
}
.list-foot {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
  font-size: 13px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.list-foot strong {
  color: var(--text);
  margin-left: 4px;
}
.is-loading {
  opacity: 0.6;
}
@media (max-width: 1100px) {
  .hide-md {
    display: none;
  }
}
@media (max-width: 700px) {
  .hide-sm {
    display: none;
  }
  .search,
  .vendor,
  .toolbar__right {
    width: 100%;
  }
  .list-foot {
    justify-content: space-between;
    gap: 8px;
  }
}
@media (max-width: 700px) {
  .ui-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 19px;
  }
  .ui-kpi__meta {
    font-size: 11.5px;
  }
  .card-tab {
    padding: 12px 8px 10px;
    font-size: 13.5px;
  }
  .card-tab i {
    display: none;
  }
}

.date-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-2);
  background: var(--info-soft);
  border-bottom: 1px solid var(--border);
}
</style>
