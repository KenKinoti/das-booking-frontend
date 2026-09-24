<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Customers</div>
        <h1>Customers</h1>
        <p>Everyone you do business with: contact details, bookings, vehicles and invoices.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="!rows.length" title="Download the current list as CSV" @click="exportCsv"><i class="fa-solid fa-download"></i> Export</button>
        <button class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-plus"></i> New customer</button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'all' }" @click="setStatus('all')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-users"></i></span>Total customers</div>
        <div class="ui-kpi__value"><span v-if="statsLoading" class="ui-skeleton sk-val"></span><template v-else>{{ stats.total_customers || 0 }}</template></div>
        <div class="ui-kpi__meta">{{ stats.inactive_customers || 0 }} inactive</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'active' }" @click="setStatus('active')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-user-check"></i></span>Active</div>
        <div class="ui-kpi__value"><span v-if="statsLoading" class="ui-skeleton sk-val"></span><template v-else>{{ stats.active_customers || 0 }}</template></div>
        <div class="ui-kpi__meta">Available for bookings and invoices</div>
      </button>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-user-plus"></i></span>New this month</div>
        <div class="ui-kpi__value"><span v-if="statsLoading" class="ui-skeleton sk-val"></span><template v-else>{{ stats.new_this_month || 0 }}</template></div>
        <div class="ui-kpi__meta">Added since the 1st</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-regular fa-calendar-check"></i></span>Upcoming bookings</div>
        <div class="ui-kpi__value"><span v-if="statsLoading" class="ui-skeleton sk-val"></span><template v-else>{{ stats.with_upcoming_bookings || 0 }}</template></div>
        <div class="ui-kpi__meta">Customers with a future booking</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">
            {{ t.label }} <span class="count">{{ t.count }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search name, email, phone, suburb…" aria-label="Search customers" @input="debouncedLoad" />
          </div>
          <select v-model="sort" class="ui-select sort" aria-label="Sort" @change="load">
            <option value="">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !rows.length" class="ui-card__body">
        <div v-for="n in 7" :key="n" class="sk-row">
          <div class="ui-skeleton" style="width: 34px; height: 34px; border-radius: 10px"></div>
          <div class="ui-skeleton" style="flex: 2"></div>
          <div class="ui-skeleton" style="flex: 1"></div>
          <div class="ui-skeleton" style="width: 90px"></div>
          <div class="ui-skeleton" style="width: 70px"></div>
        </div>
      </div>

      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-address-book"></i></div>
        <h3>{{ q || status !== 'all' ? 'No customers match your filters' : 'No customers yet' }}</h3>
        <p>{{ q || status !== 'all' ? 'Try a different search or clear the filter.' : 'Add your first customer to start taking bookings and sending invoices.' }}</p>
        <div style="margin-top: 14px">
          <button v-if="q || status !== 'all'" class="ui-btn" @click="clearFilters">Clear filters</button>
          <button v-else class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-plus"></i> New customer</button>
        </div>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th class="hide-sm">Phone</th>
              <th class="hide-md">Country</th>
              <th class="hide-sm">Last visit</th>
              <th class="num hide-md">Bookings</th>
              <th v-if="showVehicles" class="num hide-lg">Vehicles</th>
              <th class="num hide-lg">Spent</th>
              <th>Status</th>
              <th class="actions-col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in pageRows" :key="c.id" class="is-clickable" @click="openDetails(c)">
              <td>
                <div class="person">
                  <span class="avatar" :class="{ 'avatar--off': !c.is_active }">{{ initials(fullName(c)) }}</span>
                  <span class="person__text">
                    <span class="person__name">{{ fullName(c) }} <span v-if="c.country_code" class="name-flag" :title="countryOf(c)">{{ flag(c.country_code) }}</span></span>
                    <small>
                      {{ c.email || c.phone || '—' }}
                      <span v-if="c.contacts_count" class="contacts-pill" :title="`${c.contacts_count} contact${c.contacts_count > 1 ? 's' : ''} copied on emails`"><i class="fa-regular fa-address-card"></i> {{ c.contacts_count }}</span>
                    </small>
                  </span>
                </div>
              </td>
              <td class="hide-sm nowrap">{{ c.phone || '—' }}</td>
              <td class="hide-md nowrap">
                <span class="loc">
                  <span v-if="c.country_code" class="loc__flag" aria-hidden="true">{{ flag(c.country_code) }}</span>
                  <span>
                    <span class="loc__country">{{ countryOf(c) || '—' }}</span>
                    <small v-if="location(c)" class="muted">{{ location(c) }}</small>
                  </span>
                </span>
              </td>
              <td class="hide-sm">
                <span v-if="c.last_booking_at">{{ date(c.last_booking_at) }}</span>
                <span v-else class="muted">Never</span>
                <small v-if="c.next_booking_at" class="next">Next {{ date(c.next_booking_at, 'short') }}</small>
              </td>
              <td class="num hide-md">{{ c.bookings_count || 0 }}</td>
              <td v-if="showVehicles" class="num hide-lg">{{ c.vehicles_count || 0 }}</td>
              <td class="num hide-lg">{{ c.total_spent ? money(c.total_spent) : '—' }}</td>
              <td><span class="ui-badge" :class="c.is_active ? 'ui-badge--success' : 'ui-badge--draft'">{{ c.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions-col" @click.stop>
                <div class="row-actions">
                  <router-link :to="bookingLink(c)" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon hide-sm" title="New booking" aria-label="New booking"><i class="fa-regular fa-calendar-plus"></i></router-link>
                  <router-link :to="invoiceLink(c)" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon hide-sm" title="New invoice" aria-label="New invoice"><i class="fa-solid fa-file-invoice-dollar"></i></router-link>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit customer" aria-label="Edit customer" @click="openEdit(c)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger hide-sm" title="Delete customer" aria-label="Delete customer" @click="remove(c)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="rows.length > perPage" class="pager">
        <span class="muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, rows.length) }} of {{ rows.length }}</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="page--"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= rows.length" @click="page++">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>
    </section>

    <CustomerModal :show="formOpen" :customer="editing" @close="formOpen = false" @saved="onSaved" />
    <CustomerDetailsModal
      :show="!!detailId"
      :customer-id="detailId || ''"
      :refresh-key="detailKey"
      @close="closeDetails"
      @edit="openEdit"
      @toggle="toggle"
      @delete="remove"
      @changed="refresh"
    />
  </div>
</template>

<script>
import CustomerModal from '@/components/CustomerModal.vue'
import CustomerDetailsModal from '@/components/CustomerDetailsModal.vue'
import { customerService, customerName, initials, newInvoiceLink, newBookingLink } from '@/services/customerService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatMoney, downloadBlob, isoDate } from '@/utils/format'
import { countryFlag } from '@/utils/currencies'
import { customerCountry } from '@/services/customerService'

export default {
  name: 'Customers',
  components: { CustomerModal, CustomerDetailsModal },
  data() {
    return {
      rows: [],
      stats: {},
      statsLoading: true,
      loading: false,
      error: '',
      q: this.$route.query.q || '',
      status: ['active', 'inactive'].includes(this.$route.query.status) ? this.$route.query.status : 'all',
      sort: '',
      page: 1,
      perPage: 25,
      timer: null,
      formOpen: false,
      editing: null,
      detailId: this.$route.query.customer || null,
      detailKey: 0
    }
  },
  computed: {
    tabs() {
      return [
        { value: 'all', label: 'All', count: this.stats.total_customers ?? 0 },
        { value: 'active', label: 'Active', count: this.stats.active_customers ?? 0 },
        { value: 'inactive', label: 'Inactive', count: this.stats.inactive_customers ?? 0 }
      ]
    },
    pageRows() {
      return this.rows.slice((this.page - 1) * this.perPage, this.page * this.perPage)
    },
    showVehicles() {
      return (this.stats.total_vehicles || 0) > 0
    }
  },
  watch: {
    '$route.query.customer'(v) {
      this.detailId = v || null
    }
  },
  created() {
    this.load()
    this.loadStats()
    if (this.$route.query.new) this.openCreate()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    initials,
    fullName: customerName,
    date: formatDate,
    money: (v) => formatMoney(v),
    invoiceLink: newInvoiceLink,
    bookingLink: newBookingLink,
    flag: countryFlag,
    countryOf: customerCountry,
    location(c) {
      const a = c.address || {}
      return [a.suburb, a.state].filter(Boolean).join(', ')
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.rows = await customerService.list({ search: this.q || undefined, status: this.status === 'all' ? undefined : this.status, sort: this.sort || undefined })
        const maxPage = Math.max(1, Math.ceil(this.rows.length / this.perPage))
        if (this.page > maxPage) this.page = maxPage
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load customers')
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        this.stats = await customerService.stats()
      } catch {
        this.stats = {}
      } finally {
        this.statsLoading = false
      }
    },
    refresh() {
      this.load()
      this.loadStats()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.page = 1
        this.syncQuery()
        this.load()
      }, 250)
    },
    setStatus(s) {
      this.status = this.status === s && s !== 'all' ? 'all' : s
      this.page = 1
      this.syncQuery()
      this.load()
    },
    clearFilters() {
      this.q = ''
      this.status = 'all'
      this.syncQuery()
      this.load()
    },
    syncQuery(extra = {}) {
      const query = {}
      if (this.status !== 'all') query.status = this.status
      if (this.q) query.q = this.q
      if (this.detailId) query.customer = this.detailId
      this.$router.replace({ query: { ...query, ...extra } }).catch(() => {})
    },
    openCreate() {
      this.editing = null
      this.formOpen = true
    },
    openEdit(c) {
      this.editing = { ...c }
      this.formOpen = true
    },
    openDetails(c) {
      this.detailId = c.id
      this.syncQuery()
    },
    closeDetails() {
      this.detailId = null
      this.syncQuery()
    },
    onSaved(saved) {
      const wasEditing = !!this.editing
      this.formOpen = false
      this.refresh()
      if (this.detailId) this.detailKey++
      else if (!wasEditing && saved?.id) this.openDetails(saved)
    },
    async toggle(c) {
      if (c.is_active) {
        const ok = await confirmDialog({
          title: 'Deactivate customer?',
          message: `${customerName(c)} will be hidden from active lists. Their bookings and history are kept and you can reactivate them at any time.`,
          confirmText: 'Deactivate'
        })
        if (!ok) return
      }
      try {
        const updated = await customerService.toggleStatus(c.id)
        toast.success(updated?.is_active ? 'Customer reactivated' : 'Customer deactivated')
        this.refresh()
        this.detailKey++
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the customer'))
      }
    },
    async remove(c) {
      const ok = await confirmDialog({
        title: `Delete ${customerName(c)}?`,
        message: 'The customer and their vehicles will be removed. Past bookings and invoices stay in your records. This cannot be undone.',
        confirmText: 'Delete customer',
        danger: true
      })
      if (!ok) return
      try {
        await customerService.remove(c.id)
        toast.success('Customer deleted')
        if (this.detailId === c.id) this.closeDetails()
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the customer'))
      }
    },
    exportCsv() {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const head = ['First name', 'Last name', 'Email', 'Phone', 'Street', 'Suburb', 'State', 'Postcode', 'Country', 'Country code', 'Invoice currency', 'Contacts', 'Status', 'Bookings', 'Last visit', 'Total spent', 'Created']
      const lines = this.rows.map((c) =>
        [
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.address?.street,
          c.address?.suburb,
          c.address?.state,
          c.address?.postcode,
          customerCountry(c),
          c.country_code || '',
          c.billing_currency || '',
          c.contacts_count || 0,
          c.is_active ? 'Active' : 'Inactive',
          c.bookings_count || 0,
          c.last_booking_at ? isoDate(new Date(c.last_booking_at)) : '',
          (c.total_spent || 0).toFixed(2),
          isoDate(new Date(c.created_at))
        ]
          .map(esc)
          .join(',')
      )
      downloadBlob(new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv' }), `customers-${isoDate()}.csv`)
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

.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }

.sk-val {
  display: inline-block;
  width: 60px;
  height: 26px;
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

.sort {
  width: 150px;
}

.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  align-items: center;
}

.person {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.person__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.person__name {
  font-weight: 600;
}

.person__text small {
  color: var(--text-3);
  font-size: 12.5px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.avatar--off {
  background: var(--neutral-soft);
  color: var(--text-3);
}

.muted {
  color: var(--text-3);
}

.contacts-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
}

.loc {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loc__flag {
  font-size: 18px;
  line-height: 1;
}

.loc small {
  display: block;
  font-size: 12px;
}

.nowrap {
  white-space: nowrap;
}

.next {
  display: block;
  font-size: 12px;
  color: var(--success);
}

.actions-col {
  width: 1%;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.danger:hover {
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 1200px) {
  .hide-lg {
    display: none;
  }
}

.name-flag {
  display: none;
  font-weight: 400;
}

@media (max-width: 960px) {
  .hide-md {
    display: none;
  }
  .name-flag {
    display: inline;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .search,
  .sort {
    width: 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .person {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 20px;
  }
  .ui-kpi__meta {
    display: none;
  }
}
</style>
