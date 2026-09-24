<template>
  <section class="ui-card">
    <div class="toolbar">
      <div class="ui-tabs" role="tablist" aria-label="Reminder status">
        <button v-for="t in tabs" :key="t.key" class="ui-tab" :class="{ 'is-active': status === t.key }" @click="status = t.key">
          {{ t.label }} <span v-if="counts[t.key]" class="count" :class="{ danger: t.key === 'overdue' }">{{ counts[t.key] }}</span>
        </button>
      </div>
      <div class="spacer"></div>
      <button class="ui-btn ui-btn--primary" @click="$emit('add')"><i class="fa-solid fa-plus"></i> New reminder</button>
    </div>

    <div v-if="error" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div></div>
    <div v-else-if="all === null" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
    <div v-else-if="!visible.length" class="ui-empty">
      <div class="ui-empty__icon" :class="{ ok: all.length }"><i :class="all.length ? 'fa-solid fa-check' : 'fa-regular fa-bell'"></i></div>
      <template v-if="!all.length">
        <h3>No reminders yet</h3>
        <p>Never miss rent, bills, or a {{ settings.tax_name }} deadline again. Repeating reminders roll forward when you tick them off.</p>
        <button class="ui-btn ui-btn--primary ui-btn--sm" style="margin-top: 12px" @click="$emit('add')"><i class="fa-solid fa-plus"></i> Add your first reminder</button>
      </template>
      <template v-else>
        <h3>{{ status === 'done' ? 'Nothing completed yet' : 'All caught up' }}</h3>
        <p>{{ status === 'overdue' ? 'Nothing is overdue.' : 'No reminders in this view.' }}</p>
      </template>
    </div>
    <div v-else>
      <div v-for="g in groups" :key="g.key" class="group">
        <h3 class="group__title" :class="g.key">{{ g.label }} <span>{{ g.items.length }}</span></h3>
        <ul class="list">
          <li v-for="r in g.items" :key="r.id" class="item" :class="{ 'is-done': r.done, 'is-overdue': r.overdue }">
            <label class="check" :title="r.done ? 'Mark as not done' : 'Mark as done'">
              <input type="checkbox" :checked="r.done" :disabled="busy === r.id" :aria-label="`${r.done ? 'Undo' : 'Complete'} ${r.title}`" @change="toggle(r)" />
              <span><i class="fa-solid fa-check"></i></span>
            </label>
            <div class="item__main" @click="$emit('edit', r)">
              <strong>{{ r.title }}</strong>
              <small>
                <span :class="{ neg: r.overdue }">{{ dueText(r) }}</span>
                <template v-if="r.recurrence !== 'none'"> · <i class="fa-solid fa-repeat"></i> {{ recurrenceLabel(r.recurrence) }}</template>
                <template v-if="r.notes"> · {{ r.notes }}</template>
              </small>
            </div>
            <span v-if="r.amount_minor" class="item__amt">{{ fmt(r.amount_minor, r.currency) }}</span>
            <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Edit ${r.title}`" @click="$emit('edit', r)"><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Delete ${r.title}`" @click="remove(r)"><i class="fa-regular fa-trash-can"></i></button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script>
import { smallbizApi, fmtMinor, RECURRENCE } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { formatDate, relativeDays } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'HubReminders',
  props: {
    settings: { type: Object, required: true },
    refreshKey: { type: Number, default: 0 }
  },
  emits: ['add', 'edit', 'changed'],
  data() {
    return {
      all: null,
      error: null,
      busy: null,
      status: 'open',
      tabs: [
        { key: 'open', label: 'To do' },
        { key: 'overdue', label: 'Overdue' },
        { key: 'done', label: 'Done' },
        { key: 'all', label: 'All' }
      ]
    }
  },
  computed: {
    counts() {
      const a = this.all || []
      return { open: a.filter((r) => !r.done).length, overdue: a.filter((r) => r.overdue).length, done: 0, all: 0 }
    },
    visible() {
      const a = this.all || []
      if (this.status === 'open') return a.filter((r) => !r.done)
      if (this.status === 'overdue') return a.filter((r) => r.overdue)
      if (this.status === 'done') return a.filter((r) => r.done)
      return a
    },
    groups() {
      const g = [
        { key: 'overdue', label: 'Overdue', items: [] },
        { key: 'week', label: 'Next 7 days', items: [] },
        { key: 'later', label: 'Later', items: [] },
        { key: 'done', label: 'Done', items: [] }
      ]
      for (const r of this.visible) {
        if (r.done) g[3].items.push(r)
        else if (r.overdue) g[0].items.push(r)
        else if (r.days_left <= 7) g[1].items.push(r)
        else g[2].items.push(r)
      }
      g[3].items.sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)))
      return g.filter((x) => x.items.length)
    }
  },
  watch: {
    refreshKey() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    fmt(v, c) {
      return fmtMinor(v, c)
    },
    recurrenceLabel(k) {
      return (RECURRENCE.find((r) => r.key === k) || {}).label || k
    },
    dueText(r) {
      if (r.done) return `Done · was due ${formatDate(r.due_date)}`
      if (r.overdue) return `Overdue · due ${formatDate(r.due_date)} (${relativeDays(r.due_date)})`
      return `Due ${relativeDays(r.due_date)} · ${formatDate(r.due_date)}`
    },
    async load() {
      this.error = null
      try {
        this.all = await smallbizApi.reminders({ status: 'all' })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load reminders')
      }
    },
    async toggle(r) {
      this.busy = r.id
      try {
        const res = await smallbizApi.toggleReminder(r.id)
        if (res.reminder.done) toast.success(res.next ? `Done — next one added for ${formatDate(res.next.due_date)}` : 'Nice — marked as done')
        else toast.info('Marked as not done')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update reminder'))
        this.load()
      } finally {
        this.busy = null
      }
    },
    async remove(r) {
      const ok = await confirmDialog({ title: 'Delete reminder?', message: `“${r.title}” will be removed.`, confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await smallbizApi.deleteReminder(r.id)
        toast.success('Reminder deleted')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete reminder'))
      }
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.spacer {
  flex: 1;
}

.count.danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.group {
  padding: 8px 8px 4px;
}

.group__title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin: 8px 10px 4px;
  font-weight: 650;
}

.group__title span {
  margin-left: 4px;
  font-weight: 500;
}

.group__title.overdue {
  color: var(--danger);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 10px;
}

.item:hover {
  background: var(--surface-hover);
}

.item.is-overdue {
  box-shadow: inset 3px 0 0 var(--danger);
}

.item__main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.item__main strong {
  display: block;
  font-weight: 600;
}

.is-done .item__main strong {
  text-decoration: line-through;
  color: var(--text-3);
}

.item__main small {
  color: var(--text-3);
  font-size: 12.5px;
}

.neg {
  color: var(--danger);
  font-weight: 550;
}

.item__amt {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.check {
  position: relative;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}

.check input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.check span {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 2px solid var(--border-strong);
  display: grid;
  place-items: center;
  font-size: 11px;
  color: transparent;
  transition: all 0.15s;
}

.check:hover span {
  border-color: var(--success);
}

.check input:checked + span {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}

.check input:focus-visible + span {
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.ok {
  background: var(--success-soft);
  color: var(--success);
}
</style>
