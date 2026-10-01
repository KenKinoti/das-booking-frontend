<template>
  <div class="rec-fields">
    <label class="ui-field">
      <span class="ui-label">Repeat</span>
      <select class="ui-select" :value="modelValue.frequency" data-testid="rec-frequency" @change="set('frequency', $event.target.value)">
        <option v-if="allowNone" value="">Does not repeat</option>
        <option v-for="f in frequencies" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </label>
    <template v-if="modelValue.frequency">
      <label v-if="modelValue.frequency === 'custom'" class="ui-field">
        <span class="ui-label">Every</span>
        <div class="inline">
          <input class="ui-input num" type="number" min="1" max="60" :value="modelValue.interval" aria-label="Every how many months" @input="set('interval', toInt($event.target.value))" />
          <span class="muted">months</span>
        </div>
      </label>
      <label v-if="showStart" class="ui-field">
        <span class="ui-label">First bill date</span>
        <input class="ui-input" type="date" :value="modelValue.start_date" data-testid="rec-start" @input="set('start_date', $event.target.value)" />
      </label>
      <label class="ui-field">
        <span class="ui-label">Ends</span>
        <select class="ui-select" :value="modelValue.end_mode" aria-label="Ends" @change="set('end_mode', $event.target.value)">
          <option value="never">Never</option>
          <option value="after">After a number of bills</option>
          <option value="on">On a date</option>
        </select>
      </label>
      <label v-if="modelValue.end_mode === 'after'" class="ui-field">
        <span class="ui-label">Number of bills</span>
        <input class="ui-input num" type="number" min="1" max="1000" :value="modelValue.end_after" aria-label="Number of bills" @input="set('end_after', toInt($event.target.value))" />
      </label>
      <label v-if="modelValue.end_mode === 'on'" class="ui-field">
        <span class="ui-label">Last bill on or before</span>
        <input class="ui-input" type="date" :value="modelValue.end_date" aria-label="End date" @input="set('end_date', $event.target.value)" />
      </label>
      <label v-if="modelValue.mode !== 'track'" class="ui-field">
        <span class="ui-label">Create the next bill as</span>
        <select class="ui-select" :value="modelValue.create_as" data-testid="rec-create-as" @change="set('create_as', $event.target.value)">
          <option value="draft">Draft — I'll check and approve it</option>
          <option value="approved">Approved — ready to pay</option>
        </select>
      </label>
      <label class="ui-field">
        <span class="ui-label">Payment</span>
        <select class="ui-select" :value="modelValue.auto_pay ? 'auto' : 'manual'" data-testid="rec-autopay" @change="set('auto_pay', $event.target.value === 'auto')">
          <option value="manual">Needs manual payment</option>
          <option value="auto">Paid automatically by card / direct debit</option>
        </select>
      </label>
      <p v-if="summary" class="ui-hint rec-summary"><i class="fa-solid fa-repeat"></i> {{ summary }}</p>
    </template>
  </div>
</template>

<script>
import { FREQUENCIES } from '@/services/recurringBills'
import { formatDate } from '@/utils/format'

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default {
  name: 'RecurrenceFields',
  props: {
    modelValue: { type: Object, required: true },
    allowNone: { type: Boolean, default: false },
    showStart: { type: Boolean, default: true },
    startDate: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  computed: {
    frequencies() {
      return FREQUENCIES
    },
    summary() {
      const m = this.modelValue
      const start = m.start_date || this.startDate
      if (!m.frequency || !start) return ''
      const d = new Date(`${start}T00:00:00`)
      if (Number.isNaN(d.getTime())) return ''
      const day = ordinal(d.getDate())
      let s = ''
      switch (m.frequency) {
        case 'weekly':
          s = `Every ${d.toLocaleDateString(undefined, { weekday: 'long' })}`
          break
        case 'monthly':
          s = `Monthly on the ${day}`
          break
        case 'quarterly':
          s = `Every 3 months on the ${day}`
          break
        case 'yearly':
          s = `Every year on ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`
          break
        case 'custom':
          s = Number(m.interval) > 1 ? `Every ${m.interval} months on the ${day}` : `Monthly on the ${day}`
      }
      if (d.getDate() > 28 && m.frequency !== 'weekly') s += ' (or the last day of shorter months)'
      if (m.end_mode === 'after' && m.end_after) s += `, ${m.end_after} bill${m.end_after === 1 ? '' : 's'}`
      if (m.end_mode === 'on' && m.end_date) s += `, until ${formatDate(m.end_date)}`
      return s
    }
  },
  methods: {
    toInt(v) {
      const n = parseInt(v, 10)
      return Number.isNaN(n) ? '' : n
    },
    set(k, v) {
      const next = { ...this.modelValue, [k]: v }
      if (k === 'frequency' && v === 'custom' && !next.interval) next.interval = 2
      if (k === 'end_mode' && v === 'after' && !next.end_after) next.end_after = 12
      this.$emit('update:modelValue', next)
    }
  }
}
</script>

<style scoped>
.rec-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px 14px;
  align-items: start;
}
.inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.inline .ui-input {
  width: 90px;
}
.muted {
  color: var(--text-3);
  font-size: 13px;
}
.num {
  font-variant-numeric: tabular-nums;
}
.rec-summary {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-2);
}
.rec-summary i {
  color: var(--accent);
  margin-right: 4px;
}
</style>
