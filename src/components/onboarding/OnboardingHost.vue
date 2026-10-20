<template>
  <div v-if="applies" class="ob-host">
    <WelcomeSheet v-if="onboarding.sheetOpen" :data="data" :preview="preview" @go="go" @later="later" @start="start" />
    <OnboardingDrawer
      v-if="onboarding.drawerOpen"
      :data="data"
      :preview="preview"
      :busy="onboarding.busy"
      @close="closeDrawer"
      @go="go"
      @toggle="toggle"
      @dismiss="dismiss"
      @restart="restart"
    />
    <button
      v-if="showPill"
      ref="pill"
      type="button"
      class="ob-pill"
      :class="{ 'is-pos': isPos }"
      :aria-label="`Getting started: ${data.done_count} of ${data.total} steps done${preview ? ' (preview of the owner\'s steps)' : ''}. Open the checklist`"
      aria-haspopup="dialog"
      data-testid="onboarding-pill"
      @click="openDrawer"
    >
      <span class="ob-pill__ring" :style="{ '--p': data.percent }" aria-hidden="true"><i class="fa-solid fa-flag-checkered"></i></span>
      <span class="ob-pill__text">Getting started <strong>{{ data.done_count }}/{{ data.total }}</strong></span>
      <span v-if="preview" class="ob-pill__tag">Preview</span>
    </button>
  </div>
</template>

<script>
import WelcomeSheet from './WelcomeSheet.vue'
import OnboardingDrawer from './OnboardingDrawer.vue'
import {
  onboarding,
  loadOnboarding,
  onboardingApplies,
  isPreview,
  closeSheet,
  markWelcomed,
  openDrawer,
  closeDrawer,
  setStepDone,
  dismissOnboarding,
  restartOnboarding,
  refreshSoon,
  firstRun,
  firstRunBlocked,
  scanBlockers,
  personKey
} from './onboarding'
import { access } from '@/composables/useAccess'
import { loadOrgPrefs } from '@/composables/useOrgPrefs'
import { useAuthStore } from '@/stores/auth'
import { confirmDialog } from '@/composables/useConfirm'
import { toast } from '@/composables/useToast'

// "Getting started" for the signed-in person (mounted once in App.vue):
// the welcome sheet on first sign-in, then a floating "Getting started 2/5"
// pill that opens the checklist drawer, until every step is done or the
// person hides it (My profile → Show getting started again).
export default {
  name: 'OnboardingHost',
  components: { WelcomeSheet, OnboardingDrawer },
  data() {
    return { onboarding }
  },
  computed: {
    data() {
      return onboarding.data
    },
    applies() {
      void access.needsSetup
      void access.loaded
      return onboardingApplies(this.$route)
    },
    preview() {
      return isPreview()
    },
    /** another first-run prompt (where the business is based, a dialog…) comes first */
    blocked() {
      void firstRun.prefsKey
      void firstRun.domBlocked
      return firstRunBlocked(this.$route)
    },
    isPos() {
      return this.$route.path === '/pos'
    },
    allDone() {
      return !!this.data?.all_done
    },
    authKey() {
      const a = useAuthStore()
      return a.token ? `${a.user?.id || ''}:${a.user?.organization_id || ''}:${a.token.slice(-16)}` : ''
    },
    showPill() {
      const d = this.data
      if (!this.applies || !d || onboarding.sheetOpen || onboarding.drawerOpen || this.blocked) return false
      if (onboarding.cardVisible && this.$route.path === '/dashboard') return false
      if (this.preview) return !onboarding.previewHidden
      return !d.dismissed && !d.all_done && (d.welcomed || onboarding.autoOpened)
    }
  },
  watch: {
    applies: {
      immediate: true,
      handler(v) {
        onboarding.active = !!v
        this.maybeWelcome()
      }
    },
    'onboarding.data'() {
      this.maybeWelcome()
    },
    blocked(v) {
      if (!v) this.maybeWelcome()
    },
    '$route.path'() {
      refreshSoon(500, 5000)
      this.$nextTick(scanBlockers)
    },
    // The drawer replaces the pill while it is open: give focus back to the
    // pill when it closes (unless the person moved focus somewhere else).
    'onboarding.drawerOpen'(open) {
      if (!open) this.$nextTick(() => this.focusPill())
    },
    authKey(k) {
      if (k) {
        loadOnboarding(true)
        this.loadPrefs()
      }
    },
    allDone(v, old) {
      if (v && old === false && !this.preview) toast.success("You're all set — every getting-started step is done")
    }
  },
  mounted() {
    loadOnboarding()
    this.loadPrefs()
    window.addEventListener('focus', this.onFocus)
    // Watch for other prompts and dialogs coming and going (one check per frame).
    let queued = false
    this.observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        scanBlockers()
      })
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
    scanBlockers()
  },
  beforeUnmount() {
    window.removeEventListener('focus', this.onFocus)
    this.observer?.disconnect()
    clearTimeout(this.welcomeTimer)
    onboarding.active = false
  },
  methods: {
    /** The organisation's region (and so its one-time prompt) is known before the welcome shows. */
    loadPrefs() {
      const key = personKey()
      if (!key) return
      loadOrgPrefs().finally(() => {
        if (personKey() === key) firstRun.prefsKey = key
      })
    },
    // First sign-in: the welcome sheet, once nothing else is waiting for the
    // person (re-checked a moment later, so a prompt that is just appearing wins).
    maybeWelcome() {
      clearTimeout(this.welcomeTimer)
      if (!this.canWelcome()) return
      this.welcomeTimer = setTimeout(() => {
        scanBlockers()
        if (!this.canWelcome()) return
        onboarding.autoOpened = true
        onboarding.sheetOpen = true
      }, 350)
    },
    canWelcome() {
      const d = onboarding.data
      return !!(this.applies && d && !this.preview && !d.welcomed && !d.dismissed && !onboarding.autoOpened && !onboarding.sheetOpen && !this.blocked)
    },
    navigate(to) {
      if (!to || this.$route.fullPath === to) return
      this.$router.push(to).catch(() => {})
    },
    go(step) {
      const fromSheet = onboarding.sheetOpen
      onboarding.sheetOpen = false
      onboarding.drawerOpen = false
      if (fromSheet) markWelcomed()
      this.navigate(step.to)
    },
    later() {
      closeSheet()
    },
    start() {
      const next = this.data?.steps?.find((s) => !s.done)
      closeSheet()
      if (next) this.navigate(next.to)
    },
    openDrawer() {
      openDrawer()
    },
    closeDrawer() {
      closeDrawer()
    },
    toggle(step, done) {
      setStepDone(step, done)
    },
    dismiss() {
      dismissOnboarding()
    },
    async restart() {
      // The confirmation opens on its own; the drawer comes back if they cancel.
      closeDrawer()
      const ok = await confirmDialog({
        title: 'Start over?',
        message: 'Your ticks are cleared and the welcome shows again. Steps that tick themselves stay done.',
        confirmText: 'Start over'
      })
      if (ok) restartOnboarding()
      else openDrawer()
    },
    focusPill() {
      const a = document.activeElement
      if ((!a || a === document.body) && this.$refs.pill) this.$refs.pill.focus({ preventScroll: true })
    },
    onFocus() {
      refreshSoon(300, 5000)
    }
  }
}
</script>

