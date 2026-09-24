<template>
  <div class="ac" :class="`ac--${variant}`">
    <div class="ac__scroll" ref="scroll" @scroll.passive="onScroll" @click="onContentClick">
      <!-- Not configured -->
      <div v-if="disabled" class="ac__setup">
        <div class="ac__setup-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <h3>Ask DASYIN isn't switched on yet</h3>
        <p v-if="isSuperAdmin">
          Set <code>ANTHROPIC_API_KEY</code> on the backend service (optionally <code>ASSISTANT_MODEL</code>) and restart it. The assistant will then be available to everyone in
          your workspace.
        </p>
        <p v-else>The AI assistant needs to be enabled for your workspace. Ask your administrator to turn it on.</p>
        <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="refreshStatus"><i class="fa-solid fa-rotate"></i> Check again</button>
      </div>

      <div v-else-if="statusMissing" class="ac__setup">
        <div class="ac__setup-icon is-warn"><i class="fa-solid fa-plug-circle-exclamation"></i></div>
        <h3>Couldn't reach the assistant</h3>
        <p>{{ assistant.statusError }}</p>
        <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="refreshStatus"><i class="fa-solid fa-rotate"></i> Try again</button>
      </div>

      <template v-else>
        <div v-if="loading" class="ac__loading">
          <div class="ui-skeleton" style="height: 38px; width: 60%; margin-left: auto"></div>
          <div class="ui-skeleton" style="height: 64px; width: 85%"></div>
          <div class="ui-skeleton" style="height: 38px; width: 50%; margin-left: auto"></div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!items.length && !pending && !error" class="ac__empty">
          <div class="ac__empty-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
          <h3>How can I help?</h3>
          <p>Ask about your customers, invoices, bookings and more — or ask me to update a record. I'll check with you before changing anything.</p>
          <div class="ac__chips">
            <button v-for="s in suggestions" :key="s" class="ac__chip" type="button" @click="useSuggestion(s)">
              <i class="fa-solid fa-arrow-right"></i>{{ s }}
            </button>
          </div>
          <p v-if="toolWarning" class="ac__muted"><i class="fa-solid fa-circle-info"></i> {{ toolWarning }}</p>
        </div>

        <!-- Messages -->
        <div v-else class="ac__list" aria-live="polite">
          <template v-for="(it, i) in items" :key="it.key || it.id + '-' + i">
            <div v-if="it.kind === 'user'" class="ac__msg ac__msg--user">
              <div class="ac__bubble">{{ it.text }}</div>
            </div>
            <div v-else-if="it.kind === 'assistant'" class="ac__msg ac__msg--bot">
              <div class="ac__md" v-html="md(it.text)"></div>
              <span v-if="it.streaming" class="ac__caret" aria-hidden="true"></span>
              <span v-if="it.stopped" class="ac__muted ac__stopped">Stopped</span>
            </div>
            <div v-else-if="it.kind === 'tool'" class="ac__tool" :class="`is-${it.status}`">
              <span class="ac__tool-icon"><i :class="toolIcon(it)"></i></span>
              <span class="ac__tool-text">{{ it.summary || it.title }}</span>
              <router-link v-if="it.link && isInternal(it.link)" :to="it.link" class="ac__tool-link" @click="$emit('navigate')">Open <i class="fa-solid fa-arrow-right"></i></router-link>
              <a v-else-if="it.link" :href="it.link" target="_blank" rel="noopener noreferrer" class="ac__tool-link">Open <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
            </div>
          </template>

          <div v-if="thinking" class="ac__thinking"><span></span><span></span><span></span></div>

          <!-- Pending action -->
          <div v-if="pending" class="ac__pending" :class="{ 'is-danger': pending.destructive }" role="group" aria-label="Action waiting for confirmation">
            <div class="ac__pending-head">
              <span class="ac__pending-icon"><i :class="pending.destructive ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-pen-to-square'"></i></span>
              <div>
                <small>{{ pending.destructive ? 'Confirm destructive action' : 'Confirm change' }}</small>
                <strong>{{ pending.summary }}</strong>
              </div>
            </div>
            <div v-if="pending.destructive" class="ac__pending-warn">
              <i class="fa-solid fa-circle-exclamation"></i> This may delete or permanently change data and might not be reversible.
            </div>
            <button v-if="pending.fields && pending.fields.length" type="button" class="ac__details-btn" @click="showDetails = !showDetails" :aria-expanded="showDetails">
              <i class="fa-solid" :class="showDetails ? 'fa-chevron-up' : 'fa-chevron-down'"></i> {{ showDetails ? 'Hide details' : 'Show details' }} ({{ pending.fields.length }})
            </button>
            <dl v-if="showDetails" class="ac__fields">
              <template v-for="f in pending.fields" :key="f.key">
                <dt>{{ f.label }}</dt>
                <dd>{{ f.value }}</dd>
              </template>
            </dl>
            <div class="ac__pending-actions">
              <button class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="resolving" @click="resolve(false)">Cancel</button>
              <button class="ui-btn ui-btn--sm" :class="pending.destructive ? 'ui-btn--danger' : 'ui-btn--primary'" :disabled="resolving" @click="resolve(true)" data-test="asst-confirm">
                <i v-if="resolving" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-check"></i>
                {{ pending.destructive ? 'Yes, do it' : 'Confirm' }}
              </button>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="ac__error" role="alert">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{{ error.message }}</span>
            <button v-if="error.retryable" class="ui-btn ui-btn--ghost ui-btn--sm" @click="retry"><i class="fa-solid fa-rotate-right"></i> Retry</button>
          </div>
        </div>
      </template>
    </div>

    <button v-if="!atBottom && items.length" class="ac__jump" @click="scrollToBottom(true)" aria-label="Scroll to latest"><i class="fa-solid fa-arrow-down"></i></button>

    <form v-if="!disabled" class="ac__composer" @submit.prevent="submit">
      <div class="ac__input-wrap">
        <textarea
          ref="input"
          v-model="draft"
          class="ac__input"
          rows="1"
          :placeholder="pending ? 'Reply, or confirm the action above…' : 'Ask DASYIN…'"
          :disabled="statusMissing"
          aria-label="Message Ask DASYIN"
          maxlength="8000"
          @keydown="onKeydown"
          @input="autosize"
        ></textarea>
        <button v-if="streaming" type="button" class="ac__send is-stop" @click="stop" aria-label="Stop generating" title="Stop">
          <i class="fa-solid fa-stop"></i>
        </button>
        <button v-else type="submit" class="ac__send" :disabled="!draft.trim() || statusMissing" aria-label="Send" title="Send (Enter)">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
      </div>
      <div class="ac__hint">
        <span><kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line</span>
        <span v-if="autoApprove" class="ac__auto" title="Non-destructive updates run without asking"><i class="fa-solid fa-bolt"></i> Auto-approve on</span>
      </div>
    </form>
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { renderMarkdown } from '@/utils/miniMarkdown'
import { assistant, loadStatus, pageContext, suggestionsFor, streamSSE, upsertConversation, emitDataChanged } from '@/composables/useAssistant'

