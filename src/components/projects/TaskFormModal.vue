<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 640px" novalidate role="dialog" aria-modal="true" :aria-label="title" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>{{ title }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="ui-field">
          <label for="tf-title">Title</label>
          <input id="tf-title" ref="title" v-model="form.title" class="ui-input" maxlength="512" placeholder="What needs to be done?" required />
        </div>
        <div class="ui-field">
          <label for="tf-desc">Description</label>
          <textarea id="tf-desc" v-model="form.description" class="ui-textarea" rows="3" placeholder="Details, acceptance criteria, links…"></textarea>
        </div>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="tf-status">Status</label>
            <select id="tf-status" v-model="form.status_category" class="ui-select">
              <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="tf-type">Type</label>
            <select id="tf-type" v-model="form.type" class="ui-select">
              <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="tf-priority">Priority</label>
            <select id="tf-priority" v-model="form.priority" class="ui-select">
              <option value="">None</option>
              <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="tf-due">Due date</label>
            <input id="tf-due" v-model="form.due_date" type="date" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="tf-assignee">Assignee</label>
            <input id="tf-assignee" v-model="form.assignee_name" class="ui-input" list="tf-assignees" maxlength="255" placeholder="Name" />
            <datalist id="tf-assignees">
              <option v-for="a in assignees" :key="a" :value="a"></option>
            </datalist>
          </div>
          <div class="ui-field">
            <label for="tf-points">Story points</label>
            <input id="tf-points" v-model="form.story_points" type="number" min="0" max="1000" step="0.5" class="ui-input" placeholder="—" />
          </div>
        </div>
        <div class="ui-field">
          <label for="tf-email">Assignee email <span class="opt">(optional)</span></label>
          <input id="tf-email" v-model="form.assignee_email" type="email" class="ui-input" maxlength="255" placeholder="name@company.com" />
        </div>
      </div>
      <div class="ui-modal__foot">
        <button v-if="task" type="button" class="ui-btn ui-btn--ghost danger-link" :disabled="saving" @click="remove">
          <i class="fa-regular fa-trash-can"></i> Delete
        </button>
        <span class="spacer"></span>
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ task ? 'Save task' : 'Add task' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { pmApi, TASK_CATEGORIES, PRIORITIES, TASK_TYPES } from '@/services/projects'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'TaskFormModal',
  props: {
    projectId: { type: String, required: true },
    task: { type: Object, default: null },
    defaultCategory: { type: String, default: 'todo' },
    assignees: { type: Array, default: () => [] }
  },
  emits: ['close', 'saved', 'deleted'],
  data() {
    const t = this.task || {}
    return {
      categories: TASK_CATEGORIES,
      priorities: PRIORITIES,
      saving: false,
      error: '',
      form: {
        title: t.title || '',
        description: t.description || '',
        status_category: t.status_category || this.defaultCategory,
        type: t.type || 'Task',
        priority: String(t.priority || '').toLowerCase(),
        due_date: t.due_date ? String(t.due_date).slice(0, 10) : '',
        assignee_name: t.assignee_name || '',
        assignee_email: t.assignee_email || '',
        story_points: t.story_points ?? ''
      }
    }
  },
  computed: {
    title() {
      return this.task ? `Edit ${this.task.key}` : 'New task'
    },
    typeOptions() {
      return TASK_TYPES.includes(this.form.type) ? TASK_TYPES : [this.form.type, ...TASK_TYPES]
    }
  },
  mounted() {
    this.$nextTick(() => this.$refs.title?.focus())
  },
  methods: {
    async save() {
      this.error = ''
      if (!this.form.title.trim()) {
        this.error = 'Give the task a title.'
        return
      }
      const pts = this.form.story_points
      const payload = { ...this.form, story_points: pts === '' || pts === null ? undefined : Number(pts), clear_story_points: pts === '' || pts === null }
      this.saving = true
      try {
        const saved = this.task ? await pmApi.updateTask(this.task.id, payload) : await pmApi.createTask(this.projectId, payload)
        toast.success(this.task ? 'Task updated' : `Task ${saved.key} added`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the task')
      } finally {
        this.saving = false
      }
    },
    async remove() {
      const okd = await confirmDialog({ title: `Delete ${this.task.key}?`, message: `“${this.task.title}” will be permanently deleted.`, confirmText: 'Delete task', danger: true })
      if (!okd) return
      this.saving = true
      try {
        await pmApi.deleteTask(this.task.id)
        toast.success('Task deleted')
        this.$emit('deleted', this.task)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not delete the task')
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
.opt {
  color: var(--text-3);
  font-weight: 400;
}
.spacer {
  flex: 1;
}
.danger-link {
  color: var(--danger);
}
</style>
