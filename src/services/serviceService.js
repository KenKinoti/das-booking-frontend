import api from './api'

/** Services catalogue API (/services). */
export const serviceService = {
  list: (params = {}) => api.get('/services', { params }).then((r) => r.data?.services || []),
  get: (id) => api.get(`/services/${id}`).then((r) => r.data?.service),
  create: (data) => api.post('/services', data).then((r) => r.data?.service),
  update: (id, data) => api.put(`/services/${id}`, data).then((r) => r.data?.service),
  remove: (id) => api.delete(`/services/${id}`),
  toggleStatus: (id) => api.patch(`/services/${id}/toggle-status`).then((r) => r.data?.service),
  duplicate: (id) => api.post(`/services/${id}/duplicate`).then((r) => r.data?.service),
  categories: () => api.get('/services/categories').then((r) => r.data?.details || (r.data?.categories || []).map((name) => ({ name }))),
  stats: () => api.get('/services/stats').then((r) => r.data?.stats || {}),

  // Backwards-compatible names
  getServices(params = {}) {
    return api.get('/services', { params })
  },
  getService(id) {
    return api.get(`/services/${id}`)
  },
  createService(data) {
    return api.post('/services', data)
  },
  updateService(id, data) {
    return api.put(`/services/${id}`, data)
  },
  deleteService(id) {
    return api.delete(`/services/${id}`)
  },
  toggleServiceStatus(id) {
    return api.patch(`/services/${id}/toggle-status`)
  },
  duplicateService(id) {
    return api.post(`/services/${id}/duplicate`)
  },
  getServiceCategories() {
    return api.get('/services/categories')
  },
  getServiceStats() {
    return api.get('/services/stats')
  }
}

export function formatDuration(min) {
  const m = Number(min) || 0
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

/** Industry groupings used by the per-category service pages. */
export const SERVICE_GROUPS = [
  { slug: 'automotive-repair', path: '/services/automotive-repair', title: 'Automotive repair', icon: 'fa-solid fa-screwdriver-wrench', match: ['repair', 'brake', 'clutch', 'engine', 'transmission', 'suspension', 'exhaust', 'panel'], category: 'Automotive repair', vehicle: true },
  { slug: 'automotive-maintenance', path: '/services/automotive-maintenance', title: 'Automotive maintenance', icon: 'fa-solid fa-oil-can', match: ['maintenance', 'logbook', 'oil', 'tyre', 'tire', 'battery', 'wheel', 'alignment'], category: 'Automotive maintenance', vehicle: true },
  { slug: 'diagnostic-services', path: '/services/diagnostic-services', title: 'Diagnostics', icon: 'fa-solid fa-stethoscope', match: ['diagnos', 'inspection', 'check', 'scan', 'test'], category: 'Diagnostics', vehicle: true },
  { slug: 'hair-services', path: '/services/hair-services', title: 'Hair', icon: 'fa-solid fa-scissors', match: ['hair', 'barber', 'cut', 'colour', 'color', 'blow', 'style'], category: 'Hair' },
  { slug: 'beauty-spa', path: '/services/beauty-spa', title: 'Beauty & spa', icon: 'fa-solid fa-spa', match: ['beauty', 'spa', 'facial', 'massage', 'wax', 'skin', 'lash', 'brow'], category: 'Beauty & spa' },
  { slug: 'nail-services', path: '/services/nail-services', title: 'Nails', icon: 'fa-solid fa-hand-sparkles', match: ['nail', 'manicure', 'pedicure', 'gel', 'acrylic'], category: 'Nails' }
]

export function groupForCategory(name = '') {
  const n = String(name).toLowerCase()
  return SERVICE_GROUPS.find((g) => g.match.some((k) => n.includes(k))) || null
}
