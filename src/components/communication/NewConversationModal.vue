<template>
  <div class="mp ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 560px" novalidate @submit.prevent="submit">
      <div class="ui-modal__head">
        <h2>New conversation</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 14px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <p v-if="!allowGroups" class="ui-hint" style="margin: 0 0 10px">Group conversations are turned off — choose one person.</p>
        <div class="ui-input-group">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input ref="search" v-model="q" class="ui-input" type="search" placeholder="Search people in your organisation" aria-label="Search people" />
        </div>

        <div v-if="selected.length" class="picked">
          <span v-for="u in selectedUsers" :key="u.id" class="pill">
            {{ name(u) }}
            <button type="button" :aria-label="`Remove ${name(u)}`" @click="toggle(u.id)"><i class="fa-solid fa-xmark"></i></button>
          </span>
        </div>

        <div class="people" role="listbox" aria-multiselectable="true" aria-label="People">
          <div v-if="loading" class="sk"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 44px"></div></div>
          <div v-else-if="!filtered.length" class="empty muted">{{ users.length ? 'No one matches that search.' : 'No one else is in your organisation yet. Add staff to start chatting.' }}</div>
          <label v-for="u in filtered" v-else :key="u.id" class="person-row" :class="{ 'is-selected': selected.includes(u.id) }">
            <input type="checkbox" :checked="selected.includes(u.id)" @change="toggle(u.id)" />
            <span class="avatar">{{ initials(name(u)) }}</span>
            <span class="who">
              <strong>{{ name(u) }}</strong>
              <small>{{ u.email }}<template v-if="u.role"> · {{ roleLabel(u.role) }}</template></small>
            </span>
            <i v-if="selected.includes(u.id)" class="fa-solid fa-circle-check tick"></i>
          </label>
        </div>

        <label v-if="selected.length > 1" class="ui-field" style="margin-top: 14px">
          <span class="ui-label">Group name (optional)</span>
          <input v-model.trim="groupName" class="ui-input" maxlength="100" placeholder="e.g. Kitchen team" />
        </label>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="!selected.length || saving">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-paper-plane'"></i>
          {{ selected.length > 1 ? 'Start group chat' : 'Start chat' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage, listFrom } from '@/services/api'
import { messagingService, personName, initials } from '@/services/messaging'

const ROLES = { super_admin: 'Super admin', admin: 'Admin', manager: 'Manager', care_worker: 'Staff', support_coordinator: 'Coordinator' }

export default {
  name: 'NewConversationModal',
  props: {
    meId: { type: String, default: '' },
    threads: { type: Array, default: () => [] },
    allowGroups: { type: Boolean, default: true }
  },
  emits: ['close', 'created', 'open'],
  data() {
    return { users: [], loading: true, q: '', selected: [], groupName: '', saving: false, error: '' }
  },
  computed: {
    filtered() {
      const q = this.q.toLowerCase()
      return this.users.filter((u) => !q || `${this.name(u)} ${u.email}`.toLowerCase().includes(q))
    },
    selectedUsers() {
      return this.selected.map((id) => this.users.find((u) => u.id === id)).filter(Boolean)
    }
  },
  async created() {
    try {
      const res = await api.get('/users', { params: { limit: 500, is_active: true } })
      this.users = listFrom(res, 'users').filter((u) => u.id !== this.meId && u.is_active !== false).sort((a, b) => this.name(a).localeCompare(this.name(b)))
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load people')
    } finally {
      this.loading = false
      this.$nextTick(() => this.$refs.search && this.$refs.search.focus())
    }
  },
  methods: {
    name: personName,
    initials,
    roleLabel: (r) => ROLES[r] || r,
    toggle(id) {
      if (this.selected.includes(id)) this.selected = this.selected.filter((x) => x !== id)
      else this.selected = this.allowGroups ? [...this.selected, id] : [id]
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    async submit() {
      if (!this.selected.length) return
      // Re-use an existing one-to-one chat instead of creating a duplicate.
      if (this.selected.length === 1) {
        const existing = this.threads.find((t) => !t.isGroup && t.others.length === 1 && t.others[0].user_id === this.selected[0])
        if (existing) {
          this.$emit('open', existing.id)
          return
        }
      }
      this.saving = true
      this.error = ''
      try {
        const thread = await messagingService.createThread({
          type: this.selected.length > 1 ? 'group' : 'direct',
          name: this.selected.length > 1 ? this.groupName : '',
          participant_ids: this.selected
        })
        this.$emit('created', thread)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not start the conversation')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.picked {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 600;
}

.pill button {
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
}

.pill button:hover {
  background: var(--surface);
}

.people {
  margin-top: 12px;
  max-height: 340px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.sk {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.empty {
  padding: 28px 16px;
  text-align: center;
  font-size: 13.5px;
}

.person-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.person-row:last-child {
  border-bottom: 0;
}

.person-row:hover {
  background: var(--surface-hover);
}

.person-row.is-selected {
  background: var(--accent-soft);
}

.person-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.who {
  flex: 1;
  min-width: 0;
}

.who strong {
  display: block;
  font-weight: 600;
}

.who small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tick {
  color: var(--accent);
}
</style>
