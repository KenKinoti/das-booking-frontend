<template>
  <div class="ui-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">{{ today }}</div>
        <h1>{{ greeting }}, {{ firstName }}</h1>
        <p>Here’s what’s happening across your business today.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/bookings" class="ui-btn"><i class="fa-solid fa-calendar-plus"></i> New booking</router-link>
        <router-link to="/invoices/new" class="ui-btn ui-btn--primary"><i class="fa-solid fa-plus"></i> New invoice</router-link>
      </div>
    </header>

    <div class="ui-kpis">
      <router-link to="/billing" class="ui-kpi kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-sack-dollar"></i></span>Collected this month</div>
        <div class="ui-kpi__value"><span v-if="loading" class="ui-skeleton sk"></span><template v-else>{{ money(stats?.paid_this_month) }}</template></div>
        <div class="ui-kpi__meta">Invoiced {{ money(stats?.invoiced_this_month) }}</div>
      </router-link>
      <router-link to="/invoices?status=unpaid" class="ui-kpi kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-hourglass-half"></i></span>Outstanding</div>
        <div class="ui-kpi__value"><span v-if="loading" class="ui-skeleton sk"></span><template v-else>{{ money(stats?.outstanding) }}</template></div>
        <div class="ui-kpi__meta" :class="{ danger: stats?.overdue > 0 }">{{ stats?.overdue > 0 ? money(stats.overdue) + ' overdue' : 'Nothing overdue' }}</div>
      </router-link>
      <router-link to="/bookings" class="ui-kpi kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-calendar-check"></i></span>Bookings today</div>
        <div class="ui-kpi__value"><span v-if="loading" class="ui-skeleton sk"></span><template v-else>{{ todaysBookings.length }}</template></div>
        <div class="ui-kpi__meta">{{ upcoming.length }} upcoming this week</div>
      </router-link>
      <router-link to="/customers" class="ui-kpi kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-warn"><i class="fa-solid fa-users"></i></span>Customers</div>
        <div class="ui-kpi__value"><span v-if="loading" class="ui-skeleton sk"></span><template v-else>{{ customers.length }}</template></div>
        <div class="ui-kpi__meta">{{ newCustomers }} new in the last 30 days</div>
      </router-link>
    </div>

    <div class="grid">
      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Upcoming bookings</h2>
          <router-link to="/bookings" class="ui-btn ui-btn--ghost ui-btn--sm">View all</router-link>
        </div>
        <div v-if="loading" class="ui-card__body"><div class="ui-skeleton" style="height: 160px"></div></div>
        <div v-else-if="!upcoming.length" class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-regular fa-calendar"></i></div>
          <h3>No upcoming bookings</h3>
          <p>New appointments will appear here.</p>
        </div>
        <ul v-else class="list">
          <li v-for="b in upcoming.slice(0, 6)" :key="b.id" class="drow">
            <div class="when">
              <strong>{{ time(b.start_time) }}</strong>
              <small>{{ day(b.start_time) }}</small>
            </div>
            <div class="grow">
              <strong>{{ customerName(b) }}</strong>
              <small>{{ serviceNames(b) }}</small>
            </div>
            <span class="ui-badge" :class="bookingBadge(b.status)">{{ label(b.status) }}</span>
          </li>
        </ul>
      </section>

      <section class="ui-card">
        <div class="ui-card__head"><h2>Quick actions</h2></div>
        <div class="ui-card__body actions">
          <router-link v-for="a in quick" :key="a.to" :to="a.to" class="action">
            <span class="action__icon" :style="{ background: a.bg, color: a.fg }"><i :class="a.icon"></i></span>
            <span>{{ a.label }}</span>
          </router-link>
        </div>
      </section>
    </div>

    <div class="grid grid-even">
      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Overdue invoices</h2>
          <router-link to="/invoices?status=overdue" class="ui-btn ui-btn--ghost ui-btn--sm">View all</router-link>
        </div>
        <div v-if="loading" class="ui-card__body"><div class="ui-skeleton" style="height: 120px"></div></div>
        <div v-else-if="!overdue.length" class="ui-empty small">
          <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
          <h3>All caught up</h3>
          <p>No invoices are overdue.</p>
        </div>
        <ul v-else class="list">
          <li v-for="inv in overdue" :key="inv.id">
            <router-link :to="`/invoices/${inv.id}`" class="drow link">
              <div class="grow">
                <strong>{{ inv.client_name }}</strong>
                <small>{{ inv.number }} · {{ inv.days_overdue }} days late</small>
              </div>
              <strong class="danger tabular">{{ money(inv.balance_due, inv.currency) }}</strong>
            </router-link>
          </li>
        </ul>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Low stock</h2>
          <router-link to="/inventory" class="ui-btn ui-btn--ghost ui-btn--sm">Inventory</router-link>
        </div>
        <div v-if="loading" class="ui-card__body"><div class="ui-skeleton" style="height: 120px"></div></div>
        <div v-else-if="!lowStock.length" class="ui-empty small">
          <div class="ui-empty__icon ok"><i class="fa-solid fa-box"></i></div>
          <h3>Stock levels look good</h3>
          <p>Products at or below their minimum will show here.</p>
        </div>
        <ul v-else class="list">
          <li v-for="p in lowStock" :key="p.id" class="drow">
            <div class="grow">
              <strong>{{ p.name }}</strong>
              <small>{{ p.sku }}</small>
            </div>
            <span class="ui-badge" :class="p.current_stock === 0 ? 'ui-badge--danger' : 'ui-badge--warning'">{{ p.current_stock }} left</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script>
