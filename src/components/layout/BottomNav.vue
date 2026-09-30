<template>
  <nav v-if="enabled" class="bn" :class="{ 'is-hidden': keyboard }" aria-label="Primary">
    <router-link
      v-for="it in items"
      :key="it.to"
      :to="it.to"
      class="bn__item"
      :class="{ 'is-active': isActive(it) }"
      :aria-current="isActive(it) ? 'page' : null"
    >
      <span class="bn__icon"><i :class="it.icon" aria-hidden="true"></i></span>
      <span class="bn__label">{{ it.label }}</span>
    </router-link>
    <button type="button" class="bn__item" :class="{ 'is-active': drawerOpen }" :aria-expanded="drawerOpen" aria-label="More — open the menu" @click="$emit('more')">
      <span class="bn__icon">
        <i class="fa-solid fa-bars" aria-hidden="true"></i>
        <span v-if="unread" class="bn__dot" aria-hidden="true"></span>
      </span>
      <span class="bn__label">More</span>
    </button>
  </nav>
</template>

<script>
import { hasModule, entitlements } from '@/composables/useEntitlements'
import { notifications } from '@/composables/useNotifications'

// Most used destinations, in priority order; the first four the plan allows
// are shown (plus More, which opens the full menu).
const CANDIDATES = [
  { label: 'Home', to: '/dashboard', icon: 'fa-solid fa-house', module: 'core', match: /^\/dashboard/ },
  { label: 'Invoices', to: '/invoices', icon: 'fa-solid fa-file-invoice-dollar', module: 'invoicing', match: /^\/(invoices(?!\/settings)|quotes|billing)/ },
  { label: 'POS', to: '/pos', icon: 'fa-solid fa-cash-register', module: 'pos', match: /^\/pos(-transactions)?(\/|$)/ },
  { label: 'Bookings', to: '/bookings', icon: 'fa-solid fa-calendar-days', module: 'bookings', match: /^\/(bookings|scheduling)/ },
  { label: 'Customers', to: '/customers', icon: 'fa-solid fa-address-book', module: 'crm', match: /^\/(customers|crm)/ },
  { label: 'Business', to: '/business', icon: 'fa-solid fa-briefcase', module: 'smallbiz', match: /^\/business/ },
  { label: 'Inventory', to: '/inventory', icon: 'fa-solid fa-box', module: 'inventory', match: /^\/(inventory|suppliers)/ },
  { label: 'Ask', to: '/assistant', icon: 'fa-solid fa-wand-magic-sparkles', module: 'core', match: /^\/assistant/ }
]

// Pages with their own bottom action bar hide the navigation
const HIDE_ON = [/^\/pos\/?$/, /^\/meetings\/[^/]+$/, /^\/video-call/, /^\/invoices\/new/, /^\/invoices\/[^/]+\/edit/, /^\/quotes\/new/, /^\/quotes\/[^/]+\/edit/]

export default {
  name: 'BottomNav',
  props: { drawerOpen: { type: Boolean, default: false } },
  emits: ['more'],
  data() {
    return { keyboard: false }
  },
  computed: {
    items() {
      void entitlements.modules
      void entitlements.loaded
      return CANDIDATES.filter((c) => hasModule(c.module)).slice(0, 4)
    },
    enabled() {
      return !HIDE_ON.some((re) => re.test(this.$route.path))
    },
    unread() {
      return notifications.unread > 0
    }
  },
  watch: {
    enabled: {
      immediate: true,
      handler(v) {
        document.documentElement.classList.toggle('has-bottom-nav', v)
      }
    }
  },
  mounted() {
    document.addEventListener('focusin', this.onFocus)
    document.addEventListener('focusout', this.onFocus)
  },
  beforeUnmount() {
    document.documentElement.classList.remove('has-bottom-nav')
    document.removeEventListener('focusin', this.onFocus)
    document.removeEventListener('focusout', this.onFocus)
  },
  methods: {
    isActive(it) {
      return it.match.test(this.$route.path)
    },
    onFocus() {
      // Hide while typing so the on-screen keyboard isn't pushed up by the bar
      requestAnimationFrame(() => {
        const a = document.activeElement
        this.keyboard = !!a && (a.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]), textarea, select, [contenteditable="true"]') ?? false)
      })
    }
  }
}
</script>

<style scoped>
.bn {
  display: none;
}

@media (max-width: 767px) {
  .bn {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1015;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    height: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));
    padding: 0 max(4px, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(4px, env(safe-area-inset-left));
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: saturate(1.4) blur(14px);
    -webkit-backdrop-filter: saturate(1.4) blur(14px);
    border-top: 1px solid var(--border);
    transition: transform 0.2s var(--ease);
  }

  .bn.is-hidden {
    transform: translateY(110%);
  }

  .bn__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--text-3);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .bn__icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 52px;
    height: 28px;
    border-radius: 999px;
    font-size: 17px;
    transition: background 0.15s, color 0.15s;
  }

  .bn__label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }

  .bn__item.is-active {
    color: var(--accent);
  }

  .bn__item.is-active .bn__icon {
    background: var(--accent-soft);
  }

  .bn__item:active .bn__icon {
    transform: scale(0.94);
  }

  .bn__dot {
    position: absolute;
    top: 2px;
    right: 12px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--danger);
    box-shadow: 0 0 0 2px var(--surface);
  }
}

@media print {
  .bn {
    display: none !important;
  }
}
</style>
