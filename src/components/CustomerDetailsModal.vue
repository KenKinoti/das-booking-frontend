<template>
  <Teleport to="body">
    <div v-if="show" class="drawer-backdrop" @mousedown.self="$emit('close')">
      <aside class="drawer" role="dialog" aria-modal="true" :aria-label="name || 'Customer'" @mousedown="onDrawerDown">
        <header class="drawer__head">
          <div v-if="customer" class="who">
            <span class="avatar avatar--lg">{{ initials(name) }}</span>
            <div class="who__text">
              <h2>{{ name }}</h2>
              <div class="who__meta">
                <span class="ui-badge" :class="customer.is_active ? 'ui-badge--success' : 'ui-badge--draft'">{{ customer.is_active ? 'Active' : 'Inactive' }}</span>
                <span>Customer since {{ date(customer.created_at) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="who"><div class="ui-skeleton" style="width: 220px; height: 22px"></div></div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </header>

        <div v-if="customer" class="drawer__actions">
          <router-link :to="bookingLink" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-regular fa-calendar-plus"></i> New booking</router-link>
          <router-link :to="invoiceLink" class="ui-btn ui-btn--sm"><i class="fa-solid fa-file-invoice-dollar"></i> New invoice</router-link>
          <button class="ui-btn ui-btn--sm" @click="$emit('edit', customer)"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
          <div class="more">
            <button class="ui-btn ui-btn--sm ui-btn--icon" title="More actions" aria-label="More actions" :aria-expanded="menu" @click="menu = !menu"><i class="fa-solid fa-ellipsis"></i></button>
            <div v-if="menu" class="menu" role="menu" @click="menu = false">
              <a v-if="customer.email" :href="`mailto:${customer.email}`" class="menu__item" role="menuitem"><i class="fa-regular fa-envelope"></i> Send email</a>
              <a v-if="customer.phone" :href="`tel:${customer.phone}`" class="menu__item" role="menuitem"><i class="fa-solid fa-phone"></i> Call</a>
              <router-link :to="allInvoicesLink" class="menu__item" role="menuitem"><i class="fa-solid fa-list"></i> All invoices</router-link>
              <button class="menu__item" role="menuitem" @click="$emit('toggle', customer)">
                <i :class="customer.is_active ? 'fa-solid fa-user-slash' : 'fa-solid fa-user-check'"></i> {{ customer.is_active ? 'Deactivate' : 'Reactivate' }}
              </button>
              <button class="menu__item menu__item--danger" role="menuitem" @click="$emit('delete', customer)"><i class="fa-regular fa-trash-can"></i> Delete customer</button>
            </div>
          </div>
        </div>

        <div v-if="error" class="drawer__body">
          <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Retry</a></span></div>
        </div>

        <template v-else-if="customer">
          <div class="drawer__stats">
            <div class="stat">
              <span>Bookings</span>
              <strong>{{ customer.bookings_count || 0 }}</strong>
            </div>
            <div class="stat">
              <span>Spent</span>
              <strong>{{ money(customer.total_spent) }}</strong>
            </div>
            <div class="stat">
              <span>Last visit</span>
              <strong>{{ customer.last_booking_at ? date(customer.last_booking_at) : '—' }}</strong>
            </div>
            <div class="stat">
              <span>Next booking</span>
              <strong>{{ customer.next_booking_at ? date(customer.next_booking_at) : '—' }}</strong>
            </div>
          </div>

          <nav class="drawer__tabs">
            <div class="ui-tabs" role="tablist">
              <button v-for="t in tabs" :key="t.id" class="ui-tab" :class="{ 'is-active': tab === t.id }" role="tab" :aria-selected="tab === t.id" @click="tab = t.id">
                {{ t.label }} <span v-if="t.count != null" class="count">{{ t.count }}</span>
              </button>
            </div>
          </nav>

          <div class="drawer__body">
            <!-- Overview -->
            <section v-if="tab === 'overview'">
              <dl class="facts">
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a v-if="customer.email" :href="`mailto:${customer.email}`">{{ customer.email }}</a>
                    <span v-else class="muted">Not provided</span>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a v-if="customer.phone" :href="`tel:${customer.phone}`">{{ customer.phone }}</a>
                    <span v-else class="muted">Not provided</span>
                  </dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{{ address || '—' }}</dd>
                </div>
                <div>
                  <dt>Country</dt>
                  <dd>{{ countryLabel || '—' }}</dd>
                </div>
                <div>
                  <dt>Invoice currency</dt>
                  <dd>
                    <strong class="cur">{{ customer.billing_currency }}</strong>
                    <span class="muted"> · {{ currencyNote }}</span>
                  </dd>
                </div>
                <div>
                  <dt>Contacts</dt>
                  <dd>
                    <button v-if="contactsCount" class="link-btn" @click="tab = 'contacts'">{{ contactsCount }} {{ contactsCount === 1 ? 'person' : 'people' }} copied on emails</button>
                    <button v-else class="link-btn" @click="tab = 'contacts'"><i class="fa-solid fa-plus"></i> Add accounts or staff contacts</button>
                  </dd>
                </div>
                <div v-if="customer.date_of_birth">
                  <dt>Date of birth</dt>
                  <dd>{{ date(customer.date_of_birth) }}</dd>
                </div>
              </dl>
              <div class="notes">
                <h3>Notes</h3>
                <p v-if="customer.notes" class="notes__text">{{ customer.notes }}</p>
                <p v-else class="muted">No notes yet. Use Edit to add preferences or reminders.</p>
              </div>

              <div class="mini-head">
                <h3>Recent bookings</h3>
                <button v-if="bookings.length" class="link-btn" @click="tab = 'bookings'">View all</button>
              </div>
              <p v-if="!bookings.length" class="muted">No bookings yet.</p>
              <ul v-else class="list">
                <li v-for="b in bookings.slice(0, 3)" :key="b.id">
                  <router-link :to="`/bookings?booking=${b.id}`" class="list__row">
                    <span class="list__date">
                      <strong>{{ day(b.start_time) }}</strong><small>{{ month(b.start_time) }}</small>
                    </span>
                    <span class="list__main">
                      <strong>{{ b.services.length ? b.services.join(', ') : 'Booking' }}</strong>
                      <small>{{ time(b.start_time) }} – {{ time(b.end_time) }}<template v-if="b.vehicle"> · {{ b.vehicle }}</template></small>
                    </span>
                    <span class="ui-badge" :class="bookingBadge(b.status)">{{ label(b.status) }}</span>
                  </router-link>
                </li>
              </ul>
            </section>

            <!-- Bookings -->
            <section v-else-if="tab === 'bookings'">
              <div v-if="!bookings.length" class="empty">
                <i class="fa-regular fa-calendar"></i>
                <p>No bookings for this customer yet.</p>
                <router-link :to="bookingLink" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-regular fa-calendar-plus"></i> New booking</router-link>
              </div>
              <ul v-else class="list">
                <li v-for="b in bookings" :key="b.id">
                  <router-link :to="`/bookings?booking=${b.id}`" class="list__row">
                    <span class="list__date">
                      <strong>{{ day(b.start_time) }}</strong><small>{{ month(b.start_time) }}</small>
                    </span>
                    <span class="list__main">
                      <strong>{{ b.services.length ? b.services.join(', ') : 'Booking' }}</strong>
                      <small>{{ date(b.start_time) }} · {{ time(b.start_time) }}<template v-if="b.vehicle"> · {{ b.vehicle }}</template></small>
                    </span>
                    <span class="list__end">
                      <span class="ui-badge" :class="bookingBadge(b.status)">{{ label(b.status) }}</span>
                      <small v-if="b.total_price">{{ money(b.total_price) }}</small>
                    </span>
                  </router-link>
                </li>
              </ul>
            </section>

            <!-- Contacts -->
            <section v-else-if="tab === 'contacts'">
              <CustomerContacts :customer-id="customer.id" @changed="onContactsChanged" />
            </section>

            <!-- Vehicles -->
            <section v-else-if="tab === 'vehicles'">
              <VehicleManagementModal embedded :customer="customer" :initial="vehicles" @changed="onVehiclesChanged" />
            </section>

            <!-- Invoices -->
            <section v-else-if="tab === 'invoices'">
              <div v-if="invoicesLoading" class="list">
                <div v-for="n in 3" :key="n" class="ui-skeleton" style="height: 52px; border-radius: 10px"></div>
              </div>
              <div v-else-if="!invoices.length" class="empty">
                <i class="fa-solid fa-file-invoice-dollar"></i>
                <p>No invoices linked to this customer.</p>
                <div class="ui-actions" style="justify-content: center">
                  <router-link :to="invoiceLink" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-solid fa-plus"></i> New invoice</router-link>
                  <router-link :to="allInvoicesLink" class="ui-btn ui-btn--sm">Search invoices</router-link>
                </div>
              </div>
              <template v-else>
                <ul class="list">
                  <li v-for="inv in invoices" :key="inv.id">
                    <router-link :to="`/invoices/${inv.id}`" class="list__row">
                      <span class="inv-icon"><i class="fa-regular fa-file-lines"></i></span>
                      <span class="list__main">
                        <strong>{{ inv.number }}</strong>
                        <small>Issued {{ date(inv.issue_date) }} · due {{ date(inv.due_date) }}</small>
                      </span>
                      <span class="list__end">
                        <span class="ui-badge" :class="`ui-badge--${inv.display_status || inv.status}`">{{ invLabel(inv.display_status || inv.status) }}</span>
                        <small>{{ money(inv.total, inv.currency) }}</small>
                      </span>
                    </router-link>
                  </li>
                </ul>
                <router-link :to="allInvoicesLink" class="link-btn" style="display: inline-block; margin-top: 12px">View all invoices for {{ name }} <i class="fa-solid fa-arrow-right"></i></router-link>
              </template>
            </section>
          </div>
        </template>

        <div v-else class="drawer__body">
          <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 18px; margin-bottom: 14px"></div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script>
import VehicleManagementModal from './VehicleManagementModal.vue'
import CustomerContacts from './customers/CustomerContacts.vue'
import { customerService, customerName, initials, customerAddress, customerCountryLabel, customerCountry, newInvoiceLink, newBookingLink, invoicesLink } from '@/services/customerService'
import { invoicingApi, STATUS_LABELS } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'

const BOOKING_BADGES = {
  scheduled: 'ui-badge--info',
  confirmed: 'ui-badge--converted',
  in_progress: 'ui-badge--warning',
  completed: 'ui-badge--success',
  cancelled: 'ui-badge--draft',
  no_show: 'ui-badge--danger'
}

export default {
  name: 'CustomerDetailsModal',
  components: { VehicleManagementModal, CustomerContacts },
  props: {
    show: { type: Boolean, default: false },
    customerId: { type: String, default: '' },
    refreshKey: { type: Number, default: 0 }
  },
  emits: ['close', 'edit', 'toggle', 'delete', 'changed'],
  data() {
    return { customer: null, vehicles: [], bookings: [], contactsN: null, invoices: [], invoicesTotal: 0, invoicesLoaded: false, invoicesLoading: false, error: '', tab: 'overview', menu: false }
  },
  computed: {
    name() {
      return customerName(this.customer)
    },
    address() {
      return customerAddress(this.customer)
    },
    countryLabel() {
      return customerCountryLabel(this.customer)
    },
    contactsCount() {
      return this.contactsN ?? this.customer?.contacts_count ?? 0
    },
    currencyNote() {
      const src = this.customer?.currency_source
      if (src === 'customer') return 'set on this customer'
      if (src === 'country') return `from ${customerCountry(this.customer)}`
      return 'your default currency'
    },
    bookingLink() {
      return newBookingLink(this.customer)
    },
    invoiceLink() {
      return newInvoiceLink(this.customer)
    },
    allInvoicesLink() {
      return invoicesLink(this.customer)
    },
    tabs() {
      return [
        { id: 'overview', label: 'Overview' },
        // Counts are server totals (the lists below show the most recent entries).
        { id: 'bookings', label: 'Bookings', count: this.customer?.bookings_count ?? this.bookings.length },
        { id: 'contacts', label: 'Contacts', count: this.contactsCount },
        { id: 'vehicles', label: 'Vehicles', count: this.vehicles.length },
        { id: 'invoices', label: 'Invoices', count: this.invoicesLoaded ? this.invoicesTotal : null }
      ]
    }
  },
  watch: {
    show(v) {
      if (v) {
        this.tab = 'overview'
        this.load()
      }
    },
    customerId() {
      if (this.show) this.load()
    },
    refreshKey() {
      if (this.show) this.load()
    },
    tab(t) {
      if (t === 'invoices' && !this.invoicesLoaded) this.loadInvoices()
    }
  },
  mounted() {
    if (this.show) this.load()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    initials,
    date: formatDate,
    money(v, c) {
      return formatMoney(v, c || 'AUD')
    },
    onKey(e) {
      if (e.key === 'Escape' && this.show && !document.querySelector('.ui-modal-backdrop')) this.$emit('close')
    },
    async load() {
      if (!this.customerId) return
      this.error = ''
      this.menu = false
      if (this.customer?.id !== this.customerId) {
        this.customer = null
        this.invoicesLoaded = false
        this.invoices = []
      }
      try {
        const data = await customerService.get(this.customerId)
        this.customer = data.customer
        this.vehicles = data.vehicles || []
        this.bookings = data.bookings || []
        this.contactsN = Array.isArray(data.contacts) ? data.contacts.length : null
        if (this.tab === 'invoices') this.loadInvoices()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load this customer')
      }
    },
    async loadInvoices() {
      this.invoicesLoading = true
      try {
        let data = await invoicingApi.list({ type: 'invoice', customer_id: this.customerId, per_page: 10 })
        let rows = data.invoices || []
        if (!rows.length && this.customer?.email) {
          data = await invoicingApi.list({ type: 'invoice', q: this.customer.email, per_page: 10 })
          rows = data.invoices || []
        }
        this.invoices = rows
        this.invoicesTotal = data.total ?? rows.length
      } catch {
        this.invoices = []
        this.invoicesTotal = 0
      } finally {
        this.invoicesLoaded = true
        this.invoicesLoading = false
      }
    },
    onDrawerDown(e) {
      if (this.menu && !e.target.closest('.more')) this.menu = false
    },
    onContactsChanged(n) {
      if (this.contactsN !== null && this.contactsN !== n) this.$emit('changed')
      this.contactsN = n
    },
    onVehiclesChanged(list) {
      this.vehicles = list
      this.$emit('changed')
    },
    bookingBadge(s) {
      return BOOKING_BADGES[s] || 'ui-badge--draft'
    },
    label(s) {
      return String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    },
    invLabel(s) {
      return STATUS_LABELS[s] || this.label(s)
    },
    day(v) {
      return new Date(v).getDate()
    },
    month(v) {
      return new Date(v).toLocaleString(undefined, { month: 'short' })
    },
    time(v) {
      return new Date(v).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1900;
  background: rgba(10, 12, 24, 0.42);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
  animation: fade 0.15s ease-out;
}

.drawer {
  width: min(600px, 100%);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  animation: slide 0.22s var(--ease);
}

@keyframes slide {
  from {
    transform: translateX(40px);
    opacity: 0;
  }
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

.drawer__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 24px 24px 16px;
}

.who {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.who__text {
  min-width: 0;
}

.who h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.who__meta {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--text-3);
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

.avatar--lg {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  font-size: 17px;
}

.drawer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 24px 20px;
  border-bottom: 1px solid var(--border);
}

.more {
  position: relative;
}

.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 200px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 5;
}

.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  background: none;
  border-radius: 8px;
  font: inherit;
  font-size: 13.5px;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  text-decoration: none;
}

.menu__item i {
  width: 16px;
  color: var(--text-3);
}

.menu__item:hover {
  background: var(--surface-hover);
}

.menu__item--danger,
.menu__item--danger i {
  color: var(--danger);
}

.drawer__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--border);
}

