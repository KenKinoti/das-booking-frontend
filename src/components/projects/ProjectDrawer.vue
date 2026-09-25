<template>
  <div class="drawer-backdrop" @mousedown.self="$emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" :aria-label="`${project.key} ${project.name}`">
      <header class="drawer__head">
        <div class="drawer__title">
          <div class="drawer__eyebrow">
            <span class="key">{{ project.key }}</span>
            <span v-if="isJira" class="src src--jira"><i class="fa-brands fa-jira"></i> Jira</span>
            <span v-else class="src"><i class="fa-solid fa-house"></i> Local</span>
            <span class="ui-badge" :class="`ui-badge--${statusMeta.badge}`">{{ statusMeta.label }}</span>
          </div>
          <h2>{{ project.name }}</h2>
          <p v-if="project.description" class="desc">{{ project.description }}</p>
        </div>
        <div class="drawer__actions">
          <a v-if="isJira && project.external_url" :href="project.external_url" target="_blank" rel="noopener" class="ui-btn ui-btn--sm">
            <i class="fa-solid fa-arrow-up-right-from-square"></i><span class="hide-xs"> Open in Jira</span>
          </a>
          <button class="ui-btn ui-btn--sm ui-btn--icon" aria-label="Edit project" title="Edit project" @click="$emit('edit', project)"><i class="fa-regular fa-pen-to-square"></i></button>
          <button class="ui-btn ui-btn--sm ui-btn--icon" aria-label="Delete project" title="Delete project" @click="removeProject"><i class="fa-regular fa-trash-can"></i></button>
          <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>

      <div class="drawer__body">
        <section class="facts">
          <div class="fact fact--progress">
            <span class="fact__label">Progress</span>
            <div class="progress-line">
              <div class="bar"><span :style="{ width: stats.progress + '%' }"></span></div>
              <strong>{{ stats.progress }}%</strong>
            </div>
            <span class="fact__meta">{{ stats.done }} of {{ stats.total }} done<span v-if="stats.overdue" class="txt-danger"> · {{ stats.overdue }} overdue</span></span>
          </div>
          <div class="fact">
            <span class="fact__label">Owner</span>
            <strong :class="{ muted: !project.owner_name }">{{ project.owner_name || 'Unassigned' }}</strong>
          </div>
          <div class="fact">
            <span class="fact__label">Timeline</span>
            <strong v-if="project.start_date || project.due_date">{{ date(project.start_date) }} → {{ date(project.due_date) }}</strong>
            <strong v-else class="muted">Not set</strong>
          </div>
          <div class="fact">
            <span class="fact__label">Budget</span>
            <strong class="tnum" :class="{ muted: !project.budget }">{{ project.budget ? money(project.budget) : 'Not set' }}</strong>
          </div>
          <div v-if="isJira" class="fact">
            <span class="fact__label">Last synced</span>
            <strong :title="project.last_synced_at ? dateTime(project.last_synced_at) : ''">{{ project.last_synced_at ? ago(project.last_synced_at) : 'Never' }}</strong>
          </div>
        </section>

        <div class="toolbar">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search tasks…" aria-label="Search tasks" />
          </div>
          <select v-model="assignee" class="ui-select" aria-label="Assignee">
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            <option v-for="a in assignees" :key="a" :value="a">{{ a }}</option>
          </select>
          <select v-model="category" class="ui-select" aria-label="Status">
            <option value="all">All statuses</option>
            <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <div class="seg" role="group" aria-label="View">
            <button :class="{ on: view === 'board' }" :aria-pressed="view === 'board'" title="Board" @click="setView('board')"><i class="fa-solid fa-table-columns"></i><span class="hide-xs"> Board</span></button>
            <button :class="{ on: view === 'list' }" :aria-pressed="view === 'list'" title="List" @click="setView('list')"><i class="fa-solid fa-list"></i><span class="hide-xs"> List</span></button>
          </div>
          <button v-if="!isJira" class="ui-btn ui-btn--primary ui-btn--sm new-task" @click="newTask('todo')"><i class="fa-solid fa-plus"></i> New task</button>
        </div>

        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

        <div v-else-if="loading && !tasks.length" class="board">
          <div v-for="c in categories" :key="c.value" class="bcol">
            <div class="ui-skeleton" style="height: 18px; width: 50%"></div>
            <div v-for="n in 3" :key="n" class="ui-skeleton" style="height: 64px; margin-top: 10px"></div>
          </div>
        </div>

        <div v-else-if="!tasks.length" class="ui-empty">
          <div class="ui-empty__icon"><i :class="isJira ? 'fa-brands fa-jira' : 'fa-solid fa-list-check'"></i></div>
          <h3>{{ isJira ? 'No issues synced' : 'No tasks yet' }}</h3>
          <p v-if="isJira">This Jira project has no issues matching your sync filter. Create issues in Jira, then run a sync.</p>
          <p v-else>Break the project into tasks and track them across To do, In progress and Done.</p>
          <button v-if="!isJira" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="newTask('todo')"><i class="fa-solid fa-plus"></i> Add the first task</button>
        </div>

        <!-- Board -->
        <div v-else-if="view === 'board'" class="board">
          <section
            v-for="c in visibleColumns"
            :key="c.value"
            class="bcol"
            :class="{ 'is-drop': dropCol === c.value }"
            @dragover.prevent="onDragOver(c.value)"
            @dragleave="dropCol = dropCol === c.value ? null : dropCol"
            @drop.prevent="onDrop(c.value)"
          >
            <header class="col__head">
              <span><i :class="[c.icon, `cat-${c.value}`]"></i> {{ c.label }}</span>
              <span class="count">{{ byCat[c.value].length }}</span>
            </header>
            <div class="col__list">
              <article
                v-for="t in byCat[c.value]"
                :key="t.id"
                class="tcard"
                :class="{ 'is-dragging': dragId === t.id }"
                :draggable="t.source !== 'jira'"
                tabindex="0"
                @dragstart="onDragStart(t, $event)"
                @dragend="dragId = null; dropCol = null"
                @click="openTask(t)"
                @keydown.enter="openTask(t)"
              >
                <div class="tcard__top">
                  <span class="tkey"><i :class="typeIcon(t.type)" :title="t.type"></i> {{ t.key }}</span>
                  <i v-if="t.source === 'jira'" class="fa-solid fa-arrow-up-right-from-square ext" title="Opens in Jira"></i>
                </div>
                <div class="tcard__title">{{ t.title }}</div>
                <div class="tcard__meta">
                  <span v-if="t.source === 'jira' && t.status" class="jstatus">{{ t.status }}</span>
                  <span v-if="prio(t)" class="prio" :class="`tone-${prio(t).tone}`" :title="`Priority: ${prio(t).label}`"><i :class="prio(t).icon"></i></span>
                  <span v-if="t.story_points != null" class="pts" title="Story points">{{ t.story_points }}</span>
                  <span v-if="t.due_date" class="due" :class="{ 'txt-danger': overdue(t) }"><i class="fa-regular fa-calendar"></i> {{ shortDate(t.due_date) }}</span>
                  <span class="grow"></span>
                  <span v-if="t.assignee_name" class="avatar" :title="t.assignee_name">{{ initials(t.assignee_name) }}</span>
                </div>
              </article>
              <button v-if="!isJira" class="add-inline" @click="newTask(c.value)"><i class="fa-solid fa-plus"></i> Add task</button>
              <p v-else-if="!byCat[c.value].length" class="col__empty">Nothing here</p>
            </div>
          </section>
        </div>

        <!-- List -->
        <div v-else class="ui-table-wrap list">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Title</th>
                <th>Status</th>
                <th class="hide-sm">Assignee</th>
                <th class="hide-sm">Priority</th>
                <th>Due</th>
                <th class="num hide-sm">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filtered.length">
                <td colspan="7" class="muted center">No tasks match your filters.</td>
              </tr>
              <tr v-for="t in filtered" :key="t.id" class="is-clickable" @click="openTask(t)">
                <td class="nowrap"><i :class="typeIcon(t.type)" class="muted"></i> <strong>{{ t.key }}</strong></td>
                <td>{{ t.title }} <i v-if="t.source === 'jira'" class="fa-solid fa-arrow-up-right-from-square ext"></i></td>
                <td class="nowrap"><span class="ui-badge" :class="`ui-badge--${catBadge(t.status_category)}`">{{ t.status || catLabel(t.status_category) }}</span></td>
                <td class="hide-sm">{{ t.assignee_name || '—' }}</td>
                <td class="hide-sm"><span v-if="prio(t)" class="prio" :class="`tone-${prio(t).tone}`"><i :class="prio(t).icon"></i> {{ prio(t).label }}</span><span v-else class="muted">—</span></td>
                <td class="nowrap" :class="{ 'txt-danger': overdue(t) }">{{ t.due_date ? shortDate(t.due_date) : '—' }}</td>
                <td class="num hide-sm">{{ t.story_points ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </aside>

    <TaskFormModal
      v-if="taskModal"
      :project-id="project.id"
      :task="taskModal.task"
      :default-category="taskModal.category"
      :assignees="assignees"
      @close="taskModal = null"
      @saved="onTaskSaved"
      @deleted="onTaskDeleted"
    />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import TaskFormModal from './TaskFormModal.vue'
import { pmApi, TASK_CATEGORIES, projectStatus, priorityMeta, typeIcon, initials, isOverdue } from '@/services/projects'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatDateTime, formatMoney } from '@/utils/format'

const VIEW_KEY = 'pm.taskView'

export default {
  name: 'ProjectDrawer',
  components: { TaskFormModal },
  props: { project: { type: Object, required: true } },
  emits: ['close', 'edit', 'deleted', 'changed'],
  data() {
    let view = 'board'
    try {
      view = localStorage.getItem(VIEW_KEY) || 'board'
    } catch {
      /* storage unavailable */
    }
    return {
      categories: TASK_CATEGORIES,
      tasks: [],
      loading: false,
      error: '',
      q: '',
      assignee: 'all',
      category: 'all',
      view,
      taskModal: null,
      dragId: null,
      dropCol: null
    }
  },
  computed: {
    isJira() {
      return this.project.source === 'jira'
    },
    statusMeta() {
      return projectStatus(this.project.status)
    },
    stats() {
      const total = this.tasks.length
      const done = this.tasks.filter((t) => t.status_category === 'done').length
      return { total, done, overdue: this.tasks.filter(isOverdue).length, progress: total ? Math.floor((done / total) * 100) : 0 }
    },
    assignees() {
      return [...new Set(this.tasks.map((t) => t.assignee_name).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    },
    filtered() {
      const q = this.q.trim().toLowerCase()
      return this.tasks.filter((t) => {
        if (this.category !== 'all' && t.status_category !== this.category) return false
        if (this.assignee === 'unassigned' && t.assignee_name) return false
        if (!['all', 'unassigned'].includes(this.assignee) && t.assignee_name !== this.assignee) return false
        if (q && !`${t.key} ${t.title} ${t.assignee_name}`.toLowerCase().includes(q)) return false
        return true
      })
    },
    byCat() {
      const out = { todo: [], in_progress: [], done: [] }
      for (const t of this.filtered) (out[t.status_category] || out.todo).push(t)
      return out
    },
    visibleColumns() {
      return this.category === 'all' ? this.categories : this.categories.filter((c) => c.value === this.category)
    }
  },
  watch: {
    'project.id'() {
      this.tasks = []
      this.load()
    }
  },
  created() {
    this.load()
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    typeIcon,
    initials,
    date: formatDate,
    dateTime: formatDateTime,
    money: (v) => formatMoney(v, orgCurrency(), { compact: true }),
    shortDate: (v) => formatDate(v, 'short'),
    overdue: isOverdue,
    ago(v) {
      const s = Math.round((Date.now() - new Date(v).getTime()) / 1000)
      if (Number.isNaN(s)) return '—'
      if (s < 60) return 'Just now'
      if (s < 3600) return `${Math.floor(s / 60)} min ago`
      if (s < 86400) return `${Math.floor(s / 3600)} h ago`
      return formatDate(v)
    },
    prio: (t) => priorityMeta(t.priority),
    catLabel(c) {
      return (TASK_CATEGORIES.find((x) => x.value === c) || {}).label || c
    },
    catBadge(c) {
      return c === 'done' ? 'success' : c === 'in_progress' ? 'info' : 'draft'
    },
    onKey(e) {
      if (e.key === 'Escape' && !this.taskModal && !document.querySelector('.ui-modal-backdrop')) this.$emit('close')
    },
    setView(v) {
      this.view = v
      try {
        localStorage.setItem(VIEW_KEY, v)
      } catch {
        /* ignore */
      }
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await pmApi.listTasks(this.project.id)
        this.tasks = data?.tasks || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load tasks')
      } finally {
        this.loading = false
      }
    },
    openTask(t) {
      if (t.source === 'jira') {
        if (t.url) window.open(t.url, '_blank', 'noopener')
        return
      }
      this.taskModal = { task: t, category: t.status_category }
    },
    newTask(category) {
      this.taskModal = { task: null, category }
    },
    onTaskSaved(saved) {
      const i = this.tasks.findIndex((t) => t.id === saved.id)
      if (i >= 0) this.tasks.splice(i, 1, saved)
      else this.tasks.unshift(saved)
      this.taskModal = null
      this.$emit('changed')
    },
    onTaskDeleted(task) {
      this.tasks = this.tasks.filter((t) => t.id !== task.id)
      this.taskModal = null
      this.$emit('changed')
    },
    onDragStart(t, e) {
      if (t.source === 'jira') return
      this.dragId = t.id
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', t.id)
    },
    onDragOver(cat) {
      if (this.dragId) this.dropCol = cat
    },
    async onDrop(cat) {
      const t = this.tasks.find((x) => x.id === this.dragId)
      this.dragId = null
      this.dropCol = null
      if (!t || t.status_category === cat) return
      const prev = { ...t }
      Object.assign(t, { status_category: cat, status: this.catLabel(cat) })
      try {
        const saved = await pmApi.updateTask(t.id, { status_category: cat })
        Object.assign(t, saved)
        this.$emit('changed')
      } catch (e) {
        Object.assign(t, prev)
        toast.error(apiErrorMessage(e, 'Could not move the task'))
      }
    },
    async removeProject() {
      const msg = this.isJira
        ? `The local copy of ${this.project.key} and its ${this.tasks.length} synced issues will be removed and the project won't be synced any more. Nothing is deleted in Jira.`
        : `${this.project.name} and its ${this.tasks.length} task${this.tasks.length === 1 ? '' : 's'} will be permanently deleted.`
      const okd = await confirmDialog({ title: `Delete ${this.project.key}?`, message: msg, confirmText: this.isJira ? 'Remove project' : 'Delete project', danger: true })
      if (!okd) return
      try {
        await pmApi.deleteProject(this.project.id)
        toast.success(this.isJira ? 'Jira project removed' : 'Project deleted')
        this.$emit('deleted', this.project)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the project'))
      }
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(10, 12, 24, 0.45);
  display: flex;
  justify-content: flex-end;
  animation: fade 0.15s ease-out;
}
.drawer {
  width: min(1040px, 100vw);
  height: 100%;
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: slide 0.22s var(--ease, ease-out);
}
@keyframes slide {
  from { transform: translateX(40px); }
  to { transform: none; }
}
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.drawer__head {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.drawer__title {
  min-width: 0;
}
.drawer__eyebrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.key {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  background: var(--bg-subtle);
  border-radius: var(--radius-xs, 6px);
  padding: 2px 7px;
}
.src {
  font-size: 12px;
  color: var(--text-3);
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.src--jira {
  color: var(--info);
}
.drawer__head h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
  color: var(--text);
  overflow-wrap: anywhere;
}
.desc {
  margin: 6px 0 0;
  color: var(--text-2);
  font-size: 14px;
  max-width: 70ch;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.drawer__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 32px;
}
.facts {
  display: grid;
  grid-template-columns: minmax(220px, 1.6fr) repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.fact {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
  color: var(--text);
}
.fact strong {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fact__label {
  font-size: 12px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.fact__meta {
  font-size: 12px;
  color: var(--text-3);
}
.progress-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--success);
  border-radius: inherit;
  transition: width 0.3s;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
}
.toolbar .search {
  flex: 1 1 220px;
}
.toolbar .ui-select {
  width: auto;
  min-width: 140px;
}
.new-task {
  margin-left: auto;
}
.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface);
}
.seg button {
  border: 0;
  background: transparent;
  color: var(--text-2);
  padding: 7px 12px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.seg button + button {
  border-left: 1px solid var(--border);
}
.seg button.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  align-items: start;
}
.bcol {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  min-height: 120px;
  transition: border-color 0.15s, background 0.15s;
}
.bcol.is-drop {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.col__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  padding: 2px 4px 10px;
}
.col__head i {
  margin-right: 4px;
}
.cat-todo { color: var(--text-3); }
.cat-in_progress { color: var(--info); }
.cat-done { color: var(--success); }
.count {
  background: var(--surface);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 12px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.col__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.col__empty {
  margin: 8px 4px;
  color: var(--text-3);
  font-size: 13px;
}
.tcard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.tcard[draggable='true'] {
  cursor: grab;
}
.tcard:hover,
.tcard:focus-visible {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
  outline: none;
}
.tcard.is-dragging {
  opacity: 0.5;
}
.tcard__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-3);
}
.tkey {
  font-family: var(--font-mono);
  font-weight: 600;
}
.ext {
  font-size: 10px;
  color: var(--text-3);
}
.tcard__title {
  font-size: 14px;
  color: var(--text);
  margin: 4px 0 8px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.tcard__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-2);
  flex-wrap: wrap;
}
.grow {
  flex: 1;
}
.jstatus {
  background: var(--bg-subtle);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}
.pts {
  background: var(--bg-subtle);
  border-radius: 999px;
  min-width: 20px;
  text-align: center;
  padding: 0 6px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.prio.tone-danger { color: var(--danger); }
.prio.tone-warning { color: var(--warning); }
.prio.tone-info { color: var(--info); }
.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: inline-grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
}
.add-inline {
  border: 1px dashed var(--border-strong);
  background: transparent;
  color: var(--text-3);
  border-radius: var(--radius-sm);
  padding: 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.add-inline:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.list {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.nowrap { white-space: nowrap; }
.muted { color: var(--text-3); }
.center { text-align: center; padding: 24px; }
.txt-danger { color: var(--danger); }
.tnum { font-variant-numeric: tabular-nums; }
@media (max-width: 760px) {
  .drawer__head {
    padding: 16px;
    flex-direction: column-reverse;
    gap: 10px;
  }
  .drawer__actions {
    align-self: flex-end;
  }
  .drawer__body {
    padding: 16px;
  }
  .facts {
    grid-template-columns: 1fr 1fr;
  }
  .fact--progress {
    grid-column: 1 / -1;
  }
  .hide-xs,
  .hide-sm {
    display: none;
  }
  .toolbar .ui-select {
    flex: 1 1 140px;
  }
  .new-task {
    margin-left: 0;
  }
}
</style>
