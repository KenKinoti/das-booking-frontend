<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="sd-backdrop" @mousedown.self="$emit('close')">
        <aside class="sd" :style="{ maxWidth: width }" role="dialog" aria-modal="true" :aria-label="title">
          <header class="sd__head">
            <div class="sd__title">
              <slot name="title">
                <h2>{{ title }}</h2>
                <p v-if="subtitle">{{ subtitle }}</p>
              </slot>
            </div>
            <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
          </header>
          <div v-if="$slots.actions" class="sd__actions"><slot name="actions" /></div>
          <div class="sd__body"><slot /></div>
          <footer v-if="$slots.footer" class="sd__foot"><slot name="footer" /></footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'SideDrawer',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    width: { type: String, default: '560px' }
  },
  emits: ['close'],
  watch: {
    open: {
      immediate: true,
      handler(v) {
        if (v) document.addEventListener('keydown', this.onKey)
        else document.removeEventListener('keydown', this.onKey)
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      // Let modals opened on top of the drawer handle Escape first.
      if (e.key === 'Escape' && !document.querySelector('.ui-modal-backdrop')) this.$emit('close')
    }
  }
}
</script>

<style scoped>
.sd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(10, 12, 24, 0.42);
  display: flex;
  justify-content: flex-end;
}

.sd {
  width: 100%;
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sd__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 14px;
}

.sd__title {
  min-width: 0;
}

.sd__title :deep(h2) {
  margin: 0;
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text);
}

.sd__title :deep(p) {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.sd__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 22px 14px;
  border-bottom: 1px solid var(--border);
}

.sd__body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px 28px;
}

.sd__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: background-color 0.2s ease;
}
.drawer-enter-active .sd,
.drawer-leave-active .sd {
  transition: transform 0.24s var(--ease);
}
.drawer-enter-from,
.drawer-leave-to {
  background-color: transparent;
}
.drawer-enter-from .sd,
.drawer-leave-to .sd {
  transform: translateX(100%);
}

@media (max-width: 600px) {
  .sd__head {
    padding: 16px 16px 12px;
  }
  .sd__actions,
  .sd__body {
    padding-left: 16px;
    padding-right: 16px;
  }
  .sd__foot {
    padding: 12px 16px;
  }
}
</style>
