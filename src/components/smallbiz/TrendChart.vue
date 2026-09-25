<template>
  <div class="trend">
    <div class="legend">
      <span><i class="sw sw-in"></i>Money in</span>
      <span><i class="sw sw-out"></i>Money out</span>
    </div>
    <div class="plot" @mouseleave="hover = -1">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" role="img" :aria-label="summary" class="svg">
        <g class="grid">
          <line v-for="t in ticks" :key="'g' + t" :x1="padL" :x2="W" :y1="y(t)" :y2="y(t)" />
        </g>
        <g v-for="(m, i) in months" :key="m.month">
          <rect v-if="hover === i" class="hover-bg" :x="colX(i) + 2" :y="0" :width="colW - 4" :height="H - padB" rx="6" />
          <rect class="bar-in" :x="colX(i) + colW / 2 - barW - 1" :y="y(m.income_net)" :width="barW" :height="barH(m.income_net)" rx="3" />
          <rect class="bar-out" :x="colX(i) + colW / 2 + 1" :y="y(m.expenses_net)" :width="barW" :height="barH(m.expenses_net)" rx="3" />
          <rect class="hit" :x="colX(i)" y="0" :width="colW" :height="H" @mouseenter="hover = i" @focus="hover = i" />
        </g>
      </svg>
      <div class="ylabels">
        <span v-for="t in ticks" :key="'l' + t" :style="{ top: (y(t) / H) * 100 + '%' }">{{ money(t, true) }}</span>
      </div>
      <div class="xlabels" :style="{ paddingLeft: (padL / W) * 100 + '%' }">
        <span v-for="m in months" :key="'x' + m.month">{{ label(m.month) }}</span>
      </div>
      <div v-if="hover >= 0" class="tip" :style="{ left: ((colX(hover) + colW / 2) / W) * 100 + '%' }">
        <strong>{{ label(months[hover].month, true) }}</strong>
        <span><i class="sw sw-in"></i>In {{ money(months[hover].income_net) }}</span>
        <span><i class="sw sw-out"></i>Out {{ money(months[hover].expenses_net) }}</span>
        <span class="tip-profit">Profit {{ money(months[hover].profit) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { fmtMinor, monthLabel } from '@/services/smallbiz'

export default {
  name: 'TrendChart',
  props: {
    months: { type: Array, default: () => [] },
    currency: { type: String, default: () => orgCurrency() }
  },
  data() {
    return { hover: -1, W: 600, H: 220, padL: 56, padB: 4 }
  },
  computed: {
    max() {
      const m = Math.max(0, ...this.months.map((x) => Math.max(x.income_net, x.expenses_net)))
      if (m <= 0) return 100
      const mag = Math.pow(10, Math.floor(Math.log10(m)))
      const steps = [1, 2, 2.5, 5, 10]
      for (const s of steps) if (s * mag >= m) return s * mag
      return 10 * mag
    },
    ticks() {
      return [this.max, this.max / 2, 0]
    },
    colW() {
      return (this.W - this.padL) / Math.max(1, this.months.length)
    },
    barW() {
      return Math.min(22, this.colW * 0.3)
    },
    summary() {
      return this.months.map((m) => `${this.label(m.month, true)}: in ${this.money(m.income_net)}, out ${this.money(m.expenses_net)}`).join('; ')
    }
  },
  methods: {
    y(v) {
      const h = this.H - this.padB - 8
      return 8 + h - (Math.max(0, v) / this.max) * h
    },
    barH(v) {
      if (v <= 0) return 0
      return Math.max(2, this.H - this.padB - this.y(v))
    },
    colX(i) {
      return this.padL + i * this.colW
    },
    money(v, compact) {
      return fmtMinor(v, this.currency, { compact, whole: compact })
    },
    label(m, long) {
      return monthLabel(m, long)
    }
  }
}
</script>

<style scoped>
.legend {
  display: flex;
  gap: 14px;
  font-size: 12.5px;
  color: var(--text-3);
  margin-bottom: 10px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.sw-in {
  background: var(--accent);
}

.sw-out {
  background: var(--info);
  opacity: 0.55;
}

.plot {
  position: relative;
  height: 240px;
  padding-bottom: 22px;
}

.svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.grid line {
  stroke: var(--border);
  stroke-dasharray: 3 4;
  vector-effect: non-scaling-stroke;
}

.bar-in {
  fill: var(--accent);
}

.bar-out {
  fill: var(--info);
  opacity: 0.55;
}

.hover-bg {
  fill: var(--surface-hover);
}

.hit {
  fill: transparent;
  cursor: default;
}

.ylabels {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 22px;
  width: 56px;
  pointer-events: none;
}

.ylabels span {
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  background: var(--surface);
  padding-right: 4px;
}

.xlabels {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  height: 22px;
  align-items: flex-end;
}

.xlabels span {
  flex: 1;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-3);
}

.tip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  background: var(--text);
  color: var(--bg);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 5;
  pointer-events: none;
  box-shadow: var(--shadow-lg);
  font-variant-numeric: tabular-nums;
}

.tip span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tip-profit {
  margin-top: 2px;
  opacity: 0.8;
}
</style>
