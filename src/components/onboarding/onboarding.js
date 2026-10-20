/**
 * Shared "Getting started" state: the welcome sheet, the floating pill and
 * its drawer (OnboardingHost, mounted once in App.vue), the Dashboard card
 * and the Profile page link all read and change it here.
 *
 *   import { onboarding, loadOnboarding, openDrawer, reopenOnboarding } from '@/components/onboarding/onboarding'
 *
 * Progress refreshes after the person changes something anywhere in the app
 * (any successful write), when they come back to the tab and on navigation,
 * so steps that tick themselves (a sale rung up, a delivery received…)
 * update without a reload.
 */
import { reactive } from 'vue'
import api, { apiErrorMessage } from '@/services/api'
import { onboardingAPI } from '@/services/onboarding'
import { toast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { access, term, termLower } from '@/composables/useAccess'
import { isPlatformAdminSession, isViewingAsOrg } from '@/utils/session'
import { orgDefaults } from '@/utils/orgDefaults'

export const onboarding = reactive({
  loaded: false,
  loading: false,
  error: '',
  key: '',
  data: null,
  sheetOpen: false,
  drawerOpen: false,
  /** the welcome sheet opened by itself once in this page load */
  autoOpened: false,
  /** the Dashboard card is on screen (the pill steps aside) */
  cardVisible: false,
  /** a super admin's preview hidden for this page load (nothing is saved) */
  previewHidden: false,
  /** OnboardingHost is mounted and the person has steps */
  active: false,
  busy: ''
})

function sessionKey() {
  try {
    const a = useAuthStore()
    if (!a?.token || !a.user) return ''
    return `${a.user.id || a.user.email || ''}:${a.user.organization_id || ''}:${a.token.slice(-16)}`
  } catch {
    return ''
  }
}

/** Fill any {term} placeholders left in a step with the organisation's words. */
export function fillTerms(text) {
  return String(text || '').replace(/\{(a_)?([A-Za-z_]+)\}/g, (m, art, name) => {
    const key = name.toLowerCase()
    let t = name[0] === name[0].toUpperCase() ? term(key, '') : termLower(key)
    if (!t || t === key) return m
    if (art) t = (/^[aeiou]/i.test(t) ? 'an ' : 'a ') + t
    return t
  })
}

/** "as a Bartender" / "as an Admin officer" / "as the Owner". */
export function asRole(d) {
  const name = d?.role_name || 'team member'
  if (d?.role_base === 'admin') return `as the ${name}`
  return `as ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`
}

function apply(d) {
  if (!d) return
  d.steps = (d.steps || []).map((s) => ({ ...s, title: fillTerms(s.title), description: fillTerms(s.description) }))
  onboarding.data = d
  onboarding.loaded = true
  onboarding.error = ''
}

export function resetOnboarding() {
  Object.assign(onboarding, { loaded: false, loading: false, error: '', key: '', data: null, sheetOpen: false, drawerOpen: false, autoOpened: false, previewHidden: false, busy: '' })
}

let inflight = null
export async function loadOnboarding(force = false) {
  const key = sessionKey()
  if (!key || isPlatformAdminSession()) {
    if (onboarding.key) resetOnboarding()
    return onboarding
  }
  if (key !== onboarding.key) {
    resetOnboarding()
    onboarding.key = key
  } else if (!force && onboarding.loaded) {
    return onboarding
  }
  if (inflight) return inflight
  onboarding.loading = true
  inflight = onboardingAPI
    .me()
    .then((d) => {
      if (sessionKey() === key) apply(d)
      return onboarding
    })
    .catch((e) => {
      onboarding.error = apiErrorMessage(e, 'Getting started could not be loaded')
      return onboarding
    })
    .finally(() => {
      onboarding.loading = false
      inflight = null
    })
  return inflight
}

// ---------------------------------------------------------------- other first-run prompts

/**
 * The welcome sheet never stacks on another first-run prompt: the one-time
 * "Where is your business based?" prompt (RegionSetupPrompt), the setup
 * wizard (its own page, no app shell), or any other dialog that is open
 * (a forced password change, a confirmation, a page's own modal…). It waits
 * until they are finished; the pill stays hidden meanwhile.
 */
export const firstRun = reactive({
  /** session key whose organisation preferences have loaded (or failed) */
  prefsKey: '',
  /** another dialog / first-run prompt is on screen */
  domBlocked: false,
  /** the region prompt is on screen (changes re-check its "Not now") */
  regionInDom: false
})

const REGION_DISMISSED_KEY = 'region_prompt_dismissed' // RegionSetupPrompt's "Not now"

function regionDismissed(org) {
  try {
    return (JSON.parse(localStorage.getItem(REGION_DISMISSED_KEY) || '[]') || []).includes(org)
  } catch {
    return false
  }
}

/** Is RegionSetupPrompt waiting for this person on this route? (same rules as the prompt) */
export function regionPromptPending(route) {
  void firstRun.regionInDom
  const p = orgDefaults
  if (!p.loaded || !p.needsSetup || !p.canEdit || !p.orgId) return false
  if (['/settings', '/organizations'].includes(route?.path)) return false
  return !regionDismissed(p.orgId)
}

const BLOCKERS = '[data-testid=region-setup], .ui-modal-backdrop, [role=dialog][aria-modal=true], [role=alertdialog]'

/** Look for another prompt or dialog on screen (ours are marked data-onboarding). */
export function scanBlockers() {
  const shown = (el) => el.getClientRects().length > 0 && !el.closest('[data-onboarding]')
  const blocked = [...document.querySelectorAll(BLOCKERS)].some(shown)
  const region = !!document.querySelector('[data-testid=region-setup]')
  if (blocked !== firstRun.domBlocked) firstRun.domBlocked = blocked
  if (region !== firstRun.regionInDom) firstRun.regionInDom = region
}

/** The signed-in person + organisation ('' when signed out). */
export function personKey() {
  try {
    const a = useAuthStore()
    return a?.token && a.user ? `${a.user.id || a.user.email || ''}:${a.user.organization_id || ''}` : ''
  } catch {
    return ''
  }
}

/** True while another first-run prompt or dialog needs the person first. */
export function firstRunBlocked(route) {
  return firstRun.prefsKey !== personKey() || firstRun.domBlocked || regionPromptPending(route)
}

/** Platform admin pages never show "Getting started". */
export function isPlatformRoute(route) {
  if (!route) return false
  if (route.matched?.some((r) => r.meta?.requiresSuperAdmin) || route.meta?.requiresSuperAdmin) return true
  return /^\/(super-admin|organizations|users-admin|module-management|menu-manager|system-settings|audit-logs|database)(\/|$)/.test(route.path || '')
}

/**
 * Should "Getting started" show at all on this route? Not on platform admin
 * pages, never for a super admin on their own platform session, not while
 * an owner still has the setup wizard to finish, and only with steps.
 */
export function onboardingApplies(route) {
  const d = onboarding.data
  if (!d || d.hidden || !d.steps?.length) return false
  if (isPlatformAdminSession() || isPlatformRoute(route)) return false
  if (access.needsSetup || route?.meta?.setup) return false
  return true
}

/** Is this a read-only preview (a super admin viewing an organisation)? */
export function isPreview() {
  return !!onboarding.data?.preview || isViewingAsOrg()
}

async function write(kind, fn) {
  onboarding.busy = kind
  try {
    apply(await fn())
    return true
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Could not save your progress'))
    return false
  } finally {
    onboarding.busy = ''
  }
}

export function markWelcomed() {
  if (!onboarding.data || onboarding.data.welcomed || isPreview()) return Promise.resolve(true)
  onboarding.data.welcomed = true
  return write('welcomed', onboardingAPI.welcomed)
}

export function setStepDone(step, done) {
  if (!onboarding.data) return Promise.resolve(false)
  if (isPreview()) {
    toast.info("This is a preview of the owner's steps — nothing is saved")
    return Promise.resolve(false)
  }
  // optimistic tick
  const s = onboarding.data.steps.find((x) => x.key === step.key)
  if (s) s.done = done
  return write('step:' + step.key, () => onboardingAPI.setStep(step.key, done))
}

export async function dismissOnboarding() {
  onboarding.drawerOpen = false
  onboarding.sheetOpen = false
  if (isPreview()) {
    onboarding.previewHidden = true
    return true
  }
  const ok = await write('dismiss', () => onboardingAPI.dismiss(true))
  if (ok) toast.info('Getting started is hidden. You can reopen it from My profile.')
  return ok
}

/** "Show getting started again" (My profile): un-hide it and open the checklist. */
export async function reopenOnboarding() {
  await loadOnboarding()
  onboarding.previewHidden = false
  if (!isPreview() && onboarding.data?.dismissed) {
    if (!(await write('reopen', () => onboardingAPI.dismiss(false)))) return false
  }
  if (!onboarding.data?.steps?.length) {
    toast.info('There are no getting-started steps for your role yet.')
    return false
  }
  onboarding.sheetOpen = false
  onboarding.drawerOpen = true
  return true
}

/** Start over: ticks cleared and the welcome sheet again. */
export async function restartOnboarding() {
  if (isPreview()) {
    toast.info("This is a preview of the owner's steps — nothing is saved")
    return false
  }
  const ok = await write('restart', onboardingAPI.restart)
  if (ok) {
    onboarding.drawerOpen = false
    onboarding.sheetOpen = true
  }
  return ok
}

export function openDrawer() {
  onboarding.sheetOpen = false
  onboarding.drawerOpen = true
  loadOnboarding(true)
}

export function closeDrawer() {
  onboarding.drawerOpen = false
}

export function openSheet() {
  onboarding.drawerOpen = false
  onboarding.sheetOpen = true
}

/** Close the welcome sheet; it counts as seen. */
export function closeSheet() {
  onboarding.sheetOpen = false
  return markWelcomed()
}

// ---------------------------------------------------------------- refresh

let refreshTimer = null
let lastRefresh = 0
/** Refresh soon (debounced); throttled to once every few seconds unless forced. */
export function refreshSoon(delay = 1200, minGap = 0) {
  if (!onboarding.active) return
  if (minGap && Date.now() - lastRefresh < minGap) return
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    lastRefresh = Date.now()
    loadOnboarding(true)
  }, delay)
}

// Any successful change elsewhere may complete a step that ticks itself.
api.interceptors.response.use((r) => {
  const m = (r?.config?.method || '').toLowerCase()
  if (onboarding.active && m && m !== 'get' && m !== 'head' && !/\/onboarding\//.test(r.config.url || '') && !/\/auth\//.test(r.config.url || '')) {
    refreshSoon(1200)
  }
  return r
})
