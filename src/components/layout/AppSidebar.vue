<template>
  <aside class="sb" :class="{ 'is-rail': rail, 'is-mobile-open': mobileOpen }" aria-label="Main navigation">
    <div class="sb__brand">
      <router-link to="/dashboard" class="sb__logo" @click="$emit('navigate')">
        <BrandMark class="sb__mark" :size="36" />
        <span class="sb__name" v-show="!rail">
          {{ appName }}
          <small>{{ orgName }}</small>
        </span>
      </router-link>
      <button class="sb__icon-btn sb__close" @click="$emit('close')" aria-label="Close menu">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <button v-if="!rail" class="sb__search" @click="$emit('open-search')">
      <i class="fa-solid fa-magnifying-glass"></i>
      <span>Search…</span>
      <kbd>{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
    </button>

    <nav class="sb__nav">
      <section v-for="group in groups" :key="group.id" class="sb__group" :class="{ 'is-open': isOpen(group.id), 'has-active': groupActive(group) }">
        <button
          class="sb__group-head"
          :aria-expanded="isOpen(group.id)"
          :title="rail ? group.label : undefined"
          @click="onGroupClick(group)"
        >
          <span class="sb__group-icon"><i :class="group.icon"></i></span>
          <span class="sb__group-label" v-show="!rail">{{ group.label }}</span>
          <span v-if="!rail && !isOpen(group.id) && groupActive(group)" class="sb__dot" aria-hidden="true"></span>
          <i v-show="!rail" class="fa-solid fa-chevron-down sb__chev"></i>
        </button>
        <div class="sb__items" v-show="!rail && isOpen(group.id)">
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="sb__item"
            :class="{ 'is-active': active(item) }"
            @click="$emit('navigate')"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </section>
    </nav>

    <router-link v-if="plan && !rail" to="/plan" class="sb__plan" @click="$emit('navigate')">
      <span class="sb__plan-icon"><i class="fa-solid fa-gem"></i></span>
      <span class="sb__plan-text">
        <strong>{{ plan.name }} plan</strong>
        <small>{{ plan.hint }}</small>
      </span>
      <span v-if="plan.upgrade" class="sb__plan-cta">Upgrade</span>
    </router-link>

    <div class="sb__foot">
      <button v-if="!rail" class="sb__foot-btn" @click="toggleAll">
        <i :class="allOpen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
        <span>{{ allOpen ? 'Collapse all' : 'Expand all' }}</span>
      </button>
      <router-link
        to="/faq#about"
        class="sb__ver"
        :title="`${appName} ${versionLabel} — about this release`"
        :aria-label="`${appName} version ${appVersion}. About this release`"
        @click="$emit('navigate')"
      >
        <span class="sb__ver-dot" aria-hidden="true"></span>{{ rail ? versionShort : versionLabel }}
      </router-link>
      <button class="sb__foot-btn sb__rail-toggle" @click="$emit('toggle-rail')" :title="rail ? 'Expand sidebar' : 'Collapse sidebar'" :aria-label="rail ? 'Expand sidebar' : 'Collapse sidebar'">
        <i :class="rail ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left'"></i>
      </button>
    </div>
  </aside>
</template>

<script>
import { visibleGroups, isItemActive } from '@/navigation'
import { useAuthStore } from '@/stores/auth'
import { APP_NAME } from '@/config'
import { entitlements } from '@/composables/useEntitlements'
import { APP_VERSION, VERSION_LABEL, VERSION_SHORT } from '@/version'
import BrandMark from './BrandMark.vue'

const STORAGE_KEY = 'nav.openGroups'

export default {
  name: 'AppSidebar',
  components: { BrandMark },
  props: {
    rail: { type: Boolean, default: false },
    mobileOpen: { type: Boolean, default: false }
  },
  emits: ['navigate', 'close', 'toggle-rail', 'open-search'],
  data() {
    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    } catch {
      saved = null
    }
    return {
      openGroups: Array.isArray(saved) ? saved : ['overview', 'sales'],
      appName: APP_NAME,
      appVersion: APP_VERSION,
      versionLabel: VERSION_LABEL,
      versionShort: VERSION_SHORT,
      isMac: typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    }
  },
  computed: {
    auth() {
      return useAuthStore()
    },
    groups() {
      return visibleGroups(this.auth.isSuperAdmin)
    },
    orgName() {
      const u = this.auth.user || {}
      return u.organization?.name || u.organization_name || (this.auth.isSuperAdmin ? 'Platform admin' : 'Workspace')
    },
    plan() {
      const p = entitlements.plan
      if (!p || !p.tier || this.auth.isSuperAdmin) return null
      const sub = p.subscription || {}
      let hint = p.industry?.name || ''
      if (p.trial?.active) hint = `Trial · ${p.trial.days_left} day${p.trial.days_left === 1 ? '' : 's'} left`
      else if (p.trial?.expired) hint = 'Trial ended'
      else if (sub.status === 'past_due') hint = 'Payment past due'
      return { name: p.tier.name, hint, upgrade: sub.tier !== 'large' }
    },
    allOpen() {
      return this.groups.every((g) => this.openGroups.includes(g.id))
    }
  },
  watch: {
    '$route.path': {
      immediate: true,
      handler() {
        // Always reveal the group that contains the current page
        const g = this.groups.find((grp) => this.groupActive(grp))
        if (g && !this.openGroups.includes(g.id)) this.openGroups.push(g.id)
      }
    },
    openGroups: {
      deep: true,
      handler(v) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
        } catch {
          /* ignore */
        }
      }
    }
  },
  methods: {
    active(item) {
      return isItemActive(item, this.$route.path)
    },
    groupActive(group) {
      return group.items.some((i) => this.active(i))
    },
    isOpen(id) {
      return this.openGroups.includes(id)
    },
    onGroupClick(group) {
      if (this.rail) {
        if (!this.isOpen(group.id)) this.openGroups.push(group.id)
        this.$emit('toggle-rail')
        return
      }
      const i = this.openGroups.indexOf(group.id)
      if (i === -1) this.openGroups.push(group.id)
      else this.openGroups.splice(i, 1)
    },
    toggleAll() {
      this.openGroups = this.allOpen ? this.groups.filter((g) => this.groupActive(g)).map((g) => g.id) : this.groups.map((g) => g.id)
    }
  }
}
</script>

