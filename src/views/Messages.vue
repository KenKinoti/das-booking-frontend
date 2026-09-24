<template>
  <div class="mp ui-page ui-page--wide msg-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Communication</div>
        <h1>Messages</h1>
        <p>Chat with people in your organisation — one-to-one or in groups.</p>
      </div>
      <div class="ui-actions">
        <span class="conn" :class="`conn--${socketStatus}`" :title="socketTitle"><i class="fa-solid fa-circle"></i> {{ socketLabel }}</span>
        <router-link to="/messaging-settings" class="ui-btn"><i class="fa-solid fa-gear"></i> Settings</router-link>
        <button class="ui-btn ui-btn--primary" :disabled="!chatSettings.enable_in_app_messaging" @click="showNew = true"><i class="fa-regular fa-pen-to-square"></i> New conversation</button>
      </div>
    </header>

    <section class="ui-card chat" :class="{ 'show-thread': !!activeId }">
      <!-- Thread list -->
      <aside class="threads">
        <div class="threads__head">
          <div class="ui-input-group">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search conversations" aria-label="Search conversations" />
          </div>
          <div class="ui-tabs filter-tabs">
            <button class="ui-tab" :class="{ 'is-active': filter === 'all' }" @click="filter = 'all'">All</button>
            <button class="ui-tab" :class="{ 'is-active': filter === 'unread' }" @click="filter = 'unread'">Unread <span v-if="totalUnread" class="count">{{ totalUnread }}</span></button>
            <button class="ui-tab" :class="{ 'is-active': filter === 'groups' }" @click="filter = 'groups'">Groups</button>
          </div>
        </div>
        <div class="threads__list" role="list">
          <template v-if="loadingThreads && !threads.length">
            <div v-for="n in 6" :key="n" class="thread sk"><div class="ui-skeleton" style="width: 40px; height: 40px; border-radius: 12px"></div><div style="flex: 1"><div class="ui-skeleton" style="height: 12px; width: 60%; margin-bottom: 8px"></div><div class="ui-skeleton" style="height: 10px"></div></div></div>
          </template>
          <div v-else-if="threadsError" class="list-note">
            <p class="txt-danger">{{ threadsError }}</p>
            <button class="ui-btn ui-btn--sm" @click="loadThreads">Try again</button>
          </div>
          <div v-else-if="!threads.length" class="list-note">
            <div class="ui-empty__icon"><i class="fa-regular fa-comments"></i></div>
            <p><strong>No conversations yet</strong></p>
            <p class="muted">Start one with a teammate.</p>
            <button class="ui-btn ui-btn--primary ui-btn--sm" @click="showNew = true"><i class="fa-regular fa-pen-to-square"></i> New conversation</button>
          </div>
          <div v-else-if="!visibleThreads.length" class="list-note muted">Nothing matches.</div>
          <button
            v-for="t in visibleThreads"
            :key="t.id"
            role="listitem"
            class="thread"
            :class="{ 'is-active': t.id === activeId, 'is-unread': t.unread > 0 }"
            @click="openThread(t.id)"
          >
            <span class="t-avatar" :class="{ group: t.isGroup }">
              <i v-if="t.isGroup" class="fa-solid fa-user-group"></i>
              <template v-else>{{ initials(t.name) }}</template>
            </span>
            <span class="t-body">
              <span class="t-top">
                <span class="t-name">{{ t.name }}</span>
                <span class="t-time">{{ time(t.updatedAt) }}</span>
              </span>
              <span class="t-bottom">
                <span class="t-preview">
                  <template v-if="typingIn[t.id]"><em class="typing-text">typing…</em></template>
                  <template v-else-if="t.last">{{ t.last.sender_id === meId ? 'You: ' : t.isGroup ? firstName(t.last.sender) + ': ' : '' }}{{ t.last.content }}</template>
                  <template v-else><span class="muted">No messages yet</span></template>
                </span>
                <span v-if="t.unread" class="t-unread" :aria-label="`${t.unread} unread`">{{ t.unread > 99 ? '99+' : t.unread }}</span>
              </span>
            </span>
          </button>
        </div>
      </aside>

      <!-- Conversation -->
      <div class="convo">
        <template v-if="active">
          <div class="convo__head">
            <button class="ui-btn ui-btn--ghost ui-btn--icon back" aria-label="Back to conversations" @click="closeThread"><i class="fa-solid fa-arrow-left"></i></button>
            <span class="t-avatar" :class="{ group: active.isGroup }">
              <i v-if="active.isGroup" class="fa-solid fa-user-group"></i>
              <template v-else>{{ initials(active.name) }}</template>
            </span>
            <div class="convo__title">
              <h2>{{ active.name }}</h2>
              <small class="muted">
                <template v-if="typingIn[active.id]">{{ typingIn[active.id] }} is typing…</template>
                <template v-else-if="active.isGroup">{{ active.participants.length }} members · {{ memberNames }}</template>
                <template v-else-if="active.others[0] && active.others[0].user">{{ active.others[0].user.email }}</template>
              </small>
            </div>
            <div class="ui-actions">
              <button class="ui-btn ui-btn--sm" :disabled="calling" title="Start a video call with these people" @click="startCall"><i :class="calling ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-video'"></i><span class="hide-sm"> Video call</span></button>
            </div>
          </div>

          <div ref="scroller" class="convo__messages" @scroll="onScroll">
            <div v-if="hasMore" class="load-older">
              <button class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="loadingOlder" @click="loadOlder"><i :class="loadingOlder ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-clock-rotate-left'"></i> Load earlier messages</button>
            </div>
            <div v-if="loadingMessages && !messages.length" class="msg-sk">
              <div v-for="n in 5" :key="n" class="ui-skeleton" :style="{ height: '34px', width: 30 + ((n * 17) % 40) + '%', marginLeft: n % 2 ? 'auto' : 0 }"></div>
            </div>
            <div v-else-if="messagesError" class="list-note">
              <p class="txt-danger">{{ messagesError }}</p>
              <button class="ui-btn ui-btn--sm" @click="loadMessages(active.id)">Try again</button>
            </div>
            <div v-else-if="!messages.length" class="list-note">
              <div class="ui-empty__icon"><i class="fa-regular fa-hand"></i></div>
              <p><strong>Say hello</strong></p>
              <p class="muted">This is the start of your conversation with {{ active.name }}.</p>
            </div>
            <template v-for="g in grouped" :key="g.key">
              <div class="day"><span>{{ g.label }}</span></div>
              <div v-for="m in g.messages" :key="m.id || m._tmp" class="msg" :class="{ mine: m.sender_id === meId, cont: m._continued, failed: m._failed, pending: m._pending }">
                <span v-if="m.sender_id !== meId && !m._continued" class="m-avatar">{{ initials(senderName(m)) }}</span>
                <div class="m-bubble-wrap">
                  <div v-if="active.isGroup && m.sender_id !== meId && !m._continued" class="m-sender">{{ senderName(m) }}</div>
                  <div class="m-bubble"><template v-for="(part, pi) in linkify(m.content)" :key="pi"><a v-if="part.href" :href="part.href" target="_blank" rel="noopener noreferrer">{{ part.text }}</a><template v-else>{{ part.text }}</template></template></div>
                  <div class="m-meta">
                    <template v-if="m._failed"><i class="fa-solid fa-circle-exclamation"></i> Not sent · <a href="#" @click.prevent="retry(m)">Retry</a></template>
                    <template v-else-if="m._pending">Sending…</template>
                    <template v-else>{{ clock(m.created_at) }}</template>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <button v-if="showJump" class="jump" @click="scrollToBottom(true)"><i class="fa-solid fa-arrow-down"></i> New messages</button>

          <div v-if="!chatSettings.enable_in_app_messaging" class="ui-alert ui-alert--warning chat-off"><i class="fa-solid fa-lock"></i><span>Team chat is turned off for your organisation. <router-link to="/messaging-settings">Messaging settings</router-link></span></div>
          <form v-else class="composer" @submit.prevent="send">
            <textarea
              ref="composer"
              v-model="draft"
              class="ui-textarea"
              rows="1"
              maxlength="4000"
              :placeholder="`Message ${active.name}`"
              aria-label="Message"
              @keydown.enter.exact.prevent="send"
              @input="onInput"
            ></textarea>
            <button type="submit" class="ui-btn ui-btn--primary send" :disabled="!draft.trim()" aria-label="Send message"><i class="fa-solid fa-paper-plane"></i><span class="hide-sm"> Send</span></button>
          </form>
          <div v-if="chatSettings.enable_in_app_messaging" class="hint muted">Enter to send · Shift + Enter for a new line</div>
        </template>

        <div v-else class="convo__empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-comments"></i></div>
          <h3>Select a conversation</h3>
          <p class="muted">Pick a conversation on the left, or start a new one.</p>
          <button class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="showNew = true"><i class="fa-regular fa-pen-to-square"></i> New conversation</button>
        </div>
      </div>
    </section>

    <NewConversationModal v-if="showNew" :me-id="meId" :threads="threads" :allow-groups="chatSettings.enable_group_chats !== false" @close="showNew = false" @created="onCreated" @open="onOpenExisting" />
  </div>