<style scoped>
.ob-pill {
  position: fixed;
  z-index: 1012;
  right: max(24px, env(safe-area-inset-right));
  bottom: calc(24px + env(safe-area-inset-bottom));
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  max-width: calc(100vw - 32px);
  padding: 0 16px 0 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-lg);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  animation: ob-pill-in 0.25s var(--ease);
  transition: transform 0.15s var(--ease), border-color 0.15s;
}

.ob-pill:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.ob-pill:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@keyframes ob-pill-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.ob-pill__ring {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: conic-gradient(var(--success) calc(var(--p, 0) * 1%), var(--bg-subtle) 0);
}

.ob-pill__ring::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: var(--surface);
}

.ob-pill__ring i {
  position: relative;
  font-size: 11px;
  color: var(--accent);
}

.ob-pill__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ob-pill__text strong {
  margin-left: 2px;
  font-variant-numeric: tabular-nums;
}

.ob-pill__tag {
  padding: 2px 8px;
  border-radius: 99px;
  background: var(--info-soft);
  color: var(--info);
  font-size: 11.5px;
  font-weight: 650;
}

/* Desktop POS: the Charge button is bottom-right in the cart, so the pill goes bottom-left */
@media (min-width: 1024px) {
  .ob-pill.is-pos {
    right: auto;
    left: calc(var(--sidebar-w, 264px) + 24px);
  }
  .shell.is-rail .ob-pill.is-pos {
    left: calc(var(--sidebar-rail, 76px) + 24px);
  }
}

/* Phones: above the bottom navigation */
@media (max-width: 767px) {
  .ob-pill {
    right: max(16px, env(safe-area-inset-right));
    bottom: calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom) + 12px);
    height: 42px;
    font-size: 13.5px;
  }
}

/* Phones & tablets on the POS: above the cart bar (16px + 54px), never over Charge */
@media (max-width: 1023px) {
  .ob-pill.is-pos {
    right: max(16px, env(safe-area-inset-right));
    bottom: calc(16px + 54px + 12px + env(safe-area-inset-bottom));
  }
}

/* Long forms on phones keep Save / Cancel in a sticky bar at the bottom */
@media (max-width: 640px) {
  :global(html:has(.ui-form-actions)) .ob-pill {
    bottom: calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom) + 84px);
  }
}

@media print {
  .ob-pill {
    display: none;
  }
}
</style>
