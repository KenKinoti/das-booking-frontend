/**
 * Routes of Platform admin → Announcements and the public unsubscribe page,
 * and the global <AnnouncementBanner /> component the app shell mounts.
 *
 * The routes are added at start-up (router.addRoute) so the shared
 * src/router/index.js stays untouched; this module is imported by the
 * notification centre, which App.vue loads, so it runs before main.js
 * installs the router — routes added then take part in the first navigation
 * like any other. The banner is registered globally when the router is
 * installed, so App.vue needs only the one line that mounts it.
 */
import router from '@/router'
import AnnouncementBanner from './AnnouncementBanner.vue'

if (!router.__dasyinAnnouncements) {
  router.__dasyinAnnouncements = true
  const install = router.install
  router.install = function (app, ...rest) {
    if (!app.component('AnnouncementBanner')) app.component('AnnouncementBanner', AnnouncementBanner)
    return install.call(this, app, ...rest)
  }
}

const records = [
  {
    path: '/super-admin/announcements',
    name: 'Announcements',
    component: () => import('@/views/platform/Announcements.vue'),
    meta: { requiresAuth: true, requiresSuperAdmin: true, title: 'Announcements' }
  },
  {
    path: '/super-admin/announcements/new',
    name: 'AnnouncementNew',
    component: () => import('@/views/platform/AnnouncementComposer.vue'),
    meta: { requiresAuth: true, requiresSuperAdmin: true, title: 'New announcement' }
  },
  {
    path: '/super-admin/announcements/:id/edit',
    name: 'AnnouncementEdit',
    component: () => import('@/views/platform/AnnouncementComposer.vue'),
    props: true,
    meta: { requiresAuth: true, requiresSuperAdmin: true, title: 'Edit announcement' }
  },
  {
    path: '/super-admin/announcements/:id',
    name: 'AnnouncementDetail',
    component: () => import('@/views/platform/AnnouncementDetail.vue'),
    props: true,
    meta: { requiresAuth: true, requiresSuperAdmin: true, title: 'Announcement' }
  },
  {
    path: '/unsubscribe',
    name: 'Unsubscribe',
    component: () => import('@/views/public/Unsubscribe.vue'),
    meta: { requiresAuth: false, public: true, title: 'Unsubscribe' }
  }
]

for (const r of records) {
  if (!router.hasRoute(r.name)) router.addRoute(r)
}

export default records
