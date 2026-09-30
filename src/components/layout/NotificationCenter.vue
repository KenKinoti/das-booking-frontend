<template>
  <div class="nc" ref="root">
    <button
      class="nc__bell"
      :class="{ 'is-on': open }"
      type="button"
      @click="toggle"
      :aria-expanded="open"
      aria-haspopup="dialog"
      :aria-label="state.unread ? `Notifications, ${state.unread} unread` : 'Notifications'"
      title="Notifications"
    >
      <i class="fa-regular fa-bell"></i>
      <span v-if="state.unread" class="nc__count" aria-hidden="true">{{ state.unread > 99 ? '99+' : state.unread }}</span>
    </button>

    <teleport to="body">
      <transition name="nc-fade">
        <div v-if="open" class="nc__scrim" @click="close" aria-hidden="true"></div>
      </transition>
      <transition name="nc-pop">
        <section
          v-if="open"
          class="nc__panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="nc-title"
          ref="panel"
          :style="dragY ? { transform: `translateY(${dragY}px)` } : null"
          @keydown.esc="close"
        >
          <div class="nc__handle" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd" aria-hidden="true"><span></span></div>
          <header class="nc__head">
            <h2 id="nc-title">Notifications</h2>
            <div class="nc__head-actions">
              <button class="ui-btn ui-btn--ghost ui-btn--sm" type="button" :disabled="!state.unread" @click="markAllRead">
                <i class="fa-solid fa-check-double"></i><span>Mark all read</span>
              </button>
              <div class="nc__more" ref="more">
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" type="button" aria-label="More actions" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">
                  <i class="fa-solid fa-ellipsis"></i>
                </button>
                <div v-if="moreOpen" class="nc__menu" role="menu">
                  <button type="button" role="menuitem" @click="refresh"><i class="fa-solid fa-rotate"></i> Refresh</button>
                  <button type="button" role="menuitem" :disabled="!hasRead" @click="clear('read')"><i class="fa-regular fa-trash-can"></i> Clear read</button>
                  <button type="button" role="menuitem" class="is-danger" :disabled="!state.items.length" @click="clear('all')"><i class="fa-solid fa-trash-can"></i> Clear all</button>
                </div>
              </div>
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon nc__close" type="button" aria-label="Close notifications" @click="close"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </header>

          <nav class="ui-tabs nc__tabs" role="tablist" aria-label="Filter notifications">
            <button class="ui-tab" :class="{ 'is-active': tab === 'all' }" role="tab" :aria-selected="tab === 'all'" @click="tab = 'all'">All</button>
            <button class="ui-tab" :class="{ 'is-active': tab === 'unread' }" role="tab" :aria-selected="tab === 'unread'" @click="tab = 'unread'">
              Unread <span v-if="state.unread" class="count">{{ state.unread }}</span>
            </button>
          </nav>

          <div class="nc__body" ref="body">
            <div v-if="state.loading && !state.loaded" class="nc__skeletons" aria-busy="true" aria-label="Loading notifications">
              <div v-for="i in 4" :key="i" class="nc__sk">
                <span class="ui-skeleton nc__sk-icon"></span>
                <span class="nc__sk-lines"><span class="ui-skeleton" style="width: 70%"></span><span class="ui-skeleton" style="width: 90%"></span></span>
              </div>
            </div>

            <div v-else-if="state.error && !state.items.length" class="ui-empty nc__empty">
              <div class="ui-empty__icon" style="color: var(--danger)"><i class="fa-solid fa-plug-circle-xmark"></i></div>
              <h3>Couldn’t load notifications</h3>
              <p>{{ state.error }}</p>
              <button class="ui-btn ui-btn--sm" type="button" @click="refresh"><i class="fa-solid fa-rotate-right"></i> Retry</button>
            </div>

            <div v-else-if="!visible.length" class="ui-empty nc__empty">
              <div class="ui-empty__icon"><i :class="tab === 'unread' ? 'fa-solid fa-check-double' : 'fa-regular fa-bell'"></i></div>
              <h3>{{ tab === 'unread' ? 'You’re all caught up' : 'No notifications yet' }}</h3>
              <p>{{ tab === 'unread' ? 'Nothing new since you last looked.' : 'Bookings, payments, stock alerts, leave requests and more will show up here.' }}</p>
            </div>

            <template v-else>
              <section v-for="g in groups" :key="g.label" class="nc__group" :aria-label="g.label">
                <h3 class="nc__group-title">{{ g.label }}</h3>
                <ul class="nc__list">
                  <li v-for="n in g.items" :key="n.id" class="nc__item" :class="[{ 'is-unread': !n.read_at }, `is-${n.severity || 'info'}`]">
                    <button type="button" class="nc__main" @click="openItem(n)">
                      <span class="nc__icon" aria-hidden="true"><i :class="iconFor(n)"></i></span>
                      <span class="nc__text">
                        <strong>{{ n.title }}</strong>
                        <span v-if="n.body" class="nc__body-text">{{ n.body }}</span>
                        <small>
                          <span :title="fullTime(n.created_at)">{{ ago(n.created_at) }}</span>
                          <span v-if="severityLabel(n)" class="nc__sev"> · {{ severityLabel(n) }}</span>
                        </small>
                      </span>
                      <span v-if="!n.read_at" class="nc__dot" aria-label="Unread"></span>
                    </button>
                    <div class="nc__item-actions">
                      <button type="button" class="nc__act" :aria-label="n.read_at ? 'Mark as unread' : 'Mark as read'" :title="n.read_at ? 'Mark as unread' : 'Mark as read'" @click="markRead(n, !n.read_at)">
                        <i :class="n.read_at ? 'fa-regular fa-envelope' : 'fa-regular fa-envelope-open'"></i>
                      </button>
                      <button type="button" class="nc__act" aria-label="Remove notification" title="Remove" @click="removeNotification(n)">
                        <i class="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </li>
                </ul>
              </section>
              <div v-if="state.hasMore && tab === 'all'" class="nc__more-row">
                <button class="ui-btn ui-btn--sm" type="button" @click="loadMore"><i class="fa-solid fa-angles-down"></i> Load older</button>
              </div>
            </template>
          </div>
        </section>
      </transition>
    </teleport>
  </div>
