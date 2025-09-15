/**
 * =============================================================================
 * API Service - DASYIN Complete ERP System
 * =============================================================================
 *
 * This service handles all API interactions with the comprehensive ERP backend.
 * All data is fetched from the real database with full ledger management.
 *
 * Backend API Endpoints:
 * ---------------------
 * - /auth/* - Authentication endpoints
 * - /finance/* - Complete finance & accounting with ledger
 * - /inventory/* - Advanced inventory management
 * - /crm/* - Advanced CRM & sales pipeline
 * - /booking/* - Original booking management
 * - /production/* - Production & MRP
 * - /projects/* - Project management
 * - /hcm/* - HCM & payroll
 * - /ecommerce/* - E-commerce integration
 * - /admin/* - Administrative functions
 *
 * =============================================================================
 */

import axios from 'axios'
import { useAuthStore } from '../stores/auth'

// Create axios instance with base configuration for Complete ERP
const api = axios.create({
  baseURL: 'http://localhost:8087/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Login function to get real JWT tokens from ERP backend
export const login = async (email, password) => {
  try {
    const response = await axios.post('http://localhost:8087/api/v1/auth/login', {
      email,
      password
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    })

    const { token, refresh_token, user } = response.data.data
    
    // Store real tokens
    localStorage.setItem('auth_token', token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('user_data', JSON.stringify(user))
    
    return { success: true, data: response.data.data }
  } catch (error) {
    console.error('Login failed:', error)
    return { 
      success: false, 
      message: error.response?.data?.message || 'Login failed' 
    }
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor with auto token refresh
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle network errors gracefully
    if (!error.response) {
      console.warn('Network error, using mock mode for development')
      // Return a mock response for development
      return Promise.resolve({
        data: {
          success: false,
          error: { message: 'Backend not available' }
        }
      })
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken && refreshToken !== 'mock-refresh-token') {
          const response = await axios.post(
            'http://localhost:8087/api/v1/auth/refresh',
            { refresh_token: refreshToken },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000
            }
          )

          const newToken = response.data.data.token
          localStorage.setItem('auth_token', newToken)

          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          return api(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
      }

      // Only logout if not using mock token
      const authToken = localStorage.getItem('auth_token')
      if (authToken !== 'mock-jwt-token-for-testing') {
        const { useAuthStore } = await import('../stores/auth')
        const authStore = useAuthStore()
        await authStore.logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)


// ===== ERP MODULE API FUNCTIONS =====

// Finance & Accounting Module
export const financeAPI = {
  // Chart of Accounts
  getChartOfAccounts: () => api.get('/finance/chart-of-accounts'),
  createAccount: (account) => api.post('/finance/chart-of-accounts', account),

  // Journal Entries & Ledger
  getJournalEntries: () => api.get('/finance/journal-entries'),
  createJournalEntry: (entry) => api.post('/finance/journal-entries', entry),
  postJournalEntry: (entryId) => api.post(`/finance/journal-entries/${entryId}/post`),

  // Financial Reports
  getTrialBalance: (asOfDate) => api.get('/finance/reports/trial-balance', { params: { as_of_date: asOfDate } }),
  getProfitLoss: (startDate, endDate) => api.get('/finance/reports/profit-loss', { params: { start_date: startDate, end_date: endDate } }),
  getBalanceSheet: (asOfDate) => api.get('/finance/reports/balance-sheet', { params: { as_of_date: asOfDate } }),
  getGeneralLedger: (accountId, startDate, endDate) => api.get('/finance/reports/general-ledger', { params: { account_id: accountId, start_date: startDate, end_date: endDate } }),

  // Invoicing & AR
  getInvoices: () => api.get('/finance/invoices'),
  createInvoice: (invoice) => api.post('/finance/invoices', invoice),

  // Bills & AP
  getBills: () => api.get('/finance/bills'),
  createBill: (bill) => api.post('/finance/bills', bill),

  // Vendors
  getVendors: () => api.get('/finance/vendors'),
  createVendor: (vendor) => api.post('/finance/vendors', vendor),

  // Banking
  getBankAccounts: () => api.get('/finance/bank-accounts'),
  createBankAccount: (account) => api.post('/finance/bank-accounts', account),

  // Dashboard
  getDashboard: () => api.get('/finance/dashboard')
}

// Inventory Management Module
export const inventoryAPI = {
  getProducts: () => api.get('/inventory/products'),
  createProduct: (product) => api.post('/inventory/products', product),
  getProduct: (id) => api.get(`/inventory/products/${id}`),
  updateProduct: (id, product) => api.put(`/inventory/products/${id}`, product),
  deleteProduct: (id) => api.delete(`/inventory/products/${id}`),
  getDashboard: () => api.get('/inventory/dashboard')
}

// CRM Module
export const crmAPI = {
  getLeads: () => api.get('/crm/leads'),
  createLead: (lead) => api.post('/crm/leads', lead),
  getLead: (id) => api.get(`/crm/leads/${id}`),
  updateLead: (id, lead) => api.put(`/crm/leads/${id}`, lead),
  deleteLead: (id) => api.delete(`/crm/leads/${id}`),

  getCustomers: () => api.get('/crm/customers'),
  createCustomer: (customer) => api.post('/crm/customers', customer),

  getOpportunities: () => api.get('/crm/opportunities'),
  createOpportunity: (opportunity) => api.post('/crm/opportunities', opportunity),

  getDashboard: () => api.get('/crm/dashboard')
}

// Booking Management Module (Original)
export const bookingAPI = {
  getBookings: () => api.get('/booking/bookings'),
  createBooking: (booking) => api.post('/booking/bookings', booking),
  getBooking: (id) => api.get(`/booking/bookings/${id}`),
  updateBooking: (id, booking) => api.put(`/booking/bookings/${id}`, booking),
  deleteBooking: (id) => api.delete(`/booking/bookings/${id}`),
  updateBookingStatus: (id, status) => api.put(`/booking/bookings/${id}/status`, { status }),
  getAvailableSlots: () => api.get('/booking/available-slots'),

  getCustomers: () => api.get('/booking/customers'),
  createCustomer: (customer) => api.post('/booking/customers', customer),
  getCustomer: (id) => api.get(`/booking/customers/${id}`),
  updateCustomer: (id, customer) => api.put(`/booking/customers/${id}`, customer),

  getServices: () => api.get('/booking/services'),
  createService: (service) => api.post('/booking/services', service),
  getService: (id) => api.get(`/booking/services/${id}`),
  updateService: (id, service) => api.put(`/booking/services/${id}`, service),

  getVehicles: () => api.get('/booking/vehicles'),
  createVehicle: (vehicle) => api.post('/booking/vehicles', vehicle),
  getCustomerVehicles: (customerId) => api.get(`/booking/customer/${customerId}/vehicles`),

  getDashboard: () => api.get('/booking/dashboard')
}

// Production & MRP Module
export const productionAPI = {
  getDashboard: () => api.get('/production/dashboard'),
  getWorkOrders: () => api.get('/production/work-orders'),
  createWorkOrder: (workOrder) => api.post('/production/work-orders', workOrder),
  getBOMs: () => api.get('/production/boms'),
  createBOM: (bom) => api.post('/production/boms', bom)
}

// Project Management Module
export const projectsAPI = {
  getDashboard: () => api.get('/projects/dashboard'),
  getProjects: () => api.get('/projects/projects'),
  createProject: (project) => api.post('/projects/projects', project),
  getTimeEntries: () => api.get('/projects/time-entries'),
  createTimeEntry: (timeEntry) => api.post('/projects/time-entries', timeEntry)
}

// HCM & Payroll Module
export const hcmAPI = {
  getDashboard: () => api.get('/hcm/dashboard'),
  getEmployees: () => api.get('/hcm/employees'),
  createEmployee: (employee) => api.post('/hcm/employees', employee),
  getTimeEntries: () => api.get('/hcm/time-entries'),
  createTimeEntry: (timeEntry) => api.post('/hcm/time-entries', timeEntry),
  getPayrollRecords: () => api.get('/hcm/payroll'),
  createPayrollPeriod: (payrollPeriod) => api.post('/hcm/payroll', payrollPeriod)
}

// E-commerce Integration Module
export const ecommerceAPI = {
  getDashboard: () => api.get('/ecommerce/dashboard'),
  getPlatforms: () => api.get('/ecommerce/platforms'),
  createPlatform: (platform) => api.post('/ecommerce/platforms', platform),
  getOnlineOrders: () => api.get('/ecommerce/orders'),
  triggerSync: () => api.post('/ecommerce/sync')
}

// Admin & System Module
export const adminAPI = {
  getCompleteOverview: () => api.get('/admin/overview'),
  getModuleStatus: () => api.get('/admin/modules'),
  getHealth: () => api.get('/health')
}

export default api
