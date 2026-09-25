<template>
  <section class="ui-card pnl-card dviz" data-testid="pnl-card">
    <div class="ui-card__head wrap">
      <div>
        <h2><i class="fa-solid fa-scale-balanced head-ic"></i> Profit &amp; loss</h2>
        <span class="sub">
          <template v-if="d">{{ rangeText }} · {{ basisLabel }} basis · excl. {{ d.tax?.label || 'tax' }} · {{ d.currency }}</template>
          <template v-else>Revenue − expenses = net profit</template>
        </span>
      </div>
      <div class="head-actions">
        <div class="ui-tabs basis" role="tablist" aria-label="Basis">
          <button
            v-for="b in ['accrual', 'cash']"
            :key="b"
            type="button"
            role="tab"
            class="ui-tab"
            :class="{ 'is-active': basis === b }"
            :aria-selected="basis === b"
            :title="help[b]"
            :data-basis="b"
            @click="setBasis(b)"
          >
            {{ labels[b] }}
          </button>
        </div>
        <PnlHow v-if="d" :rules="d.rules" :excluded="d.excluded" :currency="d.currency" :report-link="reportLink" />
        <router-link :to="reportLink" class="ui-btn ui-btn--sm">Full report <i class="fa-solid fa-arrow-right"></i></router-link>
      </div>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger">
        <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
      </div>
    </div>
    <div v-else-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 260px"></div></div>
    <div v-else-if="!d.has_data" class="ui-empty small">
      <div class="ui-empty__icon"><i class="fa-solid fa-scale-balanced"></i></div>
      <h3>No income or expenses in this period</h3>
      <p>Issue an invoice, ring up a sale or record an expense — your profit &amp; loss builds itself.</p>
      <div class="empty-actions">
        <router-link to="/invoices/new" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-solid fa-plus"></i> New invoice</router-link>
        <router-link to="/business?tab=cashbook" class="ui-btn ui-btn--sm"><i class="fa-solid fa-arrow-up"></i> Record an expense</router-link>
      </div>
    </div>
    <div v-else class="ui-card__body pnl-body" :class="{ busy: loading }">
      <!-- the equation -->
      <div class="eq" aria-label="Revenue minus expenses equals net profit">
        <router-link :to="lineLink('income')" class="eq__item" data-pnl="revenue">
          <span class="eq__label"><i class="dviz-swatch" style="background: var(--viz-1)"></i>Revenue</span>
          <strong class="eq__val">{{ money(t.revenue) }}</strong>
          <span class="eq__meta"><DeltaBadge v-if="cmp" :value="ch.revenue" :show-new="true" /> {{ cmp ? 'vs ' + money(p.revenue, true) : 'excl. ' + d.tax.label }}</span>
        </router-link>
        <span class="eq__op" aria-hidden="true">−</span>
        <router-link :to="lineLink('expenses')" class="eq__item" data-pnl="expenses">
          <span class="eq__label"><i class="dviz-swatch" style="background: var(--viz-2)"></i>Expenses</span>
          <strong class="eq__val">{{ money(t.total_expenses) }}</strong>
          <span class="eq__meta"><DeltaBadge v-if="cmp" :value="ch.total_expenses" :positive-is-good="false" :show-new="true" /> {{ money(t.cost_of_sales, true) }} cost of sales</span>
        </router-link>
        <span class="eq__op" aria-hidden="true">=</span>
        <router-link :to="reportLink" class="eq__item eq__item--net" :class="netTone" data-pnl="net">
          <span class="eq__label"><i :class="t.net_profit < 0 ? 'fa-solid fa-arrow-trend-down' : 'fa-solid fa-arrow-trend-up'"></i>{{ t.net_profit < 0 ? 'Net loss' : 'Net profit' }}</span>
          <strong class="eq__val eq__val--big">{{ money(t.net_profit) }}</strong>
          <span class="eq__meta">
            <template v-if="t.net_margin_pct !== null">{{ t.net_margin_pct.toFixed(1) }}% margin</template>
            <DeltaBadge v-if="cmp" :value="ch.net_profit" :show-new="true" />
            <template v-if="cmp"> vs {{ money(p.net_profit, true) }}</template>
          </span>
        </router-link>
      </div>

      <div class="grid3">
        <div class="panel">
          <div class="panel__head">
            <h3>From revenue to net profit</h3>
            <span class="muted">Gross margin {{ t.gross_margin_pct === null ? '—' : t.gross_margin_pct.toFixed(1) + '%' }}</span>
          </div>
          <PnlBars :bars="waterfall" :height="210" connectors show-values :format-y="axis" aria-label="Waterfall: revenue, cost of sales, gross profit, operating expenses, net profit" />
        </div>

        <div class="panel">
          <div class="panel__head">
            <h3>Top expenses</h3>
            <span class="muted">{{ money(t.total_expenses, true) }} in total</span>
          </div>
          <div v-if="!d.top_expenses.length" class="ui-empty tiny"><p>No expenses in this period.</p></div>
          <ul v-else class="bars" role="list">
            <li v-for="e in d.top_expenses" :key="e.key">
              <router-link :to="e.link || reportLink" class="bars__row" :title="`${e.label}: ${money(e.amount)} (${e.share_pct}% of expenses)`">
                <span class="bars__top">
                  <span class="bars__name">{{ e.label }}</span>
                  <strong>{{ money(e.amount) }}</strong>
                </span>
                <span class="bars__track"><span class="bars__fill" :style="{ width: barPct(e.amount) }"></span></span>
                <small class="muted">{{ e.share_pct }}% of expenses{{ e.section === 'cost_of_sales' ? ' · cost of sales' : '' }}</small>
              </router-link>
            </li>
          </ul>
        </div>

        <div class="panel">
          <div class="panel__head">
            <h3>Net profit, last 12 months</h3>
            <span class="muted">{{ trendNote }}</span>
          </div>
          <PnlBars :bars="trend" :height="210" :format-y="axis" aria-label="Net profit by month for the last 12 months" />
        </div>
      </div>

      <div class="foot">
        <span>
          <i class="fa-solid fa-receipt"></i> {{ d.tax.label }} collected {{ money(d.tax.collected) }} · paid {{ money(d.tax.paid) }} · net {{ money(d.tax.net) }}
          <span class="muted">(memo — not profit)</span>
        </span>
        <span v-if="d.other_currencies.length" class="muted">
          Not included: <template v-for="(o, i) in d.other_currencies" :key="o.currency">{{ i ? '; ' : '' }}{{ o.currency }} net {{ fmtOther(o.net_profit, o.currency) }}</template>
        </span>
      </div>
    </div>
  </section>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import '@/components/dashboard/dashviz.css'
