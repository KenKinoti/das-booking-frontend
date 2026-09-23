<template>
  <div class="toasts" aria-live="polite">
    <transition-group name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`is-${t.type}`" role="status">
        <i :class="icon(t.type)"></i>
        <div class="toast-item__text">
          <strong v-if="t.title">{{ t.title }}</strong>
          <span>{{ t.message }}</span>
        </div>
        <button v-if="t.action" class="toast-item__action" @click="t.action.run(); dismissToast(t.id)">{{ t.action.label }}</button>
        <button class="toast-item__close" @click="dismissToast(t.id)" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { toasts, dismissToast } from '@/composables/useToast'

export default {
  name: 'ToastHost',
  setup() {
    const icon = (type) =>
      ({
        success: 'fa-solid fa-circle-check',
        error: 'fa-solid fa-circle-exclamation',
        warning: 'fa-solid fa-triangle-exclamation'
      })[type] || 'fa-solid fa-circle-info'
    return { toasts, dismissToast, icon }
  }
}
</script>

<style scoped>
.toasts {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 4000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  font-size: 13.5px;
}

.toast-item > i {
  margin-top: 2px;
  font-size: 16px;
  color: var(--info);
}

.is-success > i { color: var(--success); }
.is-error > i { color: var(--danger); }
.is-warning > i { color: var(--warning); }

.toast-item__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.toast-item__action {
  border: 0;
  background: transparent;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
}

.toast-item__close {
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  padding: 2px 4px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
