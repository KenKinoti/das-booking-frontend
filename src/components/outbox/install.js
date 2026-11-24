/**
 * Pending review (v2.19, pkg/outbox) — wiring (imported once from main.js, like the schedsend install): adds the page to
 * the router so the shared src/router/index.js stays untouched.
 *
 *   /outbox     Waiting / Approved & scheduled / Sent / Rejected & superseded
 *               (?open=<id> opens one item — the links in the update emails and notifications; ?tab=, ?flag=, ?customer=)
 *
 * Pending review is core (every plan); everyone sees it — approvers act, others see the messages they queued.
 */
import router from '@/router'

const records = [
  {
    path: '/outbox',
    name: 'PendingReview',
    component: () => import('@/views/communication/PendingReview.vue'),
    meta: { requiresAuth: true, title: 'Pending review' }
  }
]

for (const r of records) {
  if (!router.hasRoute(r.name)) router.addRoute(r)
}

export default records
