<template>
  <div ref="root" class="ip" :class="{ 'is-open': open }">
    <div class="ui-input-group">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input
        ref="input"
        v-model="q"
        class="ui-input"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        :aria-label="placeholder"
        :data-testid="testid || undefined"
        @focus="open = true"
        @input="open = true"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="pickActive"
        @keydown.esc="open = false"
      />
    </div>
    <ul v-if="open && (matches.length || q)" class="ip__list" role="listbox">
      <li v-if="!matches.length" class="ip__empty">No stock item matches “{{ q }}”</li>
      <li v-for="(it, i) in matches" :key="it.product_id" role="option" :aria-selected="i === active">
        <button type="button" :class="{ 'is-active': i === active }" :data-pick="it.name" @mousedown.prevent="pick(it)">
          <span class="ip__name">{{ it.name }}</span>
          <small>{{ catLabel(it.category) }}<template v-if="it.unit_size && it.base_unit === 'ml'"> · {{ it.unit_size }} ml {{ it.unit_label || 'bottle' }}</template><template v-if="showStock && it.on_hand !== undefined"> · {{ qtyText(it.on_hand, it) }}</template></small>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
import { categoryLabel, qtyText } from '@/utils/barUnits'

// Search-as-you-type picker over the bar's stock items (name, SKU, barcode).
export default {
  name: 'ItemPicker',
  props: {
    items: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Search stock items or scan a barcode' },
    exclude: { type: Array, default: () => [] },
    showStock: { type: Boolean, default: false },
    testid: { type: String, default: '' }
  },
  emits: ['pick'],
  data() {
    return { q: '', open: false, active: 0 }
  },
  computed: {
    matches() {
      const q = this.q.trim().toLowerCase()
      const ex = new Set(this.exclude)
      const list = this.items.filter((it) => !ex.has(it.product_id))
      const out = !q ? list : list.filter((it) => [it.name, it.sku, it.barcode].some((v) => v && String(v).toLowerCase().includes(q)))
      return out.slice(0, 30)
    }
  },
  watch: {
    q() {
      this.active = 0
    }
  },
  mounted() {
    document.addEventListener('mousedown', this.onDoc)
  },
  beforeUnmount() {
    document.removeEventListener('mousedown', this.onDoc)
  },
  methods: {
    qtyText,
    catLabel: categoryLabel,
    onDoc(e) {
      if (this.$refs.root && !this.$refs.root.contains(e.target)) this.open = false
    },
    move(d) {
      if (!this.matches.length) return
      this.open = true
      this.active = (this.active + d + this.matches.length) % this.matches.length
    },
    pickActive() {
      const q = this.q.trim().toLowerCase()
      const exact = q && this.items.find((it) => [it.barcode, it.sku].some((v) => v && String(v).toLowerCase() === q))
      const it = exact || this.matches[this.active]
      if (it) this.pick(it)
    },
    pick(it) {
      this.$emit('pick', it)
      this.q = ''
      this.open = false
    },
    focus() {
      this.$refs.input?.focus()
    }
  }
}
</script>

<style scoped>
.ip {
  position: relative;
}
.ip__list {
  position: absolute;
  z-index: 30;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  margin: 0;
  padding: 4px;
  list-style: none;
  max-height: 280px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}
.ip__list button {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font: inherit;
  cursor: pointer;
}
.ip__list button:hover,
.ip__list button.is-active {
  background: var(--surface-hover);
}
.ip__name {
  font-weight: 600;
  font-size: 14px;
}
.ip__list small {
  color: var(--text-3);
  font-size: 12px;
}
.ip__empty {
  padding: 10px;
  color: var(--text-3);
  font-size: 13px;
}
</style>
