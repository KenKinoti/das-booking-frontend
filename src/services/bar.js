/**
 * Club / bar stock API (backend: /api/v1/bar/*, pkg/bar). Every call returns
 * the `data` of the `{ success, data }` envelope. Money fields (costs, values,
 * pour cost, variance amounts) are removed by the server for users without
 * the inventory "approve" permission — the UI hides them when absent.
 */
import api from '@/services/api'

const B = '/bar'
const data = (r) => (r && r.data && Object.prototype.hasOwnProperty.call(r.data, 'data') ? r.data.data : r?.data)
const clean = (p = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false))

/** First array found under the given keys (or the value itself). */
export function arr(v, ...keys) {
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object') {
    for (const k of keys) if (Array.isArray(v[k])) return v[k]
  }
  return []
}

export const barApi = {
  // Settings & setup
  settings: () => api.get(`${B}/settings`).then(data),
  saveSettings: (body) => api.put(`${B}/settings`, body).then(data),
  catalog: () => api.get(`${B}/setup/catalog`).then(data),
  setup: (body) => api.post(`${B}/setup`, body).then(data),

  locations: () => api.get(`${B}/locations`).then((r) => arr(data(r), 'locations', 'items')),
  createLocation: (body) => api.post(`${B}/locations`, body).then(data),
  updateLocation: (id, body) => api.put(`${B}/locations/${id}`, body).then(data),
  deleteLocation: (id) => api.delete(`${B}/locations/${id}`).then(data),

  terminals: () => api.get(`${B}/terminals`).then((r) => arr(data(r), 'terminals', 'items')),
  saveTerminals: (terminals) => api.put(`${B}/terminals`, { terminals }).then(data),

  // Items & recipes
  items: (params = {}) => api.get(`${B}/items`, { params: clean(params) }).then((r) => arr(data(r), 'items')),
  item: (id) => api.get(`${B}/items/${id}`).then(data),
  createItem: (body) => api.post(`${B}/items`, body).then(data),
  updateItem: (id, body) => api.put(`${B}/items/${id}`, body).then(data),
  deleteItem: (id) => api.delete(`${B}/items/${id}`).then(data),
  makeMenuItems: (id, body) => api.post(`${B}/items/${id}/menu-items`, body).then(data),

  recipes: (params = {}) => api.get(`${B}/recipes`, { params: clean(params) }).then((r) => arr(data(r), 'recipes', 'items')),
  recipe: (posProductId) => api.get(`${B}/recipes/${posProductId}`).then(data),
  createRecipe: (body) => api.post(`${B}/recipes`, body).then(data),
  saveRecipe: (posProductId, body) => api.put(`${B}/recipes/${posProductId}`, body).then(data),
  deleteRecipe: (posProductId) => api.delete(`${B}/recipes/${posProductId}`).then(data),

  posAvailability: (locationId) => api.get(`${B}/pos-availability`, { params: clean({ location_id: locationId }) }).then(data),

  // Stock & ledger
  stock: (params = {}) => api.get(`${B}/stock`, { params: clean(params) }).then((r) => arr(data(r), 'items', 'stock')),
  movements: (params = {}) => api.get(`${B}/movements`, { params: clean(params) }).then((r) => arr(data(r), 'movements', 'items')),

  // Transfers
  transfers: (params = {}) => api.get(`${B}/transfers`, { params: clean(params) }).then((r) => arr(data(r), 'transfers', 'items')),
  transfer: (id) => api.get(`${B}/transfers/${id}`).then(data),
  createTransfer: (body) => api.post(`${B}/transfers`, body).then(data),
  issueTransfer: (id, lines) => api.post(`${B}/transfers/${id}/issue`, { lines }).then(data),
  receiveTransfer: (id, lines) => api.post(`${B}/transfers/${id}/receive`, { lines }).then(data),
  cancelTransfer: (id) => api.post(`${B}/transfers/${id}/cancel`).then(data),
  suggestTransfer: (toLocationId) => api.get(`${B}/transfers/suggest`, { params: { to_location_id: toLocationId } }).then(data),

  // Wastage
  wastage: (params = {}) => api.get(`${B}/wastage`, { params: clean(params) }).then((r) => arr(data(r), 'wastage', 'entries', 'items')),
  logWastage: (body) => api.post(`${B}/wastage`, body).then(data),
  approveWastage: (id) => api.post(`${B}/wastage/${id}/approve`).then(data),
  rejectWastage: (id, note = '') => api.post(`${B}/wastage/${id}/reject`, note ? { note } : {}).then(data),

  // Counts
  counts: (params = {}) => api.get(`${B}/counts`, { params: clean(params) }).then((r) => arr(data(r), 'counts', 'items')),
  count: (id) => api.get(`${B}/counts/${id}`).then(data),
  startCount: (body) => api.post(`${B}/counts`, body).then(data),
  saveCountLines: (id, lines) => api.put(`${B}/counts/${id}/lines`, { lines }).then(data),
  submitCount: (id) => api.post(`${B}/counts/${id}/submit`).then(data),
  approveCount: (id) => api.post(`${B}/counts/${id}/approve`).then(data),
  recount: (id, productIds) => api.post(`${B}/counts/${id}/recount`, { product_ids: productIds }).then(data),
  deleteCount: (id) => api.delete(`${B}/counts/${id}`).then(data),

  // Purchasing & receiving
  reorder: (params = {}) => api.get(`${B}/reorder`, { params: clean(params) }).then(data),
  createPos: (groups, extra = {}) => api.post(`${B}/reorder/create-pos`, { groups, ...extra }).then((r) => arr(data(r), 'purchase_orders')),
  openPos: (params = {}) => api.get(`${B}/purchase-orders`, { params: clean(params) }).then((r) => arr(data(r), 'purchase_orders')),
  savePar: (locationId, lines) => api.put(`${B}/par`, { location_id: locationId, lines }).then(data),
  nightReport: (date, html = false) => api.get(`${B}/reports/night`, { params: clean({ date, html: html ? 1 : undefined }) }).then(data),
  sendNightReport: (date) => api.post(`${B}/reports/night/send`, date ? { date } : {}).then(data),
  deliveries: (params = {}) => api.get(`${B}/deliveries`, { params: clean(params) }).then((r) => arr(data(r), 'deliveries', 'items')),
  receiveDelivery: (body) => api.post(`${B}/deliveries`, body).then(data),

  // Reports
  overview: (date) => api.get(`${B}/overview`, { params: clean({ date }) }).then(data),
  variance: (params = {}) => api.get(`${B}/variance`, { params: clean(params) }).then(data),
  pourCost: (params = {}) => api.get(`${B}/reports/pour-cost`, { params: clean(params) }).then(data),
  valuation: (params = {}) => api.get(`${B}/reports/valuation`, { params: clean(params) }).then(data),
  slowMovers: (params = {}) => api.get(`${B}/reports/slow-movers`, { params: clean(params) }).then(data),
  exportCsv: (dataset, params = {}) => api.get(`${B}/reports/export/${dataset}.csv`, { params: clean(params), responseType: 'blob' }).then((r) => r.data)
}

