<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <div class="ui-modal" style="max-width: 560px">
      <div class="ui-modal__head">
        <h2>Product categories</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <form class="add" novalidate @submit.prevent="create">
          <input ref="newName" v-model="newName" class="ui-input" maxlength="100" placeholder="New category name" aria-label="New category name" />
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!newName.trim() || busy === 'new'">
            <i :class="busy === 'new' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-plus'"></i> Add
          </button>
        </form>

        <div v-if="!list.length" class="empty">
          <i class="fa-solid fa-tags"></i>
          <span>No categories yet. Categories help you filter and report on stock.</span>
        </div>
        <ul v-else class="list">
          <li v-for="c in list" :key="c.id">
            <template v-if="editing === c.id">
              <input :ref="`edit_${c.id}`" v-model="editName" class="ui-input" maxlength="100" :aria-label="`Rename ${c.name}`" @keydown.enter.prevent="rename(c)" @keydown.esc.stop.prevent="editing = ''" />
              <button class="ui-btn ui-btn--primary ui-btn--icon ui-btn--sm" :disabled="busy === c.id" aria-label="Save name" @click="rename(c)"><i class="fa-solid fa-check"></i></button>
              <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Cancel rename" @click="editing = ''"><i class="fa-solid fa-xmark"></i></button>
            </template>
            <template v-else>
              <span class="name">{{ c.name }}</span>
              <span class="count">{{ c.product_count || 0 }} product{{ c.product_count === 1 ? '' : 's' }}</span>
              <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Rename ${c.name}`" title="Rename" @click="startEdit(c)"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm danger-text" :aria-label="`Delete ${c.name}`" title="Delete" :disabled="busy === c.id" @click="remove(c)"><i class="fa-regular fa-trash-can"></i></button>
            </template>
          </li>
        </ul>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
import { inventoryService } from '@/services/inventoryService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'CategoriesModal',
  props: { categories: { type: Array, default: () => [] } },
  emits: ['close', 'changed'],
  data() {
    return { list: [...this.categories], newName: '', editing: '', editName: '', busy: '', dirty: false, confirming: false }
  },
  watch: {
    categories(v) {
      this.list = [...v]
    }
  },
  mounted() {
    this.$refs.newName?.focus()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape' && !this.editing && !this.confirming) this.close()
    },
    close() {
      this.$emit('close')
    },
    sort() {
      this.list.sort((a, b) => a.name.localeCompare(b.name))
    },
    async create() {
      const name = this.newName.trim()
      if (!name) return
      this.busy = 'new'
      try {
        const res = await inventoryService.createCategory({ name })
        this.list.push({ ...res.data.category, product_count: 0 })
        this.sort()
        this.newName = ''
        toast.success(`Category “${name}” added`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add the category'))
      } finally {
        this.busy = ''
      }
    },
    startEdit(c) {
      this.editing = c.id
      this.editName = c.name
      this.$nextTick(() => {
        const el = this.$refs[`edit_${c.id}`]
        ;(Array.isArray(el) ? el[0] : el)?.focus()
      })
    },
    async rename(c) {
      const name = this.editName.trim()
      if (!name || name === c.name) {
        this.editing = ''
        return
      }
      this.busy = c.id
      try {
        await inventoryService.updateCategory(c.id, { name })
        c.name = name
        this.sort()
        this.editing = ''
        toast.success('Category renamed')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not rename the category'))
      } finally {
        this.busy = ''
      }
    },
    async remove(c) {
      this.confirming = true
      const ok = await confirmDialog({
        title: `Delete “${c.name}”?`,
        message: c.product_count ? `${c.product_count} product${c.product_count === 1 ? '' : 's'} will become uncategorised. Products are not deleted.` : 'This category has no products.',
        confirmText: 'Delete category',
        danger: true
      })
      this.confirming = false
      if (!ok) return
      this.busy = c.id
      try {
        await inventoryService.deleteCategory(c.id)
        this.list = this.list.filter((x) => x.id !== c.id)
        toast.success(`Category “${c.name}” deleted`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the category'))
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.add {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.add .ui-input {
  flex: 1;
  min-width: 0;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 50vh;
  overflow-y: auto;
}
.list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 14px;
  min-height: 48px;
}
.list li + li {
  border-top: 1px solid var(--border);
}
.list li .ui-input {
  flex: 1;
  min-width: 0;
  height: 34px;
}
.name {
  flex: 1;
  min-width: 0;
  font-weight: 550;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.count {
  font-size: 12px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.danger-text {
  color: var(--danger);
}
.empty {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 16px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-3);
}
</style>
