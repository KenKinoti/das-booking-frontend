<template>
  <div v-if="show" class="vab" :class="{ 'is-all': !ownerView }" role="region" aria-label="Viewing an organisation" data-testid="viewas-bar" :data-mode="ownerView ? 'owner' : 'all'">
    <div class="vab__row">
      <span class="vab__icon" aria-hidden="true"><i :class="ownerView ? 'fa-solid fa-user-tie' : 'fa-solid fa-user-shield'"></i></span>
      <p class="vab__text">
        <span class="vab__lead">
          <span class="vab__hide-sm">Viewing </span><strong data-testid="viewas-org">{{ orgName }}</strong><span class="vab__as">{{ ownerView ? ' as its owner' : ' with all menus' }}</span>
        </span>
        <span class="vab__meta">
          <span v-if="typeName" class="vab__chip vab__hide-md" data-testid="viewas-type"><i :class="typeIcon" aria-hidden="true"></i>{{ typeName }}</span>
          <router-link v-if="planLabel" to="/plan" class="vab__chip" :class="{ 'is-warn': planWarn }" data-testid="viewas-plan" :title="`${orgName}’s plan`"><i class="fa-solid fa-gem" aria-hidden="true"></i><span class="vab__long">{{ planLabel }}</span><span class="vab__short">{{ planShort }}</span></router-link>
        </span>
      </p>
      <div class="vab__mode" role="group" aria-label="Menus shown">
        <button type="button" :class="{ 'is-on': ownerView }" :aria-pressed="ownerView" data-testid="viewas-owner" title="Show only the menus this organisation’s owner sees" @click="setMode('owner')">
          <span class="vab__mlong">Owner view</span><span class="vab__mshort">Owner</span>
        </button>
        <button type="button" :class="{ 'is-on': !ownerView }" :aria-pressed="!ownerView" data-testid="viewas-all" title="Show every menu, as a super admin (support)" @click="setMode('all')">
          <span class="vab__mlong">All menus</span><span class="vab__mshort">All</span>
        </button>
      </div>
      <button type="button" class="ui-btn ui-btn--sm vab__exit" data-testid="viewas-exit" title="End this organisation session and return to Platform admin" @click="exit">
        <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
        <span class="vab__long">Exit to platform</span><span class="vab__short">Exit</span>
      </button>
    </div>
  </div>

  <!-- Notes scroll with the page (only the bar itself stays put) -->
  <div v-if="show && (blockedNote || setupPending)" class="vab-notes" :class="{ 'is-all': !ownerView }">
    <div v-if="blockedNote" class="vab__note is-warn" role="status" data-testid="viewas-blocked">
      <i class="fa-solid fa-lock" aria-hidden="true"></i>
      <span>
        {{ blockedNote }}
        <button type="button" class="vab__link" data-testid="viewas-open-all" @click="openAll">Open it with all menus</button>
        <span aria-hidden="true"> · </span>
        <button type="button" class="vab__link" @click="exit">Exit to platform</button>
      </span>
    </div>

    <div v-if="setupPending" class="vab__note" data-testid="viewas-setup">
      <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
      <span>
        Setup not finished —
        <router-link to="/setup" class="vab__link" data-testid="viewas-setup-link">open the setup wizard as the owner sees it</router-link>
      </span>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '@/stores/auth'
import { access, ensureAccess } from '@/composables/useAccess'
import { entitlements, ensureEntitlements } from '@/composables/useEntitlements'
import { useBranding } from '@/composables/useBranding'
import { viewAs, setViewMode, tokenClaims, VIEW_ALL, VIEW_OWNER } from '@/utils/session'
import { exitToPlatform } from '@/services/platform'
import { recheckRoute } from '@/router'

function contextName(orgId) {
  try {
    const c = JSON.parse(localStorage.getItem('current_organization') || 'null')
    return c && String(c.id) === String(orgId) ? c.name || '' : ''
  } catch {
    return ''
  }
}

/**
 * Shown while a super admin is signed in as an organisation ("Log in as").
 * Owner view (default): menus, plan and business type exactly as the
 * organisation's owner gets them. "All menus": every module, as a super
 * admin, for support work. The choice lasts for this impersonation only.
 */