/** Status meta for transfers, counts and wastage entries. */
export const TRANSFER_STATUS = {
  requested: { label: 'Requested', badge: 'ui-badge--info', icon: 'fa-regular fa-hand' },
  issued: { label: 'Issued', badge: 'ui-badge--warning', icon: 'fa-solid fa-dolly' },
  received: { label: 'Received', badge: 'ui-badge--success', icon: 'fa-solid fa-circle-check' },
  direct: { label: 'Moved', badge: 'ui-badge--success', icon: 'fa-solid fa-right-left' },
  completed: { label: 'Completed', badge: 'ui-badge--success', icon: 'fa-solid fa-circle-check' },
  cancelled: { label: 'Cancelled', badge: 'ui-badge--void', icon: 'fa-solid fa-ban' }
}
export const COUNT_STATUS = {
  draft: { label: 'In progress', badge: 'ui-badge--draft' },
  submitted: { label: 'To review', badge: 'ui-badge--warning' },
  recount: { label: 'Recount', badge: 'ui-badge--info' },
  approved: { label: 'Approved', badge: 'ui-badge--success' }
}
export const WASTAGE_STATUS = {
  pending: { label: 'Pending approval', badge: 'ui-badge--warning' },
  approved: { label: 'Approved', badge: 'ui-badge--success' },
  rejected: { label: 'Rejected', badge: 'ui-badge--void' }
}
export function statusMeta(map, s) {
  return map[s] || { label: s ? String(s).replace(/_/g, ' ') : '—', badge: 'ui-badge--draft' }
}

export default barApi
