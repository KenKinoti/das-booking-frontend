import api from './api'

// Mock data for development
const mockProducts = [
  {
    id: '1',
    name: 'Engine Oil 5W-30',
    description: 'High quality synthetic engine oil',
    sku: 'ENG-OIL-5W30',
    category_id: '1',
    brand_id: '1',
    unit_of_measure: 'liter',
    cost_price: 25.00,
    selling_price: 35.00,
    current_stock: 50,
    reorder_point: 10,
    is_active: true,
    category: { id: '1', name: 'Oils & Fluids' },
    brand: { id: '1', name: 'Castrol' }
  },
  {
    id: '2',
    name: 'Brake Pads Front',
    description: 'Ceramic brake pads for front wheels',
    sku: 'BRK-PAD-FRT',
    category_id: '2',
    brand_id: '2',
    unit_of_measure: 'set',
    cost_price: 80.00,
    selling_price: 120.00,
    current_stock: 5,
    reorder_point: 8,
    is_active: true,
    category: { id: '2', name: 'Brake System' },
    brand: { id: '2', name: 'Brembo' }
  }
]

const mockCategories = [
  { id: '1', name: 'Oils & Fluids', description: 'Engine oils, coolants, brake fluids' },
  { id: '2', name: 'Brake System', description: 'Brake pads, discs, and components' },
  { id: '3', name: 'Engine Parts', description: 'Engine components and parts' }
]

const mockBrands = [
  { id: '1', name: 'Castrol', description: 'Premium lubricants' },
  { id: '2', name: 'Brembo', description: 'Brake system specialist' },
  { id: '3', name: 'Bosch', description: 'Automotive technology' }
]

export const inventoryService = {
  // Products
  async getProducts(params = {}) {
    try {
      const response = await api.get('/inventory/products', { params })
      return response
    } catch (error) {
      console.warn('Using mock data for products:', error.message)
      return {
        data: {
          products: mockProducts.filter(p => {
            if (params.search) {
              const search = params.search.toLowerCase()
              return p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
            }
            if (params.category_id) {
              return p.category_id === params.category_id
            }
            if (params.is_active !== undefined) {
              return p.is_active === params.is_active
            }
            return true
          })
        }
      }
    }
  },

  async getProduct(id) {
    return api.get(`/inventory/products/${id}`)
  },

  async createProduct(productData) {
    return api.post('/inventory/products', productData)
  },

  async updateProduct(id, productData) {
    return api.put(`/inventory/products/${id}`, productData)
  },

  async deleteProduct(id) {
    return api.delete(`/inventory/products/${id}`)
  },

  // Categories
  async getCategories() {
    return api.get('/inventory/categories')
  },

  async createCategory(categoryData) {
    return api.post('/inventory/categories', categoryData)
  },

  // Brands
  async getBrands() {
    return api.get('/inventory/brands')
  },

  async createBrand(brandData) {
    return api.post('/inventory/brands', brandData)
  },

  // Inventory Items
  async getInventoryItems(params = {}) {
    return api.get('/inventory/items', { params })
  },

  async adjustInventory(adjustmentData) {
    return api.post('/inventory/items/adjust', adjustmentData)
  },

  // Locations
  async getInventoryLocations() {
    return api.get('/inventory/locations')
  },

  async createInventoryLocation(locationData) {
    return api.post('/inventory/locations', locationData)
  },

  // Reports
  async getInventoryMovements(params = {}) {
    return api.get('/inventory/movements', { params })
  },

  async getReport() {
    return api.get('/inventory/report')
  }
}