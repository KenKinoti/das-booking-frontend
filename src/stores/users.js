import { defineStore } from 'pinia'
import { usersService } from '../services/users'
import { apiErrorMessage } from '../services/api'

/** Organisation users (staff). Thin cache over usersService. */
export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    summary: {},
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 500, total: 0, totalPages: 0 }
  }),

  getters: {
    activeUsers: (state) => state.users.filter((u) => u.is_active),
    staff: (state) => state.users,
    usersByRole: (state) =>
      state.users.reduce((acc, u) => {
        ;(acc[u.role] = acc[u.role] || []).push(u)
        return acc
      }, {})
  },

  actions: {
    async fetchUsers(params = {}) {
      this.isLoading = true
      this.error = null
      try {
        const { users, pagination, summary } = await usersService.list({ limit: 500, sort: 'name', ...params })
        this.users = users
        this.summary = summary
        this.pagination = { page: pagination.page || 1, limit: pagination.limit || 500, total: pagination.total || users.length, totalPages: pagination.total_pages || 1 }
        return users
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load users')
        throw e
      } finally {
        this.isLoading = false
      }
    },
    async createUser(data) {
      const res = await usersService.create(data)
      if (res.user) this.users.unshift(res.user)
      return res
    },
    async updateUser(id, data) {
      const user = await usersService.update(id, data)
      const i = this.users.findIndex((u) => u.id === id)
      if (i !== -1 && user) this.users[i] = user
      return user
    },
    async deleteUser(id) {
      await usersService.remove(id)
      this.users = this.users.filter((u) => u.id !== id)
    }
  }
})