export default {
  name: 'ViewAsBar',
  data() {
    return { branding: useBranding().branding, viewAs }
  },
  computed: {
    auth() {
      return useAuthStore()
    },
    show() {
      return this.auth.isViewingAsOrg
    },
    ownerView() {
      return this.auth.isOwnerView
    },
    orgId() {
      return this.auth.token ? String(tokenClaims(this.auth.token).org_id || '') : ''
    },
    orgName() {
      const b = this.branding.orgId === this.orgId ? this.branding.orgName : ''
      return b || contextName(this.orgId) || this.auth.user?.organization_name || 'this organisation'
    },
    typeName() {
      return access.loaded && access.confirmed && access.type?.name ? access.type.name : ''
    },
    typeIcon() {
      return access.type?.icon || 'fa-solid fa-shapes'
    },
    plan() {
      const p = entitlements.plan
      return p && p.tier ? p : null
    },
    planLabel() {
      const p = this.plan
      if (!p) return ''
      const name = `${p.tier.name} plan`
      if (p.trial?.active) return `${name} · trial, ${p.trial.days_left} day${p.trial.days_left === 1 ? '' : 's'} left`
      if (p.trial?.expired) return `${name} · trial ended`
      if (p.subscription?.status === 'past_due') return `${name} · past due`
      if (p.subscription?.status === 'cancelled') return `${name} · cancelled`
      return name
    },
    planShort() {
      const p = this.plan
      if (!p) return ''
      if (p.trial?.active) return `${p.tier.name} · trial ${p.trial.days_left}d`
      if (p.trial?.expired) return `${p.tier.name} · trial ended`
      if (p.subscription?.status === 'past_due') return `${p.tier.name} · past due`
      return `${p.tier.name} plan`
    },
    planWarn() {
      const p = this.plan
      return !!p && (!!p.trial?.expired || p.subscription?.status === 'past_due' || (p.trial?.active && p.trial.days_left <= 3))
    },
    setupPending() {
      return access.loaded && access.needsSetup
    },
    blockedNote() {
      const b = this.viewAs.blocked
      if (!b || !this.ownerView || this.$route.path !== b.at) return ''
      if (b.reason === 'plan') return `${b.label} isn’t in ${this.orgName}’s plan — this is the screen its owner gets.`
      const why = this.typeName ? ` (hidden for ${this.typeName})` : ''
      return `${b.label} isn’t available to ${this.orgName}’s owner${why} — they are taken here instead.`
    }
  },
  watch: {
    show: {
      immediate: true,
      handler(on) {
        document.documentElement.classList.toggle('has-viewas-bar', !!on)
        if (on) {
          // All menus skips the organisation checks in the router: load what the bar shows.
          ensureAccess()
          ensureEntitlements()
        }
      }
    }
  },
  beforeUnmount() {
    document.documentElement.classList.remove('has-viewas-bar')
  },
  methods: {
    setMode(mode) {
      if ((mode === VIEW_OWNER) === this.ownerView) return
      setViewMode(mode, this.auth.token)
      if (mode === VIEW_OWNER) recheckRoute()
    },
    openAll() {
      const from = this.viewAs.blocked?.from
      setViewMode(VIEW_ALL, this.auth.token)
      if (from) this.$router.push(from)
    },
    exit() {
      exitToPlatform()
    }
  }
}
</script>

<style scoped>
.vab {
  position: sticky;
  top: calc(var(--topbar-h) + env(safe-area-inset-top));
  z-index: 1019;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
  background: color-mix(in srgb, var(--accent) 7%, var(--surface));
  color: var(--text);
  padding: 0 24px;
}

.vab.is-all {
  border-bottom-color: color-mix(in srgb, var(--warning) 40%, var(--border));
  background: color-mix(in srgb, var(--warning) 9%, var(--surface));
}

.vab__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 6px 0;
  min-width: 0;
}

.vab__icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
}

.is-all .vab__icon {
  background: var(--warning-soft);
  color: var(--warning);
}

.vab__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px 12px;
  flex-wrap: wrap;
  font-size: 13.5px;
  line-height: 1.3;
}

.vab__lead {
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vab__lead strong {
  font-weight: 650;
}

.vab__as {
  color: var(--text-2);
}

.vab__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.vab__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 550;
  white-space: nowrap;
  text-decoration: none;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vab__chip i {
  font-size: 10.5px;
  color: var(--accent);
}

a.vab__chip:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.vab__chip.is-warn {
  border-color: color-mix(in srgb, var(--warning) 45%, var(--border));
  background: var(--warning-soft);
}

.vab__chip.is-warn i {
  color: var(--warning);
}

.vab__mode {
  display: inline-flex;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.vab__mode button {
  height: 28px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.vab__mode button:hover {
  color: var(--text);
}

.vab__mode button.is-on {
  background: var(--accent-soft);
  color: var(--accent);
}

.is-all .vab__mode button.is-on {
  background: var(--warning-soft);
  color: var(--warning);
}

.vab__mode button:focus-visible,
.vab__link:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 1px;
}

.vab__exit {
  flex-shrink: 0;
  white-space: nowrap;
}

.vab-notes {
  padding: 0 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.vab-notes.is-all {
  border-bottom-color: color-mix(in srgb, var(--warning) 40%, var(--border));
  background: color-mix(in srgb, var(--warning) 5%, var(--surface));
}

.vab__note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 0 9px 42px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.vab__note + .vab__note {
  border-top: 1px dashed color-mix(in srgb, var(--accent) 22%, var(--border));
}

.vab__note > i {
  margin-top: 3px;
  font-size: 12px;
  color: var(--accent);
}

.vab__note.is-warn > i {
  color: var(--warning);
}

.vab__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.vab__link:hover {
  color: var(--accent);
  text-decoration-thickness: 2px;
}

.vab__short,
.vab__mshort {
  display: none;
}

@media (max-width: 1279px) {
  .vab__hide-md {
    display: none;
  }
}

@media (max-width: 1199px) {
  .vab__mlong {
    display: none;
  }
  .vab__mshort {
    display: inline;
  }
}

@media (max-width: 991px) {
  .vab,
  .vab-notes {
    padding: 0 max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left));
  }
}

@media (max-width: 640px) {
  .vab,
  .vab-notes {
    padding: 0 max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left));
  }
  .vab__row {
    gap: 8px;
  }
  .vab__icon {
    display: none;
  }
  .vab__text {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    font-size: 13px;
  }
  .vab__as,
  .vab__hide-sm {
    display: none;
  }
  .vab__chip {
    height: 20px;
    padding: 0 7px;
    font-size: 11.5px;
  }
  .vab__long {
    display: none;
  }
  .vab__short {
    display: inline;
  }
  .vab__mode button {
    height: 32px;
    padding: 0 10px;
  }
  .vab__exit {
    height: 36px;
  }
  .vab__note {
    padding-left: 0;
    font-size: 12.5px;
  }
}
</style>

<style>
/* The legacy "Logged in as" banner gives way to the bar while it is shown. */
html.has-viewas-bar .org-context-banner {
  display: none !important;
}
</style>
