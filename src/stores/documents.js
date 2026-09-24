import { defineStore } from 'pinia'
import { documentsService } from '../services/documents'
import { apiErrorMessage } from '../services/api'

/** Document library cache over documentsService. */
export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    documents: [],
    pagination: {},
    stats: {},
    isLoading: false,
    error: null
  }),

  getters: {
    documentsByCategory: (state) =>
      state.documents.reduce((acc, d) => {
        ;(acc[d.category] = acc[d.category] || []).push(d)
        return acc
      }, {}),
    activeDocuments: (state) => state.documents.filter((d) => d.is_active),
    expiringDocuments: (state) => {
      const soon = Date.now() + 30 * 86400000
      return state.documents.filter((d) => d.expiry_date && new Date(d.expiry_date).getTime() <= soon)
    }
  },

  actions: {
    async fetchDocuments(params = {}) {
      this.isLoading = true
      this.error = null
      try {
        const { documents, pagination } = await documentsService.list(params)
        this.documents = documents
        this.pagination = pagination
        return documents
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load documents')
        throw e
      } finally {
        this.isLoading = false
      }
    },
    async fetchStats() {
      this.stats = await documentsService.stats()
      return this.stats
    },
    async uploadDocument(data, onProgress) {
      const doc = await documentsService.upload(data, onProgress)
      if (doc) this.documents.unshift(doc)
      return doc
    },
    async updateDocument(id, data) {
      const doc = await documentsService.update(id, data)
      const i = this.documents.findIndex((d) => d.id === id)
      if (i !== -1 && doc) this.documents[i] = doc
      return doc
    },
    async deleteDocument(id) {
      await documentsService.remove(id)
      this.documents = this.documents.filter((d) => d.id !== id)
    },
    async downloadDocument(id) {
      return documentsService.file(id)
    }
  }
})
