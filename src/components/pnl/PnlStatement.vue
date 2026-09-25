<template>
  <div class="stmt">
    <div class="ui-table-wrap">
      <table class="ui-table pnl-table" data-testid="pnl-statement">
        <thead>
          <tr>
            <th>Line</th>
            <th class="num">{{ periodHead }}</th>
            <th v-if="cmp" class="num">{{ prevHead }}</th>
            <th v-if="cmp" class="num">Change</th>
          </tr>
        </thead>
        <tbody v-for="s in d.sections" :id="anchor(s.key)" :key="s.key">
          <tr class="section">
            <td :colspan="cols">{{ s.label }}</td>
          </tr>
          <tr v-if="!s.lines.length">
            <td class="muted indent">Nothing in this period</td>
            <td class="num muted">{{ money(0) }}</td>
            <td v-if="cmp"></td>
            <td v-if="cmp"></td>
          </tr>
          <template v-for="l in s.lines" :key="l.key">
            <tr class="line" :data-line="l.key">
              <td class="indent">
                <button v-if="l.children && l.children.length" type="button" class="twisty" :aria-expanded="!!open[l.key]" :aria-label="(open[l.key] ? 'Hide' : 'Show') + ' breakdown of ' + l.label" @click="toggle(l.key)">
                  <i :class="open[l.key] ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
                </button>
                <router-link v-if="l.link" :to="l.link" class="lnk" :title="'Open the records behind ' + l.label">{{ l.label }}</router-link>
                <span v-else>{{ l.label }}</span>
                <small v-if="l.note" class="note">{{ l.note }}</small>
                <small v-if="l.sources && l.sources.length > 1" class="note">
                  <template v-for="(p, i) in l.sources" :key="p.label">{{ i ? ' · ' : '' }}<router-link :to="p.link" class="lnk">{{ p.label }}</router-link> {{ money(p.amount) }}</template>
                </small>
              </td>
              <td class="num amt">{{ money(signed(s, l.amount)) }}</td>
              <td v-if="cmp" class="num muted">{{ money(signed(s, l.previous)) }}</td>
              <td v-if="cmp" class="num"><DeltaBadge :value="l.change_pct" :positive-is-good="s.key === 'income'" :show-new="true" /></td>
            </tr>
            <template v-if="open[l.key]">
              <tr v-for="c in l.children" :key="l.key + c.label" class="child">
                <td class="indent2">
                  <router-link v-if="c.link" :to="c.link" class="lnk">{{ c.label }}</router-link>
                  <span v-else>{{ c.label }}</span>
                </td>
                <td class="num muted">{{ money(signed(s, c.amount)) }}</td>
                <td v-if="cmp"></td>
                <td v-if="cmp"></td>
              </tr>
            </template>
          </template>
          <tr class="subtotal" :data-total="s.key">
            <td>Total {{ s.label.toLowerCase() }}</td>
            <td class="num">{{ money(signed(s, s.total)) }}</td>
            <td v-if="cmp" class="num muted">{{ money(signed(s, s.previous)) }}</td>
            <td v-if="cmp" class="num"><DeltaBadge :value="s.change_pct" :positive-is-good="s.key === 'income'" :show-new="true" /></td>
          </tr>
          <tr v-if="s.key === 'cost_of_sales'" class="grand gross" data-total="gross_profit">
            <td>Gross profit <small class="note inline">{{ margin(t.gross_margin_pct) }}</small></td>
            <td class="num" :class="{ neg: t.gross_profit < 0 }">{{ money(t.gross_profit) }}</td>
            <td v-if="cmp" class="num muted">{{ money(pv.gross_profit) }}</td>
            <td v-if="cmp" class="num"><DeltaBadge :value="ch.gross_profit" :show-new="true" /></td>
          </tr>
        </tbody>
        <tbody>
          <tr class="grand net" :class="{ neg: t.net_profit < 0, pos: t.net_profit > 0 }" data-total="net_profit">
            <td>{{ t.net_profit < 0 ? 'Net loss' : 'Net profit' }} <small class="note inline">{{ margin(t.net_margin_pct) }}</small></td>
            <td class="num">{{ money(t.net_profit) }}</td>
            <td v-if="cmp" class="num muted">{{ money(pv.net_profit) }}</td>
            <td v-if="cmp" class="num"><DeltaBadge :value="ch.net_profit" :show-new="true" /></td>
          </tr>
        </tbody>
        <tbody class="memo">
          <tr class="section">
            <td :colspan="cols">{{ d.tax.label }} memo — not part of profit</td>
          </tr>
          <tr>
            <td class="indent">{{ d.tax.label }} collected on sales</td>
            <td class="num">{{ money(d.tax.collected) }}</td>
            <td v-if="cmp" class="num muted">{{ money(d.tax.previous?.collected) }}</td>
            <td v-if="cmp"></td>
          </tr>
          <tr>
            <td class="indent">{{ d.tax.label }} paid on purchases</td>
            <td class="num">{{ money(-d.tax.paid) }}</td>
            <td v-if="cmp" class="num muted">{{ money(-(d.tax.previous?.paid || 0)) }}</td>
            <td v-if="cmp"></td>
          </tr>
          <tr class="subtotal">
            <td>Net {{ d.tax.label }} {{ d.tax.net >= 0 ? 'owed' : 'refundable' }}</td>
            <td class="num">{{ money(d.tax.net) }}</td>
            <td v-if="cmp" class="num muted">{{ money(d.tax.previous?.net) }}</td>
            <td v-if="cmp"></td>
          </tr>
          <tr v-if="d.tax.payments_to_tax_office">
            <td class="indent muted">Tax payments recorded in the cash book (left out of expenses)</td>
            <td class="num muted">{{ money(d.tax.payments_to_tax_office) }}</td>
            <td v-if="cmp"></td>
            <td v-if="cmp"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="extras">
      <div v-if="d.excluded.length" class="box">
        <h3><i class="fa-solid fa-filter-circle-xmark"></i> Left out so nothing counts twice</h3>
        <ul>
          <li v-for="e in d.excluded" :key="e.key">
            <span>{{ e.label }}</span><b>{{ e.count }} · {{ money(e.amount) }}</b>
          </li>
        </ul>
      </div>
      <div v-if="d.other_currencies.length" class="box">
        <h3><i class="fa-solid fa-coins"></i> Other currencies (not in the totals)</h3>
        <ul>
          <li v-for="o in d.other_currencies" :key="o.currency">
            <span>{{ o.currency }}: revenue {{ other(o.revenue, o.currency) }}, expenses {{ other(o.expenses, o.currency) }}</span><b>net {{ other(o.net_profit, o.currency) }}</b>
          </li>
        </ul>
      </div>
      <div class="box rules">
        <h3><i class="fa-regular fa-circle-question"></i> How this is calculated</h3>
        <ul>
          <li v-for="(r, i) in d.rules" :key="i">{{ r }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import DeltaBadge from '@/components/dashboard/DeltaBadge.vue'
import { rangeLabel } from '@/components/dashboard/analytics'
import { pnlMoney } from '@/services/pnl'

/** The full statement table for a /reports/profit-loss response. */
export default {
  name: 'PnlStatement',
  components: { DeltaBadge },
  props: {
    d: { type: Object, required: true }
  },
  data() {
    return { open: {} }
  },
  computed: {
    t() {
      return this.d.totals
    },
    pv() {
      return this.d.previous || {}
    },
    ch() {
      return this.d.change_pct || {}
    },
    cmp() {
      return !!this.d.compare
    },
    cols() {
      return this.cmp ? 4 : 2
    },
    periodHead() {
      return rangeLabel(this.d.period.from, this.d.period.to)
    },
    prevHead() {
      return this.d.compare ? rangeLabel(this.d.compare.from, this.d.compare.to) : ''
    }
  },
  methods: {
    money(v) {
      if (v === null || v === undefined) return '—'
      return pnlMoney(v, this.d.currency)
    },
    other(v, cur) {
      return `${cur} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    // costs are shown as positive amounts inside their own sections
    signed(s, v) {
      return v
    },
    margin(v) {
      return v === null || v === undefined ? '' : `${Number(v).toFixed(1)}% margin`
    },
    anchor(k) {
      return k === 'income' ? 'income' : k === 'cost_of_sales' ? 'cost-of-sales' : 'expenses'
    },
    toggle(k) {
      this.open = { ...this.open, [k]: !this.open[k] }
    },
    expandAll(v = true) {
      const o = {}
      for (const s of this.d.sections) for (const l of s.lines) if (l.children && l.children.length) o[l.key] = v
      this.open = o
    }
  }
}
</script>

<style scoped>
.pnl-table td,
.pnl-table th {
  vertical-align: top;
}

.pnl-table .num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.section td {
  background: var(--bg-subtle);
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-2);
}

.indent {
  padding-left: 22px;
}

.indent2 {
  padding-left: 52px;
  font-size: 12.5px;
}

.twisty {
  border: 0;
  background: none;
  color: var(--text-3);
  width: 20px;
  margin-left: -22px;
  cursor: pointer;
  padding: 0;
}

.lnk {
  color: var(--text);
  text-decoration: underline;
  text-decoration-color: var(--border-strong);
  text-underline-offset: 3px;
}

.lnk:hover {
  color: var(--accent);
  text-decoration-color: var(--accent);
}

.note {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}

.note.inline {
  display: inline;
  font-weight: 500;
  margin-left: 6px;
}

.amt {
  font-weight: 550;
}

.muted {
  color: var(--text-3);
}

.subtotal td {
  font-weight: 700;
  border-top: 1px solid var(--border-strong);
}

.grand td {
  font-weight: 800;
  font-size: 14.5px;
  border-top: 2px solid var(--border-strong);
}

.gross td {
  background: var(--surface-2);
}

.net.pos td {
  background: var(--success-soft);
}

.net.neg td {
  background: var(--danger-soft);
}

.net.pos td.num:nth-child(2) {
  color: var(--success);
}

.net.neg td.num:nth-child(2),
td.neg {
  color: var(--danger);
}

.memo td {
  font-size: 13px;
}

.extras {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  padding: 16px;
}

.box {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  font-size: 13px;
  min-width: 0;
}

.box h3 {
  margin: 0 0 8px;
  font-size: 13.5px;
  font-weight: 650;
}

.box h3 i {
  color: var(--text-3);
  margin-right: 4px;
}

.box ul {
  margin: 0;
  padding-left: 18px;
  color: var(--text-2);
}

.box li {
  margin-bottom: 5px;
}

.box:not(.rules) ul {
  list-style: none;
  padding: 0;
}

.box:not(.rules) li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.box b {
  white-space: nowrap;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.rules {
  grid-column: 1 / -1;
}

@media print {
  .twisty {
    display: none;
  }

  .lnk {
    text-decoration: none;
  }

  .extras {
    display: block;
  }

  .box {
    break-inside: avoid;
    margin-bottom: 8px;
  }
}
</style>
