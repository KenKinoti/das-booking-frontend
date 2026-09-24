<template>
  <div v-if="showShell" class="shell" :class="{ 'is-rail': effectiveRail }">
    <AppSidebar
      :rail="effectiveRail"
      :mobile-open="mobileOpen"
      @navigate="mobileOpen = false"
      @close="mobileOpen = false"
      @toggle-rail="toggleRail"
      @open-search="paletteOpen = true"
    />
    <div v-if="mobileOpen" class="shell__scrim" @click="mobileOpen = false"></div>

    <div class="shell__main">
      <AppTopbar @toggle-menu="mobileOpen = !mobileOpen" @open-search="paletteOpen = true" />
      <OrganizationContext />
      <main class="app-content" id="main">
        <WhatsNew v-if="$route.path === '/dashboard'" />
        <router-view v-slot="{ Component, route }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
    </div>
    <CommandPalette :open="paletteOpen" @close="paletteOpen = false" />
  </div>

  <div v-else class="auth-container">
    <router-view />
  </div>

  <ToastHost />
  <ConfirmHost />
</template>

<script>
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
import CommandPalette from './components/layout/CommandPalette.vue'
import ToastHost from './components/layout/ToastHost.vue'
import ConfirmHost from './components/layout/ConfirmHost.vue'
import WhatsNew from './components/layout/WhatsNew.vue'
import OrganizationContext from './components/OrganizationContext.vue'
import { useAuthStore } from './stores/auth'
import { globalTheme } from './composables/useTheme'
import { APP_VERSION } from './version'

export default {
  name: 'App',
  components: { AppSidebar, AppTopbar, CommandPalette, ToastHost, ConfirmHost, OrganizationContext, WhatsNew },
  data() {
    let rail = false
    try {
      rail = localStorage.getItem('nav.rail') === '1'
    } catch {
      rail = false
    }
    return { rail, mobileOpen: false, paletteOpen: false, isMobile: window.innerWidth < 992 }
  },
  computed: {
    showShell() {
      const auth = useAuthStore()
      return auth.isAuthenticated && this.$route.meta.requiresAuth !== false && !this.$route.meta.public
    },
    effectiveRail() {
      return this.rail && !this.isMobile
    },
    isDark() {
      return globalTheme.isDark.value
    }
  },
  watch: {
    '$route.fullPath'() {
      this.mobileOpen = false
    },
    mobileOpen(open) {
      // Lock the page behind the off-canvas drawer
      document.documentElement.classList.toggle('has-drawer-open', open)
    },
    isDark: {
      immediate: true,
      handler(dark) {
        // Mobile browser chrome / installed-app title bar follows the app theme
        document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0b0d14' : '#f6f7fb'))
      }
    }
  },
  created() {
    document.documentElement.dataset.appVersion = APP_VERSION
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('resize', this.onResize, { passive: true })
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    toggleRail() {
      this.rail = !this.rail
      try {
        localStorage.setItem('nav.rail', this.rail ? '1' : '0')
      } catch {
        /* ignore */
      }
    },
    onResize() {
      this.isMobile = window.innerWidth < 992
      if (!this.isMobile) this.mobileOpen = false
    },
    onKey(e) {
      if (e.key === 'Escape' && this.mobileOpen) {
        this.mobileOpen = false
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && this.showShell) {
        e.preventDefault()
        this.paletteOpen = !this.paletteOpen
      }
    }
  }
}
</script>

<style>
/* Legacy pages that set their own widths never push the page sideways on small screens */
@media (max-width: 991px) {
  .app-content {
    overflow-x: clip;
  }
}

.shell__main {
  margin-left: var(--sidebar-w);
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.22s var(--ease);
}

.shell.is-rail .shell__main {
  margin-left: var(--sidebar-rail);
}

.app-content {
  flex: 1;
  padding: 28px 32px 48px;
  min-width: 0;
}

.shell__scrim {
  position: fixed;
  inset: 0;
  z-index: 1025;
  background: rgba(10, 12, 24, 0.45);
  backdrop-filter: blur(2px);
  animation: ui-fade 0.2s ease-out;
  touch-action: none;
}

html.has-drawer-open,
html.has-drawer-open body {
  overflow: hidden;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.14s ease, transform 0.18s var(--ease);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
}

@media (max-width: 991px) {
  .shell__main,
  .shell.is-rail .shell__main {
    margin-left: 0;
  }
  .app-content {
    padding: 20px max(16px, env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  }
}

@media print {
  .sb,
  .tb,
  .shell__scrim {
    display: none !important;
  }
  .shell__main {
    margin-left: 0 !important;
  }
  .app-content {
    padding: 0 !important;
  }
}
</style>
