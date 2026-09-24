import api from './api'

/**
 * Inventory API (backend: /api/v1/inventory/*).
 * Methods return the axios response; use `listFrom` / `response.data` to read.
 */

export const STOCK_STATUS = {
  in_stock: { label: 'In stock', badge: 'success' },
  low_stock: { label: 'Low stock', badge: 'warning' },
  out_of_stock: { label: 'Out of stock', badge: 'danger' }
}

export const UNITS = ['each', 'box', 'pack', 'set', 'pair', 'kg', 'g', 'litre', 'ml', 'metre', 'hour']

/** Suggest a SKU from a product name, avoiding SKUs already in `taken` (a Set of upper-case SKUs). */
export function suggestSku(name, taken = new Set()) {
  const words = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  let prefix = ''
  for (const w of words) {
    prefix += w.slice(0, 3)
    if (prefix.length >= 6) break
  }
  prefix = prefix.slice(0, 9) || 'SKU'
  for (let i = 1; i < 10000; i++) {
    const sku = `${prefix}-${String(i).padStart(3, '0')}`
    if (!taken.has(sku)) return sku
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

export const inventoryService = {
  // Products
  getProducts(params = {}) {
    return api.get('/inventory/products', { params })
  },
  getProduct(id) {
    return api.get(`/inventory/products/${id}`)
  },
  createProduct(data) {
    return api.post('/inventory/products', data)
  },
  updateProduct(id, data) {
    return api.put(`/inventory/products/${id}`, data)
  },
  deleteProduct(id) {
    return api.delete(`/inventory/products/${id}`)
  },

  // Categories
  getCategories() {
    return api.get('/inventory/categories')
  },
  createCategory(data) {
    return api.post('/inventory/categories', data)
  },
  updateCategory(id, data) {
    return api.put(`/inventory/categories/${id}`, data)
  },
  deleteCategory(id) {
    return api.delete(`/inventory/categories/${id}`)
  },

  // Brands
  getBrands() {
    return api.get('/inventory/brands')
  },
  createBrand(data) {
    return api.post('/inventory/brands', data)
  },

  // Stock
  getInventoryItems(params = {}) {
    return api.get('/inventory/items', { params })
  },
  /** { product_id, movement_type: 'in'|'out'|'adjustment', quantity, reason, notes, reference } */
  adjustInventory(data) {
    return api.post('/inventory/items/adjust', data)
  },

  // Locations
  getInventoryLocations() {
    return api.get('/inventory/locations')
  },
  createInventoryLocation(data) {
    return api.post('/inventory/locations', data)
  },

  // Movements & reports
  getInventoryMovements(params = {}) {
    return api.get('/inventory/movements', { params })
  },
  getReport() {
    return api.get('/inventory/report')
  }
}

export default inventoryService
