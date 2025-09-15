import api from './api'

// Mock data for development
const mockTransactions = [
  {
    id: '1',
    transaction_number: 'TXN-2024-001',
    customer_id: null,
    customer_name: 'Walk-in Customer',
    subtotal: 155.00,
    tax_amount: 15.50,
    discount_amount: 0,
    total_amount: 170.50,
    payment_method: 'cash',
    payment_status: 'completed',
    status: 'completed',
    created_at: '2024-03-15T14:30:00Z',
    items: [
      {
        id: '1',
        product_id: '1',
        product_name: 'Engine Oil 5W-30',
        quantity: 2,
        unit_price: 35.00,
        total_price: 70.00
      },
      {
        id: '2',
        product_id: '2',
        product_name: 'Brake Pads Front',
        quantity: 1,
        unit_price: 85.00,
        total_price: 85.00
      }
    ]
  },
  {
    id: '2',
    transaction_number: 'TXN-2024-002',
    customer_id: '1',
    customer_name: 'John Smith',
    subtotal: 450.00,
    tax_amount: 45.00,
    discount_amount: 22.50,
    total_amount: 472.50,
    payment_method: 'card',
    payment_status: 'completed',
    status: 'completed',
    created_at: '2024-03-15T16:45:00Z',
    items: [
      {
        id: '3',
        product_id: '3',
        product_name: 'Tire Set (4x)',
        quantity: 1,
        unit_price: 450.00,
        total_price: 450.00
      }
    ]
  }
]

const mockDiscounts = [
  {
    id: '1',
    name: 'Customer Loyalty',
    type: 'percentage',
    value: 5.0,
    is_active: true,
    valid_from: '2024-01-01',
    valid_until: '2024-12-31'
  },
  {
    id: '2',
    name: 'Bulk Purchase',
    type: 'fixed',
    value: 50.0,
    minimum_amount: 500.0,
    is_active: true,
    valid_from: '2024-01-01',
    valid_until: '2024-12-31'
  }
]

const mockTaxRates = [
  {
    id: '1',
    name: 'GST',
    rate: 10.0,
    is_default: true,
    is_active: true
  }
]

const mockCashDrawers = [
  {
    id: '1',
    staff_id: 'staff-1',
    staff_name: 'John Cashier',
    opening_amount: 200.00,
    closing_amount: 1250.75,
    expected_amount: 1230.50,
    difference: 20.25,
    opened_at: '2024-03-15T09:00:00Z',
    closed_at: '2024-03-15T18:00:00Z',
    status: 'closed'
  }
]

export const posService = {
  // Transactions
  async getTransactions(params = {}) {
    try {
      const response = await api.get('/pos/transactions', { params })
      return response
    } catch (error) {
      console.warn('Using mock data for transactions:', error.message)
      return {
        data: {
          transactions: mockTransactions.filter(t => {
            if (params.status) {
              return t.status === params.status
            }
            if (params.payment_method) {
              return t.payment_method === params.payment_method
            }
            if (params.search) {
              const search = params.search.toLowerCase()
              return t.transaction_number.toLowerCase().includes(search) ||
                     t.customer_name.toLowerCase().includes(search)
            }
            return true
          })
        }
      }
    }
  },

  async getTransaction(id) {
    return api.get(`/pos/transactions/${id}`)
  },

  async createTransaction(transactionData) {
    return api.post('/pos/transactions', transactionData)
  },

  async voidTransaction(id, reason) {
    return api.post(`/pos/transactions/${id}/void`, { reason })
  },

  // Cash Drawer
  async getCashDrawers(params = {}) {
    try {
      const response = await api.get('/pos/cash-drawer', { params })
      return response
    } catch (error) {
      console.warn('Using mock data for cash drawers:', error.message)
      return {
        data: {
          cash_drawers: mockCashDrawers.filter(cd => {
            if (params.status) {
              return cd.status === params.status
            }
            if (params.staff_id) {
              return cd.staff_id === params.staff_id
            }
            return true
          })
        }
      }
    }
  },

  async openCashDrawer(drawerData) {
    return api.post('/pos/cash-drawer/open', drawerData)
  },

  async closeCashDrawer(id, closingData) {
    return api.post(`/pos/cash-drawer/${id}/close`, closingData)
  },

  // Discounts
  async getDiscounts() {
    try {
      const response = await api.get('/pos/discounts')
      return response
    } catch (error) {
      console.warn('Using mock data for discounts:', error.message)
      return {
        data: {
          discounts: mockDiscounts.filter(d => d.is_active)
        }
      }
    }
  },

  async createDiscount(discountData) {
    return api.post('/pos/discounts', discountData)
  },

  // Tax Rates
  async getTaxRates() {
    try {
      const response = await api.get('/pos/tax-rates')
      return response
    } catch (error) {
      console.warn('Using mock data for tax rates:', error.message)
      return {
        data: {
          tax_rates: mockTaxRates.filter(tr => tr.is_active)
        }
      }
    }
  },

  async createTaxRate(taxRateData) {
    return api.post('/pos/tax-rates', taxRateData)
  },

  // Reports
  async getPOSReport(params = {}) {
    try {
      const response = await api.get('/pos/report', { params })
      return response
    } catch (error) {
      console.warn('Using mock data for POS report:', error.message)
      const totalSales = mockTransactions.reduce((sum, t) => sum + t.total_amount, 0)
      const todaysTransactions = mockTransactions.filter(t => {
        const today = new Date().toISOString().split('T')[0]
        return t.created_at.startsWith(today)
      })

      return {
        data: {
          report: {
            total_sales: totalSales,
            total_transactions: mockTransactions.length,
            cash_sales: mockTransactions.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + t.total_amount, 0),
            card_sales: mockTransactions.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + t.total_amount, 0),
            todays_sales: todaysTransactions.reduce((sum, t) => sum + t.total_amount, 0),
            todays_transactions: todaysTransactions.length,
            recent_transactions: mockTransactions.slice(0, 10),
            top_products: [
              { product_name: 'Engine Oil 5W-30', quantity_sold: 15, total_revenue: 525.00 },
              { product_name: 'Brake Pads Front', quantity_sold: 8, total_revenue: 680.00 },
              { product_name: 'Tire Set (4x)', quantity_sold: 3, total_revenue: 1350.00 }
            ]
          }
        }
      }
    }
  },

  // Returns & Exchanges
  async processReturn(returnData) {
    try {
      const response = await api.post('/pos/returns', returnData)
      return response
    } catch (error) {
      console.warn('Using mock data for return processing:', error.message)
      return {
        data: {
          return_transaction: {
            id: `RTN-${Date.now()}`,
            original_transaction_id: returnData.original_transaction_id,
            return_amount: returnData.refund_amount,
            refund_method: returnData.refund_method,
            return_reason: returnData.return_reason,
            processed_at: new Date().toISOString(),
            status: 'completed'
          }
        }
      }
    }
  }
}