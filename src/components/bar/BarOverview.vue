<template>
  <div class="ov" data-testid="bar-overview">
    <div v-if="loading && !ov" class="ov__grid">
      <div class="ui-skeleton" style="height: 260px"></div>
      <div class="ui-skeleton" style="height: 260px"></div>
    </div>
    <template v-else-if="ov">
      <div v-if="Number(ov.oversold_lines) > 0" class="ui-alert ui-alert--warning" data-testid="ov-oversold">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>{{ ov.oversold_lines }} sale line{{ ov.oversold_lines === 1 ? '' : 's' }} this night went beyond the stock recorded at the bar — a delivery or transfer may be missing. <a href="#" @click.prevent="$emit('go', 'counts')">Count the bar</a> to correct it.</span>
      </div>

      <div class="ov__grid">
        <div class="col">
          <!-- Sales by category -->
          <section class="blk">
            <div class="blk__head">
              <h3>Sales by category</h3>
              <span class="muted">{{ formatDate(ov.business_date) }}</span>
            </div>
            <div v-if="!cats.length" class="ui-empty small"><p>No bar sales on this night yet. Sales rung up in the POS from a bar show here with their pour cost.</p></div>
            <div v-else class="ui-table-wrap">
              <table class="ui-table tbl">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th class="num">Sold</th>
                    <th v-if="perm.approve" class="num">Net sales</th>
                    <th v-if="perm.approve" class="num hide-sm">Cost</th>
                    <th v-if="perm.approve" class="num">Pour cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in cats" :key="c.category" :data-cat="c.category">
                    <td><i :class="categoryIcon(c.category)" class="cic"></i> {{ c.label || categoryLabel(c.category) }}</td>
                    <td class="num">{{ c.qty }}</td>
                    <td v-if="perm.approve" class="num">{{ money(c.revenue) }}</td>
                    <td v-if="perm.approve" class="num hide-sm">{{ has(c.cost) ? money(c.cost) : '—' }}</td>
                    <td v-if="perm.approve" class="num" :class="{ over: c.on_target === false }">
                      <template v-if="c.pour_cost_pct !== null && c.pour_cost_pct !== undefined">{{ fmtNum(c.pour_cost_pct, 1) }}%</template><template v-else>—</template>
                      <small v-if="has(c.pour_cost_target)" class="sub">target {{ fmtNum(c.pour_cost_target, 1) }}%</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <a v-if="perm.approve" href="#" class="more" @click.prevent="$emit('go', 'reports')">Pour cost report <i class="fa-solid fa-arrow-right"></i></a>
          </section>

          <!-- Low stock -->
          <section class="blk" data-testid="ov-low">
            <div class="blk__head">
              <h3>Low at the bars</h3>
              <span class="muted">{{ low.length }} item{{ low.length === 1 ? '' : 's' }}</span>
            </div>
            <div v-if="!low.length" class="ui-empty small">
              <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
              <p>Nothing at the bars is at or below its reorder point. Items show here once they have a par level and reorder point.</p>
            </div>
            <template v-else>
              <div v-for="g in lowByBar" :key="g.location_id" class="lowgrp">
                <div class="lowgrp__head">
                  <strong>{{ g.location }}</strong>
                  <button v-if="perm.create" type="button" class="ui-btn ui-btn--sm" :data-testid="'topup-' + g.location" @click="$emit('transfer', { topUp: true, to_location_id: g.location_id })"><i class="fa-solid fa-arrow-up-wide-short"></i> Top up to par</button>
                </div>
                <ul class="rows">
                  <li v-for="r in g.rows" :key="r.product_id" @click="$emit('open-item', r.product_id)">
                    <span>{{ r.name }}</span>
                    <span class="q" :class="{ neg: Number(r.on_hand) <= 0 }">{{ r.on_hand_text }}<small> · par {{ fmtNum(r.par, 1) }}</small></span>
                  </li>
                </ul>
              </div>
            </template>
          </section>
        </div>

        <div class="col">
          <!-- To do -->
          <section class="blk" data-testid="ov-todo">
            <div class="blk__head"><h3>Waiting on you</h3></div>
            <ul class="todo">
              <li :class="{ zero: !num('pending_transfers.requested') }" @click="$emit('go', 'transfers')">
                <i class="fa-regular fa-hand"></i><span>Stock requests to issue</span><strong>{{ num('pending_transfers.requested') }}</strong>
              </li>
              <li :class="{ zero: !num('pending_transfers.issued') }" @click="$emit('go', 'transfers')">
                <i class="fa-solid fa-dolly"></i><span>Transfers on the way</span><strong>{{ num('pending_transfers.issued') }}</strong>
              </li>
              <li v-if="perm.approve" :class="{ zero: !num('pending_approvals.wastage') }" @click="$emit('go', 'wastage')">
                <i class="fa-solid fa-gift"></i><span>Comps &amp; wastage to approve</span><strong>{{ num('pending_approvals.wastage') }}</strong>
              </li>
              <li v-if="perm.approve" :class="{ zero: !num('pending_approvals.counts') }" @click="$emit('go', 'counts')">
                <i class="fa-solid fa-clipboard-check"></i><span>Counts to review</span><strong>{{ num('pending_approvals.counts') }}</strong>
              </li>
              <li :class="{ zero: !num('open_counts') }" @click="$emit('go', 'counts')">
                <i class="fa-solid fa-hourglass-half"></i><span>Counts in progress</span><strong>{{ num('open_counts') }}</strong>
              </li>
            </ul>
          </section>

          <!-- Last count -->
          <section class="blk" data-testid="ov-last-count">
            <div class="blk__head"><h3>Last approved count</h3></div>
            <div v-if="!lc" class="ui-empty small"><p>No approved count yet. Variance starts with your first stock take.</p></div>
            <button v-else type="button" class="lastc" @click="$emit('open-count', lc.id)">
              <span class="lastc__t"><strong>{{ lc.location }}</strong><small>{{ lc.number }} · night of {{ formatDate(lc.business_date) }}</small></span>
              <span v-if="perm.approve && has(lc.variance_value)" class="lastc__v" :class="Number(lc.variance_value) < 0 ? 'neg' : Number(lc.variance_value) > 0 ? 'pos' : ''">{{ signedMoney(lc.variance_value) }}<small>net variance</small></span>
              <span v-if="lc.flagged_count" class="ui-badge ui-badge--warning">{{ lc.flagged_count }} flagged</span>
            </button>
          </section>

          <!-- Stock value -->
          <section v-if="perm.approve && values.length" class="blk" data-testid="ov-values">
            <div class="blk__head"><h3>Stock value by location</h3><strong class="tot">{{ money(ov.stock_value) }}</strong></div>
            <ul class="bars">
              <li v-for="v in values" :key="v.location_id">
                <span class="bars__l">{{ v.location }}</span>
                <span class="bars__t"><span :style="{ width: barPct(v.value) + '%' }"></span></span>
                <span class="bars__v">{{ money(v.value) }}</span>
              </li>
            </ul>
          </section>

          <!-- Wastage by reason -->
          <section v-if="reasons.length" class="blk">
            <div class="blk__head"><h3>Wastage &amp; comps</h3></div>
            <ul class="rows">
              <li v-for="r in reasons" :key="r.reason" @click="$emit('go', 'wastage')">
                <span>{{ reasonLabel(r.reason) }}</span>
                <span class="q">{{ r.entries }} · {{ fmtNum(r.servings, 1) }} drinks<template v-if="perm.approve && has(r.value)"> · {{ money(r.value) }}</template></span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </template>
    <div v-else class="ui-empty small"><p>Figures for this night are not available.</p></div>
  </div>
