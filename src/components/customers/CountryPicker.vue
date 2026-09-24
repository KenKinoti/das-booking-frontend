<template>
  <div class="cp" ref="root" @keydown.esc.stop="close">
    <button
      :id="id"
      type="button"
      class="ui-input cp__btn"
      :class="{ 'is-placeholder': !modelValue, 'is-invalid': invalid }"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
      @keydown.down.prevent="openList"
    >
      <span v-if="modelValue" class="cp__flag" aria-hidden="true">{{ flag(modelValue) }}</span>
      <span class="cp__label">{{ modelValue ? name(modelValue) || modelValue : placeholder }}</span>
      <i class="fa-solid fa-chevron-down cp__chev" aria-hidden="true"></i>
    </button>
    <div v-if="open" class="cp__pop" :class="{ 'cp__pop--up': up, 'cp__pop--right': alignRight }" role="dialog" aria-label="Choose a country">
      <div class="ui-input-group cp__search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          ref="search"
          v-model="q"
          class="ui-input"
          placeholder="Search countries"
          aria-label="Search countries"
          autocomplete="off"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="pickActive"
        />
      </div>
      <ul class="cp__list" role="listbox" ref="list">
        <li v-if="clearable && !q" role="option" :aria-selected="!modelValue" class="cp__opt cp__opt--none" @mousedown.prevent="pick('')">No country</li>
        <li
          v-for="(c, i) in matches"
          :key="c.code"
          role="option"
          :aria-selected="c.code === modelValue"
          class="cp__opt"
          :class="{ 'is-active': i === active, 'is-selected': c.code === modelValue }"
          :data-code="c.code"
          @mousemove="active = i"
          @mousedown.prevent="pick(c.code)"
        >
          <span class="cp__flag" aria-hidden="true">{{ flag(c.code) }}</span>
          <span class="cp__name">{{ c.name }}</span>
          <span v-if="showCurrency && currency(c.code)" class="cp__cur">{{ currency(c.code) }}</span>
          <i v-if="c.code === modelValue" class="fa-solid fa-check cp__tick"></i>
        </li>
        <li v-if="!matches.length" class="cp__empty">No country matches “{{ q }}”</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { COUNTRIES, countryFlag, countryName, currencyForCountry } from '@/utils/currencies'

// Countries people pick most often float to the top when not searching.
const PINNED = ['AU', 'NZ', 'KE', 'US', 'GB']

export default {
  name: 'CountryPicker',
  props: {
    modelValue: { type: String, default: '' },
    id: { type: String, default: undefined },
    placeholder: { type: String, default: 'Select a country' },
    clearable: { type: Boolean, default: true },
    showCurrency: { type: Boolean, default: true },
    invalid: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return { open: false, q: '', active: 0, up: false, alignRight: false }
  },
  computed: {
    matches() {
      const q = this.q.trim().toLowerCase()
      if (!q) {
        const pinned = PINNED.map((code) => COUNTRIES.find((c) => c.code === code)).filter(Boolean)
        return [...pinned, ...COUNTRIES.filter((c) => !PINNED.includes(c.code))]
      }
      const starts = []
      const contains = []
      for (const c of COUNTRIES) {
        const n = c.name.toLowerCase()
        if (c.code.toLowerCase() === q || n.startsWith(q)) starts.push(c)
        else if (n.includes(q) || (currencyForCountry(c.code) || '').toLowerCase() === q) contains.push(c)
      }
      return [...starts, ...contains]
    }
  },
  watch: {
    q() {
      this.active = 0
    }
  },
  beforeUnmount() {
    document.removeEventListener('mousedown', this.onOutside)
  },
  methods: {
    flag: countryFlag,
    name: countryName,
    currency: currencyForCountry,
    toggle() {
      this.open ? this.close() : this.openList()
    },
    openList() {
      const rect = this.$refs.root.getBoundingClientRect()
      this.up = window.innerHeight - rect.bottom < 330 && rect.top > 330
      // Keep the list on screen when the field sits near the right edge.
      const box = this.$refs.root.closest('.ui-modal')?.getBoundingClientRect()
      const right = Math.min(window.innerWidth, box ? box.right : window.innerWidth) - 8
      this.alignRight = rect.left + Math.max(rect.width, 280) > right
      this.open = true
      this.q = ''
      const idx = this.matches.findIndex((c) => c.code === this.modelValue)
      this.active = idx >= 0 ? idx : 0
      document.addEventListener('mousedown', this.onOutside)
      this.$nextTick(() => {
        this.$refs.search?.focus()
        this.scrollActive()
      })
    },
    close() {
      this.open = false
      document.removeEventListener('mousedown', this.onOutside)
    },
    onOutside(e) {
      if (!this.$refs.root?.contains(e.target)) this.close()
    },
    move(d) {
      this.active = Math.max(0, Math.min(this.matches.length - 1, this.active + d))
      this.scrollActive()
    },
    scrollActive() {
      this.$nextTick(() => this.$refs.list?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }))
    },
    pickActive() {
      const c = this.matches[this.active]
      if (c) this.pick(c.code)
    },
    pick(code) {
      this.$emit('update:modelValue', code)
      this.$emit('change', code)
      this.close()
      this.$nextTick(() => this.$el.querySelector('.cp__btn')?.focus())
    }
  }
}
</script>

<style scoped>
.cp {
  position: relative;
}

.cp__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.cp__btn.is-placeholder .cp__label {
  color: var(--text-3);
}

.cp__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp__chev {
  font-size: 11px;
  color: var(--text-3);
}

.cp__flag {
  font-size: 16px;
  line-height: 1;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.cp__pop {
  position: absolute;
  z-index: 40;
  top: calc(100% + 4px);
  left: 0;
  width: max(100%, 280px);
  max-width: calc(100vw - 32px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 6px;
}

.cp__pop--right {
  left: auto;
  right: 0;
}

.cp__pop--up {
  top: auto;
  bottom: calc(100% + 4px);
}

.cp__search {
  margin-bottom: 6px;
}

.cp__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
}

.cp__opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--text);
}

.cp__opt.is-active {
  background: var(--surface-hover);
}

.cp__opt.is-selected {
  font-weight: 600;
}

.cp__opt--none {
  color: var(--text-3);
}

.cp__name {
  flex: 1;
  min-width: 0;
}

.cp__cur {
  font-size: 11.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.cp__tick {
  color: var(--accent);
  font-size: 12px;
}

.cp__empty {
  padding: 10px 8px;
  color: var(--text-3);
  font-size: 13px;
}
</style>