</template>

<script>
import {
  notifications,
  refreshNotifications,
  markRead,
  markAllRead,
  removeNotification,
  clearNotifications,
  loadMoreNotifications,
  startNotifications,
  stopNotifications
} from '@/composables/useNotifications'
import { confirmDialog } from '@/composables/useConfirm'

const TYPE_ICONS = [
  [/^booking\./, 'fa-solid fa-calendar-check'],
  [/^quote\./, 'fa-solid fa-file-signature'],
  [/^(invoice|payment)\./, 'fa-solid fa-file-invoice-dollar'],
  [/^pos\./, 'fa-solid fa-cash-register'],
  [/^stock\./, 'fa-solid fa-box-open'],
  [/^leave\./, 'fa-solid fa-umbrella-beach'],
  [/^meeting\./, 'fa-solid fa-video'],
  [/^event\./, 'fa-solid fa-ticket'],
  [/^ai\./, 'fa-solid fa-wand-magic-sparkles'],
  [/^plan\./, 'fa-solid fa-gem'],
  [/^org\./, 'fa-solid fa-code-merge']
]
const SEV_ICONS = { success: 'fa-solid fa-circle-check', warning: 'fa-solid fa-triangle-exclamation', error: 'fa-solid fa-circle-exclamation', info: 'fa-solid fa-bell' }

