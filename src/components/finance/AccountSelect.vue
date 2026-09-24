<template>
  <select class="ui-select" :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)">
    <option value="">{{ placeholder }}</option>
    <optgroup v-for="g in groups" :key="g.value" :label="g.label">
      <option v-for="a in g.accounts" :key="a.id" :value="a.id">{{ a.code }} · {{ a.name }}</option>
    </optgroup>
  </select>
</template>

<script>
import { groupAccounts } from '@/services/finance'

export default {
  name: 'AccountSelect',
  props: {
    modelValue: { type: String, default: '' },
    accounts: { type: Array, default: () => [] },
    types: { type: Array, default: null },
    exclude: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Select account…' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  computed: {
    groups() {
      const list = this.accounts.filter((a) => (a.is_active || a.id === this.modelValue) && !this.exclude.includes(a.id))
      return groupAccounts(list, { types: this.types })
    }
  }
}
</script>
