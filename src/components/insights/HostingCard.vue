<template>
  <section class="ui-card host" data-testid="hosting-card">
    <div class="ui-card__head wrap">
      <div>
        <h2><i class="fa-solid fa-server head-ic"></i> Hosting portfolio</h2>
        <span class="sub">Synergy Wholesale sites · costs converted from AUD to {{ currency }}</span>
      </div>
      <router-link to="/analytics?view=hosting" class="ui-btn ui-btn--sm">Unit economics <i class="fa-solid fa-arrow-right"></i></router-link>
    </div>
    <div class="ui-card__body">
      <div class="figs">
        <div data-host="sites"><small>Active sites</small><strong>{{ h.sites }}</strong></div>
        <div data-host="margin">
          <small>Margin / month</small><strong :class="{ neg: h.margin_month < 0 }">{{ m(h.margin_month) }}</strong>
          <span class="hint">{{ h.margin_pct != null ? h.margin_pct + '% of billed' : 'nothing billed' }}</span>
        </div>
      </div>
      <div class="split" role="img" :aria-label="`${h.billed} billed, ${h.unbilled} not billed`">
        <span v-if="h.billed" class="b" :style="{ flexGrow: h.billed }"></span>
        <span v-if="h.unbilled" class="u" :style="{ flexGrow: h.unbilled }"></span>
        <span v-if="other > 0" class="o" :style="{ flexGrow: other }"></span>
      </div>
      <div class="legend">
        <span><i class="dviz-swatch" style="background: var(--viz-1)"></i>Billed {{ h.billed }}</span>
        <span><i class="dviz-swatch" style="background: var(--viz-2)"></i>Not billed {{ h.unbilled }}</span>
        <span v-if="other > 0"><i class="dviz-swatch" style="background: var(--border-strong)"></i>Own / internal {{ other }}</span>
      </div>
      <ul class="lines">
        <li>
          <span>Billed to clients</span><strong>{{ m(h.revenue_month) }}/mo</strong>
        </li>
        <li>
          <span>Synergy cost</span><strong>{{ m(h.cost_month) }}/mo</strong>
        </li>
        <li v-if="h.balance_aud != null">
          <span>Prepaid balance</span>
          <strong :class="{ warn: h.runway_days != null && h.runway_days < 30 }">AUD {{ fmt(h.balance_aud) }}<template v-if="h.runway_days != null"> · {{ h.runway_days }} days</template></strong>
        </li>
        <li v-if="h.near_full || h.below_cost || h.alerts">
          <span>Needs attention</span>
          <span class="badges">
            <span v-if="h.near_full" class="ui-badge ui-badge--warning">{{ h.near_full }} near full</span>
            <span v-if="h.below_cost" class="ui-badge ui-badge--danger">{{ h.below_cost }} below cost</span>
            <router-link v-if="h.alerts" to="/expenses?tab=synergy" class="ui-badge ui-badge--info">{{ h.alerts }} alert{{ h.alerts === 1 ? '' : 's' }}</router-link>
          </span>
        </li>
      </ul>
      <router-link v-if="h.unbilled" to="/insights?type=unbilled" class="cta"><i class="fa-solid fa-lightbulb"></i> {{ h.unbilled }} site{{ h.unbilled === 1 ? '' : 's' }} not billed — see opportunities</router-link>
    </div>
  </section>
</template>

<script>
import { formatMoney } from '@/utils/format'

export default {
  name: 'HostingCard',
  props: {
    h: { type: Object, required: true },
    currency: { type: String, default: '' }
  },
  computed: {
    other() {
      return Math.max(0, (this.h.sites || 0) - (this.h.billed || 0) - (this.h.unbilled || 0))
    }
  },
  methods: {
    m(v) {
      return formatMoney(v || 0, this.currency || undefined)
    },
    fmt(v) {
      return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }
}
</script>

<style scoped>
.host {
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.figs small {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.figs strong {
  display: block;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.neg {
  color: var(--danger);
}

.warn {
  color: var(--warning);
}

.hint {
  font-size: 11.5px;
  color: var(--text-3);
}

.split {
  display: flex;
  gap: 2px;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background: var(--bg-subtle);
}

.split span {
  flex-basis: 0;
  min-width: 4px;
}

.split .b {
  background: var(--viz-1);
}

.split .u {
  background: var(--viz-2);
}

.split .o {
  background: var(--border-strong);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  color: var(--text-3);
  margin: 6px 0 10px;
}

.legend span {
  display: inline-flex;
  align-items: center;
}

.lines {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lines li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-2);
}

.lines strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.cta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  background: var(--warning-soft);
  color: var(--text);
  font-size: 12.5px;
  font-weight: 550;
}

.cta i {
  color: var(--warning);
}
</style>
