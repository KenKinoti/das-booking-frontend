<template>
  <!-- On body: a drawer opened from the URL must not be caught in the page's enter transition -->
  <Teleport to="body">
  <div class="bd-backdrop bar-ui" @mousedown.self="$emit('close')">
    <aside class="bd" :style="{ '--bd-w': width }" role="dialog" aria-modal="true" :aria-label="title" :data-testid="testid || undefined" @keydown.esc="$emit('close')">
      <header class="bd__head">
        <div class="bd__title">
          <div v-if="eyebrow" class="ui-eyebrow">{{ eyebrow }}</div>
          <h2>{{ title }}</h2>
          <div v-if="$slots.sub" class="bd__sub"><slot name="sub" /></div>
        </div>
        <div class="bd__actions">
          <slot name="actions" />
          <button ref="close" type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>
      <div class="bd__body"><slot /></div>
      <footer v-if="$slots.foot" class="bd__foot"><slot name="foot" /></footer>
    </aside>
  </div>
  </Teleport>
</template>

<script>
// Side drawer used across the bar stock pages (details next to the list).
export default {
  name: 'BarDrawer',
  props: {
    title: { type: String, default: '' },
    eyebrow: { type: String, default: '' },
    width: { type: String, default: '640px' },
    testid: { type: String, default: '' }
  },
  emits: ['close'],
  mounted() {
    document.documentElement.classList.add('has-drawer-open')
    this.$nextTick(() => this.$refs.close?.focus({ preventScroll: true }))
  },
  beforeUnmount() {
    document.documentElement.classList.remove('has-drawer-open')
  }
}
</script>

<style scoped>
.bd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1900;
  background: rgba(10, 12, 24, 0.45);
  display: flex;
  justify-content: flex-end;
  animation: ui-fade 0.15s ease-out;
}
.bd {
  width: min(var(--bd-w), 100vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: bd-slide 0.18s var(--ease);
}
@keyframes bd-slide {
  from {
    transform: translateX(24px);
    opacity: 0.6;
  }
}
.bd__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}
.bd__title {
  min-width: 0;
}
.bd__head h2 {
  margin: 2px 0 2px;
  font-size: 19px;
  overflow-wrap: anywhere;
}
.bd__sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  font-size: 13px;
  color: var(--text-3);
}
.bd__actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}
.bd__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bd__foot {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface);
}
@media (max-width: 640px) {
  .bd__head {
    padding: 14px 14px 10px;
  }
  .bd__body {
    padding: 14px 14px 24px;
  }
  .bd__foot {
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
