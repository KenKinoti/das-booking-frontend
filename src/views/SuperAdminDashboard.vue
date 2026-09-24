<template>
  <div class="ui-page ui-page--wide dviz">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Platform overview</h1>
        <p>Every organisation, user and invoice on DASYIN at a glance.</p>
      </div>
      <div class="ui-actions">
        <span v-if="data" class="pf-muted pf-small updated">Updated {{ timeAgo(data.generated_at) }}</span>
        <button class="ui-btn" :disabled="loading" @click="load">
          <i :class="loading ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Refresh
        </button>
        <router-link to="/organizations?new=1" class="ui-btn ui-btn--primary"><i class="fa-solid fa-plus"></i> New organisation</router-link>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger block">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <div class="ui-kpis pf-kpis-5">
      <template v-if="!data">
        <div v-for="n in 5" :key="n" class="ui-kpi"><div class="ui-skeleton" style="width: 50%"></div><div class="ui-skeleton" style="height: 28px; margin-top: 14px; width: 40%"></div></div>
      </template>
      <template v-else>
        <router-link to="/organizations" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-building"></i></span>Organisations</div>
          <div class="ui-kpi__value">{{ n(data.organizations.total) }}</div>
          <div class="ui-kpi__meta">+{{ n(data.organizations.new_30d) }} in the last 30 days</div>
        </router-link>
        <router-link to="/users-admin" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-users"></i></span>Users</div>
          <div class="ui-kpi__value">{{ n(data.users.total) }}</div>
          <div class="ui-kpi__meta">{{ n(data.users.active) }} active · +{{ n(data.users.new_30d) }} new in 30 days</div>
        </router-link>
        <router-link to="/users-admin?status=recent" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-bolt"></i></span>Active (30 days)</div>
          <div class="ui-kpi__value">{{ n(data.users.active_30d) }}</div>
          <div class="ui-kpi__meta">{{ pct(data.users.active_30d, data.users.total) }} of users · {{ n(data.organizations.active_30d) }} organisations</div>
        </router-link>
        <router-link to="/organizations?status=suspended" class="ui-kpi kpi-link">
          <div class="ui-kpi__label"><span class="ui-kpi__icon" :class="data.organizations.suspended ? 'kpi-danger' : 'kpi-neutral'"><i class="fa-solid fa-ban"></i></span>Suspended</div>
          <div class="ui-kpi__value">{{ n(data.organizations.suspended) }}</div>
          <div class="ui-kpi__meta">Organisations with sign-in blocked</div>
        </router-link>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-file-invoice-dollar"></i></span>Invoiced (all orgs)</div>
          <div class="ui-kpi__value">{{ primary ? money(primary.invoiced, primary.currency) : '—' }}</div>
          <div class="ui-kpi__meta">
            <template v-if="primary">{{ n(primary.count) }} issued invoice{{ primary.count === 1 ? '' : 's' }} in {{ primary.currency }}<template v-if="otherCurrencies"> · +{{ otherCurrencies }} other currenc{{ otherCurrencies === 1 ? 'y' : 'ies' }}</template></template>
            <template v-else>No issued invoices yet</template>
          </div>
        </div>
      </template>
    </div>

    <div class="grid-main">
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Sign-ups over time</h2>
            <span class="pf-card-sub">New organisations and users per month, last 12 months</span>
          </div>
          <div class="pf-chart-legend" aria-label="Legend">
            <span><i class="pf-swatch" style="background: var(--viz-1)"></i>Organisations</span>
            <span><i class="pf-swatch" style="background: var(--viz-3)"></i>Users</span>
          </div>
        </div>
        <div class="ui-card__body">
          <div v-if="!data" class="ui-skeleton" style="height: 280px"></div>
          <div v-else-if="!signupTotal" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-solid fa-chart-line"></i></div>
            <h3>No sign-ups in the last 12 months</h3>
            <p>New organisations and users will be charted here.</p>
          </div>
          <TimeChart
            v-else
            :labels="data.signups.map((p) => p.month)"
            :series="signupSeries"
            :height="280"
            :format-y="(v) => n(v)"
            :format-x="monthShort"
            :format-title="monthLong"
            :format-value="(v) => n(v)"
            aria-label="Organisations and users created per month"
          />
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Invoicing across organisations</h2>
            <span class="pf-card-sub">Issued invoices (excludes drafts and voided)</span>
          </div>
        </div>
        <div v-if="!data" class="ui-card__body"><div v-for="i in 3" :key="i" class="pf-sk-row"><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 90px"></div></div></div>
        <div v-else-if="!data.invoicing.by_currency.length" class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-solid fa-file-invoice"></i></div>
          <h3>No invoices issued yet</h3>
          <p>{{ data.invoicing.drafts ? `${n(data.invoicing.drafts)} draft invoice${data.invoicing.drafts === 1 ? '' : 's'} not yet sent.` : 'Revenue will appear once organisations send invoices.' }}</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Currency</th>
                <th class="num">Invoices</th>
                <th class="num">Invoiced</th>
                <th class="num">Collected</th>
                <th class="num pf-hide-sm">Last 30 days</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in data.invoicing.by_currency" :key="c.currency">
                <td><strong>{{ c.currency }}</strong></td>
                <td class="num">{{ n(c.count) }}</td>
                <td class="num">{{ money(c.invoiced, c.currency) }}</td>
                <td class="num">
                  {{ money(c.collected, c.currency) }}
                  <small class="pf-muted rate">{{ pct(c.collected, c.invoiced) }}</small>
                </td>
                <td class="num pf-hide-sm">{{ money(last30(c.currency), c.currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div class="grid-3">
      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Largest organisations</h2>
          <router-link to="/organizations?sort=users" class="ui-btn ui-btn--ghost ui-btn--sm">View all</router-link>
        </div>
        <ul v-if="data && data.top_organizations.length" class="feed">
          <li v-for="o in data.top_organizations" :key="o.id">
            <router-link :to="`/organizations?open=${o.id}`" class="feed__link">
              <span class="pf-avatar">{{ initials(o.name) }}</span>
              <span class="pf-cell__text">
                <span class="pf-cell__title">{{ o.name }}</span>
                <span class="pf-cell__sub">Last active {{ timeAgo(o.last_active).toLowerCase() }}</span>
              </span>
              <span class="feed__right">
                <span v-if="o.status === 'suspended'" class="ui-badge ui-badge--danger">Suspended</span>
                <strong v-else>{{ n(o.users) }}</strong>
                <small v-if="o.status !== 'suspended'" class="pf-muted">user{{ o.users === 1 ? '' : 's' }}</small>
              </span>
            </router-link>
          </li>
        </ul>
        <div v-else-if="data" class="ui-empty small"><p>No organisations yet.</p></div>
        <div v-else class="ui-card__body"><div v-for="i in 4" :key="i" class="ui-skeleton" style="height: 34px; margin-bottom: 10px"></div></div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Newest organisations</h2>
          <router-link to="/organizations" class="ui-btn ui-btn--ghost ui-btn--sm">View all</router-link>
        </div>
        <ul v-if="data && data.recent_organizations.length" class="feed">
          <li v-for="o in data.recent_organizations" :key="o.id">
            <router-link :to="`/organizations?open=${o.id}`" class="feed__link">
              <span class="pf-avatar">{{ initials(o.name) }}</span>
              <span class="pf-cell__text">
                <span class="pf-cell__title">{{ o.name }}</span>
                <span class="pf-cell__sub">Joined {{ formatDate(o.created_at) }}</span>
              </span>
              <span class="feed__right pf-muted pf-small">{{ timeAgo(o.created_at) }}</span>
            </router-link>
          </li>
        </ul>
        <div v-else-if="data" class="ui-empty small"><p>No organisations yet.</p></div>
        <div v-else class="ui-card__body"><div v-for="i in 4" :key="i" class="ui-skeleton" style="height: 34px; margin-bottom: 10px"></div></div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Recent sign-ins</h2>
          <router-link to="/users-admin?sort=last_login" class="ui-btn ui-btn--ghost ui-btn--sm">View all</router-link>
        </div>
        <ul v-if="data && data.recent_logins.length" class="feed">
          <li v-for="u in data.recent_logins" :key="u.id">
            <router-link :to="`/users-admin?search=${encodeURIComponent(u.email)}`" class="feed__link">
              <span class="pf-avatar pf-avatar--round">{{ initials(u.name || u.email) }}</span>
              <span class="pf-cell__text">
                <span class="pf-cell__title">{{ u.name || u.email }}</span>
                <span class="pf-cell__sub">{{ u.organization_name || 'No organisation' }} · {{ roleLabel(u.role) }}</span>
              </span>
              <span class="feed__right pf-muted pf-small">{{ timeAgo(u.last_login_at) }}</span>
            </router-link>
          </li>
        </ul>
        <div v-else-if="data" class="ui-empty small"><p>Nobody has signed in yet.</p></div>
        <div v-else class="ui-card__body"><div v-for="i in 4" :key="i" class="ui-skeleton" style="height: 34px; margin-bottom: 10px"></div></div>
      </section>
    </div>
  </div>
</template>

<script>
import TimeChart from '@/components/dashboard/charts/TimeChart.vue'
import '@/components/dashboard/dashviz.css'
import '@/components/platform/platform.css'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'
import { platformAPI, initials, timeAgo, roleLabel, ensurePlatformSession } from '@/services/platform'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default {
  name: 'SuperAdminDashboard',
  components: { TimeChart },
  data: () => ({ data: null, loading: false, error: '' }),
  computed: {
    primary() {
      return this.data?.invoicing?.by_currency?.[0] || null
    },
    otherCurrencies() {
      return Math.max(0, (this.data?.invoicing?.by_currency?.length || 0) - 1)
    },
    signupTotal() {
      return (this.data?.signups || []).reduce((s, p) => s + p.organizations + p.users, 0)
    },
    signupSeries() {
      const s = this.data?.signups || []
      return [
        { key: 'orgs', name: 'Organisations', values: s.map((p) => p.organizations), color: 'var(--viz-1)', type: 'area' },
        { key: 'users', name: 'Users', values: s.map((p) => p.users), color: 'var(--viz-3)', type: 'line' }
      ]
    }
  },
  created() {
    // Returning here from an organisation session ("Exit" on the banner)
    // restores the super admin's own session before anything loads.
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    this.load()
  },
  methods: {
    initials,
    timeAgo,
    roleLabel,
    formatDate,
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.data = await platformAPI.overview()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load platform statistics')
      } finally {
        this.loading = false
      }
    },
    n(v) {
      return new Intl.NumberFormat().format(Number(v) || 0)
    },
    pct(a, b) {
      if (!b) return '0%'
      return `${Math.round((a / b) * 100)}%`
    },
    money(v, c) {
      return formatMoney(v, c)
    },
    last30(currency) {
      const row = (this.data?.invoicing?.last_30d_by_currency || []).find((r) => r.currency === currency)
      return row ? row.invoiced : 0
    },
    monthShort(key) {
      const [y, m] = String(key).split('-')
      return Number(m) === 1 ? `Jan ${String(y).slice(2)}` : MONTHS[Number(m) - 1] || ''
    },
    monthLong(key) {
      const [y, m] = String(key).split('-')
      return `${MONTHS[Number(m) - 1] || ''} ${y}`
    }
  }
}
</script>

<style scoped>
.block {
  margin-bottom: 20px;
}

.updated {
  margin-right: 4px;
}

.kpi-link {
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.kpi-link:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }
.kpi-danger { background: var(--danger-soft); color: var(--danger); }
.kpi-neutral { background: var(--neutral-soft); color: var(--text-2); }

.grid-main {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.rate {
  display: block;
  font-size: 11.5px;
}

.feed {
  list-style: none;
  margin: 0;
  padding: 6px 8px 10px;
}

.feed__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
}

.feed__link:hover {
  background: var(--surface-hover);
}

.feed__link .pf-cell__text {
  flex: 1;
}

.feed__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.ui-empty.small {
  padding: 32px 20px;
}

@media (max-width: 1280px) {
  .grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .grid-main {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .grid-3 {
    grid-template-columns: minmax(0, 1fr);
  }

  .updated {
    display: none;
  }
}
</style>
