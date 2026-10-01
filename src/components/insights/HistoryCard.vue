<template>
  <section class="ui-card hist" data-testid="history-card">
    <div class="ui-card__head wrap">
      <div>
        <h2><i class="fa-solid fa-clock-rotate-left head-ic"></i> Imported history</h2>
        <span class="sub">
          Zoho Books: {{ n(h.imported.invoices) }} invoices, {{ n(h.imported.customers) }} customers, {{ n(h.imported.payments) }} payments<template v-if="h.imported.credit_notes">, {{ n(h.imported.credit_notes) }} credit notes</template><template v-if="h.imported.quotes">, {{ n(h.imported.quotes) }} quotes</template>
        </span>
      </div>
      <router-link to="/analytics?view=revenue&range=all" class="ui-btn ui-btn--sm">All-time analytics <i class="fa-solid fa-arrow-right"></i></router-link>
    </div>
    <div class="ui-card__body">
      <div class="figs">
        <div data-hist="lifetime">
          <small>Lifetime revenue</small><strong>{{ m(h.lifetime_revenue, true) }}</strong>
        </div>
        <div data-hist="years">
          <small>Years covered</small><strong>{{ h.years_covered }}</strong><span class="hint">{{ year(h.first_invoice) }}–{{ year(h.last_invoice) }}</span>
        </div>
        <div data-hist="avg">
          <small>Average invoice</small><strong>{{ m(h.avg_invoice, true) }}</strong><span class="hint">{{ n(h.invoices) }} invoices · {{ n(h.clients) }} clients</span>
        </div>
        <div data-hist="dtp">
          <small>Days to pay</small><strong>{{ h.avg_days_to_pay ?? '—' }}</strong><span class="hint" :title="h.days_to_pay_note">{{ dtpTrend }}</span>
        </div>
      </div>
      <div class="cols">
        <div class="yr">
          <div class="mini-h">Revenue by year</div>
          <BarChart
            :labels="years.map((y) => String(y.year))"
            :values="years.map((y) => y.revenue)"
            :height="150"
            value-name="Revenue"
            :format-y="(v) => m(v, true)"
            :format-value="(v) => m(v)"
            :detail="(i) => `${years[i].invoices} invoices · ${years[i].clients} clients${years[i].avg_days_to_pay != null ? ' · paid in ' + years[i].avg_days_to_pay + ' days' : ''}`"
            aria-label="Revenue by year"
          />
        </div>
        <div class="top">
          <div class="mini-h">Top clients, all time</div>
          <RankList :rows="topRows" numbered />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import BarChart from '@/components/dashboard/charts/BarChart.vue'
import RankList from '@/components/dashboard/RankList.vue'
import { formatMoney } from '@/utils/format'

export default {
  name: 'HistoryCard',
  components: { BarChart, RankList },
  props: {
    h: { type: Object, required: true },
    currency: { type: String, default: '' }
  },
  computed: {
    years() {
      return this.h.by_year || []
    },
    topRows() {
      return (this.h.top_clients || []).map((c) => ({
        key: c.key,
        label: c.name,
        value: c.revenue,
        display: this.m(c.revenue, true),
        sub: `${c.share_pct}% of lifetime · ${c.docs} invoices`,
        to: { path: "/analytics", query: { view: "revenue", range: "all", client: c.key, client_name: c.name } }
      }))
    },
    dtpTrend() {
      const ys = this.years.filter((y) => y.avg_days_to_pay != null)
      if (ys.length < 2) return 'amount-weighted'
      const a = ys[0]
      const b = ys[ys.length - 1]
      return `${a.year}: ${a.avg_days_to_pay} → ${b.year}: ${b.avg_days_to_pay}`
    }
  },
  methods: {
    m(v, compact = false) {
      return formatMoney(v || 0, this.currency || undefined, { compact })
    },
    n(v) {
      return new Intl.NumberFormat().format(v || 0)
    },
    year(s) {
      return s ? s.slice(0, 4) : ''
    }
  }
}
</script>

<style scoped>
.hist {
  min-width: 0;
}

.head-ic {
  color: var(--accent);
  margin-right: 4px;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
  gap: 8px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.figs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.figs small,
.mini-h {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.mini-h {
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.figs strong {
  display: block;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.hint {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cols {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 18px;
}

@media (max-width: 760px) {
  .figs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cols {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