</template>

<script>
import { money, has, pick } from './barContext'
import { formatDate } from '@/utils/format'
import { fmtNum, categoryLabel, categoryIcon, reasonLabel } from '@/utils/barUnits'

export default {
  name: 'BarOverview',
  props: {
    ov: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['go', 'open-count', 'open-transfer', 'open-item', 'transfer'],
  computed: {
    cats() {
      return (pick(this.ov, 'sales.categories') || []).slice().sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))
    },
    low() {
      return pick(this.ov, 'low_stock_at_bars') || []
    },
    lowByBar() {
      const m = new Map()
      for (const r of this.low) {
        if (!m.has(r.location_id)) m.set(r.location_id, { location_id: r.location_id, location: r.location, rows: [] })
        m.get(r.location_id).rows.push(r)
      }
      return [...m.values()]
    },
    lc() {
      return pick(this.ov, 'last_count_variance') || null
    },
    values() {
      return pick(this.ov, 'stock_value_by_location') || []
    },
    maxValue() {
      return Math.max(1, ...this.values.map((v) => Number(v.value) || 0))
    },
    reasons() {
      return (pick(this.ov, 'wastage.by_reason') || []).slice().sort((a, b) => b.entries - a.entries)
    }
  },
  methods: {
    money,
    has,
    fmtNum,
    formatDate,
    categoryLabel,
    categoryIcon,
    reasonLabel,
    num(path) {
      return Number(pick(this.ov, path)) || 0
    },
    barPct(v) {
      return Math.max(2, Math.round(((Number(v) || 0) / this.maxValue) * 100))
    },
    signedMoney(v) {
      const n = Number(v) || 0
      return (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n))
    }
  }
}
</script>

