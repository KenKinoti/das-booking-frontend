<template>
  <div ref="root" class="how">
    <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :aria-expanded="open" aria-haspopup="dialog" @click="open = !open">
      <i class="fa-regular fa-circle-question"></i> How is this calculated?
    </button>
    <div v-if="open" class="how__pop" role="dialog" aria-label="How profit and loss is calculated">
      <div class="how__head">
        <strong>How your profit is calculated</strong>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" @click="open = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <p class="how__formula">Revenue − Cost of sales = <b>Gross profit</b> − Operating expenses = <b>Net profit</b></p>
      <ul>
        <li v-for="(r, i) in rules" :key="i">{{ r }}</li>
      </ul>
      <template v-if="excluded && excluded.length">
        <strong class="how__sub">Left out this period (counted once, or not profit)</strong>
        <ul class="how__ex">
          <li v-for="e in excluded" :key="e.key">
            <span>{{ e.label }}</span>
            <b>{{ e.count }} · {{ money(e.amount) }}</b>
          </li>
        </ul>
      </template>
      <router-link v-if="reportLink" :to="reportLink" class="how__more" @click="open = false">Open the full statement <i class="fa-solid fa-arrow-right"></i></router-link>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { pnlMoney } from '@/services/pnl'

export default {
  name: 'PnlHow',
  props: {
    rules: { type: Array, default: () => [] },
    excluded: { type: Array, default: () => [] },
    currency: { type: String, default: () => orgCurrency() },
    reportLink: { type: String, default: '' }
  },
  data() {
    return { open: false }
  },
  mounted() {
    document.addEventListener('mousedown', this.outside)
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('mousedown', this.outside)
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    money(v) {
      return pnlMoney(v, this.currency)
    },
    outside(e) {
      if (this.open && this.$refs.root && !this.$refs.root.contains(e.target)) this.open = false
    },
    onKey(e) {
      if (e.key === 'Escape') this.open = false
    }
  }
}
</script>

<style scoped>
.how {
  position: relative;
}

.how__pop {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 40;
  width: min(460px, calc(100vw - 32px));
  max-height: min(70vh, 560px);
  overflow: auto;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  color: var(--text);
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
}

.how__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.how__formula {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  color: var(--text-2);
}

ul {
  margin: 0 0 10px;
  padding-left: 18px;
  color: var(--text-2);
}

li {
  margin-bottom: 5px;
}

.how__sub {
  display: block;
  margin: 4px 0 6px;
}

.how__ex {
  list-style: none;
  padding: 0;
}

.how__ex li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
}

.how__ex b {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.how__more {
  font-weight: 600;
}

@media (max-width: 520px) {
  .how__pop {
    position: fixed;
    left: 16px;
    right: 16px;
    top: 90px;
    width: auto;
  }
}
</style>
