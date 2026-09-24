<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-label="Categories">
      <div class="ui-modal__head">
        <div>
          <h2>Categories</h2>
          <p class="sub">Rename, add or remove the categories used in your cash book.</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div class="ui-tabs">
          <button class="ui-tab" :class="{ 'is-active': type === 'income' }" @click="type = 'income'">Money in <span class="count">{{ count('income') }}</span></button>
          <button class="ui-tab" :class="{ 'is-active': type === 'expense' }" @click="type = 'expense'">Money out <span class="count">{{ count('expense') }}</span></button>
        </div>

        <ul class="cats">
          <li v-for="c in list" :key="c.id" class="cat">
            <template v-if="editing === c.id">
              <input v-model="editName" class="ui-input" maxlength="80" aria-label="Category name" @keydown.enter.prevent="saveEdit(c)" @keydown.esc.stop="editing = null" />
              <label class="ui-switch small" title="No tax is normally charged on this category"><input v-model="editTaxFree" type="checkbox" /> Tax-free</label>
              <button class="ui-btn ui-btn--sm ui-btn--primary" :disabled="busy" @click="saveEdit(c)">Save</button>
              <button class="ui-btn ui-btn--sm ui-btn--ghost" @click="editing = null">Cancel</button>
            </template>
            <template v-else>
              <span class="cat__name">{{ c.name }}</span>
              <span v-if="c.tax_free" class="ui-badge ui-badge--draft">Tax-free</span>
              <span class="cat__count">{{ c.entry_count }} {{ c.entry_count === 1 ? 'entry' : 'entries' }}</span>
              <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Rename ${c.name}`" @click="startEdit(c)"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Delete ${c.name}`" :disabled="busy" @click="remove(c)"><i class="fa-regular fa-trash-can"></i></button>
            </template>
          </li>
          <li v-if="!list.length" class="cat empty">No categories yet.</li>
        </ul>

        <form class="add" @submit.prevent="add">
          <input v-model="newName" class="ui-input" maxlength="80" :placeholder="type === 'income' ? 'New income category' : 'New expense category'" aria-label="New category name" />
          <label class="ui-switch small"><input v-model="newTaxFree" type="checkbox" /> Tax-free</label>
          <button class="ui-btn ui-btn--primary" :disabled="busy || !newName.trim()"><i class="fa-solid fa-plus"></i> Add</button>
        </form>
        <div v-if="error" class="err">{{ error }}</div>
      </div>
      <div class="ui-modal__foot">
        <button class="ui-btn" @click="$emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
import { smallbizApi } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'CategoryModal',
  props: { categories: { type: Array, default: () => [] } },
  emits: ['close', 'changed'],
  data() {
    return { type: 'expense', editing: null, editName: '', editTaxFree: false, newName: '', newTaxFree: false, busy: false, error: '' }
  },
  computed: {
    list() {
      return this.categories.filter((c) => c.type === this.type)
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape' && !this.editing) this.$emit('close')
    },
    count(t) {
      return this.categories.filter((c) => c.type === t).length
    },
    startEdit(c) {
      this.editing = c.id
      this.editName = c.name
      this.editTaxFree = c.tax_free
      this.error = ''
    },
    async run(fn, msg) {
      this.busy = true
      this.error = ''
      try {
        await fn()
        this.$emit('changed')
        return true
      } catch (e) {
        this.error = apiErrorMessage(e, msg)
        return false
      } finally {
        this.busy = false
      }
    },
    async saveEdit(c) {
      if (!this.editName.trim()) return
      if (await this.run(() => smallbizApi.updateCategory(c.id, { name: this.editName, type: c.type, tax_free: this.editTaxFree }), 'Could not rename category')) {
        this.editing = null
        toast.success('Category updated')
      }
    },
    async add() {
      if (await this.run(() => smallbizApi.createCategory({ name: this.newName, type: this.type, tax_free: this.newTaxFree }), 'Could not add category')) {
        toast.success(`Added “${this.newName.trim()}”`)
        this.newName = ''
        this.newTaxFree = false
      }
    },
    async remove(c) {
      const msg = c.entry_count ? `${c.entry_count} ${c.entry_count === 1 ? 'entry' : 'entries'} will become “Uncategorised”.` : 'This category has no entries.'
      if (!(await confirmDialog({ title: `Delete “${c.name}”?`, message: msg, confirmText: 'Delete', danger: true }))) return
      if (await this.run(() => smallbizApi.deleteCategory(c.id), 'Could not delete category')) toast.success('Category deleted')
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.cats {
  list-style: none;
  margin: 14px 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 340px;
  overflow: auto;
}

.cat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 14px;
  border-bottom: 1px solid var(--border);
  min-height: 48px;
}

.cat:last-child {
  border-bottom: 0;
}

.cat .ui-input {
  flex: 1;
  height: 32px;
}

.cat__name {
  flex: 1;
  font-weight: 550;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat__count {
  color: var(--text-3);
  font-size: 12.5px;
  white-space: nowrap;
}

.empty {
  color: var(--text-3);
  justify-content: center;
}

.add {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.add .ui-input {
  flex: 1;
  min-width: 180px;
}

.small {
  font-size: 12.5px;
  white-space: nowrap;
}

.err {
  color: var(--danger);
  font-size: 13px;
  margin-top: 8px;
}

@media (max-width: 520px) {
  .cat {
    flex-wrap: wrap;
  }
}
</style>