let keySeq = 0

export default {
  name: 'AssistantChat',
  props: {
    variant: { type: String, default: 'panel' },
    conversationId: { type: String, default: '' },
    active: { type: Boolean, default: true }
  },
  emits: ['update:conversationId', 'navigate'],
  data() {
    return {
      assistant,
      currentId: '',
      items: [],
      pending: null,
      error: null,
      draft: '',
      loading: false,
      streaming: false,
      resolving: false,
      showDetails: false,
      atBottom: true,
      controller: null,
      lastRequest: null
    }
  },
  computed: {
    isSuperAdmin() {
      return useAuthStore().isSuperAdmin
    },
    disabled() {
      return !!assistant.status && assistant.status.enabled === false
    },
    statusMissing() {
      return !assistant.status && !!assistant.statusError
    },
    toolWarning() {
      return assistant.status?.warning || ''
    },
    autoApprove() {
      return !!assistant.status?.settings?.auto_approve
    },
    suggestions() {
      return suggestionsFor(this.$route)
    },
    thinking() {
      if (!this.streaming) return false
      const last = this.items[this.items.length - 1]
      return !last || last.kind === 'user' || (last.kind === 'tool' && last.status !== 'running')
    }
  },
  watch: {
    conversationId: {
      immediate: true,
      handler(id) {
        if ((id || '') !== this.currentId) this.open(id || '')
      }
    },
    'assistant.focusTick'() {
      if (this.active) this.focus()
    },
    active(v) {
      if (v) this.$nextTick(() => this.scrollToBottom(true))
    }
  },
  mounted() {
    loadStatus()
    if (this.active) this.focus()
  },
  beforeUnmount() {
    if (this.controller) this.controller.abort()
  },
  methods: {
    md(text) {
      return renderMarkdown(text)
    },
    isInternal(link) {
      return /^\/(?!\/)/.test(link)
    },
    localLink(link) {
      const origin = window.location.origin
      return link && link.startsWith(origin + '/') ? link.slice(origin.length) : link
    },
    focus() {
      this.$nextTick(() => {
        const el = this.$refs.input
        if (el && window.matchMedia('(pointer: fine)').matches) el.focus()
      })
    },
    refreshStatus() {
      loadStatus(true)
    },
    toolIcon(it) {
      switch (it.status) {
        case 'running':
          return 'fa-solid fa-spinner fa-spin'
        case 'error':
          return 'fa-solid fa-circle-exclamation'
        case 'declined':
        case 'skipped':
          return 'fa-solid fa-ban'
        case 'awaiting':
          return 'fa-solid fa-hourglass-half'
        default:
          return it.write ? 'fa-solid fa-pen' : 'fa-solid fa-magnifying-glass'
      }
    },
    // ---- conversation loading ------------------------------------------
    async open(id) {
      if (this.controller) this.controller.abort()
      this.streaming = false
      this.currentId = id
      this.items = []
      this.pending = null
      this.error = null
      this.showDetails = false
      if (!id) return
      this.loading = true
      try {
        const { data } = await api.get(`/assistant/conversations/${id}`)
        if (this.currentId !== id) return
        const v = data?.data || {}
        this.items = (v.items || []).map((x) => ({ ...x, link: this.localLink(x.link || ''), key: `h${++keySeq}` }))
        this.pending = v.pending || null
        if (v.can_retry) this.error = { message: 'The last message did not get a reply.', retryable: true }
        this.lastRequest = v.can_retry ? { kind: 'retry' } : null
      } catch (e) {
        if (e.response?.status === 404) {
          this.currentId = ''
          this.$emit('update:conversationId', '')
        } else {
          this.error = { message: apiErrorMessage(e, 'Could not load this conversation'), retryable: false }
        }
      } finally {
        this.loading = false
        this.$nextTick(() => this.scrollToBottom(true))
      }
    },
    // ---- composer --------------------------------------------------------
    onKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault()
        this.submit()
      }
    },
    autosize() {
      const el = this.$refs.input
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 180) + 'px'
    },
    useSuggestion(s) {
      if (s.endsWith('…')) {
        this.draft = s.replace(/\s*…$/, ' ')
        this.$nextTick(() => {
          this.autosize()
          const el = this.$refs.input
          if (el) {
            el.focus()
            el.setSelectionRange(el.value.length, el.value.length)
          }
        })
        return
      }
      this.send(s)
    },
    submit() {
      const text = this.draft.trim()
      if (!text || this.streaming) return
      this.draft = ''
      this.$nextTick(this.autosize)
      this.send(text)
    },
    send(text) {
      if (this.streaming) return
      this.error = null
      if (this.pending) {
        // A new message declines the waiting action (the server does the same).
        this.markTool(this.pending.id, { status: 'declined', summary: `Skipped: ${this.pending.title}` })
        this.pending = null
      }
      this.items.push({ kind: 'user', text, key: `u${++keySeq}` })
      this.run('/assistant/chat', { conversation_id: this.currentId || undefined, message: text, page: pageContext(this.$route) }, { kind: 'chat', text })
    },
    retry() {
      const last = this.lastRequest
      this.error = null
      if (last && last.kind === 'chat' && !last.stored) {
        // Never reached the server: send the same text again.
        this.run('/assistant/chat', { conversation_id: this.currentId || undefined, message: last.text, page: pageContext(this.$route) }, last)
        return
      }
      if (!this.currentId) return
      this.run('/assistant/chat', { conversation_id: this.currentId, retry: true, page: pageContext(this.$route) }, { kind: 'retry', stored: true })
    },
    async resolve(approve) {
      if (!this.pending || this.resolving) return
      const p = this.pending
      this.resolving = true
      this.error = null
      this.markTool(p.id, { status: approve ? 'running' : 'declined', summary: approve ? `${p.title}…` : `Cancelled: ${p.title}` }, p)
      this.pending = null
      this.showDetails = false
      await this.run(`/assistant/conversations/${this.currentId}/actions/${encodeURIComponent(p.id)}`, { approve, page: pageContext(this.$route) }, { kind: 'resolve', stored: true, pending: p })
      this.resolving = false
    },
    stop() {
      if (this.controller) this.controller.abort()
    },
    // ---- streaming ---------------------------------------------------------
    markTool(id, patch, fallback) {
      const t = this.items.find((x) => x.kind === 'tool' && x.id === id)
      if (t) Object.assign(t, patch)
      else if (fallback || patch.summary) this.items.push({ kind: 'tool', id, name: fallback?.name || '', title: fallback?.title || '', key: `t${++keySeq}`, ...patch })
    },
    lastAssistant() {
      const last = this.items[this.items.length - 1]
      return last && last.kind === 'assistant' && last.streaming ? last : null
    },
    async run(path, body, req) {
      this.lastRequest = req
      this.streaming = true
      const controller = new AbortController()
      this.controller = controller
      const convBefore = this.currentId
      this.$nextTick(() => this.scrollToBottom(true))
      try {
        await streamSSE(path, body, {
          signal: controller.signal,
          onEvent: (ev, data) => this.onEvent(ev, data, req)
        })
      } catch (e) {
        if (controller.signal.aborted) {
          const a = this.lastAssistant()
          if (a) a.stopped = true
        } else if (!this.error) {
          this.error = {
            message: e.status === 429 ? e.message : e.status ? e.message : 'Connection lost. Check your connection and try again.',
            retryable: e.status !== 503 && e.status !== 404 && e.status !== 409
          }
          if (req.kind === 'resolve' && e.status === 409) this.open(this.currentId)
        }
      } finally {
        if (this.controller === controller) this.controller = null
        this.streaming = false
        for (const it of this.items) if (it.streaming) it.streaming = false
        for (const it of this.items) if (it.kind === 'tool' && it.status === 'running') it.status = controller.signal.aborted ? 'skipped' : it.status
        if (this.currentId && this.currentId !== convBefore) this.$emit('update:conversationId', this.currentId)
        this.$nextTick(() => this.scrollToBottom())
      }
    },
    onEvent(ev, d, req) {
      switch (ev) {
        case 'conversation':
          req.stored = true
          if (d.id && d.id !== this.currentId) {
            this.currentId = d.id
            this.$emit('update:conversationId', d.id)
          }
          upsertConversation({ id: d.id, title: d.title })
          break
        case 'text': {
          let a = this.lastAssistant()
          if (!a) {
            a = { kind: 'assistant', text: '', streaming: true, key: `a${++keySeq}` }
            this.items.push(a)
            a = this.items[this.items.length - 1]
          }
          a.text += d.delta || ''
          break
        }
        case 'step': {
          const a = this.lastAssistant()
          if (a) a.streaming = false
          break
        }
        case 'tool_start': {
          const a = this.lastAssistant()
          if (a) a.streaming = false
          const existing = this.items.find((x) => x.kind === 'tool' && x.id === d.id)
          if (existing) Object.assign(existing, { status: 'running', summary: d.label || d.title })
          else this.items.push({ kind: 'tool', id: d.id, name: d.name, title: d.title, status: 'running', summary: d.label || d.title, write: d.write, key: `t${++keySeq}` })
          break
        }
        case 'tool_result':
          this.markTool(d.id, { status: d.status, summary: d.summary, link: this.localLink(d.link || ''), write: d.write, name: d.name, title: d.title })
          if (d.write && d.status === 'done' && d.changed) emitDataChanged({ entity: d.changed, summary: d.summary, link: d.link || '', tool: d.name })
          break
        case 'pending_action': {
          const a = this.lastAssistant()
          if (a) a.streaming = false
          this.pending = d
          this.showDetails = false
          this.markTool(d.id, { status: 'awaiting', summary: d.summary, write: true }, d)
          break
        }
        case 'error':
          this.error = { message: d.message || 'Something went wrong', retryable: d.retryable !== false }
          break
        case 'done':
          break
      }
      this.$nextTick(() => this.scrollToBottom())
    },
    // ---- scrolling & links -----------------------------------------------
    onScroll() {
      const el = this.$refs.scroll
      if (!el) return
      this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    },
    scrollToBottom(force = false) {
      const el = this.$refs.scroll
      if (!el) return
      if (force || this.atBottom) {
        el.scrollTop = el.scrollHeight
        this.atBottom = true
      }
    },
    onContentClick(e) {
      const a = e.target.closest && e.target.closest('a[data-internal]')
      if (!a) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      this.$router.push(a.getAttribute('href'))
      this.$emit('navigate')
    }
  }
}
</script>

