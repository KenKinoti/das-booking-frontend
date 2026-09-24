<template>
  <div class="ah">
    <div class="ah__search">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="q" type="search" placeholder="Search conversations" aria-label="Search conversations" />
    </div>
    <div v-if="assistant.conversationsLoading && !assistant.conversationsLoaded" class="ah__loading">
      <div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 34px"></div>
    </div>
    <div v-else-if="!filtered.length" class="ah__empty">
      {{ q ? 'No conversations match.' : 'No conversations yet.' }}
    </div>
    <ul v-else class="ah__list">
      <li v-for="c in filtered" :key="c.id" class="ah__item" :class="{ 'is-active': c.id === activeId }">
        <form v-if="editing === c.id" class="ah__edit" @submit.prevent="saveRename(c)">
          <input ref="renameInput" v-model="editTitle" class="ui-input" maxlength="120" aria-label="Conversation title" @keydown.esc.stop="editing = ''" />
          <button class="ui-btn ui-btn--icon ui-btn--sm ui-btn--primary" type="submit" aria-label="Save title"><i class="fa-solid fa-check"></i></button>
        </form>
        <template v-else>
          <button class="ah__open" type="button" @click="$emit('select', c.id)">
            <span class="ah__title">{{ c.title || 'Untitled' }}</span>
            <span class="ah__meta">
              <i v-if="c.has_pending" class="fa-solid fa-hourglass-half" title="Waiting for your confirmation"></i>
              {{ when(c.last_message_at || c.updated_at) }}
            </span>
          </button>
          <div class="ah__actions">
            <button class="ah__icon" type="button" @click="startRename(c)" aria-label="Rename conversation" title="Rename"><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="ah__icon is-danger" type="button" @click="remove(c)" aria-label="Delete conversation" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </template>
      </li>
    </ul>
  </div>
</template>

<script>
import { assistant, loadConversations, renameConversation, deleteConversation } from '@/composables/useAssistant'
import { confirmDialog } from '@/composables/useConfirm'
import { toast } from '@/composables/useToast'
import { apiErrorMessage } from '@/services/api'

export default {
  name: 'AssistantHistory',
  props: { activeId: { type: String, default: '' } },
  emits: ['select', 'deleted'],
  data() {
    return { assistant, q: '', editing: '', editTitle: '' }
  },
  computed: {
    filtered() {
      const q = this.q.trim().toLowerCase()
      const list = assistant.conversations
      return q ? list.filter((c) => (c.title || '').toLowerCase().includes(q)) : list
    }
  },
  mounted() {
    loadConversations()
  },
  methods: {
    when(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60) return 'just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    },
    startRename(c) {
      this.editing = c.id
      this.editTitle = c.title || ''
      this.$nextTick(() => {
        const el = Array.isArray(this.$refs.renameInput) ? this.$refs.renameInput[0] : this.$refs.renameInput
        if (el) el.focus()
      })
    },
    async saveRename(c) {
      const t = this.editTitle.trim()
      if (!t) return
      try {
        await renameConversation(c.id, t)
        this.editing = ''
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not rename the conversation'))
      }
    },
    async remove(c) {
      const ok = await confirmDialog({ title: 'Delete conversation?', message: `“${c.title || 'Untitled'}” will be permanently deleted.`, confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await deleteConversation(c.id)
        this.$emit('deleted', c.id)
        toast.success('Conversation deleted')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the conversation'))
      }
    }
  }
}
</script>

<style scoped>
.ah {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.ah__search {
  position: relative;
}

.ah__search i {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-3);
}

.ah__search input {
  width: 100%;
  height: 34px;
  padding: 0 10px 0 30px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.ah__search input:focus {
  border-color: var(--accent);
}

.ah__loading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ah__empty {
  padding: 16px 6px;
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
}

.ah__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  min-height: 0;
}

.ah__item {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 9px;
}

.ah__item:hover,
.ah__item.is-active {
  background: var(--surface-hover);
}

.ah__item.is-active .ah__title {
  color: var(--accent);
  font-weight: 600;
}

.ah__open {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 7px 10px;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.ah__title {
  width: 100%;
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ah__meta {
  font-size: 11.5px;
  color: var(--text-3);
}

.ah__meta i {
  color: var(--warning);
  margin-right: 3px;
}

.ah__actions {
  display: flex;
  gap: 2px;
  padding-right: 4px;
  opacity: 0;
  transition: opacity 0.12s;
}

.ah__item:hover .ah__actions,
.ah__item:focus-within .ah__actions {
  opacity: 1;
}

@media (hover: none) {
  .ah__actions {
    opacity: 1;
  }
}

.ah__icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 0;
  background: none;
  color: var(--text-3);
  cursor: pointer;
}

.ah__icon:hover {
  background: var(--surface);
  color: var(--text);
}

.ah__icon.is-danger:hover {
  color: var(--danger);
}

.ah__edit {
  display: flex;
  gap: 6px;
  width: 100%;
  padding: 4px;
}

.ah__edit .ui-input {
  height: 32px;
  font-size: 13px;
}
</style>
