<template>
  <header class="tb">
    <div class="tb__left">
      <button class="tb__btn tb__menu" @click="$emit('toggle-menu')" aria-label="Open menu">
        <i class="fa-solid fa-bars"></i>
      </button>
      <nav class="tb__crumbs" aria-label="Breadcrumb">
        <span v-if="crumb.group" class="tb__crumb-group">{{ crumb.group }}</span>
        <i v-if="crumb.group" class="fa-solid fa-chevron-right tb__sep"></i>
        <span class="tb__crumb-page">{{ crumb.page }}</span>
      </nav>
    </div>

    <div class="tb__right">
      <button class="tb__search" @click="$emit('open-search')" aria-label="Search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <span>Search…</span>
      </button>

      <router-link v-if="planChip" to="/plan" class="tb__plan tb__hide-sm" :class="{ 'is-warn': planChip.warn }" :title="planChip.title">
        <i class="fa-solid fa-gem"></i>
        <span>{{ planChip.label }}</span>
        <strong v-if="planChip.cta">{{ planChip.cta }}</strong>
      </router-link>

      <div v-if="visibleCreateActions.length" class="tb__new" ref="newMenu">
        <button class="ui-btn ui-btn--primary ui-btn--sm" @click="newOpen = !newOpen" :aria-expanded="newOpen">
          <i class="fa-solid fa-plus"></i><span class="tb__hide-sm">Create</span>
        </button>
        <transition name="pop">
          <div v-if="newOpen" class="tb__menu-pop" role="menu">
            <router-link v-for="a in visibleCreateActions" :key="a.to" :to="a.to" class="tb__menu-item" role="menuitem" @click="newOpen = false">
              <span class="tb__menu-icon"><i :class="a.icon"></i></span>
              <span>
                <strong>{{ a.label }}</strong>
                <small>{{ a.hint }}</small>
              </span>
            </router-link>
          </div>
        </transition>
      </div>

      <button class="tb__btn" @click="toggleTheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" aria-label="Toggle theme">
        <i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
      </button>

      <div class="tb__user" ref="userMenu">
        <button class="tb__avatar-btn" @click="userOpen = !userOpen" :aria-expanded="userOpen" aria-label="Account menu">
          <span class="tb__avatar">{{ auth.userInitials }}</span>
          <span class="tb__who tb__hide-sm">
            <strong>{{ auth.userName }}</strong>
            <small>{{ roleLabel }}</small>
          </span>
          <i class="fa-solid fa-chevron-down tb__hide-sm tb__caret"></i>
        </button>
        <transition name="pop">
          <div v-if="userOpen" class="tb__menu-pop tb__menu-pop--right" role="menu">
            <div class="tb__menu-head">
              <strong>{{ auth.userName }}</strong>
              <small>{{ auth.user?.email }}</small>
            </div>
            <router-link to="/profile" class="tb__menu-item tb__menu-item--compact" @click="userOpen = false"><i class="fa-solid fa-user"></i> My profile</router-link>
            <router-link to="/settings" class="tb__menu-item tb__menu-item--compact" @click="userOpen = false"><i class="fa-solid fa-gear"></i> Settings</router-link>
            <router-link to="/faq" class="tb__menu-item tb__menu-item--compact" @click="userOpen = false"><i class="fa-solid fa-circle-question"></i> Help</router-link>
            <div class="tb__menu-sep"></div>
            <button class="tb__menu-item tb__menu-item--compact tb__danger" @click="logout"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign out</button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<script>
import { useAuthStore } from '@/stores/auth'
import { globalTheme } from '@/composables/useTheme'
import { findNav } from '@/navigation'
import { entitlements, hasModule } from '@/composables/useEntitlements'

