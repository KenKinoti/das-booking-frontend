import { defineStore } from 'pinia'
import { authService } from '../services/auth'
import { apiErrorMessage } from '../services/api'
import { seedBranding, loadBranding, clearBranding } from '../composables/useBranding'

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function isJWT(token) {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    error: null,
    _initializing: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isSuperAdmin: (state) => state.user?.role === 'super_admin',
    isAdmin: (state) => ['super_admin', 'admin'].includes(state.user?.role),
    userName: (state) => {
      if (!state.user) return 'User'
      return `${state.user.first_name || ''} ${state.user.last_name || ''}`.trim() || state.user.email
    },
    userInitials: (state) => {
      if (!state.user) return 'U'
      const first = state.user.first_name?.[0] || state.user.email?.[0] || ''
      const last = state.user.last_name?.[0] || ''
      return (first + last).toUpperCase() || 'U'
    }
  },

  actions: {
    async login(credentials) {
      this.isLoading = true
      this.error = null
      try {
        const response = await authService.login({
          email: (credentials.email || '').trim(),
          password: credentials.password
        })
        const payload = response.data?.data || response.data || {}
        if (!payload.token || !payload.user) {
          throw new Error(response.data?.error?.message || 'Login failed')
        }
        this.setSession(payload.token, payload.refresh_token, payload.user)
        return payload
      } catch (error) {
        this.error = error.response?.status === 401
          ? 'Incorrect email or password.'
          : apiErrorMessage(error, error.message || 'Login failed')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    setSession(token, refreshToken, user) {
      this.token = token
      this.refreshToken = refreshToken || null
      this.user = user
      localStorage.setItem('auth_token', token)
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
      localStorage.setItem('current_user', JSON.stringify(user))
      // Company name + logo for the sidebar and documents
      seedBranding(user)
      loadBranding({ force: true })
    },

    async logout(options = {}) {
      try {
        if (!options.skipApi && isJWT(this.token)) {
          await authService.logout()
        }
      } catch {
        // ignore – local cleanup below always runs
      } finally {
        this.token = null
        this.refreshToken = null
        this.user = null
        this.error = null
        clearBranding()
        ;['auth_token', 'refresh_token', 'current_user', 'user_data', 'lastRoute', 'lastRouteName'].forEach((k) =>
          localStorage.removeItem(k)
        )
      }
    },

    isValidJWT(token) {
      return isJWT(token)
    },

    async getCurrentUser() {
      if (!this.token) return false
      try {
        const response = await authService.getCurrentUser()
        const user = response.data?.data || response.data?.user || null
        if (user && user.id) {
          this.user = user
          localStorage.setItem('current_user', JSON.stringify(user))
          seedBranding(user)
          return true
        }
        return !!this.user
      } catch (error) {
        if (error.response?.status === 401) {
          await this.logout({ skipApi: true })
          return false
        }
        // Network problems: keep the cached session
        return !!this.user
      }
    },

    async checkAuth() {
      return this.initializeAuth()
    },

    /** Restore the session from localStorage (once per page load). */
    async initializeAuth() {
      if (this._initializing) return this._initializing
      this._initializing = (async () => {
        const token = localStorage.getItem('auth_token')
        if (!isJWT(token)) {
          await this.logout({ skipApi: true })
          return false
        }
        this.token = token
        this.refreshToken = localStorage.getItem('refresh_token')
        this.user = readJSON('current_user') || readJSON('user_data')
        if (!this.user) return this.getCurrentUser()
        // Validate in the background so navigation isn't blocked
        this.getCurrentUser()
        return true
      })()
      try {
        return await this._initializing
      } finally {
        this._initializing = null
      }
    }
  }
})
