import api from './api'

/**
 * Suppliers & purchase orders API (backend: /api/v1/suppliers/*).
 * Methods return the axios response; use `listFrom` / `response.data` to read.
 */

export const PO_STATUSES = [
  { value: 'draft', label: 'Draft', badge: 'draft' },
  { value: 'sent', label: 'Ordered', badge: 'sent' },
  { value: 'partially_received', label: 'Partially received', badge: 'partial' },
  { value: 'received', label: 'Received', badge: 'paid' },
  { value: 'cancelled', label: 'Cancelled', badge: 'void' }
]

export const PAYMENT_TERMS = ['COD', 'Net 7', 'Net 14', 'Net 30', 'Net 60', 'End of month', 'Prepaid']

export function poStatusMeta(status) {
  const s = status === 'confirmed' ? 'sent' : status
  return PO_STATUSES.find((x) => x.value === s) || { value: s, label: s || '—', badge: 'draft' }
}

export const supplierService = {
  // Suppliers
  getSuppliers(params = {}) {
    return api.get('/suppliers', { params })
  },
  getSupplier(id) {
    return api.get(`/suppliers/${id}`)
  },
  createSupplier(data) {
    return api.post('/suppliers', data)
  },
  updateSupplier(id, data) {
    return api.put(`/suppliers/${id}`, data)
  },
  deleteSupplier(id) {
    return api.delete(`/suppliers/${id}`)
  },

  // Purchase orders
  getPurchaseOrders(params = {}) {
    return api.get('/suppliers/purchase-orders', { params: { ...params, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
  },
  getPurchaseOrder(id) {
    return api.get(`/suppliers/purchase-orders/${id}`)
  },
  createPurchaseOrder(data) {
    return api.post('/suppliers/purchase-orders', data)
  },
  updatePurchaseOrder(id, data) {
    return api.put(`/suppliers/purchase-orders/${id}`, data)
  },
  deletePurchaseOrder(id) {
    return api.delete(`/suppliers/purchase-orders/${id}`)
  },
  updatePurchaseOrderStatus(id, status) {
    return api.patch(`/suppliers/purchase-orders/${id}/status`, { status })
  },
  /** receivedItems: [{ item_id, quantity_received }] – quantities for this delivery */
  receivePurchaseOrder(id, receivedItems, notes = '') {
    return api.post(`/suppliers/purchase-orders/${id}/receive`, { received_items: receivedItems, notes })
  },
  receiveAll(id, notes = '') {
    return api.post(`/suppliers/purchase-orders/${id}/receive`, { receive_all: true, notes })
  },

  // Reports
  getSupplierReport() {
    return api.get('/suppliers/report', { params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
  }
}

export default supplierService
