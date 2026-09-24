<template>
  <transition name="asp-fade">
    <div v-if="assistant.open" class="asp-scrim" @click="close" aria-hidden="true"></div>
  </transition>
  <transition name="asp-slide">
    <aside v-if="assistant.open" class="asp" role="dialog" aria-modal="false" aria-label="Ask DASYIN" @keydown.esc="onEsc">
      <header class="asp__head">
        <div class="asp__title">
          <span class="asp__logo"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
          <div class="asp__title-text">
            <strong>Ask DASYIN</strong>
            <small :title="currentTitle">{{ currentTitle }}</small>
          </div>
        </div>
        <div class="asp__actions">
          <div class="asp__pop-wrap" ref="historyWrap">
            <button class="asp__btn" :class="{ 'is-on': menu === 'history' }" @click="toggleMenu('history')" aria-label="Conversation history" title="History" :aria-expanded="menu === 'history'">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </button>
          </div>
          <button class="asp__btn" @click="newChat" aria-label="New conversation" title="New conversation"><i class="fa-solid fa-plus"></i></button>
          <button class="asp__btn" :class="{ 'is-on': menu === 'settings' }" @click="toggleMenu('settings')" aria-label="Assistant settings" title="Settings" :aria-expanded="menu === 'settings'">
            <i class="fa-solid fa-sliders"></i>
          </button>
          <router-link class="asp__btn asp__hide-sm" :to="fullPageLink" @click="close" aria-label="Open full page" title="Open full page"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></router-link>
          <button class="asp__btn" @click="close" aria-label="Close assistant" title="Close (Esc)"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>

      <div v-if="menu" class="asp__drop" ref="drop">
        <AssistantHistory v-if="menu === 'history'" :active-id="assistant.panelConversation" @select="selectConversation" @deleted="onDeleted" />
        <AssistantSettings v-else-if="menu === 'settings'" />
      </div>

      <AssistantChat
        class="asp__chat"
        variant="panel"
        :conversation-id="assistant.panelConversation"
        :active="assistant.open"
        @update:conversation-id="setPanelConversation"
        @navigate="onNavigate"
      />
    </aside>
  </transition>
</template>

<script>
import AssistantChat from './AssistantChat.vue'
import AssistantHistory from './AssistantHistory.vue'
import AssistantSettings from './AssistantSettings.vue'
import { assistant, closeAssistant, toggleAssistant, setPanelConversation, loadConversations } from '@/composables/useAssistant'
import { toast } from '@/composables/useToast'

export default {
  name: 'AssistantPanel',
  components: { AssistantChat, AssistantHistory, AssistantSettings },
  data() {
    return { assistant, menu: '', isMobile: false }
  },
  computed: {
    currentTitle() {
      const c = assistant.conversations.find((x) => x.id === assistant.panelConversation)
      return c?.title || (assistant.panelConversation ? 'Conversation' : 'New conversation')
    },
    fullPageLink() {
      return assistant.panelConversation ? { path: '/assistant', query: { c: assistant.panelConversation } } : '/assistant'
    }
  },
  watch: {
    'assistant.open'(open) {
      this.menu = ''
      if (open && !assistant.conversationsLoaded) loadConversations()
      this.lockScroll(open)
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('dasyin:data-changed', this.onDataChanged)
    document.addEventListener('mousedown', this.onDocDown)
    this.mq = window.matchMedia('(max-width: 640px)')
    this.isMobile = this.mq.matches
    this.onMq = (e) => {
      this.isMobile = e.matches
      this.lockScroll(assistant.open)
    }
    this.mq.addEventListener?.('change', this.onMq)
    if (assistant.open) {
      loadConversations()
      this.lockScroll(true)
    }
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('dasyin:data-changed', this.onDataChanged)
    document.removeEventListener('mousedown', this.onDocDown)
    this.mq?.removeEventListener?.('change', this.onMq)
    this.lockScroll(false)
  },
  methods: {
    setPanelConversation,
    lockScroll(open) {
      // Full-screen sheet on phones: stop the page behind from scrolling.
      document.documentElement.classList.toggle('has-assistant-sheet', !!open && this.isMobile)
      // Lets toasts move out of the way of the composer.
      document.documentElement.classList.toggle('has-assistant-open', !!open)
    },
    close() {
      closeAssistant()
    },
    onEsc() {
      if (this.menu) this.menu = ''
      else this.close()
    },
    toggleMenu(m) {
      this.menu = this.menu === m ? '' : m
    },
    onDocDown(e) {
      if (!this.menu) return
      const drop = this.$refs.drop
      if (drop && drop.contains(e.target)) return
      if (e.target.closest && e.target.closest('.asp__btn')) return
      if (e.target.closest && e.target.closest('.ui-modal-backdrop, .confirm, [role="alertdialog"]')) return
      this.menu = ''
    },
    newChat() {
      setPanelConversation('')
      this.menu = ''
      assistant.focusTick++
    },
    selectConversation(id) {
      setPanelConversation(id)
      this.menu = ''
    },
    onDeleted(id) {
      if (assistant.panelConversation === id) setPanelConversation('')
    },
    onNavigate() {
      if (this.isMobile) this.close()
    },
    onKey(e) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        if (this.$route.path === '/assistant') {
          assistant.focusTick++
          return
        }
        toggleAssistant()
      }
    },
    onDataChanged(e) {
      const d = e.detail || {}
      toast.success(d.summary || 'Updated by Ask DASYIN', {
        title: 'Ask DASYIN',
        duration: 7000,
        action: { label: 'Refresh page', run: () => window.location.reload() }
      })
    }
  }
}
</script>

