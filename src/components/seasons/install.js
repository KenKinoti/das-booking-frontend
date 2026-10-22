/**
 * Seasonal themes — wiring (imported once from main.js).
 *
 *  - adds the platform admin page /super-admin/seasons to the router,
 *  - mounts the season layer (top-bar greeting + corner ornament) as its own
 *    small Vue app beside the main one, once the router is ready,
 *  - keeps `data-season` on <html> in step with the session and the page:
 *    only signed-in pages with the app shell are themed; public customer
 *    pages, sign-in and the setup wizard never are.
 */
import { createApp, watch } from 'vue'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import SeasonLayer from './SeasonLayer.vue'
import { sessionChanged, setSeasonEligible, refreshIfStale } from '@/composables/useSeason'

router.addRoute({
  path: '/super-admin/seasons',
  name: 'SeasonalThemes',
  component: () => import('@/views/seasons/SeasonalThemes.vue'),
  meta: { requiresAuth: true, requiresSuperAdmin: true, title: 'Seasonal themes' }
})

function themedRoute(route, auth) {
  if (!auth.isAuthenticated || !route) return false
  const m = route.meta || {}
  return m.requiresAuth !== false && !m.public && !m.setup
}

let started = false

function start() {
  if (started) return
  started = true
  const auth = useAuthStore()
  const el = document.createElement('div')
  el.id = 'season-layer'
  document.body.appendChild(el)
  createApp(SeasonLayer).mount(el)

  const update = () => setSeasonEligible(themedRoute(router.currentRoute.value, auth))
  router.afterEach(update)
  watch(
    () => [auth.token, auth.isAuthenticated],
    () => {
      sessionChanged()
      update()
    },
    { immediate: true }
  )
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshIfStale()
  })
  setInterval(refreshIfStale, 10 * 60 * 1000)
}

router
  .isReady()
  .catch(() => {})
  .then(start)
