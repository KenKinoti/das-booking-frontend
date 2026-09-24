<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">People & Projects</div>
        <h1>Projects</h1>
        <p>Plan work, track progress and keep Jira projects in sync.</p>
      </div>
      <div class="ui-actions">
        <template v-if="jira.connected">
          <button class="ui-btn" :disabled="syncing" :title="jira.last_sync_at ? `Last synced ${ago(jira.last_sync_at)}` : 'Not synced yet'" @click="quickSync">
            <i :class="syncing ? 'fa-solid fa-arrows-rotate fa-spin' : 'fa-solid fa-arrows-rotate'"></i> {{ syncing ? 'Syncing…' : 'Sync Jira' }}
          </button>
          <button class="ui-btn" @click="showJira = true"><i class="fa-brands fa-jira jira-ic"></i> Jira settings</button>
        </template>
        <button v-else class="ui-btn" @click="showJira = true"><i class="fa-brands fa-jira jira-ic"></i> Connect Jira</button>
        <button class="ui-btn ui-btn--primary" @click="openForm(null)"><i class="fa-solid fa-plus"></i> New project</button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'active' }" @click="setStatus('active')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-diagram-project"></i></span>Active projects</div>
        <div class="ui-kpi__value">{{ stats ? stats.projects.active : '–' }}</div>
        <div class="ui-kpi__meta">{{ stats ? `${stats.projects.total} project${stats.projects.total === 1 ? '' : 's'} in total` : ' ' }}</div>
      </button>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-list-check"></i></span>Open tasks</div>
        <div class="ui-kpi__value">{{ stats ? stats.tasks.open : '–' }}</div>
        <div class="ui-kpi__meta">{{ stats ? `${stats.tasks.in_progress} in progress · ${stats.tasks.todo} to do` : ' ' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>Overdue tasks</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': stats && stats.tasks.overdue > 0 }">{{ stats ? stats.tasks.overdue : '–' }}</div>
        <div class="ui-kpi__meta">Open and past their due date</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-circle-check"></i></span>Completed this month</div>
        <div class="ui-kpi__value">{{ stats ? stats.tasks.completed_this_month : '–' }}</div>
        <div class="ui-kpi__meta">{{ stats ? `${stats.tasks.done} done overall` : ' ' }}</div>
      </div>
    </div>

    <div v-if="jira.connected" class="jira-bar" :class="`is-${jira.last_sync_status || 'never'}`">
      <i class="fa-brands fa-jira"></i>
      <span>
        Connected to <strong>{{ host(jira.site_url) }}</strong>
        <template v-if="jira.last_sync_at"> · last synced {{ ago(jira.last_sync_at) }}</template>
        <template v-else> · not synced yet</template>
        <span v-if="jira.last_sync_status === 'error'" class="txt-danger"> · last sync failed</span>
        <span v-else-if="jira.last_sync_status === 'partial'" class="txt-warning"> · some projects failed</span>
      </span>
      <button class="link" @click="showJira = true">Manage</button>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">
            {{ t.label }}<span v-if="t.count != null" class="tab-count">{{ t.count }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search projects…" aria-label="Search projects" @input="debouncedLoad" />
          </div>
          <select v-model="source" class="ui-select source" aria-label="Source" @change="load">
            <option value="all">All sources</option>
            <option value="local">Local</option>
            <option value="jira">Jira</option>
          </select>
          <div class="seg" role="group" aria-label="Layout">
            <button :class="{ on: layout === 'grid' }" :aria-pressed="layout === 'grid'" title="Cards" aria-label="Cards" @click="setLayout('grid')"><i class="fa-solid fa-grip"></i></button>
            <button :class="{ on: layout === 'table' }" :aria-pressed="layout === 'table'" title="Table" aria-label="Table" @click="setLayout('table')"><i class="fa-solid fa-list"></i></button>
          </div>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="loadAll">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !projects.length" class="ui-card__body grid">
        <div v-for="n in 6" :key="n" class="pcard sk">
          <div class="ui-skeleton" style="width: 40%; height: 14px"></div>
          <div class="ui-skeleton" style="width: 75%; height: 20px; margin-top: 10px"></div>
          <div class="ui-skeleton" style="height: 8px; margin-top: 24px"></div>
        </div>
      </div>

      <!-- nothing at all -->
      <div v-else-if="!projects.length && !filtersActive" class="ui-empty onboarding">
        <div class="ui-empty__icon"><i class="fa-solid fa-diagram-project"></i></div>
        <h3>Start tracking your projects</h3>
        <p>Create a project here, or connect Jira Cloud to bring in your existing projects and issues.</p>
        <div class="onboard-options">
          <button class="opt" @click="openForm(null)">
            <span class="opt__ic"><i class="fa-solid fa-plus"></i></span>
            <strong>Create a project</strong>
            <small>Plan tasks on a board, set dates, budget and owner.</small>
          </button>
          <button class="opt" @click="showJira = true">
            <span class="opt__ic opt__ic--jira"><i class="fa-brands fa-jira"></i></span>
            <strong>{{ jira.connected ? 'Choose Jira projects' : 'Connect Jira' }}</strong>
            <small>{{ jira.connected ? 'Pick which projects to sync, then run a sync.' : 'Sync projects and issues from your Atlassian site.' }}</small>
          </button>
        </div>
      </div>

      <div v-else-if="!projects.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-filter"></i></div>
        <h3>Nothing matches your filters</h3>
        <p>Try a different search, status or source.</p>
        <button class="ui-btn" style="margin-top: 12px" @click="clearFilters">Clear filters</button>
      </div>

      <!-- cards -->
      <div v-else-if="layout === 'grid'" class="ui-card__body grid" :class="{ 'is-loading': loading }">
        <article v-for="p in projects" :key="p.id" class="pcard" tabindex="0" @click="openProject(p)" @keydown.enter="openProject(p)">
          <div class="pcard__top">
            <span class="key">{{ p.key }}</span>
            <span v-if="p.source === 'jira'" class="src src--jira" title="Synced from Jira"><i class="fa-brands fa-jira"></i> Jira</span>
            <span class="grow"></span>
            <span class="ui-badge" :class="`ui-badge--${statusOf(p).badge}`">{{ statusOf(p).label }}</span>
          </div>
          <h3 class="pcard__name">{{ p.name }}</h3>
          <p class="pcard__desc">{{ p.description || (p.source === 'jira' ? 'Jira project' : 'No description') }}</p>
          <div class="pm-progress">
            <div class="bar"><span :style="{ width: (p.stats?.progress || 0) + '%' }"></span></div>
            <span class="pct">{{ p.stats?.progress || 0 }}%</span>
          </div>
          <div class="pcard__foot">
            <span class="muted">{{ p.stats?.done || 0 }}/{{ p.stats?.total || 0 }} tasks</span>
            <span v-if="p.stats?.overdue" class="txt-danger"><i class="fa-solid fa-triangle-exclamation"></i> {{ p.stats.overdue }} overdue</span>
            <span class="grow"></span>
            <span v-if="p.due_date" class="due" :class="{ 'txt-danger': projectLate(p) }" :title="`Due ${date(p.due_date)}`"><i class="fa-regular fa-calendar"></i> {{ date(p.due_date, 'short') }}</span>
            <span v-if="p.owner_name" class="avatar" :title="`Owner: ${p.owner_name}`">{{ initials(p.owner_name) }}</span>
          </div>
        </article>
      </div>

      <!-- table -->
      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th class="prog-col">Progress</th>
              <th class="hide-md">Owner</th>
              <th class="hide-sm">Due</th>
              <th class="num hide-sm">Open</th>
              <th class="num hide-md">Overdue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in projects" :key="p.id" class="is-clickable" @click="openProject(p)">
              <td>
                <div class="name-cell">
                  <span class="key">{{ p.key }}</span>
                  <span class="name">{{ p.name }}</span>
                  <i v-if="p.source === 'jira'" class="fa-brands fa-jira jira-ic" title="Synced from Jira"></i>
                </div>
              </td>
              <td><span class="ui-badge" :class="`ui-badge--${statusOf(p).badge}`">{{ statusOf(p).label }}</span></td>
              <td class="prog-col">
                <div class="pm-progress">
                  <div class="bar"><span :style="{ width: (p.stats?.progress || 0) + '%' }"></span></div>
                  <span class="pct">{{ p.stats?.progress || 0 }}%</span>
                </div>
              </td>
              <td class="hide-md">{{ p.owner_name || '—' }}</td>
              <td class="hide-sm nowrap" :class="{ 'txt-danger': projectLate(p) }">{{ date(p.due_date) }}</td>
              <td class="num hide-sm">{{ (p.stats?.todo || 0) + (p.stats?.in_progress || 0) }}</td>
              <td class="num hide-md" :class="{ 'txt-danger': p.stats?.overdue }">{{ p.stats?.overdue || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ProjectDrawer
      v-if="current"
      :project="current"
      @close="closeProject"
      @edit="openForm"
      @deleted="onDeleted"
      @changed="onTasksChanged"
    />
    <ProjectFormModal v-if="form.open" :project="form.project" @close="form.open = false" @saved="onSaved" />
    <JiraSettingsModal v-if="showJira" @close="showJira = false" @changed="loadAll" />
  </div>
</template>

<script>
import ProjectDrawer from '@/components/projects/ProjectDrawer.vue'
import ProjectFormModal from '@/components/projects/ProjectFormModal.vue'
import JiraSettingsModal from '@/components/projects/JiraSettingsModal.vue'
import { pmApi, PROJECT_STATUSES, projectStatus, initials } from '@/services/projects'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

const LAYOUT_KEY = 'pm.layout'

export default {
  name: 'Projects',
  components: { ProjectDrawer, ProjectFormModal, JiraSettingsModal },
  data() {
    let layout = 'grid'
    try {
      layout = localStorage.getItem(LAYOUT_KEY) || 'grid'
    } catch {
      /* storage unavailable */
    }
    return {
      projects: [],
      stats: null,
      loading: false,
      error: '',
      status: this.$route.query.status || 'all',
      source: this.$route.query.source || 'all',
      q: this.$route.query.q || '',
      layout,
      current: null,
      form: { open: false, project: null },
      showJira: false,
      syncing: false,
      timer: null
    }
  },
  computed: {
    jira() {
      return this.stats?.jira || { connected: false }
    },
    filtersActive() {
      return this.status !== 'all' || this.source !== 'all' || !!this.q.trim()
    },
    tabs() {
      const by = this.stats?.projects?.by_status || {}
      return [{ value: 'all', label: 'All', count: this.stats?.projects?.total }, ...PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label, count: by[s.value] }))]
    }
  },
  watch: {
    '$route.query.project'(id) {
      if (!id) this.current = null
      else if (!this.current || this.current.id !== id) this.openById(id)
    }
  },
  created() {
    this.loadAll().then(() => {
      const id = this.$route.query.project
      if (id) this.openById(id)
    })
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    initials,
    date: formatDate,
    statusOf: (p) => projectStatus(p.status),
    host: (u) => String(u || '').replace(/^https?:\/\//, ''),
    ago(v) {
      const s = Math.round((Date.now() - new Date(v).getTime()) / 1000)
      if (Number.isNaN(s)) return ''
      if (s < 60) return 'just now'
      if (s < 3600) return `${Math.floor(s / 60)} min ago`
      if (s < 86400) return `${Math.floor(s / 3600)} h ago`
      return formatDate(v)
    },
    projectLate(p) {
      if (!p.due_date || p.status === 'completed') return false
      const d = new Date(String(p.due_date).slice(0, 10) + 'T00:00:00')
      const t = new Date()
      t.setHours(0, 0, 0, 0)
      return d < t
    },
    async loadAll() {
      await Promise.all([this.load(), this.loadStats()])
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await pmApi.listProjects({ status: this.status, source: this.source, q: this.q.trim() || undefined })
        this.projects = data?.projects || []
        if (this.current) {
          const fresh = this.projects.find((p) => p.id === this.current.id)
          if (fresh) this.current = fresh
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load projects')
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        this.stats = await pmApi.stats()
      } catch {
        this.stats = null
      }
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.syncQuery()
        this.load()
      }, 280)
    },
    setStatus(s) {
      this.status = this.status === s && s !== 'all' ? 'all' : s
      this.syncQuery()
      this.load()
    },
    setLayout(l) {
      this.layout = l
      try {
        localStorage.setItem(LAYOUT_KEY, l)
      } catch {
        /* ignore */
      }
    },
    clearFilters() {
      this.status = 'all'
      this.source = 'all'
      this.q = ''
      this.syncQuery()
      this.load()
    },
    syncQuery(extra = {}) {
      const query = {}
      if (this.status !== 'all') query.status = this.status
      if (this.source !== 'all') query.source = this.source
      if (this.q.trim()) query.q = this.q.trim()
      const proj = 'project' in extra ? extra.project : this.$route.query.project
      if (proj) query.project = proj
      this.$router.replace({ query })
    },
    openProject(p) {
      this.current = p
      this.syncQuery({ project: p.id })
    },
    async openById(id) {
      const found = this.projects.find((p) => p.id === id)
      if (found) {
        this.current = found
        return
      }
      try {
        this.current = await pmApi.getProject(id)
      } catch {
        this.current = null
        this.syncQuery({ project: null })
        toast.error('That project no longer exists')
      }
    },
    closeProject() {
      this.current = null
      this.syncQuery({ project: null })
    },
    openForm(project) {
      this.form = { open: true, project }
    },
    onSaved(saved) {
      this.form.open = false
      if (this.current && this.current.id === saved.id) this.current = saved
      this.loadAll()
    },
    onDeleted() {
      this.closeProject()
      this.loadAll()
    },
    async onTasksChanged() {
      await this.loadAll()
    },
    async quickSync() {
      this.syncing = true
      try {
        const r = await pmApi.syncJira()
        const res = r?.result || {}
        if (r?.status === 'success') toast.success(`Synced ${res.issues || 0} issues from ${(res.projects || []).length} project(s)`)
        else toast.warning(`Synced with problems — ${r?.message || 'open Jira settings for details'}`)
      } catch (e) {
        const msg = apiErrorMessage(e, 'Sync failed')
        toast.error(msg)
        if (e?.response?.data?.error?.code === 'NO_PROJECTS') this.showJira = true
      } finally {
        this.syncing = false
        this.loadAll()
      }
    }
  }
}
</script>

<style scoped>
.jira-ic {
  color: var(--info);
}
.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}
.kpi-btn.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.kpi-danger { background: var(--danger-soft); color: var(--danger); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-info { background: var(--info-soft); color: var(--info); }
.txt-danger { color: var(--danger); }
.txt-warning { color: var(--warning); }
.muted { color: var(--text-3); }
.nowrap { white-space: nowrap; }
.grow { flex: 1; }

.jira-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  margin-bottom: 16px;
}
.jira-bar > i {
  color: var(--info);
  font-size: 16px;
}
.jira-bar > span {
  flex: 1;
  min-width: 0;
}
.jira-bar strong {
  color: var(--text);
  font-weight: 600;
}
.link {
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar .ui-tabs {
  overflow-x: auto;
  max-width: 100%;
}
.tab-count {
  margin-left: 6px;
  font-size: 11px;
  background: var(--bg-subtle);
  color: var(--text-2);
  border-radius: 999px;
  padding: 1px 7px;
  font-variant-numeric: tabular-nums;
}
.toolbar__right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.search {
  width: 240px;
}
.source {
  width: auto;
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
  padding: 8px 11px;
  cursor: pointer;
}
.seg button + button {
  border-left: 1px solid var(--border);
}
.seg button.on {
  background: var(--accent-soft);
  color: var(--accent);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.is-loading {
  opacity: 0.6;
  transition: opacity 0.2s;
}
.pcard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  min-width: 0;
}
.pcard:hover,
.pcard:focus-visible {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
  outline: none;
}
.pcard.sk {
  cursor: default;
}
.pcard__top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.key {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  background: var(--bg-subtle);
  border-radius: 6px;
  padding: 2px 7px;
}
.src {
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.src--jira {
  color: var(--info);
}
.pcard__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 10px 0 4px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.pcard__desc {
  font-size: 13px;
  color: var(--text-3);
  margin: 0 0 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
}
.pm-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
}
.bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
  min-width: 60px;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--success);
  border-radius: inherit;
  transition: width 0.3s;
}
.pct {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  min-width: 34px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.pcard__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-2);
}
.due {
  white-space: nowrap;
}
.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: inline-grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.name-cell .name {
  font-weight: 500;
  color: var(--text);
}
.prog-col {
  min-width: 160px;
}

.onboarding p {
  max-width: 460px;
  margin-left: auto;
  margin-right: auto;
}
.onboard-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 240px));
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}
.opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.opt:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.opt small {
  color: var(--text-3);
  font-size: 12px;
}
.opt__ic {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: 6px;
}
.opt__ic--jira {
  background: var(--info-soft);
  color: var(--info);
}

@media (max-width: 900px) {
  .hide-md {
    display: none;
  }
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .toolbar__right {
    width: 100%;
  }
  .search {
    flex: 1 1 100%;
    width: auto;
  }
  .source {
    flex: 1;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .onboard-options {
    grid-template-columns: 1fr;
  }
  .prog-col {
    min-width: 110px;
  }
  .jira-bar {
    flex-wrap: wrap;
  }
}
</style>