<style scoped>
.sb {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-right: 1px solid var(--border);
  z-index: 1030;
  transition: width 0.22s var(--ease), transform 0.22s var(--ease);
}

.sb.is-rail {
  width: var(--sidebar-rail);
}

.sb__brand {
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 18px;
  flex-shrink: 0;
}

.sb__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  min-width: 0;
}

.sb__mark {
  flex-shrink: 0;
}

.sb__name {
  display: flex;
  flex-direction: column;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.01em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
}

.sb__name small {
  font-weight: 500;
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.sb__icon-btn {
  border: 0;
  background: transparent;
  color: var(--text-3);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
}

.sb__close {
  display: none;
}

.sb__search {
  margin: 4px 14px 10px;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-3);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.sb__search:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}

.sb__search span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb__search kbd {
  font-family: var(--font-sans);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-3);
}

.sb__nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 12px;
}

.sb__group + .sb__group {
  margin-top: 2px;
}

.sb__group-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.sb__group-head:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.sb__group-icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: var(--text-3);
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.sb__group.has-active .sb__group-icon {
  background: var(--accent-soft);
  color: var(--accent);
}

.sb__group.has-active .sb__group-head {
  color: var(--text);
}

.sb__group-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.sb__chev {
  font-size: 10px;
  color: var(--text-3);
  transition: transform 0.2s var(--ease);
  transform: rotate(-90deg);
}

.sb__group.is-open .sb__chev {
  transform: rotate(0);
}

.sb__items {
  position: relative;
  padding: 2px 0 8px 22px;
  margin-left: 12px;
}

.sb__items::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 2px;
  bottom: 10px;
  width: 1px;
  background: var(--border);
}

.sb__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--text-2);
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}

.sb__item i {
  width: 16px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-3);
}

.sb__item:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.sb__item.is-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.sb__item.is-active i {
  color: var(--accent);
}

.sb__item.is-active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
}

.sb__plan {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 14px 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text);
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}

.sb__plan:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.sb__plan-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
}

.sb__plan-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.25;
}

.sb__plan-text strong {
  font-size: 12.5px;
  font-weight: 650;
}

.sb__plan-text small {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb__plan-cta {
  font-size: 11px;
  font-weight: 650;
  color: var(--accent);
  flex-shrink: 0;
}

.sb__foot {
  display: flex;
  gap: 6px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border);
}

.sb__foot-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  height: 34px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  flex: 1;
}

.sb__foot-btn span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb__foot-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.sb__rail-toggle {
  flex: 0 0 34px;
  padding: 0;
}

/* Release pill — always visible so everyone can tell which version they are on */
.sb__ver {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-decoration: none;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.sb__ver:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.sb__ver-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 22%, transparent);
}

.is-rail .sb__brand {
  padding: 0;
  justify-content: center;
}

.is-rail .sb__nav {
  padding: 8px 12px;
}

.is-rail .sb__group-head {
  justify-content: center;
  padding: 0;
  height: 44px;
}

.is-rail .sb__group-icon {
  width: 36px;
  height: 36px;
  font-size: 15px;
}

.is-rail .sb__foot {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.is-rail .sb__ver {
  padding: 0 8px;
  height: 26px;
  font-size: 11px;
}

.is-rail .sb__rail-toggle {
  flex: 0 0 44px;
}

@media (max-width: 991px) {
  /* Off-canvas drawer */
  .sb,
  .sb.is-rail {
    width: min(320px, 86vw);
    transform: translateX(-104%);
    box-shadow: none;
    visibility: hidden;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    transition: transform 0.26s var(--ease), visibility 0s linear 0.26s;
    overscroll-behavior: contain;
  }

  .sb.is-mobile-open {
    transform: translateX(0);
    visibility: visible;
    box-shadow: var(--shadow-lg);
    transition: transform 0.26s var(--ease), visibility 0s;
  }

  .sb__close {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .sb__close:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  /* Comfortable tap targets */
  .sb__search {
    height: 44px;
    font-size: 15px;
  }

  .sb__search kbd {
    display: none;
  }

  .sb__group-head {
    height: 46px;
    font-size: 15px;
  }

  .sb__item {
    height: 44px;
    font-size: 15px;
  }

  .sb__item i {
    font-size: 14px;
  }

  .sb__item.is-active::before {
    top: 11px;
    bottom: 11px;
  }

  .sb__plan {
    padding: 12px;
  }

  .sb__foot-btn,
  .sb__ver {
    height: 42px;
  }

  .sb__rail-toggle {
    display: none !important;
  }

  .is-rail .sb__name,
  .is-rail .sb__group-label,
  .is-rail .sb__chev {
    display: initial !important;
  }
}
</style>
