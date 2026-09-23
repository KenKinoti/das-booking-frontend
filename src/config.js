/**
 * Central runtime configuration.
 *
 * VITE_API_BASE_URL overrides everything (set it in .env.production for other
 * environments). In development the Vite dev server proxies /api to the Go
 * backend, so a relative URL is used.
 */
const PROD_API = 'https://das-erp-go-backend-567187485284.australia-southeast1.run.app/api/v1'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api/v1' : PROD_API)
).replace(/\/$/, '')

/** Backend origin (no /api/v1), used for /health and websockets. */
export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL, window.location.origin).origin
  } catch {
    return window.location.origin
  }
})()

export const WS_ORIGIN = API_ORIGIN.replace(/^http/, 'ws')

export const APP_NAME = import.meta.env.VITE_APP_TITLE || 'DASYIN ERP'
