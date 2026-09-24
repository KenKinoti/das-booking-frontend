<template>
  <div class="ui-page ui-page--wide ap">
    <div class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Overview</div>
        <h1>Ask DASYIN</h1>
        <p>Chat with your business data. Look things up, or ask for changes — you confirm before anything is updated.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--ghost ap__hist-toggle" @click="showSidebar = !showSidebar" :aria-expanded="showSidebar">
          <i class="fa-solid fa-clock-rotate-left"></i> History
        </button>
        <button class="ui-btn ui-btn--ghost" @click="showSettings = !showSettings" :aria-expanded="showSettings"><i class="fa-solid fa-sliders"></i><span class="ap__hide-sm"> Settings</span></button>
        <button class="ui-btn ui-btn--primary" @click="newChat"><i class="fa-solid fa-plus"></i> New chat</button>
      </div>
    </div>

    <div v-if="showSettings" class="ui-card ap__settings">
      <div class="ui-card__body"><AssistantSettings /></div>
    </div>

    <div class="ui-card ap__shell" :class="{ 'show-sidebar': showSidebar }">
      <aside class="ap__side">
        <div class="ap__side-head">
          <strong>Conversations</strong>
          <span class="ap__count">{{ assistant.conversations.length }}</span>
        </div>
        <AssistantHistory :active-id="conversationId" @select="select" @deleted="onDeleted" />
      </aside>
      <section class="ap__main">
        <AssistantChat variant="page" :conversation-id="conversationId" @update:conversation-id="onConversation" />
      </section>
    </div>
  </div>
</template>

<script>
import AssistantChat from '@/components/assistant/AssistantChat.vue'
import AssistantHistory from '@/components/assistant/AssistantHistory.vue'
import AssistantSettings from '@/components/assistant/AssistantSettings.vue'
import { assistant, closeAssistant } from '@/composables/useAssistant'

export default {
  name: 'AssistantPage',
  components: { AssistantChat, AssistantHistory, AssistantSettings },
  data() {
    return { assistant, showSidebar: false, showSettings: false }
  },
  computed: {
    conversationId() {
      const c = this.$route.query.c
      return typeof c === 'string' ? c : ''
    }
  },
  created() {
    // The page replaces the slide-over.
    if (assistant.open) closeAssistant()
  },
  methods: {
    select(id) {
      this.showSidebar = false
      if (id !== this.conversationId) this.$router.replace({ query: { ...this.$route.query, c: id } })
    },
    onConversation(id) {
      if ((id || '') === this.conversationId) return
      const q = { ...this.$route.query }
      if (id) q.c = id
      else delete q.c
      this.$router.replace({ query: q })
    },
    newChat() {
      this.onConversation('')
      assistant.focusTick++
    },
    onDeleted(id) {
      if (id === this.conversationId) this.onConversation('')
    }
  }
}
</script>

<style scoped>
.ap {
  display: flex;
  flex-direction: column;
}

.ap__settings {
  margin-bottom: 16px;
  max-width: 560px;
}

.ap__shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  height: calc(100dvh - var(--topbar-h) - 190px);
  min-height: 460px;
  overflow: hidden;
  padding: 0;
}

.ap__side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 14px 10px;
  border-right: 1px solid var(--border);
  background: var(--surface-2);
}

.ap__side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  font-size: 13px;
  color: var(--text-2);
}

.ap__count {
  font-size: 11.5px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-3);
  border: 1px solid var(--border);
}

.ap__main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ap__hist-toggle {
  display: none;
}

@media (max-width: 991px) {
  .ap__shell {
    grid-template-columns: minmax(0, 1fr);
    position: relative;
    height: calc(100dvh - var(--topbar-h) - 210px);
  }
  .ap__side {
    display: none;
    position: absolute;
    inset: 0;
    z-index: 3;
    border-right: 0;
    background: var(--surface);
  }
  .ap__shell.show-sidebar .ap__side {
    display: flex;
  }
  .ap__hist-toggle {
    display: inline-flex;
  }
}

@media (max-width: 640px) {
  .ap__hide-sm {
    display: none;
  }
  .ap__shell {
    height: calc(100dvh - var(--topbar-h) - 230px);
    min-height: 420px;
  }
}
</style>
