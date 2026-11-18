/**
 * Schedule send — wiring (imported once from main.js, like the subscriptions
 * install): adds Communication → Scheduled to the router so the shared
 * src/router/index.js stays untouched.
 *
 *   /communication/scheduled     upcoming / recurring / sent / failed (?tab=, ?open=<id>, ?invoice=<id>, ?new=customer|statement|team)
 */
import router from '@/router'

const records = [
  {
    path: '/communication/scheduled',
    name: 'ScheduledMessages',
    component: () => import('@/views/communication/ScheduledMessages.vue'),
    meta: { requiresAuth: true, title: 'Scheduled messages' }
  }
]

for (const r of records) {
  if (!router.hasRoute(r.name)) router.addRoute(r)
}

export default records
