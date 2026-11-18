/**
 * Morning brief — wiring (imported once from main.js, like the subscriptions
 * module): adds the brief pages to the router so the shared
 * src/router/index.js stays untouched.
 *
 *   /brief          today's brief (live) with how it was delivered
 *   /brief/:date    a past day's brief as it was sent (links in the email
 *                   and the WhatsApp "Open brief" button; sign-in first,
 *                   then back here)
 */
import router from '@/router'

const page = () => import('@/views/brief/MorningBrief.vue')

const records = [
  { path: '/brief', name: 'MorningBrief', component: page, meta: { requiresAuth: true, title: 'Morning brief' } },
  { path: '/brief/:date', name: 'MorningBriefDay', component: page, props: true, meta: { requiresAuth: true, title: 'Morning brief' } }
]

for (const r of records) {
  if (!router.hasRoute(r.name)) router.addRoute(r)
}

export default records