import api, { listFrom } from '@/services/api'
import { invoicingApi } from '@/services/invoicing'
import { useAuthStore } from '@/stores/auth'
import { formatMoney } from '@/utils/format'

export default {
  name: 'DashboardView',
  data() {
    return {
      loading: true,
      stats: null,
      bookings: [],
      customers: [],
      products: [],
      overdue: [],
      quick: [
        { label: 'New invoice', to: '/invoices/new', icon: 'fa-solid fa-file-invoice-dollar', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
        { label: 'New quote', to: '/quotes/new', icon: 'fa-solid fa-file-signature', bg: 'var(--info-soft)', fg: 'var(--info)' },
        { label: 'Bookings', to: '/bookings', icon: 'fa-solid fa-calendar-plus', bg: 'var(--success-soft)', fg: 'var(--success)' },
        { label: 'Point of sale', to: '/pos', icon: 'fa-solid fa-cash-register', bg: 'var(--warning-soft)', fg: 'var(--warning)' },
        { label: 'Customers', to: '/customers', icon: 'fa-solid fa-user-plus', bg: 'var(--danger-soft)', fg: 'var(--danger)' },
        { label: 'Reports', to: '/reports-analytics', icon: 'fa-solid fa-chart-column', bg: 'var(--neutral-soft)', fg: 'var(--text-2)' }
      ]
    }
  },
  computed: {
    firstName() {
      return useAuthStore().user?.first_name || 'there'
    },
    greeting() {
      const h = new Date().getHours()
      return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
    },
    today() {
      return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    },
    todaysBookings() {
      const d = new Date().toDateString()
      return this.bookings.filter((b) => new Date(b.start_time).toDateString() === d && b.status !== 'cancelled')
    },
    upcoming() {
      const now = Date.now()
      const week = now + 7 * 86400000
      return this.bookings
        .filter((b) => {
          const t = new Date(b.start_time).getTime()
          return t >= now - 3600000 && t <= week && !['cancelled', 'completed', 'no_show'].includes(b.status)
        })
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    },
    newCustomers() {
      const cutoff = Date.now() - 30 * 86400000
      return this.customers.filter((c) => new Date(c.created_at).getTime() >= cutoff).length
    },
    lowStock() {
      return this.products.filter((p) => p.is_active !== false && Number(p.current_stock) <= Number(p.min_stock)).slice(0, 6)
    }
  },
  async created() {
    const [stats, bookings, customers, products, overdue] = await Promise.allSettled([
      invoicingApi.stats(),
      api.get('/bookings'),
      api.get('/customers'),
      api.get('/inventory/products'),
      invoicingApi.list({ type: 'invoice', status: 'overdue', sort: 'due_date', per_page: 5 })
    ])
    if (stats.status === 'fulfilled') this.stats = stats.value
    if (bookings.status === 'fulfilled') this.bookings = listFrom(bookings.value, 'bookings')
    if (customers.status === 'fulfilled') this.customers = listFrom(customers.value, 'customers')
    if (products.status === 'fulfilled') this.products = listFrom(products.value, 'products')
    if (overdue.status === 'fulfilled') this.overdue = overdue.value.invoices || []
    this.loading = false
  },
  methods: {
    money(v, cur) {
      return formatMoney(v || 0, cur || this.stats?.currency || 'AUD')
    },
    time(t) {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(t))
    },
    day(t) {
      const d = new Date(t)
      if (d.toDateString() === new Date().toDateString()) return 'Today'
      return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
    },
    customerName(b) {
      const c = b.customer || {}
      return `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Customer'
    },
    serviceNames(b) {
      return (b.services || []).map((s) => s.name).join(', ') || b.notes || 'Appointment'
    },
    label(s) {
      return (s || 'scheduled').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    },
    bookingBadge(s) {
      return { confirmed: 'ui-badge--success', in_progress: 'ui-badge--warning', scheduled: 'ui-badge--info' }[s] || 'ui-badge--draft'
    }
  }
}
</script>

<style scoped>
.sk {
  display: inline-block;
  width: 110px;
  height: 26px;
}

.kpi {
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.kpi:hover {
  color: inherit;
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.k-success { background: var(--success-soft); color: var(--success); }
.k-info { background: var(--info-soft); color: var(--info); }
.k-warn { background: var(--warning-soft); color: var(--warning); }
.danger { color: var(--danger); }

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.grid-even {
  grid-template-columns: 1fr 1fr;
}

.list {
  list-style: none;
  margin: 0;
  padding: 6px;
}

.drow {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--text);
}

.drow.link:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.drow small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.grow strong {
  display: block;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.when {
  width: 76px;
  flex-shrink: 0;
  padding-right: 12px;
  border-right: 2px solid var(--accent-soft);
}

.when strong {
  font-variant-numeric: tabular-nums;
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.action {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 550;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}

.action:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
  color: var(--text);
  transform: translateY(-1px);
}

.action__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.small {
  padding: 32px 20px;
}

.ok {
  background: var(--success-soft);
  color: var(--success);
}

@media (max-width: 1100px) {
  .grid,
  .grid-even {
    grid-template-columns: 1fr;
  }
}
</style>
