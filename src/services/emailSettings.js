// Outgoing email account (organisation settings or, for super admins, the
// platform default). Backend: pkg/mail.
import api from './api'

const unwrap = (r) => r.data?.data ?? r.data

export const emailSettingsApi = {
  get: (scope) => api.get('/email-settings', { params: { scope } }).then(unwrap),
  save: (scope, body) => api.put('/email-settings', body, { params: { scope } }).then(unwrap),
  status: () => api.get('/email-settings/status').then(unwrap),
  test: (scope, body) => api.post('/email-settings/test', body || {}, { params: { scope }, timeout: 45000 }).then(unwrap),
  verify: (scope, body) => api.post('/email-settings/verify', body || {}, { params: { scope }, timeout: 45000 }).then(unwrap)
}

export const SOURCE_LABELS = {
  organisation: 'Organisation settings',
  platform: 'Platform default',
  environment: 'Server environment (SMTP_*)',
  '': 'Not set up'
}

export const SECURITY_LABELS = { starttls: 'STARTTLS', tls: 'STARTTLS', auto: 'STARTTLS if offered', ssl: 'SSL/TLS', none: 'None' }

export const PRESETS = {
  gmail: { label: 'Gmail / Google Workspace', provider: 'gmail', smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_security: 'starttls' },
  outlook: { label: 'Microsoft 365 / Outlook', provider: 'outlook', smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_security: 'starttls' }
}
