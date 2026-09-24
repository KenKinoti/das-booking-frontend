<template>
  <div class="pp">
    <div class="ui-tabs pp__tabs" role="tablist" aria-label="Date range">
      <button
        v-for="p in periods"
        :key="p.value"
        type="button"
        class="ui-tab"
        :class="{ 'is-active': modelValue.range === p.value }"
        :title="p.long"
        :aria-selected="modelValue.range === p.value"
        @click="pick(p.value)"
      >
        {{ p.label }}
      </button>
    </div>
    <div v-if="modelValue.range === 'custom'" class="pp__custom">
      <input type="date" class="ui-input ui-input--sm" :value="from" :max="to || today" aria-label="From" @change="setFrom($event.target.value)" />
      <span class="pp__dash">–</span>
      <input type="date" class="ui-input ui-input--sm" :value="to" :min="from" :max="today" aria-label="To" @change="setTo($event.target.value)" />
    </div>
    <label v-if="showCompare" class="ui-switch pp__cmp" title="Compare with the previous period of the same length">
      <input type="checkbox" :checked="modelValue.compare" @change="emitChange({ compare: $event.target.checked })" />
      <span>Compare</span>
    </label>
  </div>
</template>

<script>
import { PERIODS } from './analytics'
import { isoDate, addDays } from '@/utils/format'

export default {
  name: 'PeriodPicker',
  props: {
    // { range, from, to, compare }
    modelValue: { type: Object, required: true },
    showCompare: { type: Boolean, default: true }
  },
  emits: ['update:modelValue'],
  computed: {
    periods() {
      return PERIODS
    },
    today() {
      return isoDate(new Date())
    },
    from() {
      return this.modelValue.from || addDays(this.today, -29)
    },
    to() {
      return this.modelValue.to || this.today
    }
  },
  methods: {
    emitChange(patch) {
      this.$emit('update:modelValue', { ...this.modelValue, ...patch })
    },
    pick(range) {
      if (range === 'custom') {
        this.emitChange({ range, from: this.from, to: this.to })
      } else {
        this.emitChange({ range })
      }
    },
    setFrom(v) {
      if (!v) return
      this.emitChange({ from: v, to: v > this.to ? v : this.to })
    },
    setTo(v) {
      if (!v) return
      this.emitChange({ to: v, from: v < this.from ? v : this.from })
    }
  }
}
</script>

<style scoped>
.pp {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pp__tabs {
  flex-wrap: nowrap;
}

.pp__custom {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pp__custom .ui-input {
  width: 150px;
  height: 36px;
}

.pp__dash {
  color: var(--text-3);
}

.pp__cmp {
  font-size: 13px;
  font-weight: 550;
}
</style>
