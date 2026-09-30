/**
 * Progressive web app: service worker registration, "update available"
 * prompt and the install experience (Chrome/Edge/Android install prompt,
 * iOS Safari "Add to Home Screen" instructions).
 *
 *   import { pwa, initPwa, promptInstall } from '@/composables/usePwa'
 */
import { reactive } from 'vue'
import { toast } from '@/composables/useToast'

const LS_VISITS = 'pwa.visits'
const LS_DISMISSED = 'pwa.bannerDismissed'
const SS_COUNTED = 'pwa.visitCounted'

function store(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key)
    localStorage.setItem(key, String(val))
  } catch {
    /* private mode */
  }
  return null
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
const isIOS = /iphone|ipad|ipod/i.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa\//i.test(ua)

export const pwa = reactive({
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  registered: false,
  registration: null,
  updateAvailable: false,
  installable: false, // a beforeinstallprompt event is waiting
  installed: false,
  standalone: false,
  isIOS,
  isIOSSafari,
  iosSheet: false,
  visits: 0,
  bannerDismissed: false
})

let deferredPrompt = null
let reloading = false
let inited = false

function detectStandalone() {
  const mq = typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || matchMedia('(display-mode: minimal-ui)').matches)
  pwa.standalone = !!(mq || navigator.standalone === true)
  document.documentElement.classList.toggle('is-standalone', pwa.standalone)
}

/** True when the app could be installed from here (and isn't already). */
export function canInstall() {
  return !pwa.standalone && (pwa.installable || pwa.isIOSSafari)
}

/** One-time mobile banner: phones/tablets, from the 2nd visit, until dismissed. */
export function shouldShowBanner() {
  const mobile = typeof matchMedia === 'function' && (matchMedia('(max-width: 820px)').matches || matchMedia('(pointer: coarse)').matches)
  return mobile && canInstall() && pwa.visits >= 2 && !pwa.bannerDismissed
}

export function dismissBanner() {
  pwa.bannerDismissed = true
  store(LS_DISMISSED, '1')
}

export async function promptInstall() {
  if (pwa.standalone) {
    toast.info('DASYIN is already installed on this device.')
    return 'installed'
  }
  if (deferredPrompt) {
    const ev = deferredPrompt
    deferredPrompt = null
    pwa.installable = false
    try {
      ev.prompt()
      const choice = await ev.userChoice
      if (choice?.outcome === 'accepted') {
        dismissBanner()
        return 'accepted'
      }
      toast.info('You can install DASYIN any time from your account menu.', { duration: 5000 })
      return 'dismissed'
    } catch {
      return 'error'
    }
  }
  if (pwa.isIOS) {
    pwa.iosSheet = true
    return 'ios'
  }
  toast.info('Use your browser menu → “Install app” (or “Add to Home screen”) to install DASYIN.', { title: 'Install DASYIN', duration: 8000 })
  return 'manual'
}

export function applyUpdate() {
  const reg = pwa.registration
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    // controllerchange reloads; fall back if it doesn't fire
    setTimeout(() => {
      if (!reloading) window.location.reload()
    }, 3000)
  } else {
    window.location.reload()
  }
}

function announceUpdate() {
  if (pwa.updateAvailable) return
  pwa.updateAvailable = true
  toast.info('A new version is available — reload to get the latest improvements.', {
    title: 'Update ready',
    key: 'sw-update',
    icon: 'fa-solid fa-arrows-rotate',
    duration: 0,
    action: { label: 'Reload', icon: 'fa-solid fa-rotate-right', run: applyUpdate }
  })
}

function watchRegistration(reg) {
  pwa.registration = reg
  pwa.registered = true
  if (reg.waiting && navigator.serviceWorker.controller) announceUpdate()
  reg.addEventListener('updatefound', () => {
    const sw = reg.installing
    if (!sw) return
    sw.addEventListener('statechange', () => {
      // A new worker is ready and an old one controls the page → update
      if (sw.state === 'installed' && navigator.serviceWorker.controller) announceUpdate()
    })
  })
}

async function registerServiceWorker() {
  if (!pwa.supported) return
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    watchRegistration(reg)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !pwa.updateAvailable) return
      reloading = true
      window.location.reload()
    })
    // Look for a new release hourly and whenever the app comes back to the foreground
    const check = () => reg.update().catch(() => {})
    setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  } catch (e) {
    console.warn('[pwa] service worker registration failed', e?.message || e)
  }
}

function countVisit() {
  let n = parseInt(store(LS_VISITS) || '0', 10) || 0
  let counted = false
  try {
    counted = sessionStorage.getItem(SS_COUNTED) === '1'
    if (!counted) sessionStorage.setItem(SS_COUNTED, '1')
  } catch {
    counted = false
  }
  if (!counted) {
    n += 1
    store(LS_VISITS, n)
  }
  pwa.visits = n
  pwa.bannerDismissed = store(LS_DISMISSED) === '1'
}

/**
 * Call once at start-up. The service worker is only registered in production
 * builds (never in the Vite dev server, where it would cache dev modules).
 */
export function initPwa({ register = import.meta.env.PROD } = {}) {
  if (inited || typeof window === 'undefined') return
  inited = true
  detectStandalone()
  countVisit()
  try {
    matchMedia('(display-mode: standalone)').addEventListener('change', detectStandalone)
  } catch {
    /* old Safari */
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own button/banner
    deferredPrompt = e
    pwa.installable = true
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    pwa.installable = false
    pwa.installed = true
    dismissBanner()
    toast.success('DASYIN is installed — open it from your home screen or app list.', { title: 'App installed', icon: 'fa-solid fa-mobile-screen' })
  })
  if (register) {
    if (document.readyState === 'complete') registerServiceWorker()
    else window.addEventListener('load', registerServiceWorker, { once: true })
  }
}

export function usePwa() {
  return { pwa, initPwa, promptInstall, canInstall, shouldShowBanner, dismissBanner, applyUpdate }
}