</template>

<script>
import { toast } from '@/composables/useToast'
import { apiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { messagingService, webSocketService, normalizeThread, personName, initials, formatMessageTime, groupMessagesByDate } from '@/services/messaging'
import { confirmDialog } from '@/composables/useConfirm'
import { meetingsApi } from '@/services/meetings'
import NewConversationModal from '@/components/communication/NewConversationModal.vue'

const PAGE = 50

export default {
  name: 'Messages',
  components: { NewConversationModal },
  data() {
    return {
      threads: [],
      loadingThreads: true,
      threadsError: '',
      activeId: null,
      messages: [],
      loadingMessages: false,
      messagesError: '',
      page: 1,
      hasMore: false,
      loadingOlder: false,
      draft: '',
      q: '',
      filter: 'all',
      showNew: false,
      socketStatus: 'connecting',
      typingIn: {},
      typingTimers: {},
      typingSent: 0,
      typingStopTimer: null,
      showJump: false,
      offs: [],
      pollTimer: null,
      tmpSeq: 0,
      calling: false,
      chatSettings: { enable_in_app_messaging: true, enable_group_chats: true, enable_typing_indicator: true }
    }
  },
  computed: {
    meId() {
      return useAuthStore().user?.id || ''
    },
    active() {
      return this.threads.find((t) => t.id === this.activeId) || null
    },
    totalUnread() {
      return this.threads.reduce((s, t) => s + (t.unread || 0), 0)
    },
    visibleThreads() {
      const q = this.q.toLowerCase()
      return this.threads.filter((t) => {
        if (this.filter === 'unread' && !t.unread) return false
        if (this.filter === 'groups' && !t.isGroup) return false
        return !q || t.name.toLowerCase().includes(q) || (t.last && (t.last.content || '').toLowerCase().includes(q))
      })
    },
    grouped() {
      return groupMessagesByDate(this.messages)
    },
    memberNames() {
      return this.active ? this.active.participants.map((p) => (p.user_id === this.meId ? 'You' : this.firstName(p.user))).join(', ') : ''
    },
    socketLabel() {
      return { connected: 'Live', connecting: 'Connecting', disconnected: 'Offline', unauthorized: 'Offline' }[this.socketStatus] || 'Offline'
    },
    socketTitle() {
      return this.socketStatus === 'connected' ? 'Messages arrive instantly' : 'Real-time connection unavailable — checking for new messages every 15 seconds'
    }
  },
  created() {
    messagingService
      .getSettings()
      .then((st) => st && (this.chatSettings = { ...this.chatSettings, ...st }))
      .catch(() => {})
    this.loadThreads().then(() => {
      const id = Number(this.$route.query.thread)
      if (id && this.threads.some((t) => t.id === id)) this.openThread(id)
    })
    if (this.$route.query.new) this.showNew = true
  },
  mounted() {
    const ws = webSocketService
    this.offs = [
      ws.on('status', (s) => (this.socketStatus = s)),
      ws.on('new_message', (env) => this.onIncoming(env)),
      ws.on('typing_indicator', (env) => this.onTyping(env))
    ]
    this.socketStatus = ws.isConnected ? 'connected' : 'connecting'
    ws.connect()
    // Fallback polling keeps things fresh if the socket can't connect.
    this.pollTimer = setInterval(() => {
      if (!webSocketService.isConnected && document.visibilityState === 'visible') this.refresh()
    }, 15000)
  },
  beforeUnmount() {
    this.offs.forEach((off) => off())
    clearInterval(this.pollTimer)
    clearTimeout(this.typingStopTimer)
    Object.values(this.typingTimers).forEach(clearTimeout)
    if (this.activeId) webSocketService.stopTyping(this.activeId)
  },
  methods: {
    initials,
    time: formatMessageTime,
    firstName(u) {
      return (u && (u.first_name || personName(u))) || 'Someone'
    },
    senderName(m) {
      if (m.sender) return personName(m.sender)
      const p = this.active && this.active.participants.find((x) => x.user_id === m.sender_id)
      return p ? personName(p.user) : 'Unknown'
    },
    linkify(text = '') {
      const out = []
      const re = /\bhttps?:\/\/[^\s<>"]+/gi
      let last = 0
      let m
      while ((m = re.exec(text))) {
        if (m.index > last) out.push({ text: text.slice(last, m.index) })
        const url = m[0].replace(/[.,!?)]+$/, '')
        out.push({ text: url, href: url })
        last = m.index + url.length
        re.lastIndex = last
      }
      if (last < text.length) out.push({ text: text.slice(last) })
      return out
    },
    clock(ts) {
      return ts ? new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
    },
    async loadThreads() {
      this.threadsError = ''
      try {
        const list = await messagingService.getThreads()
        this.threads = (list || []).map((t) => normalizeThread(t, this.meId))
        this.sortThreads()
      } catch (e) {
        this.threadsError = apiErrorMessage(e, 'Could not load conversations')
      } finally {
        this.loadingThreads = false
      }
    },
    sortThreads() {
      this.threads.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    },
    async refresh() {
      await this.loadThreads()
      if (this.activeId) this.loadMessages(this.activeId, { silent: true })
    },
    openThread(id) {
      if (this.activeId && this.activeId !== id) webSocketService.stopTyping(this.activeId)
      this.activeId = id
      this.draft = ''
      this.$router.replace({ query: { thread: String(id) } })
      this.loadMessages(id)
      const t = this.threads.find((x) => x.id === id)
      if (t) t.unread = 0
      this.$nextTick(() => this.$refs.composer && window.innerWidth > 760 && this.$refs.composer.focus())
    },
    closeThread() {
      this.activeId = null
      this.$router.replace({ query: {} })
    },
    async loadMessages(id, { silent = false } = {}) {
      if (!silent) {
        this.loadingMessages = true
        this.messages = []
        this.page = 1
      }
      this.messagesError = ''
      try {
        const list = (await messagingService.getMessages(id, 1, PAGE)) || []
        if (this.activeId !== id) return
        const fresh = list.slice().reverse()
        if (silent) {
          const known = new Set(this.messages.map((m) => m.id))
          const added = fresh.filter((m) => !known.has(m.id))
          if (added.length) {
            this.messages = [...this.messages.filter((m) => m.id), ...added].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            this.afterNewMessage()
          }
        } else {
          this.messages = fresh
          this.hasMore = list.length === PAGE
          this.$nextTick(() => this.scrollToBottom())
        }
      } catch (e) {
        if (!silent) this.messagesError = apiErrorMessage(e, 'Could not load messages')
      } finally {
        this.loadingMessages = false
      }
    },
    async loadOlder() {
      if (!this.activeId) return
      this.loadingOlder = true
      const el = this.$refs.scroller
      const before = el ? el.scrollHeight : 0
      try {
        const list = (await messagingService.getMessages(this.activeId, this.page + 1, PAGE)) || []
        this.page++
        const known = new Set(this.messages.map((m) => m.id))
        this.messages = [...list.slice().reverse().filter((m) => !known.has(m.id)), ...this.messages]
        this.hasMore = list.length === PAGE
        this.$nextTick(() => el && (el.scrollTop = el.scrollHeight - before))
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load earlier messages'))
      } finally {
        this.loadingOlder = false
      }
    },
    nearBottom() {
      const el = this.$refs.scroller
      return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120
    },
    scrollToBottom(smooth = false) {
      const el = this.$refs.scroller
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
      this.showJump = false
    },
    onScroll() {
      if (this.nearBottom()) this.showJump = false
    },
    afterNewMessage() {
      if (this.nearBottom()) this.$nextTick(() => this.scrollToBottom(true))
      else this.showJump = true
    },
    bumpThread(threadId, msg) {
      const t = this.threads.find((x) => x.id === threadId)
      if (!t) return false
      t.last = msg
      t.updatedAt = msg.created_at
      this.sortThreads()
      return true
    },
    async send() {
      const text = this.draft.trim()
      if (!text || !this.active) return
      const threadId = this.active.id
      const tmp = { _tmp: `t${++this.tmpSeq}`, _pending: true, thread_id: threadId, sender_id: this.meId, content: text, created_at: new Date().toISOString() }
      this.messages.push(tmp)
      this.draft = ''
      this.$nextTick(() => {
        this.autosize()
        this.scrollToBottom(true)
      })
      webSocketService.stopTyping(threadId)
      this.typingSent = 0
      await this.deliver(tmp)
    },
    async deliver(tmp) {
      try {
        const saved = await messagingService.sendMessage(tmp.thread_id, { content: tmp.content, message_type: 'text' })
        const i = this.messages.findIndex((m) => m._tmp === tmp._tmp)
        const dup = this.messages.some((m) => m.id === saved.id)
        if (i >= 0) {
          if (dup) this.messages.splice(i, 1)
          else this.messages.splice(i, 1, saved)
        }
        this.bumpThread(tmp.thread_id, saved)
      } catch (e) {
        const m = this.messages.find((x) => x._tmp === tmp._tmp)
        if (m) {
          m._pending = false
          m._failed = true
        }
        toast.error(apiErrorMessage(e, 'Message not sent'))
      }
    },
    retry(m) {
      m._failed = false
      m._pending = true
      this.deliver(m)
    },
    onIncoming(env) {
      const msg = env && env.data
      if (!msg || !msg.id) return
      const threadId = env.thread_id || msg.thread_id
      if (threadId === this.activeId) {
        if (!this.messages.some((m) => m.id === msg.id)) {
          if (msg.sender_id === this.meId) {
            // Our own message echoed back; the REST response will replace the temp copy.
            const pending = this.messages.find((m) => m._pending && m.content === msg.content)
            if (pending) return
          }
          this.messages.push(msg)
          this.afterNewMessage()
          // Opening the thread marks messages read on the server.
          if (msg.sender_id !== this.meId && document.visibilityState === 'visible') messagingService.getMessages(threadId, 1, 1).catch(() => {})
        }
        this.clearTyping(threadId)
      }
      if (!this.bumpThread(threadId, msg)) {
        this.loadThreads()
        return
      }
      const t = this.threads.find((x) => x.id === threadId)
      if (t && threadId !== this.activeId && msg.sender_id !== this.meId) t.unread = (t.unread || 0) + 1
    },
    onTyping(env) {
      const threadId = env.thread_id
      const uid = env.user_id || (env.data && env.data.user_id)
      if (!threadId || uid === this.meId || !this.chatSettings.enable_typing_indicator) return
      const t = this.threads.find((x) => x.id === threadId)
      if (!t) return
      if (env.data && env.data.is_typing) {
        const p = t.participants.find((x) => x.user_id === uid)
        this.typingIn = { ...this.typingIn, [threadId]: p ? this.firstName(p.user) : 'Someone' }
        clearTimeout(this.typingTimers[threadId])
        this.typingTimers[threadId] = setTimeout(() => this.clearTyping(threadId), 6000)
      } else {
        this.clearTyping(threadId)
      }
    },
    clearTyping(threadId) {
      if (!this.typingIn[threadId]) return
      const next = { ...this.typingIn }
      delete next[threadId]
      this.typingIn = next
    },
    onInput() {
      this.autosize()
      if (!this.activeId || !this.chatSettings.enable_typing_indicator) return
      const now = Date.now()
      if (this.draft && now - this.typingSent > 3000) {
        webSocketService.startTyping(this.activeId)
        this.typingSent = now
      }
      clearTimeout(this.typingStopTimer)
      const id = this.activeId
      this.typingStopTimer = setTimeout(() => {
        webSocketService.stopTyping(id)
        this.typingSent = 0
      }, 2500)
    },
    autosize() {
      const el = this.$refs.composer
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    },
    async onCreated(thread) {
      this.showNew = false
      await this.loadThreads()
      if (thread && thread.id) {
        if (!this.threads.some((t) => t.id === thread.id)) this.threads.unshift(normalizeThread(thread, this.meId))
        this.openThread(thread.id)
      }
      toast.success('Conversation started')
    },
    async startCall() {
      const t = this.active
      if (!t) return
      const okd = await confirmDialog({
        title: 'Start a video call?',
        message: `A meeting room opens now and ${t.isGroup ? 'everyone in this group gets' : `${t.name} gets`} a link here in the chat (and a calendar invite if email is set up).`,
        confirmText: 'Start call'
      })
      if (!okd) return
      this.calling = true
      try {
        const participants = t.others.filter((p) => p.user && p.user.email).map((p) => ({ name: personName(p.user), email: p.user.email, user_id: p.user_id }))
        let tz = 'UTC'
        try {
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        } catch {
          /* default */
        }
        const created = await meetingsApi.create({ title: `Call: ${t.name}`.slice(0, 120), start_at: new Date().toISOString(), duration_minutes: 30, timezone: tz, location_type: 'video', participants, send_invites: true })
        const id = (created && (created.meeting?.id || created.id)) || null
        if (!id) throw new Error('no meeting id')
        await meetingsApi.start(id).catch(() => {})
        const link = `${window.location.origin}/meetings/${id}`
        await messagingService.sendMessage(t.id, { content: `I started a video call. Join here: ${link}`, message_type: 'text' }).catch(() => {})
        this.$router.push(`/meetings/${id}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start the call'))
      } finally {
        this.calling = false
      }
    },
    onOpenExisting(id) {
      this.showNew = false
      this.openThread(id)
    }
  }
}
</script>

<style scoped>
.msg-page {
  display: flex;
  flex-direction: column;
}

.conn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-3);
  padding: 0 6px;
}

.conn i {
  font-size: 7px;
}

.conn--connected {
  color: var(--success);
}

.conn--connecting {
  color: var(--warning);
}

.chat {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  height: calc(100vh - 220px);
  min-height: 520px;
  overflow: hidden;
}

/* Thread list */
.threads {
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--surface);
}

.threads__head {
  padding: 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-tabs {
  width: 100%;
}

.filter-tabs .ui-tab {
  flex: 1;
  justify-content: center;
}

.threads__list {
  overflow-y: auto;
  flex: 1;
  padding: 6px;
}

.thread {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: var(--radius);
  background: none;
  text-align: left;
  font: inherit;
  color: var(--text);
  cursor: pointer;
  align-items: center;
}

.thread.sk {
  cursor: default;
}

.thread:hover {
  background: var(--surface-hover);
}

.thread.is-active {
  background: var(--accent-soft);
}

.t-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.thread.is-active .t-avatar {
  background: var(--surface);
}

.t-avatar.group {
  background: var(--info-soft);
  color: var(--info);
}

.t-body {
  flex: 1;
  min-width: 0;
}

.t-top,
.t-bottom {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.t-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.t-time {
  font-size: 11.5px;
  color: var(--text-3);
  flex-shrink: 0;
}

.t-preview {
  font-size: 13px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thread.is-unread .t-preview {
  color: var(--text);
  font-weight: 550;
}

.thread.is-unread .t-time {
  color: var(--accent);
  font-weight: 600;
}

.t-unread {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.typing-text {
  color: var(--accent);
}

.list-note {
  padding: 32px 16px;
  text-align: center;
}

.list-note p {
  margin: 0 0 6px;
}

.list-note .ui-empty__icon {
  margin: 0 auto 12px;
}

/* Conversation */
.convo {
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  background: var(--bg-subtle);
}

.convo__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.convo__title {
  flex: 1;
  min-width: 0;
}

.convo__title h2 {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.convo__title small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
}

.back {
  display: none;
}

.convo__messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 12px;
}

.load-older {
  text-align: center;
  margin-bottom: 12px;
}

.msg-sk {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.day {
  text-align: center;
  margin: 18px 0 12px;
  position: relative;
}

.day span {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-3);
  background: var(--bg-subtle);
  padding: 0 10px;
  position: relative;
  z-index: 1;
}

.day::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px solid var(--border);
}

.msg {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  align-items: flex-end;
}

.msg.cont {
  margin-top: 3px;
  padding-left: 42px;
}

.msg.mine {
  justify-content: flex-end;
}

.msg.mine.cont {
  padding-left: 0;
}

.m-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--surface);
  color: var(--text-2);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.m-bubble-wrap {
  max-width: min(640px, 75%);
  display: flex;
  flex-direction: column;
}

.msg.mine .m-bubble-wrap {
  align-items: flex-end;
}

.m-sender {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  margin: 0 0 3px 4px;
}

.m-bubble {
  padding: 9px 14px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  box-shadow: var(--shadow-xs);
}

.msg:not(.mine) .m-bubble {
  border-bottom-left-radius: 6px;
}

.msg.mine .m-bubble {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
  border-bottom-right-radius: 6px;
}

.m-bubble a {
  color: inherit;
  text-decoration: underline;
  word-break: break-all;
}

.msg.pending .m-bubble {
  opacity: 0.7;
}

.msg.failed .m-bubble {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--text);
}

.m-meta {
  font-size: 11px;
  color: var(--text-3);
  margin: 3px 6px 0;
}

.msg.failed .m-meta {
  color: var(--danger);
}

.msg.cont .m-meta {
  display: none;
}

.msg.cont:last-child .m-meta,
.msg.failed .m-meta,
.msg.pending .m-meta {
  display: block;
}

.jump {
  position: absolute;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--accent);
  border-radius: 999px;
  padding: 6px 14px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: var(--shadow);
  cursor: pointer;
}

.composer {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 12px 18px 4px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.composer .ui-textarea {
  flex: 1;
  resize: none;
  min-height: 42px;
  max-height: 160px;
  line-height: 1.45;
  padding-top: 10px;
}

.send {
  height: 42px;
}

.chat-off {
  margin: 12px 18px;
}

.hint {
  font-size: 11.5px;
  padding: 0 18px 10px;
  background: var(--surface);
}

.convo__empty {
  margin: auto;
  text-align: center;
  padding: 24px;
}

.convo__empty .ui-empty__icon {
  margin: 0 auto 12px;
}

.convo__empty h3 {
  font-size: 16px;
  margin: 0 0 4px;
}

@media (max-width: 1100px) {
  .chat {
    grid-template-columns: 290px minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .chat {
    grid-template-columns: 1fr;
    height: calc(100vh - 190px);
    min-height: 460px;
  }
  .convo {
    display: none;
  }
  .chat.show-thread .threads {
    display: none;
  }
  .chat.show-thread .convo {
    display: flex;
  }
  .back {
    display: inline-flex;
  }
  .convo__messages {
    padding: 14px 12px 8px;
  }
  .m-bubble-wrap {
    max-width: 85%;
  }
  .hint {
    display: none;
  }
  .composer {
    padding-bottom: 12px;
  }
  .conn {
    display: none;
  }
}
</style>
