<template>
  <section class="ui-card cf" data-testid="cashflow-card">
    <div class="ui-card__head wrap">
      <div>
        <h2>Cash-flow forecast</h2>
        <span class="sub">Next {{ f.days }} days · by week · {{ currency }}</span>
      </div>
      <router-link to="/invoices?status=unpaid" class="ui-btn ui-btn--ghost ui-btn--sm">Receivables</router-link>
    </div>
    <div class="ui-card__body">
      <div class="stats">
        <div data-cf="in">
          <small>Money in</small><strong class="pos">{{ m(f.in, true) }}</strong>
        </div>
        <div data-cf="out">
          <small>Money out</small><strong>{{ m(f.out, true) }}</strong>
        </div>
        <div data-cf="net">
          <small>Net</small><strong :class="f.net < 0 ? 'neg' : 'pos'">{{ m(f.net, true) }}</strong>
        </div>
      </div>
      <div v-if="!f.in && !f.out" class="ui-empty tiny">
        <p>Nothing due in or out in the next {{ f.days }} days.</p>
      </div>
      <SignedBarChart
        v-else
        :labels="f.weeks.map((w) => w.start)"
        :values="f.weeks.map((w) => w.net)"
        :colors="f.weeks.map((w) => (w.net < 0 ? 'var(--viz-2)' : 'var(--viz-1)'))"
        :height="170"
        value-name="Net"
        :format-x="(d) => short(d)"
        :format-y="(v) => m(v, true)"
        :format-title="(d, i) => `${short(f.weeks[i].start)} – ${short(f.weeks[i].end)}`"
        :format-value="(v) => m(v)"
        :detail="detail"
        aria-label="Net cash flow by week"
      />
      <div class="legend">
        <span><i class="dviz-swatch" style="background: var(--viz-1)"></i>Net in</span>
        <span><i class="dviz-swatch" style="background: var(--viz-2)"></i>Net out</span>
      </div>
      <ul class="parts">
        <li><span>Invoices falling due</span><strong>{{ m(f.receivables) }}</strong></li>
        <li><span>Recurring invoices to be issued</span><strong>{{ m(f.recurring_invoices) }}</strong></li>
        <li><span>Supplier bills (incl. recurring)</span><strong>− {{ m(f.bills) }}</strong></li>
        <li v-if="f.synergy"><span>Synergy hosting run-rate</span><strong>− {{ m(f.synergy) }}</strong></li>
      </ul>
      <p v-if="f.overdue_receivables || f.overdue_bills" class="od">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Not assumed: {{ m(f.overdue_receivables) }} overdue from clients<template v-if="f.overdue_bills">, {{ m(f.overdue_bills) }} overdue bills</template>.
      </p>
    </div>
  </section>
</template>

<script>
import SignedBarChart from '@/components/analytics/charts/SignedBarChart.vue'
import { formatMoney } from '@/utils/format'

export default {
  name: 'CashForecastCard',
  components: { SignedBarChart },
  props: {
    f: { type: Object, required: true },
    currency: { type: String, default: '' }
  },
  methods: {
    m(v, compact = false) {
      return formatMoney(v || 0, this.currency || undefined, { compact })
    },
    short(d) {
      return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(d + 'T00:00:00'))
    },
    detail(i) {
      const w = this.f.weeks[i]
      const p = []
      if (w.receivables) p.push(`due ${this.m(w.receivables, true)}`)
      if (w.recurring_invoices) p.push(`recurring ${this.m(w.recurring_invoices, true)}`)
      if (w.bills) p.push(`bills −${this.m(w.bills, true)}`)
      if (w.synergy) p.push(`Synergy −${this.m(w.synergy, true)}`)
      p.push(`running ${this.m(w.cumulative, true)}`)
      return p.join(' · ')
    }
  }
}
</script>

<style scoped>
.cf {
  min-width: 0;
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

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.stats small {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.stats strong {
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pos {
  color: var(--text);
}

.neg {
  color: var(--danger);
}

.legend {
  display: flex;
  gap: 12px;
  font-size: 11.5px;
  color: var(--text-3);
  margin: 4px 0 8px;
}

.legend span {
  display: inline-flex;
  align-items: center;
}

.parts {
  list-style: none;
  margin: 0;
  padding: 0;
}

.parts li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-2);
}

.parts strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.od {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.od i {
  color: var(--warning);
  margin-right: 4px;
}

.ui-empty.tiny {
  padding: 20px 10px;
}
</style>
