import api from './api'

const data = (r) => r.data?.data ?? r.data

/**
 * "Getting started" (pkg/onboarding): basic steps on how to use DASYIN from
 * the signed-in person's point of view (their role and business type).
 *
 * GET  /onboarding/me → { role_key, role_name, role_base, type_key, type_name, first_name, org_name,
 *                         steps: [{ key, title, description, to, done, auto }],
 *                         welcomed, dismissed, done_count, total, percent, all_done, preview, hidden }
 * Every write answers with the same shape. A super admin viewing an
 * organisation gets the owner's steps with preview: true (nothing is saved).
 */
export const onboardingAPI = {
  me: () => api.get('/onboarding/me').then(data),
  welcomed: () => api.post('/onboarding/me/welcomed').then(data),
  setStep: (key, done = true) => api.post(`/onboarding/me/steps/${encodeURIComponent(key)}`, { done }).then(data),
  dismiss: (dismissed = true) => api.post('/onboarding/me/dismiss', { dismissed }).then(data),
  restart: () => api.post('/onboarding/me/restart').then(data)
}