<style scoped>
.asp-scrim {
  display: none;
}

.asp {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1040;
  width: min(440px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  padding-top: env(safe-area-inset-top);
}

.asp__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 60px;
  padding: 0 10px 0 16px;
  border-bottom: 1px solid var(--border);
}

.asp__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.asp__logo {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 14px;
}

.asp__title-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.asp__title-text strong {
  font-size: 14.5px;
  font-weight: 650;
  color: var(--text);
}

.asp__title-text small {
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asp__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.asp__btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  border: 0;
  background: none;
  color: var(--text-2);
  cursor: pointer;
  text-decoration: none;
}

.asp__btn:hover,
.asp__btn.is-on {
  background: var(--surface-hover);
  color: var(--text);
}

.asp__drop {
  position: absolute;
  top: calc(60px + env(safe-area-inset-top));
  left: 10px;
  right: 10px;
  z-index: 5;
  max-height: min(460px, calc(100% - 140px));
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  overflow: auto;
}

.asp__chat {
  flex: 1 1 auto;
  min-height: 0;
}

.asp-slide-enter-active,
.asp-slide-leave-active {
  transition: transform 0.22s var(--ease), opacity 0.22s;
}

.asp-slide-enter-from,
.asp-slide-leave-to {
  transform: translateX(24px);
  opacity: 0;
}

.asp-fade-enter-active,
.asp-fade-leave-active {
  transition: opacity 0.2s;
}

.asp-fade-enter-from,
.asp-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .asp {
    width: 100vw;
    border-left: 0;
    height: 100dvh;
  }
  .asp__hide-sm {
    display: none;
  }
  .asp__head {
    padding-left: max(14px, env(safe-area-inset-left));
    padding-right: max(8px, env(safe-area-inset-right));
  }
  .asp-slide-enter-from,
  .asp-slide-leave-to {
    transform: translateY(24px);
  }
}

@media (min-width: 641px) and (max-width: 991px) {
  .asp-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1039;
    background: rgba(10, 12, 24, 0.35);
  }
}
</style>

<style>
html.has-assistant-sheet,
html.has-assistant-sheet body {
  overflow: hidden;
}

/* Keep toasts clear of the open panel's composer */
@media (min-width: 641px) {
  html.has-assistant-open .toasts {
    right: calc(min(440px, 100vw) + 16px);
  }
}

@media (max-width: 640px) {
  html.has-assistant-open .toasts {
    bottom: auto;
    top: calc(68px + env(safe-area-inset-top));
  }
}
</style>
