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
import OrganizationContext from './components/OrganizationContext.vue'
import { useAuthStore } from './stores/auth'

export default {
  name: 'App',
  components: { AppSidebar, AppTopbar, CommandPalette, ToastHost, ConfirmHost, OrganizationContext },
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
    }
  },
  watch: {
    '$route.fullPath'() {
      this.mobileOpen = false
    }
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
    },
    onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && this.showShell) {
        e.preventDefault()
        this.paletteOpen = !this.paletteOpen
      }
    }
  }
}
</script>

<style>
.shell__main {
  margin-left: var(--sidebar-w);
  min-height: 100vh;
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
    padding: 20px 16px 40px;
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