<style scoped>
.ov {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ov__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.blk {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.blk__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.blk h3 {
  font-size: 14.5px;
  margin: 0;
}
.muted {
  font-size: 12.5px;
  color: var(--text-3);
}
.tot {
  font-variant-numeric: tabular-nums;
}
.tbl td,
.tbl th {
  font-variant-numeric: tabular-nums;
}
.cic {
  color: var(--text-3);
  width: 18px;
}
td.over {
  color: var(--danger);
  font-weight: 700;
}
.sub {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 400;
}
.more {
  font-size: 13px;
  align-self: flex-end;
}
.lowgrp + .lowgrp {
  margin-top: 6px;
}
.lowgrp__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.rows li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  border-top: 1px solid var(--border);
  font-size: 13.5px;
  cursor: pointer;
}
.rows li:hover span:first-child {
  color: var(--accent);
}
.rows .q {
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.rows .q small {
  color: var(--text-3);
}
.neg {
  color: var(--danger) !important;
  font-weight: 600;
}
.pos {
  color: var(--success);
  font-weight: 600;
}
.todo {
  list-style: none;
  margin: 0;
  padding: 0;
}
.todo li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 4px;
  border-top: 1px solid var(--border);
  cursor: pointer;
  font-size: 13.5px;
}
.todo li:first-child {
  border-top: 0;
}
.todo li i {
  width: 18px;
  color: var(--accent);
}
.todo li span {
  flex: 1;
}
.todo li strong {
  min-width: 26px;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  display: inline-grid;
  place-items: center;
  background: var(--warning-soft);
  color: var(--warning);
  font-variant-numeric: tabular-nums;
}
.todo li.zero {
  color: var(--text-3);
}
.todo li.zero i {
  color: var(--text-3);
}
.todo li.zero strong {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-3);
}
.lastc {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.lastc:hover {
  border-color: var(--border-strong);
}
.lastc__t {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.lastc__t small,
.lastc__v small {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 400;
}
.lastc__v {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-variant-numeric: tabular-nums;
  font-size: 16px;
}
.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bars li {
  display: grid;
  grid-template-columns: minmax(70px, 0.9fr) 1.4fr auto;
  gap: 10px;
  align-items: center;
  font-size: 13px;
}
.bars__l {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bars__t {
  height: 8px;
  border-radius: 4px;
  background: var(--border);
  overflow: hidden;
}
.bars__t span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
}
.bars__v {
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
}
@media (max-width: 1000px) {
  .ov__grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .blk {
    padding: 12px;
  }
}
</style>
