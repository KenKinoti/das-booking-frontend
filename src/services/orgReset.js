// Platform admin: reset an organisation for handover (pkg/platform/orgreset.go).
//
//   preview(id, opts)            dry run: per group / table what is removed, updated or kept
//   reset(id, opts, confirmName) the reset itself (confirmName = the organisation's exact name)
//   backup(id, opts)             ZIP of JSON files of everything the reset removes → { blob, filename, size }
//
// opts: { keep_customers (default false), keep_catalogue (default true), keep_staff (default true) }
import api from './api'

const BASE = '/super-admin/platform/organizations'
const d = (r) => r.data?.data ?? r.data

export const RESET_DEFAULTS = Object.freeze({ keep_customers: false, keep_catalogue: true, keep_staff: true })

function clean(opts = {}) {
  return {
    keep_customers: !!(opts.keep_customers ?? RESET_DEFAULTS.keep_customers),
    keep_catalogue: !!(opts.keep_catalogue ?? RESET_DEFAULTS.keep_catalogue),
    keep_staff: !!(opts.keep_staff ?? RESET_DEFAULTS.keep_staff)
  }
}

// A failed blob download carries the JSON error as a Blob: make it readable
// for apiErrorMessage.
async function blobError(e) {
  const data = e?.response?.data
  if (data && typeof data.text === 'function') {
    try {
      e.response.data = JSON.parse(await data.text())
    } catch {
      e.response.data = {}
    }
  }
  return e
}

function filenameOf(res, fallback) {
  const cd = res.headers?.['content-disposition'] || ''
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
  return m ? decodeURIComponent(m[1]) : fallback
}

export const orgResetAPI = {
  preview: (id, opts) => api.post(`${BASE}/${id}/reset`, { ...clean(opts), dry_run: true }, { timeout: 120000 }).then(d),
  reset: (id, opts, confirmName) =>
    api.post(`${BASE}/${id}/reset`, { ...clean(opts), dry_run: false, confirm_name: confirmName }, { timeout: 300000 }).then(d),
  async backup(id, opts) {
    try {
      const res = await api.get(`${BASE}/${id}/export`, { params: clean(opts), responseType: 'blob', timeout: 300000 })
      const blob = res.data
      return { blob, filename: filenameOf(res, `organisation-backup-${new Date().toISOString().slice(0, 10)}.zip`), size: blob.size || 0 }
    } catch (e) {
      throw await blobError(e)
    }
  }
}

export default orgResetAPI