export default {
  name: 'NotificationCenter',
  data() {
    return { open: false, tab: 'all', moreOpen: false, dragY: 0, drag: null, state: notifications }
  },
  computed: {
    visible() {
      return this.tab === 'unread' ? this.state.items.filter((n) => !n.read_at) : this.state.items
    },
    hasRead() {
      return this.state.items.some((n) => n.read_at)
    },
    groups() {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const today = [],
        earlier = []
      for (const n of this.visible) (new Date(n.created_at) >= start ? today : earlier).push(n)
      return [
        { label: 'Today', items: today },
        { label: 'Earlier', items: earlier }
      ].filter((g) => g.items.length)
    }
  },
  watch: {
    open(v) {
      notifications.open = v
      if (v) {
        refreshNotifications({ silent: this.state.loaded })
        this.$nextTick(() => this.$refs.panel?.querySelector('.ui-tab.is-active')?.focus({ preventScroll: true }))
      } else {
        this.moreOpen = false
        this.dragY = 0
      }
      document.documentElement.classList.toggle('has-sheet-open', v && window.innerWidth <= 640)
    },
    'state.open'(v) {
      if (v !== this.open) this.open = v
    },
    '$route.fullPath'() {
      this.open = false
    }
  },
  mounted() {
    startNotifications()
    document.addEventListener('click', this.onDocClick, true)
  },
  beforeUnmount() {
    stopNotifications()
    document.removeEventListener('click', this.onDocClick, true)
    document.documentElement.classList.remove('has-sheet-open')
  },
  methods: {
    markRead,
    removeNotification,
    toggle() {
      this.open = !this.open
    },
    close() {
      this.open = false
    },
    refresh() {
      this.moreOpen = false
      refreshNotifications()
    },
    loadMore() {
      loadMoreNotifications()
    },
    async markAllRead() {
      await markAllRead()
    },
    async clear(scope) {
      this.moreOpen = false
      if (scope === 'all') {
        const ok = await confirmDialog({ title: 'Clear all notifications?', message: 'This removes every notification, read and unread. It can’t be undone.', confirmText: 'Clear all', danger: true })
        if (!ok) return
      }
      clearNotifications(scope)
    },
    openItem(n) {
      markRead(n, true)
      if (n.link) {
        this.open = false
        this.$router.push(n.link).catch(() => {})
      }
    },
    onDocClick(e) {
      if (this.moreOpen && !this.$refs.more?.contains(e.target)) this.moreOpen = false
      if (!this.open) return
      const inside = this.$refs.root?.contains(e.target) || this.$refs.panel?.contains(e.target) || e.target.closest?.('.toasts, .ui-modal-backdrop, .confirm-backdrop')
      if (!inside) this.open = false
    },
    iconFor(n) {
      const hit = TYPE_ICONS.find(([re]) => re.test(n.type || ''))
      return hit ? hit[1] : SEV_ICONS[n.severity] || SEV_ICONS.info
    },
    severityLabel(n) {
      return { warning: 'Needs attention', error: 'Action needed' }[n.severity] || ''
    },
    ago(iso) {
      const t = new Date(iso).getTime()
      if (!t) return ''
      const s = Math.max(0, Math.round((Date.now() - t) / 1000))
      if (s < 45) return 'Just now'
      const m = Math.round(s / 60)
      if (m < 60) return `${m} min ago`
      const h = Math.round(m / 60)
      if (h < 24) return `${h} h ago`
      const d = Math.round(h / 24)
      if (d === 1) return 'Yesterday'
      if (d < 7) return `${d} days ago`
      return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined })
    },
    fullTime(iso) {
      return iso ? new Date(iso).toLocaleString() : ''
    },
    dragStart(e) {
      if (window.innerWidth > 640) return
      this.drag = { y0: e.clientY, id: e.pointerId }
      e.currentTarget.setPointerCapture?.(e.pointerId)
    },
    dragMove(e) {
      if (!this.drag || e.pointerId !== this.drag.id) return
      this.dragY = Math.max(0, e.clientY - this.drag.y0)
    },
    dragEnd() {
      if (!this.drag) return
      const far = this.dragY > 110
      this.drag = null
      if (far) this.close()
      else this.dragY = 0
    }
  }
}
</script>

<style scoped>
.nc {
  position: relative;
  flex-shrink: 0;
}

.nc__bell {
  position: relative;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.nc__bell:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.nc__bell.is-on {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}

.nc__count {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--bg);
  font-variant-numeric: tabular-nums;
}

.nc__scrim {
  position: fixed;
  inset: 0;
  z-index: 1090;
  background: transparent;
}

.nc__panel {
  position: fixed;
  top: calc(var(--topbar-h) + env(safe-area-inset-top) + 8px);
  right: max(16px, env(safe-area-inset-right));
  z-index: 1100;
  width: min(420px, calc(100vw - 32px));
  max-height: min(640px, calc(100dvh - var(--topbar-h) - 32px));
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.nc__handle {
  display: none;
}

.nc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 12px 10px 18px;
}

.nc__head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.nc__head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nc__close {
  display: none;
}

.nc__more {
  position: relative;
}

.nc__menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 5;
  min-width: 180px;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}

.nc__menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.nc__menu button i {
  width: 16px;
  color: var(--text-3);
}

.nc__menu button:hover:not(:disabled) {
  background: var(--surface-hover);
}

.nc__menu button:disabled {
  opacity: 0.45;
  cursor: default;
}

.nc__menu .is-danger,
.nc__menu .is-danger i {
  color: var(--danger);
}

