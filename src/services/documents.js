import api from './api'

/** Document library API. Files are stored in the database (see backend documents.go). */
export const documentsService = {
  /** Returns { documents, pagination } */
  async list(params = {}) {
    const r = await api.get('/documents', { params })
    const d = r.data?.data || {}
    return { documents: d.documents || [], pagination: d.pagination || {} }
  },
  async stats() {
    const r = await api.get('/documents-stats')
    return r.data?.data || {}
  },
  async upload({ file, title, description, category, expiry_date }, onProgress) {
    const fd = new FormData()
    fd.append('file', file)
    if (title) fd.append('title', title)
    if (description) fd.append('description', description)
    fd.append('category', category || 'general')
    if (expiry_date) fd.append('expiry_date', expiry_date)
    const r = await api.post('/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100))
    })
    return r.data?.data
  },
  async update(id, data) {
    const r = await api.put(`/documents/${id}`, data)
    return r.data?.data
  },
  async remove(id) {
    await api.delete(`/documents/${id}`)
  },
  /** Returns a Blob of the file. */
  async file(id, inline = false) {
    const r = await api.get(`/documents/${id}/download`, { params: inline ? { inline: 1 } : {}, responseType: 'blob', timeout: 120000 })
    return r.data
  }
}

export const DOCUMENT_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'contract', label: 'Contracts' },
  { value: 'policy', label: 'Policies & procedures' },
  { value: 'certificate', label: 'Certificates & licences' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'financial', label: 'Financial' },
  { value: 'hr', label: 'HR & staff' },
  { value: 'customer', label: 'Customer files' },
  { value: 'report', label: 'Reports' },
  { value: 'template', label: 'Templates' },
  { value: 'care_plan', label: 'Care plans' },
  { value: 'medical_record', label: 'Medical records' },
  { value: 'incident_report', label: 'Incident reports' },
  { value: 'assessment', label: 'Assessments' }
]

export function categoryLabel(v) {
  return DOCUMENT_CATEGORIES.find((c) => c.value === v)?.label || String(v || 'General').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function fileKind(doc) {
  const t = (doc?.file_type || '').toLowerCase()
  const n = (doc?.original_filename || doc?.name || '').toLowerCase()
  if (t.includes('pdf') || n.endsWith('.pdf')) return 'pdf'
  if (t.startsWith('image/')) return 'image'
  if (t.includes('sheet') || t.includes('excel') || t.includes('csv') || /\.(xlsx?|csv|ods)$/.test(n)) return 'sheet'
  if (t.includes('word') || t.includes('opendocument.text') || /\.(docx?|odt|rtf)$/.test(n)) return 'word'
  if (t.includes('presentation') || /\.(pptx?|odp)$/.test(n)) return 'slides'
  if (t.includes('zip') || /\.(zip|rar|7z)$/.test(n)) return 'archive'
  if (t.startsWith('text/')) return 'text'
  return 'other'
}

export const KIND_ICONS = {
  pdf: 'fa-regular fa-file-pdf',
  image: 'fa-regular fa-file-image',
  sheet: 'fa-regular fa-file-excel',
  word: 'fa-regular fa-file-word',
  slides: 'fa-regular fa-file-powerpoint',
  archive: 'fa-regular fa-file-zipper',
  text: 'fa-regular fa-file-lines',
  other: 'fa-regular fa-file'
}

export function formatBytes(n) {
  const b = Number(n) || 0
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}
