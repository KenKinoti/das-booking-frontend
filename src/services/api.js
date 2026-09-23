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
import { API_BASE_URL } from '../config'

// Shared axios instance for the whole app
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Login helper kept for backwards compatibility
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password })
    const { token, refresh_token, user } = response.data.data
    localStorage.setItem('auth_token', token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('current_user', JSON.stringify(user))
    return { success: true, data: response.data.data }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error?.message || error.response?.data?.message || 'Login failed'
    }
  }
}

// Attach the bearer token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) throw new Error('No refresh token')
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  )
  const data = response.data?.data || {}
  if (!data.token) throw new Error('Refresh failed')
  localStorage.setItem('auth_token', data.token)
  if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
  return data.token
}

// Refresh expired tokens once, then send the user back to sign in
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}
    const isAuthCall = /\/auth\/(login|refresh)/.test(originalRequest.url || '')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true
      try {
        refreshPromise = refreshPromise || refreshAccessToken()
        const newToken = await refreshPromise
        refreshPromise = null
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        refreshPromise = null
        const { useAuthStore } = await import('../stores/auth')
        const authStore = useAuthStore()
        await authStore.logout({ skipApi: true })
        if (!window.location.pathname.startsWith('/login')) {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login?redirect=${redirect}&expired=1`
        }
      }
    }

    return Promise.reject(error)
  }
)

/** Human friendly message for any API error */
export function apiErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback
  if (!error.response) return 'Cannot reach the server. Check your connection and try again.'
  const d = error.response.data || {}
  return d.error?.message || d.message || (typeof d.error === 'string' ? d.error : '') || fallback
}


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
  getHealth: () => api.get('/health'),

  // Super Admin Organizations
  getAllOrganizations: (params = {}) => api.get('/super-admin/organizations', { params }),
  createOrganization: (organizationData) => api.post('/super-admin/organizations', organizationData),
  updateOrganizationStatus: (organizationId, status) => api.patch(`/super-admin/organizations/${organizationId}/status`, { status }),
  getOrganizationById: (organizationId) => api.get(`/super-admin/organizations/${organizationId}`),
  deleteOrganization: (organizationId) => api.delete(`/super-admin/organizations/${organizationId}`),

  // Organization Module Management
  updateOrganizationModules: (organizationId, moduleConfig) => api.patch(`/super-admin/organizations/${organizationId}/modules`, moduleConfig)
}

// Video Communication Module
export const videoAPI = {
  // Call Management
  initiateCall: (callData) => api.post('/video/calls/initiate', callData),
  acceptCall: (callId) => api.post(`/video/calls/${callId}/accept`),
  rejectCall: (callId) => api.post(`/video/calls/${callId}/reject`),
  endCall: (callId) => api.post(`/video/calls/${callId}/end`),
  getCallHistory: () => api.get('/video/calls/history'),

  // Recording Management
  startRecording: (callId) => api.post(`/video/calls/${callId}/recording/start`),
  stopRecording: (callId) => api.post(`/video/calls/${callId}/recording/stop`),
  getRecordings: () => api.get('/video/recordings'),
  downloadRecording: (recordingId) => api.get(`/video/recordings/${recordingId}/download`),

  // Live Streaming
  createLiveStream: (streamData) => api.post('/video/streams/create', streamData),
  startLiveStream: (streamId) => api.post(`/video/streams/${streamId}/start`),
  endLiveStream: (streamId) => api.post(`/video/streams/${streamId}/end`),
  getLiveStreams: () => api.get('/video/streams'),

  // Room Management
  getRoomInfo: (roomId) => api.get(`/video/rooms/${roomId}/info`),

  // Settings
  getVideoSettings: () => api.get('/video/settings'),
  updateVideoSettings: (settings) => api.put('/video/settings', settings)
}

export default api

/**
 * Extract an array from the many response shapes the backend returns:
 * { data: { key: [] } }, { key: [] }, { data: [] }, [] …
 */
export function listFrom(response, ...keys) {
  const body = response && Object.prototype.hasOwnProperty.call(response, 'data') && response.status ? response.data : response
  const candidates = [body, body?.data]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
    if (c && typeof c === 'object') {
      for (const k of keys) if (Array.isArray(c[k])) return c[k]
    }
  }
  return []
}
