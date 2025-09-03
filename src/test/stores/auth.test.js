import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'

// Mock the auth service
vi.mock('../../services/auth', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn()
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

describe('Auth Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.isLoading).toBe(false)
  })

  it('can set user directly on state', () => {
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' }
    
    store.user = testUser
    expect(store.user).toEqual(testUser)
  })

  it('can set token directly on state', () => {
    const testToken = 'test-token-123'
    
    store.token = testToken
    expect(store.token).toBe(testToken)
  })

  it('isAuthenticated requires both user and token', () => {
    // No user or token
    expect(store.isAuthenticated).toBe(false)
    
    // Only token
    store.token = 'test-token'
    expect(store.isAuthenticated).toBe(false)
    
    // Only user
    store.token = null
    store.user = { id: 1, name: 'Test' }
    expect(store.isAuthenticated).toBe(false)
    
    // Both user and token
    store.token = 'test-token'
    expect(store.isAuthenticated).toBe(true)
  })

  it('validates JWT format correctly', () => {
    expect(store.isValidJWT('invalid')).toBe(false)
    expect(store.isValidJWT('header.payload.signature')).toBe(true)
    expect(store.isValidJWT('')).toBe(false)
    expect(store.isValidJWT(null)).toBe(false)
  })
})