<style scoped>
.ac {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.ac__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px 18px 8px;
}

.ac--page .ac__scroll {
  padding: 24px clamp(16px, 4vw, 48px) 8px;
}

.ac--page .ac__list,
.ac--page .ac__empty,
.ac--page .ac__composer > * {
  max-width: 820px;
  margin-left: auto;
  margin-right: auto;
}

/* Setup / empty states */
.ac__setup,
.ac__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 32px 8px 16px;
  color: var(--text-2);
}

.ac__setup h3,
.ac__empty h3 {
  margin: 4px 0 0;
  font-size: 17px;
  font-weight: 650;
  color: var(--text);
}

.ac__setup p,
.ac__empty p {
  margin: 0;
  max-width: 420px;
  font-size: 13.5px;
  line-height: 1.55;
}

.ac__setup code {
  font-size: 12.5px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
}

.ac__setup-icon,
.ac__empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: var(--accent-soft);
  color: var(--accent);
}

.ac__setup-icon.is-warn {
  background: var(--warning-soft);
  color: var(--warning);
}

.ac__chips {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  max-width: 420px;
  margin-top: 10px;
}

.ac__chip {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.ac__chip i {
  font-size: 11px;
  color: var(--accent);
}

.ac__chip:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.ac__muted {
  color: var(--text-3);
  font-size: 12.5px;
}

.ac__loading {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Messages */
.ac__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ac__msg--user {
  display: flex;
  justify-content: flex-end;
}

.ac__bubble {
  max-width: 85%;
  padding: 9px 13px;
  border-radius: 16px 16px 4px 16px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ac__msg--bot {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  overflow-wrap: anywhere;
}

.ac__md :deep(p) {
  margin: 0 0 8px;
}

.ac__md :deep(p:last-child) {
  margin-bottom: 0;
}

.ac__md :deep(.md-h) {
  font-weight: 650;
  margin-top: 6px;
}

.ac__md :deep(ul),
.ac__md :deep(ol) {
  margin: 4px 0 8px;
  padding-left: 22px;
}

.ac__md :deep(li) {
  margin: 2px 0;
}

.ac__md :deep(code) {
  font-size: 12.5px;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.ac__md :deep(pre) {
  margin: 6px 0 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  overflow-x: auto;
}

.ac__md :deep(pre code) {
  padding: 0;
  border: 0;
  background: none;
}

.ac__md :deep(a) {
  color: var(--accent);
  font-weight: 550;
  text-decoration: none;
}

.ac__md :deep(a:hover) {
  text-decoration: underline;
}

.ac__md :deep(blockquote) {
  margin: 4px 0 8px;
  padding-left: 10px;
  border-left: 3px solid var(--border-strong);
  color: var(--text-2);
}

.ac__md :deep(.md-table) {
  margin: 6px 0 10px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.ac__md :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.ac__md :deep(th),
.ac__md :deep(td) {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}

.ac__md :deep(th) {
  background: var(--surface-2);
  font-weight: 600;
  color: var(--text-2);
}

.ac__md :deep(tr:last-child td) {
  border-bottom: 0;
}

.ac__caret {
  display: inline-block;
  width: 7px;
  height: 15px;
  margin-left: 2px;
  vertical-align: -2px;
  border-radius: 2px;
  background: var(--accent);
  animation: ac-blink 1s steps(2) infinite;
}

.ac__stopped {
  display: inline-block;
  margin-top: 2px;
}

@keyframes ac-blink {
  50% {
    opacity: 0;
  }
}

.ac__thinking {
  display: flex;
  gap: 4px;
  padding: 6px 2px;
}

.ac__thinking span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-3);
  animation: ac-dot 1.2s infinite ease-in-out;
}

.ac__thinking span:nth-child(2) {
  animation-delay: 0.15s;
}

.ac__thinking span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes ac-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* Tool chips */
.ac__tool {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 5px 10px 5px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12.5px;
}

.ac__tool-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10.5px;
  background: var(--surface);
  color: var(--text-3);
}

.ac__tool.is-done .ac__tool-icon {
  color: var(--success);
  background: var(--success-soft);
}

.ac__tool.is-error .ac__tool-icon {
  color: var(--danger);
  background: var(--danger-soft);
}

.ac__tool.is-awaiting .ac__tool-icon {
  color: var(--warning);
  background: var(--warning-soft);
}

.ac__tool.is-declined,
.ac__tool.is-skipped {
  opacity: 0.75;
}

.ac__tool-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac__tool-link {
  flex-shrink: 0;
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.ac__tool-link i {
  font-size: 10px;
}

/* Pending action */
.ac__pending {
  margin-top: 4px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.ac__pending.is-danger {
  border-color: color-mix(in srgb, var(--danger) 50%, var(--border));
}

.ac__pending-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.ac__pending-head small {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.ac__pending-head strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow-wrap: anywhere;
}

.ac__pending-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
}

.ac__pending.is-danger .ac__pending-icon {
  background: var(--danger-soft);
  color: var(--danger);
}

.ac__pending-warn {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12.5px;
  font-weight: 550;
}

.ac__details-btn {
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.ac__details-btn i {
  font-size: 10px;
  margin-right: 4px;
}

.ac__fields {
  display: grid;
  grid-template-columns: minmax(90px, max-content) 1fr;
  gap: 6px 12px;
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-2);
  font-size: 12.5px;
}

.ac__fields dt {
  color: var(--text-3);
  font-weight: 550;
}

.ac__fields dd {
  margin: 0;
  color: var(--text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ac__pending-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

/* Error */
.ac__error {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 13px;
}

.ac__error span {
  flex: 1 1 180px;
}

/* Composer */
.ac__jump {
  position: absolute;
  right: 18px;
  bottom: 96px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  box-shadow: var(--shadow);
  cursor: pointer;
}

.ac__composer {
  flex-shrink: 0;
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.ac__input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 6px 6px 6px 12px;
  border-radius: 14px;
  border: 1px solid var(--border-strong);
  background: var(--bg-subtle);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ac__input-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.ac__input {
  flex: 1 1 auto;
  min-width: 0;
  resize: none;
  border: 0 !important;
  outline: none;
  background: transparent !important;
  box-shadow: none !important;
  appearance: none;
  color: var(--text);
  font: inherit;
  font-size: 14.5px;
  line-height: 1.45;
  padding: 6px 0;
  max-height: 180px;
}

.ac__input::placeholder {
  color: var(--text-3);
}

.ac__send {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 0;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s;
}

.ac__send:disabled {
  opacity: 0.4;
  cursor: default;
}

.ac__send.is-stop {
  background: var(--text);
  color: var(--surface);
}

.ac__hint {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--text-3);
}

.ac__hint kbd {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  color: var(--text-2);
  font: inherit;
  font-weight: 600;
}

.ac__auto {
  color: var(--warning);
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .ac__hint > span:first-child {
    display: none;
  }
  .ac__input {
    font-size: 16px; /* no iOS zoom */
  }
  .ac__scroll {
    padding: 14px 14px 8px;
  }
}
</style>
