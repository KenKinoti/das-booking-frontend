/**
 * Client subscriptions — wiring (imported once from main.js, like the
 * seasonal themes): adds Finance → Subscriptions (with a subscription's
 * drawer at /subscriptions/:id — admin alerts link there, with ?action= for
 * their one-click actions) and the public "Your services" page to the
 * router, so the shared src/router/index.js stays untouched.
 *
 *   /subscriptions               overview, subscriptions, Synergy sites, tasks, activity, settings (?tab=)
 *   /subscriptions/:id           the same page with the subscription's drawer open (?action=extend|paid|suspend|skip)
 *   /your-services/:token        the customer's signed page (no sign-in)
 */
import router from '@/router'

const page = () => import('@/views/subscriptions/Subscriptions.vue')

const records = [
  { path: '/subscriptions', name: 'Subscriptions', component: page, meta: { requiresAuth: true, title: 'Subscriptions' } },
  { path: '/subscriptions/:id', name: 'SubscriptionDetail', component: page, props: true, meta: { requiresAuth: true, title: 'Subscription' } },
  {
    path: '/your-services/:token',
    name: 'YourServices',
    component: () => import('@/views/public/YourServices.vue'),
    props: true,
    meta: { requiresAuth: false, public: true, title: 'Your services' }
  }
]

for (const r of records) {
  if (!router.hasRoute(r.name)) router.addRoute(r)
}

export default records
