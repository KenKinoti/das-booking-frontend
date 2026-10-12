<template>
  <section v-if="show" class="ui-card btc" data-testid="bar-tonight">
    <div class="ui-card__head">
      <div>
        <h2>Tonight at the bar</h2>
        <span class="sub">{{ sub }}</span>
      </div>
      <router-link to="/bar-stock" class="ui-btn ui-btn--ghost ui-btn--sm">Bar stock <i class="fa-solid fa-arrow-right"></i></router-link>
    </div>
    <div class="btc__grid">
      <div v-if="money">
        <small>Bar sales</small>
        <strong data-testid="btc-sales">{{ fmt(o.sales?.gross) }}</strong>
        <span>{{ n(o.sales?.transactions) }} sale{{ n(o.sales?.transactions) === 1 ? '' : 's' }}</span>
      </div>
      <div v-if="money">
        <small>Pour cost</small>
        <strong :class="{ bad: overTarget }">{{ o.pour_cost_pct !== null && o.pour_cost_pct !== undefined ? fmtNum(o.pour_cost_pct, 1) + '%' : '—' }}</strong>
        <span>{{ o.cost_of_sales !== undefined ? 'cost ' + fmt(o.cost_of_sales) : '' }}</span>
      </div>
      <div>
        <small>Wastage &amp; comps</small>
        <strong>{{ n(o.wastage?.entries) + n(o.comps?.entries) }}</strong>
        <span v-if="money && (o.wastage?.value !== undefined || o.comps?.value !== undefined)">{{ fmt((Number(o.wastage?.value) || 0) + (Number(o.comps?.value) || 0)) }}</span>
        <span v-else>entries</span>
      </div>
      <div>
        <small>Low at the bars</small>
        <strong :class="{ warn: (o.low_stock_at_bars || []).length }">{{ (o.low_stock_at_bars || []).length }}</strong>
        <span>{{ (o.low_stock_at_bars || []).length ? 'items to top up' : 'all above reorder' }}</span>
      </div>
      <div>
        <small>Waiting</small>
        <strong :class="{ warn: waiting }">{{ waiting }}</strong>
        <span>requests &amp; approvals</span>
      </div>
    </div>
  </section>
</template>

<script>
import { barApi } from '@/services/bar'
import { hasModule } from '@/composables/useEntitlements'
import { can } from '@/composables/useAccess'
import { formatMoney } from '@/utils/format'
import { fmtNum } from '@/utils/barUnits'

// Dashboard card: tonight's bar figures. Shown only when the organisation has bar locations.
export default {
  name: 'BarTonightCard',
  data() {
    return { o: null, has: false }
  },
  computed: {
    show() {
      return this.has && !!this.o
    },
    money() {
      return can('inventory', 'approve')
    },
    sub() {
      if (!this.o?.business_date) return ''
      const d = new Date(this.o.business_date + 'T12:00:00')
      return `Night of ${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} · until ${this.o.day_cutoff || '06:00'}`
    },
    overTarget() {
      return (this.o?.sales?.categories || []).some((c) => c.on_target === false)
    },
    waiting() {
      return this.n(this.o?.pending_transfers?.requested) + (this.money ? this.n(this.o?.pending_approvals?.total) : 0)
    }
  },
  async created() {
    if (!hasModule('inventory') || !can('inventory', 'view')) return
    try {
      const locs = await barApi.locations()
      this.has = locs.some((l) => l.type !== 'store' && l.is_active !== false)
      if (this.has) this.o = await barApi.overview()
    } catch {
      this.has = false
    }
  },
  methods: {
    fmtNum,
    n(v) {
      return Number(v) || 0
    },
    fmt(v) {
      return v === null || v === undefined ? '—' : formatMoney(v, this.o?.currency)
    }
  }
}
</script>

<style scoped>
.btc {
  margin-bottom: 16px;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}
.btc__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  padding: 0 16px 16px;
}
.btc__grid > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  min-width: 0;
}
.btc__grid small {
  font-size: 12px;
  color: var(--text-3);
}
.btc__grid strong {
  font-size: 19px;
  font-variant-numeric: tabular-nums;
}
.btc__grid span {
  font-size: 12px;
  color: var(--text-3);
}
.bad {
  color: var(--danger);
}
.warn {
  color: var(--warning);
}
@media (max-width: 640px) {
  .btc__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
