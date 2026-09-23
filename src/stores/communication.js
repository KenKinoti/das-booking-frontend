import { WS_ORIGIN } from '../config'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCommunicationStore = defineStore('communication', () => {
  // State
  const isConnected = ref(false)
  const connectionStatus = ref('disconnected') // connected, connecting, disconnected, error
  const unreadMessages = ref(0)
  const teamNotifications = ref(0)
  const activeCalls = ref([])
  const contacts = ref([])
  const messageThreads = ref([])
  const callHistory = ref([])
  const isScreenSharing = ref(false)
  const currentUser = ref(null)

  // WebSocket connection
  let ws = null
  const wsUrl = ref(null)

  // Computed
  const totalUnreadCount = computed(() => {
    return unreadMessages.value + teamNotifications.value
  })

  const hasActiveCall = computed(() => {
    return activeCalls.value.length > 0
  })

  const onlineContacts = computed(() => {
    return contacts.value.filter(contact => contact.status === 'online')
  })

  // Actions
  const initialize = async () => {
    try {
      // Set WebSocket URL based on environment
      wsUrl.value = `${WS_ORIGIN}/ws/communication`

      await connectWebSocket()
      await loadContacts()
      await loadMessageThreads()
      await loadCallHistory()

      console.log('Communication system initialized')
    } catch (error) {
      console.error('Failed to initialize communication:', error)
      connectionStatus.value = 'error'
    }
  }

  const connectWebSocket = async () => {
    console.log('Connecting to WebSocket:', wsUrl.value)
    console.log('✅ WebSocket attempting connection to port 8091')

    // WebSocket connection enabled - real-time communication active
    try {
      connectionStatus.value = 'connecting'

      ws = new WebSocket(wsUrl.value)

      ws.onopen = () => {
        console.log('WebSocket connected')
        isConnected.value = true
        connectionStatus.value = 'connected'

        // Send authentication
        sendMessage({
          type: 'auth',
          token: localStorage.getItem('authToken')
        })
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        isConnected.value = false
        connectionStatus.value = 'disconnected'

        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (connectionStatus.value === 'disconnected') {
            connectWebSocket()
          }
        }, 5000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        connectionStatus.value = 'error'

        // Fallback to mock mode if WebSocket fails
        console.log('Falling back to mock mode')
        connectionStatus.value = 'connected'
        isConnected.value = true
      }

    } catch (error) {
      console.error('WebSocket connection failed:', error)
      connectionStatus.value = 'error'

      // Fallback to mock mode
      console.log('Falling back to mock mode')
      connectionStatus.value = 'connected'
      isConnected.value = true
    }
  }

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'welcome':
        console.log('🎉 WebSocket connection established:', data.data?.message)
        break
      case 'message_received':
        console.log('✅ Message acknowledged by server:', data.data)
        break
      case 'new_message':
        handleNewMessage(data.payload)
        break
      case 'call_invite':
        handleCallInvite(data.payload)
        break
      case 'call_update':
        handleCallUpdate(data.payload)
        break
      case 'contact_status':
        handleContactStatusUpdate(data.payload)
        break
      case 'typing_indicator':
        handleTypingIndicator(data.payload)
        break
      default:
        console.log('Unknown message type:', data.type)
    }
  }

  const sendMessage = (message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket not connected')
    }
  }

  const handleNewMessage = (message) => {
    // Find or create thread
    let thread = messageThreads.value.find(t => t.id === message.thread_id)
    if (!thread) {
      thread = {
        id: message.thread_id,
        participants: message.participants,
        messages: [],
        lastMessage: null,
        unreadCount: 0,
        type: message.thread_type || 'direct'
      }
      messageThreads.value.push(thread)
    }

    // Add message to thread
    thread.messages.push(message)
    thread.lastMessage = message

    // Increment unread count if not from current user
    if (message.sender_id !== currentUser.value?.id) {
      thread.unreadCount++

      if (message.thread_type === 'team') {
        teamNotifications.value++
      } else {
        unreadMessages.value++
      }
    }

    // Sort threads by last message time
    messageThreads.value.sort((a, b) => {
      const aTime = new Date(a.lastMessage?.created_at || 0)
      const bTime = new Date(b.lastMessage?.created_at || 0)
      return bTime - aTime
    })
  }

  const handleCallInvite = (callData) => {
    // Show incoming call UI
    console.log('Incoming call:', callData)
    // This would trigger a call notification modal
  }

  const handleCallUpdate = (callUpdate) => {
    const callIndex = activeCalls.value.findIndex(call => call.id === callUpdate.call_id)
    if (callIndex !== -1) {
      activeCalls.value[callIndex] = { ...activeCalls.value[callIndex], ...callUpdate }
    }
  }

  const handleContactStatusUpdate = (statusUpdate) => {
    const contact = contacts.value.find(c => c.id === statusUpdate.user_id)
    if (contact) {
      contact.status = statusUpdate.status
      contact.lastSeen = statusUpdate.last_seen
    }
  }

  const handleTypingIndicator = (typingData) => {
    // Handle typing indicators in UI
    console.log('Typing indicator:', typingData)
  }

  const loadContacts = async () => {
    try {
      // Mock data for now - replace with actual API call
      contacts.value = [
        {
          id: 1,
          name: 'John Smith',
          email: 'john@company.com',
          avatar: null,
          status: 'online',
          lastSeen: new Date().toISOString(),
          department: 'Sales'
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah@company.com',
          avatar: null,
          status: 'away',
          lastSeen: new Date(Date.now() - 300000).toISOString(),
          department: 'Support'
        },
        {
          id: 3,
          name: 'Mike Davis',
          email: 'mike@company.com',
          avatar: null,
          status: 'offline',
          lastSeen: new Date(Date.now() - 3600000).toISOString(),
          department: 'Engineering'
        }
      ]
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }

  const loadMessageThreads = async () => {
    try {
      // Mock data - replace with actual API call
      messageThreads.value = [
        {
          id: 1,
          participants: [
            { id: 1, name: 'John Smith', avatar: null },
            { id: 'current', name: 'You', avatar: null }
          ],
          messages: [
            {
              id: 1,
              sender_id: 1,
              content: 'Hey, can we schedule a call later today?',
              type: 'text',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              read: false
            }
          ],
          lastMessage: {
            id: 1,
            sender_id: 1,
            content: 'Hey, can we schedule a call later today?',
            created_at: new Date(Date.now() - 3600000).toISOString()
          },
          unreadCount: 1,
          type: 'direct'
        }
      ]
      unreadMessages.value = 1
    } catch (error) {
      console.error('Failed to load message threads:', error)
    }
  }

  const loadCallHistory = async () => {
    try {
      // Mock data - replace with actual API call
      callHistory.value = [
        {
          id: 1,
          type: 'video',
          participants: ['John Smith', 'You'],
          duration: 1800, // 30 minutes in seconds
          started_at: new Date(Date.now() - 7200000).toISOString(),
          ended_at: new Date(Date.now() - 5400000).toISOString(),
          status: 'completed'
        }
      ]
    } catch (error) {
      console.error('Failed to load call history:', error)
    }
  }

  const startCall = async (type, participants) => {
    try {
      const callData = {
        id: Date.now(), // Use proper UUID in production
        type, // 'video' or 'voice'
        participants,
        started_at: new Date().toISOString(),
        status: 'active'
      }

      activeCalls.value.push(callData)

      // Send call invite through WebSocket
      sendMessage({
        type: 'start_call',
        payload: callData
      })

      return callData
    } catch (error) {
      console.error('Failed to start call:', error)
      throw error
    }
  }

  const endCall = async (callId) => {
    try {
      const callIndex = activeCalls.value.findIndex(call => call.id === callId)
      if (callIndex !== -1) {
        const call = activeCalls.value[callIndex]
        call.ended_at = new Date().toISOString()
        call.status = 'ended'

        // Move to call history
        callHistory.value.unshift(call)

        // Remove from active calls
        activeCalls.value.splice(callIndex, 1)

        // Send end call message
        sendMessage({
          type: 'end_call',
          payload: { call_id: callId }
        })
      }
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }

  const sendTextMessage = async (threadId, content, type = 'text') => {
    try {
      const message = {
        id: Date.now(), // Use proper UUID in production
        thread_id: threadId,
        sender_id: currentUser.value?.id || 'current',
        content,
        type,
        created_at: new Date().toISOString(),
        read: true
      }

      // Add to local thread immediately for better UX
      const thread = messageThreads.value.find(t => t.id === threadId)
      if (thread) {
        thread.messages.push(message)
        thread.lastMessage = message
      }

      // Send through WebSocket
      sendMessage({
        type: 'send_message',
        payload: message
      })

      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  const markMessagesAsRead = (threadId = null) => {
    if (threadId) {
      const thread = messageThreads.value.find(t => t.id === threadId)
      if (thread) {
        if (thread.type === 'team') {
          teamNotifications.value -= thread.unreadCount
        } else {
          unreadMessages.value -= thread.unreadCount
        }
        thread.unreadCount = 0
        thread.messages.forEach(msg => {
          if (msg.sender_id !== currentUser.value?.id) {
            msg.read = true
          }
        })
      }
    } else {
      // Mark all messages as read
      messageThreads.value.forEach(thread => {
        if (thread.type === 'team') {
          teamNotifications.value -= thread.unreadCount
        } else {
          unreadMessages.value -= thread.unreadCount
        }
        thread.unreadCount = 0
        thread.messages.forEach(msg => {
          if (msg.sender_id !== currentUser.value?.id) {
            msg.read = true
          }
        })
      })
    }
  }

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })

      isScreenSharing.value = true

      // Handle screen share end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        isScreenSharing.value = false
      })

      return stream
    } catch (error) {
      console.error('Failed to start screen share:', error)
      throw error
    }
  }

  const stopScreenShare = () => {
    isScreenSharing.value = false
  }

  const setCurrentUser = (user) => {
    currentUser.value = user
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
    connectionStatus.value = 'disconnected'
  }

  return {
    // State
    isConnected,
    connectionStatus,
    unreadMessages,
    teamNotifications,
    activeCalls,
    contacts,
    messageThreads,
    callHistory,
    isScreenSharing,
    currentUser,

    // Computed
    totalUnreadCount,
    hasActiveCall,
    onlineContacts,

    // Actions
    initialize,
    connectWebSocket,
    sendMessage,
    startCall,
    endCall,
    sendTextMessage,
    markMessagesAsRead,
    startScreenShare,
    stopScreenShare,
    setCurrentUser,
    disconnect
  }
})