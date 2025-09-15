import api from './api'

// Mock data for development
const mockSuppliers = [
  {
    id: '1',
    name: 'AutoParts Pro',
    contact_name: 'John Smith',
    email: 'john@autopartspro.com',
    phone: '+61 2 9876 5432',
    address: '123 Industrial Rd, Sydney NSW 2000',
    status: 'active',
    payment_terms: 'Net 30',
    tax_number: 'ABN 12 345 678 901',
    created_at: '2024-01-15T09:00:00Z'
  },
  {
    id: '2',
    name: 'Premium Automotive',
    contact_name: 'Sarah Wilson',
    email: 'sarah@premiumauto.com.au',
    phone: '+61 3 8765 4321',
    address: '456 Supply St, Melbourne VIC 3000',
    status: 'active',
    payment_terms: 'Net 15',
    tax_number: 'ABN 98 765 432 109',
    created_at: '2024-02-01T10:30:00Z'
  }
]

const mockPurchaseOrders = [
  {
    id: '1',
    order_number: 'PO-2024-001',
    supplier_id: '1',
    supplier: { id: '1', name: 'AutoParts Pro' },
    order_date: '2024-03-01',
    expected_date: '2024-03-15',
    status: 'sent',
    sub_total: 1250.00,
    tax_amount: 125.00,
    shipping_cost: 50.00,
    total_amount: 1425.00,
    notes: 'Urgent order for brake system parts',
    items: [
      {
        id: '1',
        product_id: '2',
        quantity: 5,
        unit_cost: 120.00,
        total_cost: 600.00
      },
      {
        id: '2',
        product_id: '1',
        quantity: 10,
        unit_cost: 35.00,
        total_cost: 350.00
      }
    ]
  }
]

export const supplierService = {
  // Suppliers
  async getSuppliers(params = {}) {
    try {
      const response = await api.get('/suppliers', { params })
      return response
    } catch (error) {
      console.warn('Using mock data for suppliers:', error.message)
      return {
        data: {
          suppliers: mockSuppliers.filter(s => {
            if (params.search) {
              const search = params.search.toLowerCase()
              return s.name.toLowerCase().includes(search) ||
                     s.contact_name.toLowerCase().includes(search) ||
                     s.email.toLowerCase().includes(search)
            }
            if (params.status) {
              return s.status === params.status
            }
            return true
          })
        }
      }
    }
  },

  async getSupplier(id) {
    return api.get(`/suppliers/${id}`)
  },

  async createSupplier(supplierData) {
    return api.post('/suppliers', supplierData)
  },

  async updateSupplier(id, supplierData) {
    return api.put(`/suppliers/${id}`, supplierData)
  },

  async deleteSupplier(id) {
    return api.delete(`/suppliers/${id}`)
  },

  // Purchase Orders
  async getPurchaseOrders(params = {}) {
    try {
      const response = await api.get('/suppliers/purchase-orders', { params })
      return response
    } catch (error) {
      console.warn('Using mock data for purchase orders:', error.message)
      return {
        data: {
          purchase_orders: mockPurchaseOrders.filter(po => {
            if (params.supplier_id) {
              return po.supplier_id === params.supplier_id
            }
            if (params.status) {
              return po.status === params.status
            }
            if (params.search) {
              const search = params.search.toLowerCase()
              return po.order_number.toLowerCase().includes(search) ||
                     po.supplier.name.toLowerCase().includes(search)
            }
            return true
          })
        }
      }
    }
  },

  async getPurchaseOrder(id) {
    return api.get(`/suppliers/purchase-orders/${id}`)
  },

  async createPurchaseOrder(orderData) {
    return api.post('/suppliers/purchase-orders', orderData)
  },

  async updatePurchaseOrderStatus(id, status) {
    return api.patch(`/suppliers/purchase-orders/${id}/status`, { status })
  },

  async receivePurchaseOrder(id, receivedItems) {
    return api.post(`/suppliers/purchase-orders/${id}/receive`, { received_items: receivedItems })
  },

  // Reports
  async getSupplierReport() {
    try {
      const response = await api.get('/suppliers/report')
      return response
    } catch (error) {
      console.warn('Using mock data for supplier report:', error.message)
      return {
        data: {
          report: {
            total_suppliers: mockSuppliers.length,
            active_suppliers: mockSuppliers.filter(s => s.status === 'active').length,
            total_purchases: 15250.75,
            recent_orders: mockPurchaseOrders,
            top_suppliers: [
              {
                supplier_name: 'AutoParts Pro',
                order_count: 8,
                total_amount: 9850.50
              },
              {
                supplier_name: 'Premium Automotive',
                order_count: 5,
                total_amount: 5400.25
              }
            ]
          }
        }
      }
    }
  }
}