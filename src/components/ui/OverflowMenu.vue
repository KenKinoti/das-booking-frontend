<template>
  <div class="ui-overflow" ref="root">
    <button
      type="button"
      class="ui-btn ui-btn--icon"
      :class="btnClass"
      :aria-label="label"
      :title="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <i class="fa-solid fa-ellipsis"></i>
    </button>
    <transition name="ui-ov">
      <div v-if="open" class="ui-overflow__menu" role="menu" :aria-label="label" @keydown.esc="close">
        <template v-for="(it, i) in visibleItems" :key="i">
          <div v-if="it.divider" class="ui-overflow__sep" role="separator"></div>
          <router-link v-else-if="it.to" :to="it.to" class="ui-overflow__item" :class="{ 'is-danger': it.danger }" role="menuitem" @click="close">
            <i v-if="it.icon" :class="it.icon"></i>{{ it.label }}
          </router-link>
          <button v-else type="button" class="ui-overflow__item" :class="{ 'is-danger': it.danger }" role="menuitem" :disabled="it.disabled" @click="select(it)">
            <i v-if="it.icon" :class="it.icon"></i>{{ it.label }}
          </button>
        </template>
        <slot :close="close" />
      </div>
    </transition>
  </div>
</template>

<script>
/**
 * ⋯ menu for secondary actions (page headers, rows, cards).
 * <OverflowMenu :items="[{ label: 'Export CSV', icon: 'fa-solid fa-download', onClick: exportCsv }, { divider: true }, { label: 'Delete', danger: true, onClick: remove }]" />
 * Items: label, icon, onClick | to, danger, disabled, hidden, divider.
 * Opens as a bottom sheet on phones.
 */
export default {
  name: 'OverflowMenu',
  props: {
    items: { type: Array, default: () => [] },
    label: { type: String, default: 'More actions' },
    btnClass: { type: [String, Array, Object], default: '' }
  },
  data() {
    return { open: false }
  },
  computed: {
    visibleItems() {
      return this.items.filter((i) => i && !i.hidden)
    }
  },
  watch: {
    open(v) {
      if (v) {
        document.addEventListener('pointerdown', this.onDoc, true)
        document.addEventListener('keydown', this.onKey)
        this.$nextTick(() => this.$el.querySelector('.ui-overflow__item:not(:disabled)')?.focus({ preventScroll: true }))
      } else {
        document.removeEventListener('pointerdown', this.onDoc, true)
        document.removeEventListener('keydown', this.onKey)
      }
    },
    '$route.fullPath'() {
      this.open = false
    }
  },
  beforeUnmount() {
    document.removeEventListener('pointerdown', this.onDoc, true)
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    close() {
      this.open = false
    },
    select(it) {
      this.open = false
      if (typeof it.onClick === 'function') it.onClick()
    },
    onDoc(e) {
      if (!this.$refs.root?.contains(e.target)) this.open = false
    },
    onKey(e) {
      if (e.key === 'Escape') this.open = false
    }
  }
}
</script>

<style>
.ui-overflow__sep {
  height: 1px;
  margin: 6px 4px;
  background: var(--border);
}

.ui-ov-enter-active,
.ui-ov-leave-active {
  transition: opacity 0.14s, transform 0.16s var(--ease);
}

.ui-ov-enter-from,
.ui-ov-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