export default {
  name: 'AppTopbar',
  emits: ['toggle-menu', 'open-search'],
  data() {
    return {
      newOpen: false,
      userOpen: false,
      createActions: [
        { label: 'Invoice', hint: 'Bill a customer', to: '/invoices/new', icon: 'fa-solid fa-file-invoice-dollar', module: 'invoicing' },
        { label: 'Quote', hint: 'Send an estimate', to: '/quotes/new', icon: 'fa-solid fa-file-signature', module: 'invoicing' },
        { label: 'Booking', hint: 'Schedule an appointment', to: '/bookings', icon: 'fa-solid fa-calendar-plus', module: 'bookings' },
        { label: 'Customer', hint: 'Add a contact', to: '/customers', icon: 'fa-solid fa-user-plus', module: 'crm' }
      ]
    }
  },
  computed: {
    auth() {
      return useAuthStore()
    },
    isDark() {
      return globalTheme.isDark.value
    },
    visibleCreateActions() {
      // re-evaluate when the plan loads
      void entitlements.modules
      return this.createActions.filter((a) => hasModule(a.module))
    },
    planChip() {
      const p = entitlements.plan
      if (!p || !p.tier || this.auth.isSuperAdmin) return null
      const tier = p.subscription?.tier
      if (p.trial?.active) {
        return { label: `${p.tier.name} trial · ${p.trial.days_left}d left`, cta: 'Choose plan', warn: p.trial.days_left <= 3, title: 'Your trial' }
      }
      if (p.trial?.expired) return { label: 'Trial ended', cta: 'Choose plan', warn: true, title: 'Your trial has ended' }
      if (p.subscription?.status === 'past_due') return { label: `${p.tier.name} · past due`, cta: '', warn: true, title: 'Payment past due' }
      return { label: `${p.tier.name} plan`, cta: tier === 'large' ? '' : 'Upgrade', warn: false, title: 'Plan & billing' }
    },
    roleLabel() {
      const r = this.auth.user?.role || ''
      return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    },
    crumb() {
      const nav = findNav(this.$route.path)
      const title = this.$route.meta.title
      if (nav) {
        const exact = nav.item.to === this.$route.path
        const page = exact || !title ? nav.item.label : title
        return { group: nav.group.label === page ? '' : nav.group.label, page }
      }
      return { group: '', page: title || (typeof this.$route.name === 'string' ? this.$route.name.replace(/([a-z])([A-Z])/g, '$1 $2') : '') }
    }
  },
  watch: {
    '$route.fullPath'() {
      this.newOpen = false
      this.userOpen = false
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    toggleTheme() {
      globalTheme.toggleTheme()
    },
    onDocClick(e) {
      if (this.newOpen && !this.$refs.newMenu?.contains(e.target)) this.newOpen = false
      if (this.userOpen && !this.$refs.userMenu?.contains(e.target)) this.userOpen = false
    },
    onKey(e) {
      if (e.key === 'Escape') {
        this.newOpen = false
        this.userOpen = false
      }
    },
    async logout() {
      this.userOpen = false
      await this.auth.logout()
      this.$router.replace('/login')
    }
  }
}
</script>

<style scoped>
.tb__plan {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 550;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.tb__plan i {
  color: var(--accent);
  font-size: 11px;
}

.tb__plan strong {
  color: var(--accent);
  font-weight: 650;
}

.tb__plan:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.tb__plan.is-warn {
  border-color: color-mix(in srgb, var(--warning) 45%, var(--border));
  background: var(--warning-soft);
}

.tb__plan.is-warn i {
  color: var(--warning);
}

.tb {
  position: sticky;
  top: 0;
  z-index: 1020;
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: saturate(1.4) blur(12px);
  -webkit-backdrop-filter: saturate(1.4) blur(12px);
  border-bottom: 1px solid var(--border);
}

.tb__left,
.tb__right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.tb__btn {
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
  flex-shrink: 0;
}

.tb__btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.tb__menu {
  display: none;
}

.tb__crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 14px;
}

.tb__crumb-group {
  color: var(--text-3);
  white-space: nowrap;
}

.tb__sep {
  font-size: 9px;
  color: var(--text-3);
}

.tb__crumb-page {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb__search {
  display: none;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-3);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
}

.tb__new,
.tb__user {
  position: relative;
}

.tb__avatar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 10px 0 4px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  color: var(--text);
  font: inherit;
}

.tb__avatar-btn:hover {
  background: var(--surface-hover);
}

.tb__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(140deg, #8b7fff, #5b4cf0 60%, #2f86ff);
}

.tb__who {
  display: flex;
  flex-direction: column;
  text-align: left;
  line-height: 1.15;
}

.tb__who strong {
  font-size: 13px;
  font-weight: 600;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tb__who small {
  font-size: 11.5px;
  color: var(--text-3);
}

.tb__caret {
  font-size: 10px;
  color: var(--text-3);
}

.tb__menu-pop {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 250px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 50;
}

.tb__menu-pop--right {
  left: auto;
  right: 0;
  min-width: 230px;
}

.tb__menu-head {
  display: flex;
  flex-direction: column;
  padding: 8px 10px 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 6px;
}

.tb__menu-head small {
  color: var(--text-3);
}

.tb__menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 9px;
  color: var(--text);
  background: transparent;
  border: 0;
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.tb__menu-item:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.tb__menu-item strong {
  display: block;
  font-weight: 600;
}

.tb__menu-item small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.tb__menu-item--compact i {
  width: 16px;
  color: var(--text-3);
}

.tb__menu-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.tb__menu-sep {
  height: 1px;
  background: var(--border);
  margin: 6px 4px;
}

.tb__danger,
.tb__danger i {
  color: var(--danger) !important;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.14s, transform 0.14s var(--ease);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

@media (max-width: 991px) {
  .tb {
    padding: 0 14px;
  }
  .tb__menu {
    display: grid;
  }
  .tb__search {
    display: flex;
  }
  .tb__crumb-group,
  .tb__sep {
    display: none;
  }
}

@media (max-width: 640px) {
  .tb__hide-sm,
  .tb__search span {
    display: none;
  }
  .tb__avatar-btn {
    padding: 0 4px;
  }
  .tb__menu-pop {
    left: auto;
    right: -60px;
  }
}
</style>
