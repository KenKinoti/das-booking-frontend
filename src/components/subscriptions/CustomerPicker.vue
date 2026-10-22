<template>
  <div class="cp" :class="{ open }">
    <div v-if="selected && !editing" class="cp__chosen">
      <span class="cp__avatar" aria-hidden="true">{{ initials(selected) }}</span>
      <span class="cp__main">
        <strong>{{ selected.name }}</strong>
        <small>{{ [selected.email, selected.currency].filter(Boolean).join(' · ') || 'No email address' }}</small>
      </span>
      <button v-if="!disabled" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-testid="cp-change" @click="startEdit">Change</button>
    </div>
    <div v-else class="ui-input-group">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input
        :id="id"
        ref="input"
        v-model="q"
        class="ui-input"
        type="search"
        autocomplete="off"
        :placeholder="placeholder"
        :disabled="disabled"
        aria-label="Search customers"
        data-testid="cp-search"
        @focus="open = true"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="pick(results[active])"
        @keydown.esc="close"
        @blur="onBlur"
      />
    </div>
    <ul v-if="open && (!selected || editing)" class="cp__list" role="listbox">
      <li v-if="loading" class="cp__hint"><i class="fa-solid fa-circle-notch fa-spin"></i> Searching…</li>
      <li v-else-if="!results.length" class="cp__hint">{{ q.trim() ? 'No customer matches — add them under Customers first.' : 'Type a name or email.' }}</li>
      <li
        v-for="(c, i) in results"
        :key="c.id"
        role="option"
        :aria-selected="i === active"
        class="cp__opt"
        :class="{ 'is-active': i === active }"
        :data-testid="`cp-opt-${c.id}`"
        @mousedown.prevent="pick(c)"
        @mouseenter="active = i"
      >
        <span class="cp__avatar" aria-hidden="true">{{ initials(c) }}</span>
        <span class="cp__main">
          <strong>{{ c.name }}</strong>
          <small>{{ [c.email, c.phone].filter(Boolean).join(' · ') }}</small>
        </span>
      </li>
    </ul>
  </div>
</template>

<script>
import api from '@/services/api'

function nameOf(c) {
  const person = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  const company = (c.company_name || '').trim()
  if (company && person && company.toLowerCase() !== person.toLowerCase()) return `${company} (${person})`
  return company || person || c.email || 'Customer'
}

export default {
  name: 'CustomerPicker',
  props: {
    modelValue: { type: String, default: '' },
    id: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: 'Search customers by name or email' },
    /** Shown before the customer loads (e.g. from a list row). */
    initialName: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'picked'],
  data() {
    return { q: '', results: [], loading: false, open: false, active: 0, selected: null, editing: false, timer: null, seq: 0 }
  },
  watch: {
    q() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.search(), 200)
    },
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) {
          this.selected = null
          return
        }
        if (this.selected?.id === v) return
        this.selected = { id: v, name: this.initialName || 'Loading…', email: '' }
        this.loadOne(v)
      }
    }
  },
  methods: {
    initials(c) {
      return (c.name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    },
    norm(c) {
      return { id: c.id, name: nameOf(c), email: c.email || '', phone: c.phone || '', currency: c.billing_currency || c.currency || '', terms: c.payment_terms_days ?? null }
    },
    async loadOne(id) {
      try {
        const r = await api.get(`/customers/${id}`)
        const c = r.data?.customer || r.data?.data || r.data
        if (c && c.id === this.modelValue) {
          this.selected = this.norm(c)
          this.$emit('picked', this.selected)
        }
      } catch {
        if (this.selected?.id === id && this.selected.name === 'Loading…') this.selected.name = this.initialName || 'Customer'
      }
    },
    async search() {
      const seq = ++this.seq
      this.loading = true
      try {
        const r = await api.get('/customers', { params: { search: this.q.trim(), limit: 20, status: 'active' } })
        if (seq !== this.seq) return
        this.results = (r.data?.customers || []).map(this.norm)
        this.active = 0
      } catch {
        if (seq === this.seq) this.results = []
      } finally {
        if (seq === this.seq) this.loading = false
      }
    },
    move(d) {
      if (!this.results.length) return
      this.open = true
      this.active = (this.active + d + this.results.length) % this.results.length
    },
    pick(c) {
      if (!c) return
      this.selected = c
      this.editing = false
      this.open = false
      this.q = ''
      this.$emit('update:modelValue', c.id)
      this.$emit('picked', c)
    },
    startEdit() {
      this.editing = true
      this.open = true
      this.search()
      this.$nextTick(() => this.$refs.input?.focus())
    },
    close() {
      this.open = false
      if (this.selected) this.editing = false
    },
    onBlur() {
      setTimeout(() => this.close(), 120)
    },
    focus() {
      if (!this.selected) this.$refs.input?.focus()
    }
  },
  mounted() {
    if (!this.modelValue) this.search()
  }
}
</script>

<style scoped>
.cp {
  position: relative;
}
.cp__chosen {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.cp__avatar {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}
.cp__main {
  min-width: 0;
  flex: 1;
}
.cp__main strong,
.cp__main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp__main small {
  color: var(--text-3);
  font-size: 12px;
}
.cp__list {
  position: absolute;
  z-index: 30;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  max-height: 260px;
  overflow: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}
.cp__opt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.cp__opt.is-active {
  background: var(--surface-hover);
}
.cp__hint {
  padding: 10px;
  color: var(--text-3);
  font-size: 13px;
}
</style>
