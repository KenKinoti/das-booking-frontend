import api from './api'

// Projects module + Jira Cloud sync (backend: /api/v1/pm)
const base = '/pm'
const unwrap = (r) => r.data?.data

export const pmApi = {
  stats: () => api.get(`${base}/stats`).then(unwrap),

  listProjects: (params) => api.get(`${base}/projects`, { params }).then(unwrap),
  getProject: (id) => api.get(`${base}/projects/${id}`).then(unwrap),
  createProject: (payload) => api.post(`${base}/projects`, payload).then(unwrap),
  updateProject: (id, payload) => api.put(`${base}/projects/${id}`, payload).then(unwrap),
  deleteProject: (id) => api.delete(`${base}/projects/${id}`).then(unwrap),

  listTasks: (projectId, params) => api.get(`${base}/projects/${projectId}/tasks`, { params }).then(unwrap),
  createTask: (projectId, payload) => api.post(`${base}/projects/${projectId}/tasks`, payload).then(unwrap),
  updateTask: (id, payload) => api.put(`${base}/tasks/${id}`, payload).then(unwrap),
  deleteTask: (id) => api.delete(`${base}/tasks/${id}`).then(unwrap),

  jiraConnection: () => api.get(`${base}/jira/connection`).then(unwrap),
  saveJiraConnection: (payload) => api.put(`${base}/jira/connection`, payload).then(unwrap),
  disconnectJira: (keepData = false) => api.delete(`${base}/jira/connection`, { params: keepData ? { keep_data: 1 } : {} }).then(unwrap),
  testJira: (payload) => api.post(`${base}/jira/test`, payload || {}).then(unwrap),
  jiraProjects: () => api.get(`${base}/jira/projects`).then(unwrap),
  syncJira: (projectKeys) => api.post(`${base}/jira/sync`, projectKeys ? { project_keys: projectKeys } : {}, { timeout: 300000 }).then(unwrap)
}

export const PROJECT_STATUSES = [
  { value: 'planned', label: 'Planned', badge: 'info' },
  { value: 'active', label: 'Active', badge: 'success' },
  { value: 'on_hold', label: 'On hold', badge: 'warning' },
  { value: 'completed', label: 'Completed', badge: 'draft' }
]

export const TASK_CATEGORIES = [
  { value: 'todo', label: 'To do', icon: 'fa-regular fa-circle' },
  { value: 'in_progress', label: 'In progress', icon: 'fa-solid fa-circle-half-stroke' },
  { value: 'done', label: 'Done', icon: 'fa-solid fa-circle-check' }
]

export const PRIORITIES = [
  { value: 'highest', label: 'Highest', icon: 'fa-solid fa-angles-up', tone: 'danger' },
  { value: 'high', label: 'High', icon: 'fa-solid fa-angle-up', tone: 'danger' },
  { value: 'medium', label: 'Medium', icon: 'fa-solid fa-equals', tone: 'warning' },
  { value: 'low', label: 'Low', icon: 'fa-solid fa-angle-down', tone: 'info' },
  { value: 'lowest', label: 'Lowest', icon: 'fa-solid fa-angles-down', tone: 'info' }
]

export const TASK_TYPES = ['Task', 'Bug', 'Story', 'Epic', 'Improvement']

export function projectStatus(value) {
  return PROJECT_STATUSES.find((s) => s.value === value) || { value, label: value || '—', badge: 'draft' }
}

export function priorityMeta(name) {
  const v = String(name || '').toLowerCase()
  return PRIORITIES.find((p) => p.value === v) || null
}

export function typeIcon(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('bug')) return 'fa-solid fa-bug'
  if (t.includes('story')) return 'fa-solid fa-bookmark'
  if (t.includes('epic')) return 'fa-solid fa-bolt'
  if (t.includes('sub')) return 'fa-solid fa-diagram-successor'
  if (t.includes('improve')) return 'fa-solid fa-arrow-trend-up'
  return 'fa-solid fa-square-check'
}

export function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function isOverdue(task) {
  if (!task?.due_date || task.status_category === 'done') return false
  const due = new Date(String(task.due_date).slice(0, 10) + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}
