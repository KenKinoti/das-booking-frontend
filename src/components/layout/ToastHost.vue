<template>
  <section class="toasts" aria-label="Notifications">
    <!-- Two live regions: errors interrupt, everything else is polite -->
    <div class="sr-only" aria-live="assertive" aria-atomic="true">{{ assertive }}</div>
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ polite }}</div>
    <transition-group name="toast" tag="div" class="toasts__stack">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="[`is-${t.type}`, { 'is-dragging': drag.id === t.id, 'is-link': !!t.link }]"
        :style="drag.id === t.id ? { transform: `translateX(${drag.dx}px)`, opacity: Math.max(0.2, 1 - Math.abs(drag.dx) / 220) } : null"
        :role="t.type === 'error' ? 'alert' : 'status'"
        @mouseenter="pauseToast(t.id)"
        @mouseleave="resumeToast(t.id)"
        @focusin="pauseToast(t.id)"
        @focusout="resumeToast(t.id)"
        @pointerdown="onDown($event, t)"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <span class="toast-item__icon" aria-hidden="true">
          <i v-if="t.type === 'loading'" class="fa-solid fa-circle-notch fa-spin"></i>
          <i v-else :class="t.icon || icon(t.type)"></i>
        </span>
        <div class="toast-item__text" @click="open(t)">
          <strong v-if="t.title">{{ t.title }}</strong>
          <span>{{ t.message }}</span>
          <div v-if="t.actions.length" class="toast-item__actions">
            <button v-for="(a, i) in t.actions" :key="i" type="button" class="toast-item__action" @click.stop="run(t, a)">
              <i v-if="a.icon" :class="a.icon"></i>{{ a.label }}
            </button>
          </div>
        </div>
        <button v-if="t.dismissible" type="button" class="toast-item__close" @click="dismissToast(t.id)" aria-label="Dismiss notification">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <span
          v-if="t.progress && t.duration"
          :key="t.rev"
          class="toast-item__bar"
          :style="{ animationDuration: t.duration + 'ms', animationPlayState: t.paused ? 'paused' : 'running' }"
          aria-hidden="true"
        ></span>
      </div>
    </transition-group>
  </section>
</template>

<script>
import { toasts, dismissToast, pauseToast, resumeToast } from '@/composables/useToast'

const ICONS = {
  success: 'fa-solid fa-circle-check',
  error: 'fa-solid fa-circle-exclamation',
  warning: 'fa-solid fa-triangle-exclamation',
  info: 'fa-solid fa-circle-info'
}

export default {
  name: 'ToastHost',
  setup() {
    return { toasts, dismissToast, pauseToast, resumeToast }
  },
  data() {
    return { drag: { id: 0, x0: 0, dx: 0, pid: null }, assertive: '', polite: '' }
  },
  computed: {
    latest() {
      const t = this.toasts[this.toasts.length - 1]
      return t ? `${t.id}:${t.type}:${t.message}` : ''
    }
  },
  watch: {
    latest() {
      const t = this.toasts[this.toasts.length - 1]
      if (!t || t.type === 'loading') return
      const text = [t.title, t.message].filter(Boolean).join('. ')
      if (t.type === 'error') this.assertive = text
      else this.polite = text
    }
  },
  methods: {
    icon(type) {
      return ICONS[type] || ICONS.info
    },
    run(t, a) {
      try {
        a.run()
      } finally {
        if (!a.keepOpen) dismissToast(t.id)
      }
    },
    open(t) {
      if (this.drag.moved) return
      if (t.link && this.$router) {
        this.$router.push(t.link).catch(() => {})
        dismissToast(t.id)
      }
    },
    onDown(e, t) {
      if (e.pointerType === 'mouse' || e.target.closest('button')) return
      this.drag = { id: t.id, x0: e.clientX, dx: 0, pid: e.pointerId, moved: false }
      pauseToast(t.id)
    },
    onMove(e) {
      if (!this.drag.id || e.pointerId !== this.drag.pid) return
      this.drag.dx = e.clientX - this.drag.x0
      if (Math.abs(this.drag.dx) > 6) this.drag.moved = true
    },
    onUp(e) {
      if (!this.drag.id || e.pointerId !== this.drag.pid) return
      const { id, dx } = this.drag
      if (Math.abs(dx) > 80) dismissToast(id)
      else resumeToast(id)
      const moved = this.drag.moved
      this.drag = { id: 0, x0: 0, dx: 0, pid: null, moved }
      setTimeout(() => (this.drag.moved = false), 50)
    }
  }
}
</script>

<style scoped>
.toasts {
  position: fixed;
  top: calc(var(--topbar-h) + env(safe-area-inset-top) + 12px);
  right: max(20px, env(safe-area-inset-right));
  z-index: 4000;
  width: min(400px, calc(100vw - 32px));
  pointer-events: none;
}

.toasts__stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.toast-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 10px 14px 12px;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  font-size: 13.5px;
  overflow: hidden;
  pointer-events: auto;
  touch-action: pan-y;
  --tone: var(--info);
  --tone-soft: var(--info-soft);
}

.toast-item.is-success { --tone: var(--success); --tone-soft: var(--success-soft); }
.toast-item.is-error { --tone: var(--danger); --tone-soft: var(--danger-soft); }
.toast-item.is-warning { --tone: var(--warning); --tone-soft: var(--warning-soft); }
.toast-item.is-loading { --tone: var(--accent); --tone-soft: var(--accent-soft); }

.toast-item::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--tone);
}

.toast-item.is-dragging {
  transition: none !important;
}

.toast-item__icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--tone-soft);
  color: var(--tone);
  font-size: 15px;
}

.toast-item__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.42;
  padding-top: 4px;
  overflow-wrap: anywhere;
}

.toast-item.is-link .toast-item__text {
  cursor: pointer;
}

.toast-item__text strong {
  font-weight: 650;
}

.toast-item__text span {
  color: var(--text-2);
}

.toast-item__text strong + span {
  font-size: 13px;
}

.toast-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.toast-item__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--tone) 35%, var(--border));
  background: var(--tone-soft);
  color: var(--tone);
  font: inherit;
  font-size: 12.5px;
  font-weight: 650;
  cursor: pointer;
}

.toast-item__action:hover {
  border-color: var(--tone);
}

.toast-item__close {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
}

.toast-item__close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.toast-item__bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: var(--tone);
  opacity: 0.55;
  transform-origin: left center;
  animation-name: toast-bar;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes toast-bar {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s var(--ease), transform 0.22s var(--ease);
}

.toast-leave-active {
  position: absolute;
  width: 100%;
}

.toast-move {
  transition: transform 0.22s var(--ease);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (max-width: 640px) {
  .toasts {
    top: auto;
    right: max(12px, env(safe-area-inset-right));
    left: max(12px, env(safe-area-inset-left));
    bottom: calc(env(safe-area-inset-bottom) + var(--bottom-nav-h, 0px) + 12px);
    width: auto;
    margin: 0 auto;
    max-width: 480px;
  }

  .toasts__stack {
    flex-direction: column;
  }

  .toast-item {
    font-size: 14px;
    padding: 12px 8px 14px 12px;
  }

  .toast-item__action {
    height: 36px;
    padding: 0 14px;
    font-size: 13.5px;
  }

  .toast-item__close {
    width: 36px;
    height: 36px;
  }

  .toast-enter-from {
    transform: translateY(12px) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-item__bar {
    animation: none;
    display: none;
  }
}
</style>