.nc__tabs {
  margin: 0 16px;
  border-bottom: 1px solid var(--border);
}

.nc__body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 0 8px;
}

.nc__group-title {
  margin: 0;
  padding: 12px 18px 6px;
  font-size: 11.5px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-3);
}

.nc__list {
  list-style: none;
  margin: 0;
  padding: 0 8px;
}

.nc__item {
  --tone: var(--info);
  --tone-soft: var(--info-soft);
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: 12px;
}

.nc__item.is-success { --tone: var(--success); --tone-soft: var(--success-soft); }
.nc__item.is-warning { --tone: var(--warning); --tone-soft: var(--warning-soft); }
.nc__item.is-error { --tone: var(--danger); --tone-soft: var(--danger-soft); }

.nc__item:hover {
  background: var(--surface-hover);
}

.nc__item.is-unread {
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
}

.nc__item.is-unread:hover {
  background: var(--accent-soft);
}

.nc__main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 6px 11px 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 12px;
}

.nc__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--tone-soft);
  color: var(--tone);
  font-size: 14px;
}

.nc__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nc__text strong {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
}

.nc__item.is-unread .nc__text strong {
  font-weight: 700;
}

.nc__body-text {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.nc__text small {
  color: var(--text-3);
  font-size: 12px;
  margin-top: 2px;
}

.nc__sev {
  margin-left: 4px;
  color: var(--tone);
  font-weight: 600;
}

.nc__dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.nc__item-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding-right: 4px;
  opacity: 0;
  transition: opacity 0.12s;
}

.nc__item:hover .nc__item-actions,
.nc__item:focus-within .nc__item-actions {
  opacity: 1;
}

.nc__act {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
}

.nc__act:hover {
  background: var(--surface);
  color: var(--text);
}

.nc__empty {
  padding: 40px 24px;
}

.nc__more-row {
  display: flex;
  justify-content: center;
  padding: 10px;
}

.nc__skeletons {
  padding: 8px 16px;
}

.nc__sk {
  display: flex;
  gap: 12px;
  padding: 10px 0;
}

.nc__sk-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  flex-shrink: 0;
}

.nc__sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nc__sk-lines .ui-skeleton {
  height: 11px;
  border-radius: 6px;
}

.nc-pop-enter-active,
.nc-pop-leave-active {
  transition: opacity 0.16s, transform 0.18s var(--ease);
}

.nc-pop-enter-from,
.nc-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.985);
}

.nc-fade-enter-active,
.nc-fade-leave-active {
  transition: opacity 0.18s;
}

.nc-fade-enter-from,
.nc-fade-leave-to {
  opacity: 0;
}

@media (pointer: coarse) {
  .nc__item-actions {
    opacity: 1;
  }
}

/* Phones: a bottom sheet with a drag handle */
@media (max-width: 640px) {
  .nc__bell {
    width: 40px;
    height: 40px;
    border-radius: 11px;
  }

  .nc__scrim {
    background: rgba(10, 12, 24, 0.45);
    backdrop-filter: blur(2px);
  }

  .nc__panel {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-height: calc(100dvh - env(safe-area-inset-top) - 40px);
    min-height: min(460px, 70dvh);
    border-radius: 20px 20px 0 0;
    border-bottom: 0;
    padding-bottom: env(safe-area-inset-bottom);
    transition: transform 0.2s var(--ease);
  }

  .nc__handle {
    display: flex;
    justify-content: center;
    padding: 8px 0 2px;
    touch-action: none;
    cursor: grab;
  }

  .nc__handle span {
    width: 40px;
    height: 4px;
    border-radius: 4px;
    background: var(--border-strong);
  }

  .nc__head {
    padding: 8px 10px 8px 18px;
  }

  .nc__head h2 {
    font-size: 18px;
  }

  .nc__head .ui-btn span {
    display: none;
  }

  .nc__close {
    display: inline-flex;
  }

  .nc__main {
    padding: 12px 4px 12px 10px;
  }

  .nc__text strong {
    font-size: 14.5px;
  }

  .nc__body-text {
    font-size: 13.5px;
  }

  .nc__act {
    width: 40px;
    height: 40px;
  }

  .nc__item-actions {
    flex-direction: row;
    align-items: center;
  }

  .nc-pop-enter-from,
  .nc-pop-leave-to {
    opacity: 1;
    transform: translateY(100%);
  }
}
</style>
