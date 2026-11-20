<template>
  <!-- Score matrix as a heat-table: rows = home goals, columns = away goals, one-hue ramp (more = darker).
       Values ≥ 1% are printed; the rest are in the tooltip and the cell's label. -->
  <div ref="root" class="fbh">
    <table class="fbh__t" :aria-label="ariaLabel">
      <caption class="fbh__cap">
        <span class="fbh__axis-x">{{ away }} goals →</span>
      </caption>
      <thead>
        <tr>
          <th class="fbh__corner" scope="col"><span class="fbh__axis-y">{{ homeShort }} ↓</span></th>
          <th v-for="(c, j) in cols" :key="'c' + j" scope="col" class="fbh__h">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in matrix" :key="'r' + i">
          <th scope="row" class="fbh__h">{{ cols[i] }}</th>
          <td
            v-for="(p, j) in row"
            :key="j"
            class="fbh__c"
            :class="{ 'is-dark': alpha(p) > 0.55, 'is-top': isTop(i, j) }"
            :style="{ background: `rgba(var(--fb-heat), ${alpha(p).toFixed(3)})` }"
            :data-h="i"
            :data-a="j"
            :data-p="Number(p).toFixed(6)"
            :aria-label="`${home} ${cols[i]}, ${away} ${cols[j]}: ${pctTxt(p)}`"
            @pointerenter="onEnter($event, i, j, p)"
            @pointermove="onEnter($event, i, j, p)"
            @pointerleave="tip = null"
          >
            <span v-if="p >= 0.01">{{ (p * 100).toFixed(p >= 0.1 ? 0 : 1) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="fbh__scale" aria-hidden="true">
      <span>0%</span>
      <i class="fbh__ramp"></i>
      <span>{{ pctTxt(maxP, 0) }}</span>
      <span class="fbh__note">Numbers are % · {{ lastLabel }} includes more goals</span>
    </div>
    <div v-if="tip" class="fb-tip" :style="tip.style" role="status">
      <div class="fb-tip__title">{{ tip.title }}</div>
      <div class="fb-tip__row"><span>Probability</span><strong>{{ tip.p }}</strong></div>
      <div class="fb-tip__row"><span>Fair odds</span><strong>{{ tip.o }}</strong></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FbHeatmap',
  props: {
    matrix: { type: Array, default: () => [] },
    home: { type: String, default: 'Home' },
    away: { type: String, default: 'Away' },
    top: { type: Array, default: () => [] } // [{ h, a }]
  },
  data() {
    return { tip: null }
  },
  computed: {
    n() {
      return this.matrix.length
    },
    cols() {
      return Array.from({ length: this.n }, (_, i) => (i === this.n - 1 ? `${i}+` : String(i)))
    },
    lastLabel() {
      return this.n ? `${this.n - 1}+` : ''
    },
    maxP() {
      let m = 0
      for (const r of this.matrix) for (const p of r) m = Math.max(m, Number(p) || 0)
      return m || 1
    },
    homeShort() {
      return this.home.length > 14 ? this.home.split(' ')[0] : this.home
    },
    ariaLabel() {
      return `Score probabilities: rows are ${this.home} goals, columns ${this.away} goals`
    }
  },
  methods: {
    alpha(p) {
      return 0.04 + 0.96 * Math.min(1, (Number(p) || 0) / this.maxP)
    },
    isTop(i, j) {
      return this.top.some((t) => t.h === i && t.a === j)
    },
    pctTxt(p, d = 1) {
      return `${((Number(p) || 0) * 100).toFixed(d)}%`
    },
    onEnter(e, i, j, p) {
      const rect = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - rect.left
      const right = px > rect.width / 2
      this.tip = {
        title: `${this.home} ${this.cols[i]} – ${this.cols[j]} ${this.away}`,
        p: this.pctTxt(p, 2),
        o: p > 0 ? (1 / p).toFixed(p > 0.02 ? 1 : 0) : '—',
        style: { left: (right ? px - 12 : px + 12) + 'px', top: e.clientY - rect.top + 14 + 'px', transform: right ? 'translateX(-100%)' : 'none' }
      }
    }
  }
}
</script>

<style scoped>
.fbh {
  position: relative;
  max-width: 460px;
}
.fbh__t {
  border-collapse: separate;
  border-spacing: 2px;
  width: 100%;
  table-layout: fixed;
}
.fbh__cap {
  caption-side: top;
  text-align: right;
  font-size: 11.5px;
  color: var(--text-3);
  padding: 0 2px 2px;
}
.fbh__corner {
  width: 44px;
  text-align: left;
  vertical-align: bottom;
}
.fbh__axis-y {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
  white-space: nowrap;
}
.fbh__h {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-3);
  text-align: center;
  padding: 2px;
}
tbody .fbh__h {
  text-align: left;
  padding-left: 4px;
}
.fbh__c {
  height: 38px;
  border-radius: 4px;
  text-align: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  cursor: default;
}
.fbh__c.is-dark {
  color: #fff;
}
.fbh__c:hover {
  box-shadow: inset 0 0 0 2px var(--text);
}
.fbh__scale {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 8px;
}
.fbh__ramp {
  display: inline-block;
  width: 90px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--fb-heat), 0.04), rgba(var(--fb-heat), 1));
}
.fbh__note {
  margin-left: auto;
}
@media (max-width: 420px) {
  .fbh__c {
    height: 32px;
    font-size: 10.5px;
  }
  .fbh__corner {
    width: 36px;
  }
}
</style>
