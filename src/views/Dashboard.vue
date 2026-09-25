<template>
  <div class="ui-page ui-page--wide dash dviz">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">{{ today }}</div>
        <h1>{{ greeting }}, {{ firstName }}</h1>
        <p>
          {{ periodText }}
          <template v-if="data && data.compare"> · compared with {{ rangeLabel(data.compare.from, data.compare.to) }}</template>
        </p>
      </div>
      <div class="ui-actions head-actions">
        <PeriodPicker v-model="period" />
        <button class="ui-btn ui-btn--icon" type="button" title="Refresh" aria-label="Refresh dashboard" :disabled="loading" @click="load">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading && !!data }"></i>
        </button>
        <router-link to="/invoices/new" class="ui-btn ui-btn--primary"><i class="fa-solid fa-plus"></i> New invoice</router-link>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger mb">
      <i class="fa-solid fa-circle-exclamation"></i>
      <div>
        {{ error }}
        <button class="ui-btn ui-btn--sm retry" type="button" @click="load">Try again</button>
      </div>
    </div>

    <!-- Profit & loss: one calculation shared with Reports, Finance, the Business hub and Analytics -->
    <PnlCard :period="period" />

    <!-- KPI row -->
    <div class="kpis" :class="{ busy: loading && data }">
      <KpiCard
        label="Revenue collected"
        icon="fa-solid fa-sack-dollar"
        tone="success"
        to="/billing"
        :loading="!data"
        :value="money(k.revenue?.value)"
        :meta="`Invoices ${money(k.collected?.value, true)} · POS ${money(k.pos_sales?.value, true)} · incl. tax`"
        :delta="k.revenue?.delta_pct"
        :show-new="compare"
        :show-delta="compare"
        :spark="k.revenue?.spark"
        spark-color="var(--viz-1)"
      />
      <KpiCard
        label="Invoiced"
        icon="fa-solid fa-file-invoice-dollar"
        to="/invoices"
        :loading="!data"
        :value="money(k.invoiced?.value)"
        :meta="`${num(k.invoice_count?.value)} invoices · avg ${money(k.avg_invoice?.value, true)}`"
        :delta="k.invoiced?.delta_pct"
        :show-new="compare"
        :show-delta="compare"
        :spark="k.invoiced?.spark"
        spark-color="var(--viz-3)"
      />
      <KpiCard
        label="Outstanding"
        icon="fa-solid fa-hourglass-half"
        tone="info"
        to="/invoices?status=unpaid"
        :loading="!data"
        :value="money(k.outstanding?.value)"
        :meta="`${num(k.outstanding?.count)} open invoice${k.outstanding?.count === 1 ? '' : 's'} · ${money(data?.cashflow?.expected, true)} due in 30 days`"
        :show-delta="false"
      />
      <KpiCard
        label="Overdue"
        icon="fa-solid fa-triangle-exclamation"
        :tone="k.overdue?.value > 0 ? 'danger' : 'success'"
        to="/invoices?status=overdue"
        :loading="!data"
        :value="money(k.overdue?.value)"
        :meta="k.overdue?.value > 0 ? `${num(k.overdue?.count)} invoices past due · ${overdueShare}% of receivables` : 'Nothing overdue'"
        :show-delta="false"
      />
      <KpiCard
        label="New customers"
        icon="fa-solid fa-user-plus"
        tone="warning"
        to="/customers"
        :loading="!data"
        :value="num(k.new_customers?.value)"
        meta="Added in this period"
        :delta="k.new_customers?.delta_pct"
        :show-new="compare"
        :show-delta="compare"
        :spark="k.new_customers?.spark"
        spark-color="var(--viz-1)"
      />
      <KpiCard
        label="Bookings"
        icon="fa-solid fa-calendar-check"
        tone="info"
        to="/bookings"
        :loading="!data"
        :value="num(k.bookings?.value)"
        :meta="`${completedBookings} completed · ${num(k.bookings_today?.value)} today`"
        :delta="k.bookings?.delta_pct"
        :show-new="compare"
        :show-delta="compare"
        :spark="k.bookings?.spark"
        spark-color="var(--viz-1)"
      />
      <KpiCard
        label="Average invoice"
        icon="fa-solid fa-receipt"
        :loading="!data"
        :value="money(k.avg_invoice?.value)"
        :meta="`Across ${num(k.invoice_count?.value)} invoices`"
        :delta="k.avg_invoice?.delta_pct"
        :show-delta="compare"
        :spark="k.avg_invoice?.spark"
        spark-color="var(--viz-3)"
      />
      <KpiCard
        label="POS sales"
        icon="fa-solid fa-cash-register"
        tone="warning"
        to="/pos"
        :loading="!data"
        :value="money(k.pos_sales?.value)"
        :meta="`${num(k.pos_transactions?.value)} transactions`"
        :delta="k.pos_sales?.delta_pct"
        :show-new="compare"
        :show-delta="compare"
        :spark="k.pos_sales?.spark"
        spark-color="var(--viz-2)"
      />
    </div>

    <div v-if="data && data.other_currencies && data.other_currencies.length" class="ui-alert cur-note mb" role="note">
      <i class="fa-solid fa-circle-info"></i>
      <span>
        Amounts are in {{ currency }}. Not included:
        <template v-for="(o, i) in data.other_currencies" :key="o.currency">{{ i ? '; ' : '' }}{{ o.open }} open invoice{{ o.open === 1 ? '' : 's' }} in {{ o.currency }} ({{ fmtCur(o.outstanding, o.currency) }} outstanding)</template>.
      </span>
    </div>

    <!-- Revenue + sources -->
    <div class="grid-row row-8-4">
      <section class="ui-card">
        <div class="ui-card__head wrap">
          <div>
            <h2>Revenue trend</h2>
            <span class="sub">{{ intervalText }} · invoiced vs collected (invoice payments + POS)</span>
          </div>
          <div class="dviz-legend" aria-label="Legend">
            <span><i class="dviz-swatch" style="background: var(--viz-1)"></i>Collected</span>
            <span><i class="dviz-swatch dviz-swatch--line" style="background: var(--viz-3)"></i>Invoiced</span>
            <span v-if="hasPrev"><i class="dviz-swatch dviz-swatch--dashed"></i>Collected, previous period</span>
          </div>
        </div>
        <div class="ui-card__body chart-body">
          <div v-if="!data" class="ui-skeleton" style="height: 300px"></div>
          <div v-else-if="!hasRevenue" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-solid fa-chart-area"></i></div>
            <h3>No revenue in this period</h3>
            <p>Send an invoice or ring up a sale and your trend will appear here.</p>
            <router-link to="/invoices/new" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-solid fa-plus"></i> Create invoice</router-link>
          </div>
          <TimeChart
            v-else
            :labels="seriesLabels"
            :series="revenueSeries"
            :height="300"
            :format-y="(v) => axisMoney(v)"
            :format-x="(d) => bucketLabel(d, data.range.interval)"
            :format-title="(d) => bucketLabel(d, data.range.interval, true)"
            :format-value="(v) => money(v)"
            aria-label="Revenue collected and invoiced over time"
          />
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Revenue by source</h2>
            <span class="sub">Cash received this period</span>
          </div>
        </div>
        <div class="ui-card__body">
          <div v-if="!data" class="ui-skeleton" style="height: 150px"></div>
          <div v-else-if="!k.revenue?.value" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-solid fa-chart-pie"></i></div>
            <h3>Nothing collected yet</h3>
            <p>Payments and POS sales will be split here.</p>
          </div>
          <DonutChart
            v-else
            :segments="sourceSegments"
            :center-value="money(k.revenue?.value, true)"
            center-label="collected"
            :format-value="(v) => money(v, true)"
            aria-label="Revenue by source"
          />
          <div v-if="data" class="rate">
            <div class="rate__head">
              <span>Collection rate</span>
              <strong>{{ k.collection_rate?.value ? k.collection_rate.value.toFixed(1) + '%' : '—' }}</strong>
            </div>
            <div class="rate__bar"><span :style="{ width: Math.min(100, k.collection_rate?.value || 0) + '%' }"></span></div>
            <small>Invoice payments received ÷ amount invoiced in this period<template v-if="k.collection_rate?.delta_pct !== null && k.collection_rate?.delta_pct !== undefined && compare"> · {{ k.collection_rate.delta_pct > 0 ? '+' : '' }}{{ k.collection_rate.delta_pct }} pts vs previous</template></small>
          </div>
        </div>
      </section>
    </div>

    <!-- Receivables, cash flow, bookings -->
    <div class="grid-row row-3">
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Receivables aging</h2>
            <span class="sub">{{ data ? money(k.outstanding?.value) + ' outstanding today' : 'Outstanding balances by days overdue' }}</span>
          </div>
          <router-link to="/invoices?status=unpaid" class="ui-btn ui-btn--ghost ui-btn--sm">Invoices</router-link>
        </div>
        <div class="ui-card__body">
          <div v-if="!data" class="ui-skeleton" style="height: 170px"></div>
          <div v-else-if="!k.outstanding?.value" class="ui-empty small">
            <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
            <h3>All paid up</h3>
            <p>No open invoice balances.</p>
          </div>
          <template v-else>
            <div class="stack" role="img" :aria-label="'Aging split'">
              <span v-for="a in agingRows" v-show="a.value > 0" :key="a.key" :style="{ flexGrow: a.value, background: a.color }" :title="`${a.label}: ${a.display}`"></span>
            </div>
            <RankList :rows="agingRows" />
          </template>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Cash-flow forecast</h2>
            <span class="sub">Open invoices by due date, next 30 days</span>
          </div>
        </div>
        <div class="ui-card__body">
          <div v-if="!data" class="ui-skeleton" style="height: 170px"></div>
          <template v-else>
            <div class="cf-stats">
              <div>
                <small>Expected in 30 days</small>
                <strong>{{ money(data.cashflow.expected) }}</strong>
              </div>
              <div>
                <small>Already overdue</small>
                <strong :class="{ danger: data.cashflow.overdue > 0 }">{{ money(data.cashflow.overdue) }}</strong>
              </div>
            </div>
            <div v-if="!data.cashflow.expected" class="ui-empty tiny">
              <p>No invoices falling due in the next 30 days.</p>
            </div>
            <BarChart
              v-else
              :labels="cashBuckets.map((b) => b.label)"
              :values="cashBuckets.map((b) => b.amount)"
              :height="160"
              value-name="Due"
              :format-y="(v) => axisMoney(v)"
              :format-title="(l, i) => cashBuckets[i].title"
              :format-value="(v) => money(v)"
              :detail="(i) => `${cashBuckets[i].count} invoice${cashBuckets[i].count === 1 ? '' : 's'}`"
              aria-label="Cash expected by week"
            />
          </template>
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Bookings</h2>
            <span class="sub">{{ data ? `${num(k.bookings_today?.value)} today · ${num(k.bookings_today?.count)} in the next 7 days` : 'Today and upcoming' }}</span>
          </div>
          <router-link to="/bookings" class="ui-btn ui-btn--ghost ui-btn--sm">Calendar</router-link>
        </div>
        <div v-if="!data" class="ui-card__body"><div class="ui-skeleton" style="height: 170px"></div></div>
        <template v-else>
          <div v-if="statusMix.length" class="mix">
            <div class="stack thin">
              <span v-for="s in statusMix" :key="s.name" :style="{ flexGrow: s.count, background: s.color }" :title="`${s.label}: ${s.count}`"></span>
            </div>
            <div class="mix__legend">
              <span v-for="s in statusMix" :key="s.name"><i class="dviz-swatch" :style="{ background: s.color }"></i>{{ s.label }} {{ s.count }}</span>
            </div>
          </div>
          <div v-if="!upcoming.length" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-regular fa-calendar"></i></div>
            <h3>No upcoming bookings</h3>
            <p>New appointments for the next 7 days will appear here.</p>
          </div>
          <ul v-else class="list">
            <li v-for="b in upcoming.slice(0, 5)" :key="b.id" class="drow">
              <div class="when">
                <strong>{{ time(b.start_time) }}</strong>
                <small>{{ day(b.start_time) }}</small>
              </div>
              <div class="grow">
                <strong>{{ b.customer || 'Customer' }}</strong>
                <small>{{ b.services || 'Appointment' }}</small>
              </div>
              <span class="ui-badge" :class="statusBadge(b.status)">{{ statusLabel(b.status) }}</span>
            </li>
          </ul>
        </template>
      </section>
    </div>

    <!-- Markets -->
    <div class="grid-row">
      <MarketsPanel :default-base="data?.currency || ''" />
    </div>

    <!-- Top lists + stock -->
    <div class="grid-row row-3">
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Top customers</h2>
            <span class="sub">By amount billed this period</span>
          </div>
          <router-link to="/reports-analytics" class="ui-btn ui-btn--ghost ui-btn--sm">Details</router-link>
        </div>
        <div class="ui-card__body tight">
          <div v-if="!data" class="ui-skeleton" style="height: 200px"></div>
          <div v-else-if="!customerRows.length" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-solid fa-users"></i></div>
            <h3>No sales yet</h3>
            <p>Customers you invoice or sell to will rank here.</p>
          </div>
          <RankList v-else :rows="customerRows" numbered />
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Top sellers</h2>
            <span class="sub">Revenue from invoices and POS</span>
          </div>
          <div class="ui-tabs nowrap" role="tablist">
            <button type="button" class="ui-tab" :class="{ 'is-active': itemTab === 'services' }" @click="itemTab = 'services'">Services</button>
            <button type="button" class="ui-tab" :class="{ 'is-active': itemTab === 'products' }" @click="itemTab = 'products'">Products</button>
          </div>
        </div>
        <div class="ui-card__body tight">
          <div v-if="!data" class="ui-skeleton" style="height: 200px"></div>
          <div v-else-if="!itemRows.length" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-solid fa-tags"></i></div>
            <h3>No {{ itemTab }} sold yet</h3>
            <p>Line items from invoices, POS sales and bookings will rank here.</p>
          </div>
          <RankList v-else :rows="itemRows" numbered :color="itemTab === 'products' ? 'var(--viz-2)' : 'var(--viz-1)'" />
        </div>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Inventory</h2>
            <span class="sub">{{ data ? `${num(data.inventory.products)} products · ${money(data.inventory.cost_value, true)} at cost` : 'Stock health' }}</span>
          </div>
          <router-link to="/inventory" class="ui-btn ui-btn--ghost ui-btn--sm">Inventory</router-link>
        </div>
        <div v-if="!data" class="ui-card__body"><div class="ui-skeleton" style="height: 200px"></div></div>
        <template v-else>
          <div class="inv-stats">
            <div>
              <small>Retail value</small><strong>{{ money(data.inventory.retail_value, true) }}</strong>
            </div>
            <div>
              <small>Low stock</small><strong :class="{ warn: data.inventory.low_stock > 0 }">{{ num(data.inventory.low_stock) }}</strong>
            </div>
            <div>
              <small>Out of stock</small><strong :class="{ danger: data.inventory.out_of_stock > 0 }">{{ num(data.inventory.out_of_stock) }}</strong>
            </div>
          </div>
          <div v-if="!data.inventory.items.length" class="ui-empty small">
            <div class="ui-empty__icon ok"><i class="fa-solid fa-box"></i></div>
            <h3>Stock levels look good</h3>
            <p>Products at or below their reorder point will show here.</p>
          </div>
          <ul v-else class="list">
            <li v-for="p in data.inventory.items.slice(0, 5)" :key="p.id" class="drow">
              <div class="grow">
                <strong>{{ p.name }}</strong>
                <small>{{ p.sku }} · reorder at {{ Math.max(p.min_stock, p.reorder_point) }}</small>
              </div>
              <span class="ui-badge" :class="p.current_stock <= 0 ? 'ui-badge--danger' : 'ui-badge--warning'">
                {{ p.current_stock <= 0 ? 'Out of stock' : `${p.current_stock} left` }}
              </span>
            </li>
          </ul>
        </template>
      </section>
    </div>

    <!-- Activity + quick actions -->
    <div class="grid-row row-8-4">
      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Recent activity</h2>
        </div>
        <div v-if="!data" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
        <div v-else-if="!data.activity.length" class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-regular fa-bell"></i></div>
          <h3>No activity yet</h3>
          <p>Invoices, payments, bookings, sales and new customers will show up here.</p>
        </div>
        <ActivityFeed v-else :items="data.activity.slice(0, 8)" :currency="currency" />
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
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import '@/components/dashboard/dashviz.css'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import PeriodPicker from '@/components/dashboard/PeriodPicker.vue'
import MarketsPanel from '@/components/dashboard/MarketsPanel.vue'
import RankList from '@/components/dashboard/RankList.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import TimeChart from '@/components/dashboard/charts/TimeChart.vue'
import BarChart from '@/components/dashboard/charts/BarChart.vue'
import DonutChart from '@/components/dashboard/charts/DonutChart.vue'
import PnlCard from '@/components/pnl/PnlCard.vue'
import {
  fetchOverview,
  money,
  moneyAxis,
  num,
  bucketLabel,
  rangeLabel,
  loadPref,
  savePref,
  BOOKING_STATUS,
  AGING_COLORS,
  PERIODS
} from '@/components/dashboard/analytics'
import { apiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const PREF = 'dash.period'

export default {
  name: 'DashboardView',
  components: { KpiCard, PeriodPicker, MarketsPanel, RankList, ActivityFeed, TimeChart, BarChart, DonutChart, PnlCard },
  data() {
    return {
      data: null,
      loading: false,
      error: '',
      period: loadPref(PREF, { range: '30d', compare: true }),
      itemTab: 'services',
      reqId: 0,
      refreshTimer: null,
      quick: [
        { label: 'New invoice', to: '/invoices/new', icon: 'fa-solid fa-file-invoice-dollar', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
        { label: 'New quote', to: '/quotes/new', icon: 'fa-solid fa-file-signature', bg: 'var(--info-soft)', fg: 'var(--info)' },
        { label: 'Bookings', to: '/bookings', icon: 'fa-solid fa-calendar-plus', bg: 'var(--success-soft)', fg: 'var(--success)' },
        { label: 'Point of sale', to: '/pos', icon: 'fa-solid fa-cash-register', bg: 'var(--warning-soft)', fg: 'var(--warning)' },
        { label: 'Customers', to: '/customers', icon: 'fa-solid fa-user-plus', bg: 'var(--danger-soft)', fg: 'var(--danger)' },
        { label: 'Profit & loss', to: '/reports/profit-loss', icon: 'fa-solid fa-scale-balanced', bg: 'var(--neutral-soft)', fg: 'var(--text-2)' }
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
      return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
    },
    k() {
      return this.data?.kpis || {}
    },
    compare() {
      return !!this.period.compare
    },
    currency() {
      return this.data?.currency || orgCurrency()
    },
    periodText() {
      if (this.data) return `Business performance for ${rangeLabel(this.data.range.from, this.data.range.to)}`
      const p = PERIODS.find((x) => x.value === this.period.range)
      return p ? `Business performance · ${p.long.toLowerCase()}` : 'Business performance'
    },
    intervalText() {
      const i = this.data?.range?.interval
      return i === 'month' ? 'Monthly' : i === 'week' ? 'Weekly' : 'Daily'
    },
    hasPrev() {
      return !!(this.data?.compare && this.data.series.some((p) => p.prev_revenue !== undefined && p.prev_revenue !== null))
    },
    hasRevenue() {
      return (this.data?.series || []).some((p) => p.revenue || p.invoiced || p.prev_revenue)
    },
    seriesLabels() {
      return (this.data?.series || []).map((p) => p.date)
    },
    revenueSeries() {
      const s = this.data?.series || []
      const out = [
        { key: 'rev', name: 'Collected', values: s.map((p) => p.revenue), color: 'var(--viz-1)', type: 'area' },
        { key: 'inv', name: 'Invoiced', values: s.map((p) => p.invoiced), color: 'var(--viz-3)', type: 'line' }
      ]
      if (this.hasPrev) {
        out.push({
          key: 'prev',
          name: 'Previous period',
          values: s.map((p) => p.prev_revenue || 0),
          color: 'var(--viz-prev)',
          type: 'line',
          dashed: true,
          tipName: (i) => (s[i]?.prev_date ? `Collected, ${bucketLabel(s[i].prev_date, this.data.range.interval)}` : 'Previous period')
        })
      }
      return out
    },
    sourceSegments() {
      const src = this.data?.revenue_by_source || []
      const color = { invoices: 'var(--viz-1)', pos: 'var(--viz-2)' }
      return src.map((s) => ({ name: s.name, value: s.amount, color: color[s.id] || 'var(--viz-4)' }))
    },
    overdueShare() {
      const o = this.k.overdue?.value || 0
      const t = this.k.outstanding?.value || 0
      return t ? Math.round((o / t) * 100) : 0
    },
    completedBookings() {
      const s = (this.data?.booking_status || []).find((x) => x.name === 'completed')
      return num(s?.count || 0)
    },
    agingRows() {
      return (this.data?.aging || []).map((a) => ({
        key: a.key,
        label: a.key === 'current' ? a.label : `${a.label} overdue`,
        value: a.amount,
        display: money(a.amount, this.currency),
        sub: `${a.count} invoice${a.count === 1 ? '' : 's'}`,
        color: AGING_COLORS[a.key]
      }))
    },
    cashBuckets() {
      const cf = this.data?.cashflow
      if (!cf) return []
      const out = []
      const ranges = [
        [0, 6, 'This wk'],
        [7, 13, 'Next wk'],
        [14, 20, 'Wk 3'],
        [21, 29, 'Wk 4+']
      ]
      const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
      for (const [a, b, label] of ranges) {
        const days = cf.days.slice(a, b + 1)
        if (!days.length) continue
        const amount = days.reduce((s, d) => s + d.amount, 0)
        const count = days.reduce((s, d) => s + d.count, 0)
        const title = `${fmt.format(new Date(days[0].date + 'T00:00:00'))} – ${fmt.format(new Date(days[days.length - 1].date + 'T00:00:00'))}`
        out.push({ label, title, amount: Math.round(amount * 100) / 100, count })
      }
      return out
    },
    statusMix() {
      return (this.data?.booking_status || []).map((s) => ({
        name: s.name,
        count: s.count,
        label: (BOOKING_STATUS[s.name] || {}).label || s.name,
        color: (BOOKING_STATUS[s.name] || {}).color || 'var(--text-3)'
      }))
    },
    upcoming() {
      return this.data?.bookings?.upcoming || []
    },
    customerRows() {
      return (this.data?.top_customers || []).map((c) => ({
        key: c.name,
        label: c.name,
        value: c.total,
        display: money(c.total, this.currency),
        sub: [
          c.invoices ? `${c.invoices} invoice${c.invoices === 1 ? '' : 's'}` : '',
          c.balance ? `${money(c.balance, this.currency)} owing` : c.invoices ? 'fully paid' : '',
          c.pos ? `${money(c.pos, this.currency)} POS` : ''
        ]
          .filter(Boolean)
          .join(' · ')
      }))
    },
    itemRows() {
      const list = (this.itemTab === 'products' ? this.data?.top_products : this.data?.top_services) || []
      return list.map((it) => ({
        key: it.name,
        label: it.name,
        value: it.revenue || it.bookings,
        display: it.revenue ? money(it.revenue, this.currency) : `${it.bookings} booked`,
        sub: [it.quantity ? `${num(it.quantity, it.quantity % 1 ? 1 : 0)} sold` : '', it.bookings && it.revenue ? `${it.bookings} booked` : '', it.sources]
          .filter(Boolean)
          .join(' · ')
      }))
    }
  },
  watch: {
    period: {
      deep: true,
      handler(v) {
        savePref(PREF, v)
        this.load()
      }
    }
  },
  created() {
    this.load()
    // keep "today" numbers fresh while the dashboard stays open
    this.refreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') this.load()
    }, 5 * 60 * 1000)
  },
  beforeUnmount() {
    clearInterval(this.refreshTimer)
  },
  methods: {
    bucketLabel,
    rangeLabel,
    num,
    async load() {
      const id = ++this.reqId
      this.loading = true
      try {
        const d = await fetchOverview(this.period)
        if (id !== this.reqId) return
        this.data = d
        this.error = ''
      } catch (e) {
        if (id !== this.reqId) return
        this.error = apiErrorMessage(e, 'Could not load dashboard analytics.')
      } finally {
        if (id === this.reqId) this.loading = false
      }
    },
    money(v, compact = false) {
      return money(v, this.currency, compact)
    },
    // Other-currency amounts are written with the ISO code ("USD 1,100.00") so
    // they can't be mistaken for the organisation's own currency.
    fmtCur(v, cur) {
      return `${cur} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    axisMoney(v) {
      return moneyAxis(v, this.currency)
    },
    time(t) {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(t))
    },
    day(t) {
      const d = new Date(t)
      if (d.toDateString() === new Date().toDateString()) return 'Today'
      const tm = new Date()
      tm.setDate(tm.getDate() + 1)
      if (d.toDateString() === tm.toDateString()) return 'Tomorrow'
      return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
    },
    statusLabel(s) {
      return (BOOKING_STATUS[s] || {}).label || s
    },
    statusBadge(s) {
      return (BOOKING_STATUS[s] || {}).badge || 'ui-badge--draft'
    }
  }
}
</script>

<style scoped>
.head-actions {
  flex-wrap: wrap;
}

.mb {
  margin-bottom: 16px;
}

.cur-note {
  background: var(--info-soft);
  color: var(--text);
}

.cur-note > i {
  color: var(--info);
}

.retry {
  margin-left: 10px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  transition: opacity 0.2s;
}

.busy {
  opacity: 0.65;
}

.grid-row {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}

.row-8-4 {
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}

.row-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-row > .ui-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
}

.ui-card__head .sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.chart-body {
  padding: 16px 20px 12px;
}

.nowrap {
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.tight {
  padding: 10px;
}

.small {
  padding: 28px 20px;
}

.ui-empty.tiny {
  padding: 24px 12px;
}

.ok {
  background: var(--success-soft);
  color: var(--success);
}

.danger {
  color: var(--danger);
}

.warn {
  color: var(--warning);
}

/* collection rate */
.rate {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.rate__head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-2);
}

.rate__head strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.rate__bar {
  height: 8px;
  border-radius: 5px;
  background: var(--bg-subtle);
  margin: 8px 0 6px;
  overflow: hidden;
}

.rate__bar span {
  display: block;
  height: 100%;
  background: var(--viz-1);
  border-radius: 5px;
}

.rate small {
  color: var(--text-3);
  font-size: 11.5px;
}

/* stacked bars */
.stack {
  display: flex;
  gap: 2px;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}

.stack span {
  flex-basis: 0;
  min-width: 3px;
}

.stack.thin {
  height: 8px;
  margin-bottom: 8px;
}

.mix {
  padding: 14px 20px 4px;
}

.mix__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  color: var(--text-3);
}

.mix__legend span {
  display: inline-flex;
  align-items: center;
}

/* cash flow */
.cf-stats,
.inv-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.inv-stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 16px 20px 0;
  margin-bottom: 6px;
}

.cf-stats small,
.inv-stats small {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.cf-stats strong,
.inv-stats strong {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

/* lists */
.list {
  list-style: none;
  margin: 0;
  padding: 6px;
}

.drow {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--text);
}

.drow small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.grow strong {
  display: block;
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grow small {
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
  font-size: 13.5px;
}

/* quick actions */
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
  font-size: 13.5px;
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

@media (max-width: 1280px) {
  .row-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .row-8-4 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .row-3 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 520px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .grid-row {
    gap: 12px;
    margin-bottom: 12px;
  }

  .actions {
    grid-template-columns: 1fr;
  }

  .head-actions {
    width: 100%;
  }
}
</style>
