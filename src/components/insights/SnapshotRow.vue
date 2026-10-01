<template>
  <section class="snap" data-testid="snapshot" aria-label="Business snapshot">
    <div class="snap__head">
      <h2>Business snapshot</h2>
      <span class="sub">
        This month and financial year to date<template v-if="s.year_start"> (from {{ fmtDay(s.year_start) }})</template> · {{ cur }}
      </span>
    </div>
    <div class="snap__grid" :class="{ busy: loading && !!d }">
      <KpiCard
        v-if="showInvoicing"
        label="Revenue this month"
        icon="fa-solid fa-chart-line"
        tone="success"
        to="/analytics?view=revenue"
        :loading="!d"
        :value="m(s.revenue_mtd)"
        :meta="`${s.invoices_mtd || 0} invoice${s.invoices_mtd === 1 ? '' : 's'} · excl. tax`"
        :delta="s.revenue_mtd_delta_pct ?? null"
        delta-title="vs the same days last month"
        :show-new="true"
        :spark="s.revenue_12m"
        spark-color="var(--viz-1)"
        data-snap="revenue_mtd"
      />
      <KpiCard
        v-if="showInvoicing"
        label="Revenue this year"
        icon="fa-solid fa-calendar"
        tone="success"
        to="/analytics?view=revenue"
        :loading="!d"
        :value="m(s.revenue_ytd)"
        :meta="`${s.invoices_ytd || 0} invoices · financial year to date`"
        :delta="s.revenue_ytd_delta_pct ?? null"
        delta-title="vs the same period last year"
        :show-new="true"
        data-snap="revenue_ytd"
      />
      <KpiCard
        v-if="showInvoicing"
        label="Cash collected"
        icon="fa-solid fa-sack-dollar"
        tone="info"
        to="/billing"
        :loading="!d"
        :value="m(s.cash_mtd)"
        :meta="`This month · ${m(s.cash_ytd, true)} this year`"
        :show-delta="false"
        :spark="s.cash_12m"
        spark-color="var(--viz-3)"
        data-snap="cash"
      />
      <KpiCard
        label="Net profit"
        icon="fa-solid fa-scale-balanced"
        :tone="s.net_profit_mtd < 0 ? 'danger' : 'success'"
        to="/reports/profit-loss"
        :loading="!d"
        :value="m(s.net_profit_mtd)"
        :meta="`This month · ${m(s.net_profit_ytd, true)} this year`"
        :show-delta="false"
        data-snap="net_profit"
      />
      <KpiCard
        v-if="showInvoicing"
        label="Receivables"
        icon="fa-solid fa-hourglass-half"
        tone="info"
        to="/invoices?status=unpaid"
        :loading="!d"
        :value="m(s.outstanding)"
        :meta="`${s.outstanding_count || 0} open invoice${s.outstanding_count === 1 ? '' : 's'} · incl. tax`"
        :show-delta="false"
        data-snap="receivables"
      />
      <KpiCard
        v-if="showInvoicing"
        label="Overdue"
        icon="fa-solid fa-triangle-exclamation"
        :tone="s.overdue > 0 ? 'danger' : 'success'"
        to="/invoices?status=overdue"
        :loading="!d"
        :value="m(s.overdue)"
        :meta="s.overdue > 0 ? `${s.overdue_count} invoice${s.overdue_count === 1 ? '' : 's'} past due · ${overduePct}% of receivables` : 'Nothing overdue'"
        :show-delta="false"
        data-snap="overdue"
      />
      <KpiCard
        label="Expenses this month"
        icon="fa-solid fa-receipt"
        tone="warning"
        to="/reports/profit-loss"
        :loading="!d"
        :value="m(s.expenses_mtd)"
        :meta="`${m(s.expenses_ytd, true)} this year · bills, expenses, payroll`"
        :show-delta="false"
        data-snap="expenses"
      />
      <KpiCard
        v-if="showInvoicing"
        label="MRR"
        icon="fa-solid fa-arrows-rotate"
        tone="accent"
        to="/analytics?view=services"
        :loading="!d"
        :value="m(s.mrr)"
        :meta="mrrMeta"
        :show-delta="false"
        data-snap="mrr"
      />
    </div>
    <p v-if="d && d.conversion" class="snap__note" data-testid="conversion-note">
      <i class="fa-solid fa-circle-info"></i>
      {{ d.conversion.note }} Net profit and expenses are the Profit &amp; loss figures (home-currency records). MRR = recurring invoices (monthly equivalent) + hosting billed outside them.
    </p>
  </section>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { formatMoney } from '@/utils/format'

export default {
  name: 'SnapshotRow',
  components: { KpiCard },
  props: {
    d: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    showInvoicing: { type: Boolean, default: true }
  },
  computed: {
    s() {
      return this.d?.snapshot || {}
    },
    cur() {
      return this.d?.currency || ''
    },
    overduePct() {
      return this.s.outstanding ? Math.round((this.s.overdue / this.s.outstanding) * 100) : 0
    },
    mrrMeta() {
      const s = this.s
      if (!s.mrr) return 'No recurring invoices or billed hosting yet'
      const parts = [`ARR ${this.m(s.arr, true)}`]
      if (s.mrr_margin_pct !== null && s.mrr_margin_pct !== undefined && s.mrr_cost) parts.push(`${s.mrr_margin_pct}% margin after hosting`)
      return parts.join(' · ')
    }
  },
  methods: {
    m(v, compact = false) {
      const n = Number(v) || 0
      // Big amounts without cents so the tile stays readable.
      if (!compact && Math.abs(n) >= 10000) {
        try {
          return new Intl.NumberFormat(undefined, { style: 'currency', currency: this.cur || 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(n)
        } catch {
          /* fall through */
        }
      }
      return formatMoney(n, this.cur || undefined, { compact })
    },
    fmtDay(s) {
      return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(s + 'T00:00:00'))
    }
  }
}
</script>

<style scoped>
.snap {
  margin-bottom: 16px;
}

.snap__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 2px 10px;
}

.snap__head h2 {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
}

.sub {
  font-size: 12px;
  color: var(--text-3);
}

.snap__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  transition: opacity 0.2s;
}

.busy {
  opacity: 0.65;
}

.snap__note {
  margin: 10px 2px 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.snap__note i {
  color: var(--info);
  margin-right: 4px;
}

@media (max-width: 1100px) {
  .snap__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .snap__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
