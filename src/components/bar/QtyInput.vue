<template>
  <div class="qi">
    <div class="qi__row">
      <input
        class="ui-input qi__num"
        type="number"
        :min="0"
        :step="unit === 'ml' ? 1 : unit === 'tot' ? 1 : 0.1"
        inputmode="decimal"
        :value="qty"
        :aria-label="label"
        :data-testid="testid ? testid + '-qty' : undefined"
        @input="$emit('update:qty', $event.target.value === '' ? '' : Number($event.target.value))"
        @focus="$event.target.select()"
      />
      <select class="ui-select qi__unit" :value="unit" :aria-label="label + ' unit'" :data-testid="testid ? testid + '-unit' : undefined" @change="$emit('update:unit', $event.target.value)">
        <option v-for="u in units" :key="u.key" :value="u.key">{{ u.label }}</option>
      </select>
    </div>
    <small v-if="item && showPreview && Number(qty) > 0" class="qi__eq">= {{ preview }}</small>
  </div>
</template>

<script>
import { inputUnits, toBase, qtyText, isMl, tots, fmtNum } from '@/utils/barUnits'

// A quantity in ml / tots / bottles / units / cases with a live "= 1 bottle + 250 ml" preview.
export default {
  name: 'QtyInput',
  props: {
    qty: { type: [Number, String], default: '' },
    unit: { type: String, default: 'unit' },
    item: { type: Object, default: null },
    totMl: { type: Number, default: 25 },
    label: { type: String, default: 'Quantity' },
    allowed: { type: Array, default: null },
    showPreview: { type: Boolean, default: true },
    testid: { type: String, default: '' }
  },
  emits: ['update:qty', 'update:unit'],
  computed: {
    units() {
      const all = inputUnits(this.item)
      return this.allowed ? all.filter((u) => this.allowed.includes(u.key)) : all
    },
    base() {
      return toBase(this.qty, this.unit, this.item, this.totMl)
    },
    preview() {
      const t = qtyText(this.base, this.item)
      if (isMl(this.item) && this.unit !== 'tot') return `${t} · ${fmtNum(tots(this.base, this.item, this.totMl), 1)} tots`
      return t
    }
  },
  watch: {
    units: {
      immediate: true,
      handler(u) {
        if (u.length && !u.some((x) => x.key === this.unit)) this.$emit('update:unit', u[0].key)
      }
    }
  }
}
</script>

<style scoped>
.qi {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.qi__row {
  display: flex;
  gap: 6px;
}
.qi__num {
  flex: 1 1 80px;
  min-width: 64px;
  font-variant-numeric: tabular-nums;
}
.qi__unit {
  flex: 0 1 120px;
  min-width: 86px;
}
.qi__eq {
  color: var(--text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
</style>
