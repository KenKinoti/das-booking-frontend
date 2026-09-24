<template>
  <div class="mp ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 560px" role="dialog" aria-label="Departments">
      <div class="ui-modal__head">
        <h2>Departments</h2>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <form v-if="canManage" class="add-row" @submit.prevent="add">
          <input v-model.trim="name" class="ui-input" placeholder="New department name" maxlength="120" aria-label="New department name" />
          <button class="ui-btn ui-btn--primary" :disabled="!name || busy"><i class="fa-solid fa-plus"></i> Add</button>
        </form>
        <div v-if="!departments.length" class="ui-empty" style="padding: 32px 12px">
          <div class="ui-empty__icon"><i class="fa-solid fa-sitemap"></i></div>
          <h3>No departments yet</h3>
          <p>Group employees by team, e.g. Kitchen, Sales, Admin.</p>
        </div>
        <ul v-else class="dept-list">
          <li v-for="d in departments" :key="d.id">
            <template v-if="editing === d.id">
              <input v-model.trim="editName" class="ui-input" maxlength="120" aria-label="Department name" @keyup.enter="rename(d)" @keyup.esc="editing = ''" />
              <button class="ui-btn ui-btn--sm ui-btn--primary" :disabled="!editName || busy" @click="rename(d)">Save</button>
              <button class="ui-btn ui-btn--sm" @click="editing = ''">Cancel</button>
            </template>
            <template v-else>
              <span class="dept-name">{{ d.name }}</span>
              <span class="muted small">{{ d.employee_count }} {{ d.employee_count === 1 ? 'person' : 'people' }}</span>
              <span v-if="canManage" class="row-actions">
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Rename ${d.name}`" @click="startEdit(d)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${d.name}`" @click="remove(d)"><i class="fa-regular fa-trash-can"></i></button>
              </span>
            </template>
          </li>
        </ul>
      </div>
      <div class="ui-modal__foot">
        <button class="ui-btn" @click="$emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'HrDepartments',
  props: { departments: { type: Array, default: () => [] }, canManage: Boolean },
  emits: ['close', 'changed'],
  data() {
    return { name: '', editing: '', editName: '', busy: false }
  },
  methods: {
    async add() {
      this.busy = true
      try {
        await api.post('/hr/departments', { name: this.name })
        toast.success(`${this.name} added`)
        this.name = ''
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add department'))
      } finally {
        this.busy = false
      }
    },
    startEdit(d) {
      this.editing = d.id
      this.editName = d.name
    },
    async rename(d) {
      if (!this.editName) return
      this.busy = true
      try {
        await api.put(`/hr/departments/${d.id}`, { name: this.editName, description: d.description })
        this.editing = ''
        toast.success('Department renamed')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not rename department'))
      } finally {
        this.busy = false
      }
    },
    async remove(d) {
      const okd = await confirmDialog({
        title: `Delete ${d.name}?`,
        message: d.employee_count ? `${d.employee_count} employee(s) will no longer have a department.` : 'This department has no employees.',
        confirmText: 'Delete',
        danger: true
      })
      if (!okd) return
      try {
        await api.delete(`/hr/departments/${d.id}`)
        toast.success('Department deleted')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete department'))
      }
    }
  }
}
</script>

<style scoped>
.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.dept-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.dept-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  min-height: 52px;
  border-bottom: 1px solid var(--border);
}

.dept-list li:last-child {
  border-bottom: 0;
}

.dept-name {
  font-weight: 600;
  flex: 1;
}

.dept-list .row-actions {
  margin-left: auto;
}
</style>
