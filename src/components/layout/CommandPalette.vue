<template>
  <transition name="cp">
    <div v-if="open" class="cp-backdrop" @mousedown.self="close">
      <div class="cp" role="dialog" aria-modal="true" aria-label="Search">
        <div class="cp__input">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            ref="input"
            v-model="query"
            placeholder="Search pages and actions…"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="choose(results[index])"
            @keydown.esc="close"
          />
          <kbd>Esc</kbd>
        </div>
        <div class="cp__list" ref="list">
          <template v-if="results.length">
            <button
              v-for="(r, i) in results"
              :key="r.key"
              class="cp__row"
              :class="{ 'is-active': i === index }"
              @mouseenter="index = i"
              @click="choose(r)"
            >
              <span class="cp__icon"><i :class="r.icon"></i></span>
              <span class="cp__label">{{ r.label }}</span>
              <span class="cp__group">{{ r.group }}</span>
            </button>
          </template>
          <div v-else class="cp__empty">No matches for “{{ query }}”</div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { visibleGroups } from '@/navigation'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'CommandPalette',
  props: { open: Boolean },
  emits: ['close'],
  data() {
    return { query: '', index: 0 }
  },
  computed: {
    entries() {
      const actions = [
        { key: 'a-inv', label: 'Create invoice', to: '/invoices/new', icon: 'fa-solid fa-plus', group: 'Action' },
        { key: 'a-quo', label: 'Create quote', to: '/quotes/new', icon: 'fa-solid fa-plus', group: 'Action' }
      ]
      const pages = visibleGroups(useAuthStore().isSuperAdmin).flatMap((g) =>
        g.items.map((i) => ({ key: i.to, label: i.label, to: i.to, icon: i.icon, group: g.label }))
      )
      return [...actions, ...pages]
    },
    results() {
      const q = this.query.trim().toLowerCase()
      if (!q) return this.entries
      return this.entries
        .map((e) => {
          const hay = `${e.label} ${e.group}`.toLowerCase()
          const idx = hay.indexOf(q)
          let score = idx === -1 ? -1 : 100 - idx
          if (score < 0) {
            // fuzzy: all characters in order
            let p = 0
            for (const ch of hay) if (ch === q[p]) p++
            score = p === q.length ? 10 : -1
          }
          return { ...e, score }
        })
        .filter((e) => e.score >= 0)
        .sort((a, b) => b.score - a.score)
    }
  },
  watch: {
    open(v) {
      if (v) {
        this.query = ''
        this.index = 0
        this.$nextTick(() => this.$refs.input?.focus())
      }
    },
    query() {
      this.index = 0
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    move(d) {
      const n = this.results.length
      if (!n) return
      this.index = (this.index + d + n) % n
      this.$nextTick(() => this.$refs.list?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }))
    },
    choose(r) {
      if (!r) return
      this.$router.push(r.to)
      this.close()
    }
  }
}
</script>

<style scoped>
.cp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(10, 12, 24, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 12vh 16px 16px;
}

.cp {
  width: 100%;
  max-width: 600px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.cp__input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  color: var(--text-3);
}

.cp__input input {
  flex: 1;
  height: 56px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 16px;
}

.cp__input kbd {
  font-family: var(--font-sans);
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-3);
  background: var(--surface-2);
}

.cp__list {
  max-height: 55vh;
  overflow-y: auto;
  padding: 8px;
}

.cp__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.cp__row.is-active {
  background: var(--accent-soft);
}

.cp__icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 12.5px;
}

.cp__row.is-active .cp__icon {
  color: var(--accent);
  border-color: transparent;
  background: var(--surface);
}

.cp__label {
  flex: 1;
  font-weight: 550;
}

.cp__group {
  font-size: 12px;
  color: var(--text-3);
}

.cp__empty {
  padding: 32px;
  text-align: center;
  color: var(--text-3);
}

.cp-enter-active,
.cp-leave-active {
  transition: opacity 0.15s;
}

.cp-enter-active .cp,
.cp-leave-active .cp {
  transition: transform 0.18s var(--ease);
}

.cp-enter-from,
.cp-leave-to {
  opacity: 0;
}

.cp-enter-from .cp,
.cp-leave-to .cp {
  transform: translateY(-8px) scale(0.98);
}
</style>
