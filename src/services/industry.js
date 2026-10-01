import api from './api'

const data = (r) => r.data?.data ?? r.data

/** Business types, roles and the setup wizard (pkg/industry). */
export const industryAPI = {
  me: () => api.get('/industry/me').then(data),
  /** { types, modules, actions } — pass all=true (super admins) to include inactive ones. */
  types: (all = false) => api.get('/industry/types', { params: all ? { all: true } : {} }).then(data),
  type: (key) => api.get(`/industry/types/${key}`).then(data),
  updateType: (key, body) => api.put(`/industry/types/${key}`, body).then(data),
  createType: (body) => api.post('/industry/types', body).then(data),
  resetType: (key) => api.post(`/industry/types/${key}/reset`).then(data),

  setType: (type) => api.put('/industry/org/type', { type }).then(data),
  setExtras: (modules) => api.put('/industry/org/extras', { modules }).then(data),
  setSetup: (status, step = '') => api.put('/industry/org/setup', { status, step }).then(data),

  /** { roles, modules, actions } */
  roles: () => api.get('/industry/roles').then(data),
  createRole: (body) => api.post('/industry/roles', body).then(data),
  updateRole: (id, body) => api.put(`/industry/roles/${id}`, body).then(data),
  deleteRole: (id) => api.delete(`/industry/roles/${id}`).then(data),
  /** { assignments: { [userId]: { role_id, key, name, base, scope, explicit } } } */
  assignments: () => api.get('/industry/assignments').then(data),
  assign: (userId, roleId) => api.put(`/industry/assignments/${userId}`, { role_id: roleId }).then(data)
}

export const ACTION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve' }

export const BASE_LEVELS = [
  { value: 'admin', label: 'Admin', hint: 'Full access, including settings, billing and users' },
  { value: 'manager', label: 'Manager', hint: 'Runs the business day to day' },
  { value: 'staff', label: 'Staff', hint: 'Only what the permissions below allow' },
  { value: 'read_only', label: 'Read-only', hint: 'Can look but never change anything' }
]

export const MODULE_LABELS = {
  core: 'Dashboard & reports',
  team: 'Staff & users',
  smallbiz: 'Business hub',
  invoicing: 'Invoicing & quotes',
  pos: 'Point of sale',
  ecommerce: 'E-commerce',
  crm: 'Customers & CRM',
  bookings: 'Bookings & services',
  events: 'Events & ticketing',
  inventory: 'Inventory & suppliers',
  manufacturing: 'Manufacturing',
  accounting: 'Accounting & banking',
  hr: 'HR & payroll',
  projects: 'Projects',
  documents: 'Documents',
  communication: 'Communication'
}

export function moduleLabel(key) {
  return MODULE_LABELS[key] || key
}
