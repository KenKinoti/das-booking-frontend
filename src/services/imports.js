import api from './api'

const unwrap = (r) => r.data?.data

// Data import (Zoho Books API + CSV/XLSX files) — backend pkg/zoho.
export const importsApi = {
  // Zoho Books connection
  connection: () => api.get('/imports/zoho/connection').then(unwrap),
  saveConnection: (payload) => api.put('/imports/zoho/connection', payload).then(unwrap),
  disconnect: () => api.delete('/imports/zoho/connection').then(unwrap),
  connect: (returnTo) => api.post('/imports/zoho/connect', { return_to: returnTo }).then(unwrap),
  organizations: () => api.get('/imports/zoho/organizations').then(unwrap),
  chooseOrganization: (id) => api.put('/imports/zoho/organization', { organization_id: id }).then(unwrap),
  previewZoho: (options) => api.post('/imports/zoho/preview', { options }).then(unwrap),

  // Jobs
  jobs: () => api.get('/imports/jobs').then(unwrap),
  job: (id) => api.get(`/imports/jobs/${id}`).then(unwrap),
  removeJob: (id) => api.delete(`/imports/jobs/${id}`).then(unwrap),
  saveOptions: (id, options) => api.put(`/imports/jobs/${id}/options`, options).then(unwrap),
  preview: (id, options) => api.post(`/imports/jobs/${id}/preview`, { options }).then(unwrap),
  start: (id, options) => api.post(`/imports/jobs/${id}/start`, { options }).then(unwrap),
  cancel: (id) => api.post(`/imports/jobs/${id}/cancel`).then(unwrap),
  resume: (id) => api.post(`/imports/jobs/${id}/resume`).then(unwrap),
  undo: (id) => api.post(`/imports/jobs/${id}/undo`, { confirm: true }).then(unwrap),
  errors: (id, params) => api.get(`/imports/jobs/${id}/errors`, { params }).then(unwrap),
  errorsCsv: (id) => api.get(`/imports/jobs/${id}/errors.csv`, { responseType: 'blob' }).then((r) => r.data),

  // Files
  fields: () => api.get('/imports/fields').then(unwrap),
  upload: (files, jobId) => {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    const url = jobId ? `/imports/jobs/${jobId}/files` : '/imports/files'
    return api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap)
  },
  files: (id) => api.get(`/imports/jobs/${id}/files`).then(unwrap),
  updateFile: (id, fileId, payload) => api.put(`/imports/jobs/${id}/files/${fileId}`, payload).then(unwrap),
  removeFile: (id, fileId) => api.delete(`/imports/jobs/${id}/files/${fileId}`).then(unwrap),

  // Original documents kept with invoices
  attachments: (invoiceId) => api.get(`/invoicing/invoices/${invoiceId}/attachments`).then(unwrap),
  attachmentBlob: (invoiceId, attId) => api.get(`/invoicing/invoices/${invoiceId}/attachments/${attId}`, { responseType: 'blob' }).then((r) => r.data)
}

export const JOB_STATUS = {
  draft: { label: 'Files uploaded', badge: 'ui-badge--draft' },
  previewing: { label: 'Building preview', badge: 'ui-badge--info' },
  preview: { label: 'Ready to import', badge: 'ui-badge--info' },
  queued: { label: 'Queued', badge: 'ui-badge--info' },
  running: { label: 'Importing', badge: 'ui-badge--info' },
  paused: { label: 'Paused', badge: 'ui-badge--warning' },
  completed: { label: 'Completed', badge: 'ui-badge--success' },
  failed: { label: 'Stopped with an error', badge: 'ui-badge--danger' },
  cancelled: { label: 'Stopped', badge: 'ui-badge--draft' },
  undone: { label: 'Undone', badge: 'ui-badge--void' }
}

export const SOURCE_LABEL = { zoho_api: 'Zoho Books (live)', csv: 'Files' }

export const ENTITY_ORDER = ['settings', 'items', 'contacts', 'contact_persons', 'quotes', 'invoices', 'payments', 'credit_notes', 'recurring', 'pdfs', 'history']

// Links to the imported records, filtered by this job.
export function entityLink(entity, jobId) {
  switch (entity) {
    case 'contacts':
    case 'contact_persons':
      return { path: '/customers', query: { import_job: jobId } }
    case 'invoices':
    case 'payments':
    case 'pdfs':
    case 'history':
      return { path: '/invoices', query: { import_job: jobId } }
    case 'quotes':
      return { path: '/quotes', query: { import_job: jobId } }
    default:
      return null
  }
}