import DeltaBadge from '@/components/dashboard/DeltaBadge.vue'
import { moneyAxis, rangeLabel } from '@/components/dashboard/analytics'
import PnlBars from './PnlBars.vue'
import PnlHow from './PnlHow.vue'
import { fetchPnl, periodParams, loadBasis, saveBasis, pnlMoney, BASIS_LABEL, BASIS_HELP } from '@/services/pnl'
import { apiErrorMessage } from '@/services/api'

export default {
  name: 'PnlCard',
  components: { DeltaBadge, PnlBars, PnlHow },
  props: {
    // the dashboard / analytics period: { range, from, to, compare }
    period: { type: Object, required: true }
  },
  emits: ['loaded'],
  data() {
    return { d: null, loading: false, error: '', basis: loadBasis(), reqId: 0, labels: BASIS_LABEL, help: BASIS_HELP }
  },
  computed: {
    t() {
      return this.d?.totals || {}
    },
    p() {
      return this.d?.previous || {}
    },
    ch() {
      return this.d?.change_pct || {}
    },
    cmp() {
      return !!this.d?.compare
    },
    basisLabel() {
      return BASIS_LABEL[this.basis]
    },
    rangeText() {
      return this.d ? rangeLabel(this.d.period.from, this.d.period.to) : ''
    },
    netTone() {
      return this.t.net_profit < 0 ? 'neg' : this.t.net_profit > 0 ? 'pos' : ''
    },
    reportLink() {
      if (!this.d) return '/reports/profit-loss'
      return { path: '/reports/profit-loss', query: { from: this.d.period.from, to: this.d.period.to, basis: this.basis } }
    },
    waterfall() {
      const t = this.t
      const m = (v) => this.money(v)
      const s = (v) => this.money(v, true)
      const net = t.net_profit || 0
      return [
        { label: 'Revenue', start: 0, end: t.revenue, color: 'var(--viz-1)', value: m(t.revenue), short: s(t.revenue), name: 'Revenue (excl. tax)' },
        { label: 'Cost of sales', start: t.revenue, end: t.gross_profit, color: 'var(--viz-2)', value: '− ' + m(t.cost_of_sales), short: t.cost_of_sales ? '−' + s(t.cost_of_sales) : '', name: 'Cost of sales' },
        { label: 'Gross profit', start: 0, end: t.gross_profit, color: 'var(--viz-3)', value: m(t.gross_profit), short: s(t.gross_profit), name: 'Gross profit', details: t.gross_margin_pct !== null ? [['Gross margin', t.gross_margin_pct + '%']] : [] },
        { label: 'Expenses', title: 'Operating expenses', start: t.gross_profit, end: net, color: 'var(--viz-2)', value: '− ' + m(t.operating_expenses), short: t.operating_expenses ? '−' + s(t.operating_expenses) : '', name: 'Operating expenses' },
        { label: 'Net profit', start: 0, end: net, color: net < 0 ? 'var(--danger)' : 'var(--success)', value: m(net), short: s(net), name: net < 0 ? 'Net loss' : 'Net profit', details: t.net_margin_pct !== null ? [['Net margin', t.net_margin_pct + '%']] : [] }
      ]
    },
    trend() {
      const fmt = new Intl.DateTimeFormat(undefined, { month: 'short' })
      const fmtL = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
      return (this.d?.series || []).map((m) => {
        const dt = new Date(m.month + '-01T00:00:00')
        return {
          label: fmt.format(dt),
          title: fmtL.format(dt) + (m.partial ? ' (so far)' : ''),
          start: 0,
          end: m.net_profit,
          color: m.net_profit < 0 ? 'var(--danger)' : 'var(--success)',
          name: m.net_profit < 0 ? 'Net loss' : 'Net profit',
          value: this.money(m.net_profit),
          details: [
            ['Revenue', this.money(m.revenue)],
            ['Expenses', this.money(m.expenses)]
          ]
        }
      })
    },
    trendNote() {
      const s = this.d?.series || []
      const tot = s.reduce((a, m) => a + (m.net_profit || 0), 0)
      return `${this.money(tot, true)} over 12 months`
    }
  },
  watch: {
    period: {
      deep: true,
      handler() {
        this.load()
      }
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      const id = ++this.reqId
      this.loading = true
      try {
        const d = await fetchPnl({ ...periodParams(this.period), basis: this.basis, compare: this.period.compare !== false })
        if (id !== this.reqId) return
        this.d = d
        this.error = ''
        this.$emit('loaded', d)
      } catch (e) {
        if (id !== this.reqId) return
        this.error = apiErrorMessage(e, 'Could not load profit & loss.')
      } finally {
        if (id === this.reqId) this.loading = false
      }
    },
    setBasis(b) {
      if (b === this.basis) return
      this.basis = b
      saveBasis(b)
      this.load()
    },
    money(v, compact = false) {
      return pnlMoney(v, this.d?.currency, compact)
    },
    fmtOther(v, cur) {
      return `${cur} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    axis(v) {
      return moneyAxis(v, this.d?.currency || orgCurrency())
    },
    barPct(v) {
      const max = Math.max(...(this.d?.top_expenses || []).map((e) => e.amount), 1)
      return Math.max(2, (v / max) * 100) + '%'
    },
    lineLink(section) {
      if (!this.d) return '/reports/profit-loss'
      return { path: '/reports/profit-loss', query: { from: this.d.period.from, to: this.d.period.to, basis: this.basis }, hash: '#' + section }
    }
  }
}
</script>

<style scoped>
.pnl-card {
  margin-bottom: 16px;
  min-width: 0;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
  gap: 10px;
}

.ui-card__head .sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.head-ic {
  color: var(--accent);
  margin-right: 4px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.basis {
  flex-wrap: nowrap;
}

.busy {
  opacity: 0.65;
  transition: opacity 0.2s;
}

.small {
  padding: 28px 20px;
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 10px;
}

.pnl-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.eq {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1.25fr);
  align-items: stretch;
  gap: 10px;
}

.eq__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  min-width: 0;
  transition: border-color 0.15s, background 0.15s;
}

.eq__item:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
  color: var(--text);
}

.eq__item--net.pos {
  background: var(--success-soft);
  border-color: transparent;
}

.eq__item--net.neg {
  background: var(--danger-soft);
  border-color: transparent;
}

.eq__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
}

.eq__item--net.pos .eq__label i {
  color: var(--success);
}

.eq__item--net.neg .eq__label i {
  color: var(--danger);
}

.eq__val {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eq__val--big {
  font-size: 30px;
}

.eq__item--net.pos .eq__val {
  color: var(--success);
}

.eq__item--net.neg .eq__val {
  color: var(--danger);
}

.eq__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.eq__op {
  align-self: center;
  font-size: 26px;
  font-weight: 300;
  color: var(--text-3);
}

.grid3 {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 18px;
}

.panel {
  min-width: 0;
}

.panel__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.panel__head h3 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 650;
}

.muted {
  color: var(--text-3);
  font-size: 12px;
}

.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bars__row {
  display: block;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  color: var(--text);
}

.bars__row:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.bars__top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.bars__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bars__top strong {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bars__track {
  display: block;
  height: 8px;
  border-radius: 4px;
  background: var(--bg-subtle);
  margin: 5px 0 3px;
  overflow: hidden;
}

.bars__fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--viz-2);
}

.foot {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 12.5px;
  color: var(--text-2);
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.ui-empty.tiny {
  padding: 24px 12px;
}

@media (max-width: 1100px) {
  .grid3 {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .grid3 > .panel:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .eq {
    grid-template-columns: minmax(0, 1fr);
  }

  .eq {
    gap: 2px;
  }

  .eq__op {
    justify-self: center;
    font-size: 18px;
    line-height: 1.1;
  }

  .grid3 {
    grid-template-columns: minmax(0, 1fr);
  }

  .eq__val--big {
    font-size: 26px;
  }
}
</style>
