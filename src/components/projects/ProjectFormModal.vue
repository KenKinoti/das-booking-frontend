<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 640px" novalidate role="dialog" aria-modal="true" :aria-label="title" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>{{ title }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="isJira" class="ui-alert jira-note">
          <i class="fa-brands fa-jira"></i>
          <span>Name and description come from Jira and update on every sync. You can plan status, dates, budget and owner here.</span>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="grid-name">
          <div class="ui-field">
            <label for="pf-name">Project name</label>
            <input id="pf-name" ref="name" v-model="form.name" class="ui-input" :disabled="isJira" maxlength="255" placeholder="e.g. Website redesign" required />
          </div>
          <div class="ui-field">
            <label for="pf-key">Key</label>
            <input id="pf-key" v-model="form.key" class="ui-input mono" :disabled="!!project" maxlength="10" placeholder="Auto" @input="form.key = form.key.toUpperCase().replace(/[^A-Z0-9]/g, '')" />
          </div>
        </div>
        <p v-if="!project" class="ui-hint key-hint">Tasks are numbered with the key, e.g. {{ (form.key || suggestedKey) }}-1. It can't be changed later.</p>

        <div class="ui-field">
          <label for="pf-desc">Description</label>
          <textarea id="pf-desc" v-model="form.description" class="ui-textarea" rows="3" :disabled="isJira" placeholder="What is this project about?"></textarea>
        </div>

        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="pf-status">Status</label>
            <select id="pf-status" v-model="form.status" class="ui-select">
              <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="pf-owner">Owner</label>
            <input id="pf-owner" v-model="form.owner_name" class="ui-input" maxlength="255" placeholder="Who is accountable?" />
          </div>
          <div class="ui-field">
            <label for="pf-start">Start date</label>
            <input id="pf-start" v-model="form.start_date" type="date" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="pf-due">Due date</label>
            <input id="pf-due" v-model="form.due_date" type="date" class="ui-input" :min="form.start_date || undefined" />
          </div>
          <div class="ui-field">
            <label for="pf-budget">Budget</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-dollar-sign"></i>
              <input id="pf-budget" v-model="form.budget" type="number" min="0" step="0.01" class="ui-input" placeholder="0.00" />
            </div>
          </div>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ project ? 'Save changes' : 'Create project' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { pmApi, PROJECT_STATUSES } from '@/services/projects'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const day = (v) => (v ? String(v).slice(0, 10) : '')

export default {
  name: 'ProjectFormModal',
  props: { project: { type: Object, default: null } },
  emits: ['close', 'saved'],
  data() {
    const p = this.project || {}
    return {
      statuses: PROJECT_STATUSES,
      saving: false,
      error: '',
      form: {
        name: p.name || '',
        key: p.key || '',
        description: p.description || '',
        status: p.status || 'active',
        owner_name: p.owner_name || '',
        start_date: day(p.start_date),
        due_date: day(p.due_date),
        budget: p.budget ? String(p.budget) : ''
      }
    }
  },
  computed: {
    isJira() {
      return this.project?.source === 'jira'
    },
    title() {
      return this.project ? `Edit ${this.project.key || 'project'}` : 'New project'
    },
    suggestedKey() {
      const words = this.form.name.split(/[^A-Za-z0-9]+/).filter(Boolean)
      let k = words.map((w) => (/[A-Za-z]/.test(w[0]) ? w[0] : '')).join('').toUpperCase()
      if (k.length < 2) k = this.form.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!/^[A-Z]/.test(k) || k.length < 2) k = 'PRJ' + k
      return k.slice(0, 5)
    }
  },
  mounted() {
    if (!this.project) this.$nextTick(() => this.$refs.name?.focus())
  },
  methods: {
    async save() {
      this.error = ''
      if (!this.isJira && !this.form.name.trim()) {
        this.error = 'Give the project a name.'
        return
      }
      if (this.form.key && !/^[A-Z][A-Z0-9]{1,9}$/.test(this.form.key)) {
        this.error = 'Key must be 2–10 letters or digits and start with a letter.'
        return
      }
      if (this.form.start_date && this.form.due_date && this.form.due_date < this.form.start_date) {
        this.error = 'Due date must be on or after the start date.'
        return
      }
      const payload = {
        status: this.form.status,
        owner_name: this.form.owner_name,
        start_date: this.form.start_date,
        due_date: this.form.due_date,
        budget: this.form.budget === '' ? 0 : Number(this.form.budget)
      }
      if (!this.isJira) {
        payload.name = this.form.name
        payload.description = this.form.description
      }
      if (!this.project && this.form.key) payload.key = this.form.key
      this.saving = true
      try {
        const saved = this.project ? await pmApi.updateProject(this.project.id, payload) : await pmApi.createProject(payload)
        toast.success(this.project ? 'Project updated' : `Project ${saved.key} created`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the project')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.ui-alert {
  margin-bottom: 14px;
}
.grid-name {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 12px;
}
.key-hint {
  margin: -2px 0 16px;
}
.mono {
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}
.jira-note {
  background: var(--info-soft);
  color: var(--text);
  border-color: transparent;
}
.jira-note i {
  color: var(--info);
}
@media (max-width: 520px) {
  .grid-name {
    grid-template-columns: 1fr 110px;
  }
}
</style>
