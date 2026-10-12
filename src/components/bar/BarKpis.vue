<template>
  <div class="ui-kpis bk" data-testid="bar-kpis">
    <template v-if="showMoney">
      <KpiCard label="Bar sales" icon="fa-solid fa-cash-register" tone="success" :loading="loading && !ov" :value="has(sales) ? whole(sales) : '—'" :meta="salesMeta" :show-delta="false" data-kpi="sales" />
      <KpiCard label="Pour cost" icon="fa-solid fa-whiskey-glass" :tone="pourTone" :loading="loading && !ov" :value="has(pour) ? pct(pour) : '—'" :meta="pourMeta" :show-delta="false" data-kpi="pour" />
      <KpiCard label="Wastage" icon="fa-solid fa-wine-glass-empty" :tone="wasteCount || compCount ? 'warning' : 'info'" :loading="loading && !ov" :value="has(wasteValue) || has(compValue) ? whole((Number(wasteValue) || 0) + (Number(compValue) || 0)) : String(wasteCount + compCount)" :meta="lossMeta" :show-delta="false" data-kpi="wastage" />
      <KpiCard label="Stock value" icon="fa-solid fa-boxes-stacked" tone="info" :loading="loading && !ov" :value="has(stockValue) ? whole(stockValue) : '—'" :meta="stockMeta" :show-delta="false" data-kpi="value" />
    </template>
    <template v-else>
      <KpiCard label="Low at the bars" icon="fa-solid fa-battery-quarter" :tone="lowCount ? 'warning' : 'success'" :loading="loading && !ov" :value="String(lowCount)" :meta="lowCount ? 'items under their reorder point' : 'all items above reorder point'" :show-delta="false" data-kpi="low" />
      <KpiCard label="Transfers waiting" icon="fa-solid fa-right-left" tone="info" :loading="loading && !ov" :value="String(pendT)" meta="requested or on the way" :show-delta="false" data-kpi="transfers" />
      <KpiCard label="Wastage tonight" icon="fa-solid fa-wine-glass-empty" :tone="wasteCount ? 'warning' : 'info'" :loading="loading && !ov" :value="String(wasteCount)" :meta="wasteCount === 1 ? 'entry logged' : 'entries logged'" :show-delta="false" data-kpi="wastage" />
      <KpiCard label="Comps tonight" icon="fa-solid fa-gift" tone="accent" :loading="loading && !ov" :value="String(compCount)" meta="free drinks recorded" :show-delta="false" data-kpi="comps" />
    </template>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { money, has, pick, countOf, bar, moneyWhole } from './barContext'
import { fmtNum } from '@/utils/barUnits'

// KPI row for one business date (GET /bar/overview). Money only for approvers.
export default {
  name: 'BarKpis',
  components: { KpiCard },
  props: {
    ov: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    showMoney: { type: Boolean, default: false }
  },
  emits: ['go'],
  computed: {
    o() {
      return this.ov || {}
    },
    sales() {
      return pick(this.o, 'sales.gross')
    },
    salesMeta() {
      const n = Number(pick(this.o, 'sales.transactions')) || 0
      const net = pick(this.o, 'sales.revenue')
      const parts = [`${n} sale${n === 1 ? '' : 's'}`]
      if (has(net) && Number(net) !== Number(this.sales)) parts.push(`${money(net)} before VAT`)
      return parts.join(' · ')
    },
    pour() {
      return pick(this.o, 'pour_cost_pct')
    },
    pourTarget() {
      // A single target only when every category sold shares it.
      const ts = (pick(this.o, 'sales.categories') || []).map((c) => c.pour_cost_target).filter((t) => t !== null && t !== undefined)
      return ts.length && ts.every((t) => t === ts[0]) ? ts[0] : undefined
    },
    offTarget() {
      return (pick(this.o, 'sales.categories') || []).filter((c) => c.on_target === false).length
    },
    pourTone() {
      if (!has(this.pour)) return 'info'
      if (this.offTarget) return 'danger'
      return 'success'
    },
    pourMeta() {
      if (!has(this.pour)) return 'no bar sales this night'
      const cos = pick(this.o, 'cost_of_sales')
      const parts = []
      if (has(cos)) parts.push(`cost ${money(cos)}`)
      if (this.offTarget) parts.push(`${this.offTarget} categor${this.offTarget === 1 ? 'y' : 'ies'} over target`)
      else if (has(this.pourTarget)) parts.push(`target ${this.pct(this.pourTarget)}`)
      return parts.join(' · ') || 'cost ÷ net sales'
    },
    wasteValue() {
      return pick(this.o, 'wastage.value')
    },
    wasteCount() {
      return Number(pick(this.o, 'wastage.entries')) || 0
    },
    wasteMeta() {
      const n = this.wasteCount
      const pend = Number(pick(this.o, 'pending_approvals.wastage')) || 0
      return `${n} entr${n === 1 ? 'y' : 'ies'}${pend ? ` · ${pend} to approve` : ''}`
    },
    compValue() {
      return pick(this.o, 'comps.value')
    },
    compCount() {
      return Number(pick(this.o, 'comps.entries')) || 0
    },
    lossMeta() {
      const pend = Number(pick(this.o, 'pending_approvals.wastage')) || 0
      const parts = [`${this.wasteCount} wastage`, `${this.compCount} comp${this.compCount === 1 ? '' : 's'}`]
      if (has(this.compValue) && this.compCount) parts[1] += ` (${this.whole(this.compValue)})`
      if (pend) parts.push(`${pend} to approve`)
      return parts.join(' · ')
    },
    compMeta() {
      const serv = Number(pick(this.o, 'comps.servings')) || 0
      return `${this.compCount} comp${this.compCount === 1 ? '' : 's'} & staff drinks${serv ? ` · ${fmtNum(serv, 1)} drinks` : ''}`
    },
    stockValue() {
      return pick(this.o, 'stock_value')
    },
    stockMeta() {
      const locs = (pick(this.o, 'stock_value_by_location') || []).length || bar.locations.length
      return `at average cost · ${locs} location${locs === 1 ? '' : 's'}`
    },
    lowCount() {
      return countOf(pick(this.o, 'low_stock_at_bars'))
    },
    pendT() {
      return Number(pick(this.o, 'pending_transfers.total')) || 0
    }
  },
  methods: {
    money,
    has,
    whole: moneyWhole,
    pct(v) {
      return `${fmtNum(v, 1)}%`
    }
  }
}
</script>

<style scoped>
@media (max-width: 640px) {
  .bk > :last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}
</style>