.stat {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat + .stat {
  border-left: 1px solid var(--border);
}

.stat span {
  font-size: 12px;
  color: var(--text-3);
}

.stat strong {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.drawer__tabs {
  padding: 16px 24px 0;
}

.drawer__body {
  padding: 20px 24px 32px;
}

.facts {
  margin: 0;
  display: grid;
  gap: 14px;
}

.facts div {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
}

.facts dt {
  color: var(--text-3);
  font-size: 13px;
}

.facts dd {
  margin: 0;
  word-break: break-word;
}

.cur {
  font-variant-numeric: tabular-nums;
}

.facts a {
  color: var(--accent);
  text-decoration: none;
}

.notes {
  margin-top: 24px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.notes h3,
.mini-head h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 650;
}

.notes__text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
}

.mini-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 28px 0 10px;
}

.muted {
  color: var(--text-3);
  margin: 0;
}

.link-btn {
  border: 0;
  background: none;
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  text-decoration: none;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.list__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  text-decoration: none;
  transition: background 0.12s, border-color 0.12s;
}

.list__row:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.list__date {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  flex-shrink: 0;
}

.list__date strong {
  font-size: 15px;
}

.list__date small {
  font-size: 10.5px;
  text-transform: uppercase;
  font-weight: 600;
}

.inv-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-2);
  flex-shrink: 0;
}

.list__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.list__main strong {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list__main small,
.list__end small {
  color: var(--text-3);
  font-size: 12.5px;
}

.list__end {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.empty {
  text-align: center;
  padding: 36px 12px;
  color: var(--text-3);
}

.empty > i {
  font-size: 24px;
  margin-bottom: 10px;
}

.empty p {
  margin: 0 0 14px;
}

@media (max-width: 560px) {
  .drawer__stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat:nth-child(3) {
    border-left: 0;
  }
  .stat:nth-child(n + 3) {
    border-top: 1px solid var(--border);
  }
  .drawer__head,
  .drawer__actions,
  .drawer__body,
  .drawer__tabs {
    padding-left: 16px;
    padding-right: 16px;
  }
  .stat {
    padding: 12px 16px;
  }
  .facts div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
