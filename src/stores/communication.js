import { defineStore } from 'pinia'
import { messagingService, webSocketService } from '../services/messaging'

/**
 * Small shared store for messaging state other parts of the app may want,
 * e.g. an unread badge. Data comes from /api/v1/messaging and live updates
 * from the messaging WebSocket.
 */
export const useCommunicationStore = defineStore('communication', {
  state: () => ({
    unread: 0,
    live: false,
    _listening: false
  }),

  actions: {
    async refreshUnread() {
      try {
        this.unread = await messagingService.getUnreadCount()
      } catch {
        /* keep the last known value */
      }
      return this.unread
    },

    /** Start listening for new messages; safe to call more than once. */
    listen(meId) {
      if (this._listening) return
      this._listening = true
      webSocketService.on('status', (s) => (this.live = s === 'connected'))
      webSocketService.on('new_message', (env) => {
        const msg = env && env.data
        if (msg && msg.sender_id !== meId) this.unread++
      })
      webSocketService.connect()
      this.refreshUnread()
    }
  }
})
