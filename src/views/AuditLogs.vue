<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Audit log</h1>
        <p>Who changed what, across platform administration, accounting and invoicing.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="exporting || !total" @click="exportCsv">
          <i :class="exporting ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i> Export
        </button>
        <button class="ui-btn" :disabled="loading" @click="load"><i :class="loading ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Refresh</button>
      </div>
    </header>

    <section class="ui-card">
      <div class="pf-toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': source === t.value }" role="tab" :aria-selected="source === t.value" @click="setSource(t.value)">
            {{ t.label }}<span v-if="counts && t.value" class="count">{{ counts[t.value] || 0 }}</span>
          </button>
        </div>
        <div class="pf-toolbar__right">
          <div class="ui-input-group pf-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search action, user, organisation…" aria-label="Search audit log" @input="debouncedLoad" />
          </div>
        </div>
      </div>
      <div class="filters">
        <select v-model="orgFilter" class="ui-select" aria-label="Organisation" @change="reload">
          <option value="">All organisations</option>
          <option v-for="o in orgs" :key="o.id" :value="o.id">{{ o.name }}</option>
        </select>
        <select v-model="action" class="ui-select" aria-label="Action type" @change="reload">
          <option value="">All actions</option>
          <option value="organization.">Organisations</option>
          <option value="user.">Users</option>
          <option value="settings.">Settings</option>
          <option value="database.">Database</option>
          <option value="ledger.">Ledger entries</option>
          <option value="invoice.">Invoices</option>
        </select>
        <label class="date"><span>From</span><input v-model="from" class="ui-input" type="date" aria-label="From date" @change="reload" /></label>
        <label class="date"><span>To</span><input v-model="to" class="ui-input" type="date" aria-label="To date" @change="reload" /></label>
        <button v-if="filtered" class="ui-btn ui-btn--ghost ui-btn--sm" @click="clearFilters"><i class="fa-solid fa-xmark"></i> Clear filters</button>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !rows.length" class="ui-card__body">
        <div v-for="n in 8" :key="n" class="pf-sk-row">
          <div class="ui-skeleton" style="width: 130px"></div>
          <div class="ui-skeleton" style="width: 140px"></div>
          <div class="ui-skeleton" style="flex: 1"></div>
        </div>
      </div>

      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <h3>{{ filtered ? 'No entries match your filters' : 'Nothing recorded yet' }}</h3>
        <p v-if="filtered">Try a different search, source or date range.</p>
        <p v-else class="empty-explain">
          Entries appear here when platform admins create, edit, suspend or delete organisations, manage users, reset passwords or change settings,
          when journal entries are posted in accounting, and when invoices are created, sent or paid. Individual sign-ins are not logged — see each user's last sign-in on the Users page.
        </p>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'pf-is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th class="pf-hide-sm">User</th>
              <th class="pf-hide-md">Organisation</th>
              <th class="pf-hide-sm">Details</th>
              <th style="width: 40px"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in rows" :key="r.source + r.id">
              <tr class="is-clickable" :class="{ 'is-open': open === r.source + r.id }" @click="toggle(r)">
                <td class="pf-nowrap">
                  <div>{{ formatDateTime(r.created_at) }}</div>
                  <small class="pf-muted">{{ timeAgo(r.created_at) }}</small>
                </td>
                <td>
                  <span class="act" :class="`act--${tone(r.action)}`"><i :class="icon(r)"></i> {{ actionLabel(r.action) }}</span>
                  <small class="src pf-muted">{{ sourceLabel(r.source) }}</small>
                </td>
                <td class="pf-hide-sm">
                  <div class="pf-cell__title user">{{ r.user_name || r.user_email || (r.user_id ? 'Unknown user' : 'System') }}</div>
                  <small v-if="r.user_name && r.user_email" class="pf-muted">{{ r.user_email }}</small>
                </td>
                <td class="pf-hide-md">
                  <router-link v-if="r.organization_id && r.organization_name" :to="`/organizations?open=${r.organization_id}`" class="org-link" @click.stop>{{ r.organization_name }}</router-link>
                  <span v-else class="pf-muted">{{ r.organization_id ? 'Deleted organisation' : '—' }}</span>
                </td>
                <td class="pf-hide-sm details">{{ describe(r) }}</td>
                <td><i class="fa-solid fa-chevron-down chev" :class="{ 'is-open': open === r.source + r.id }"></i></td>
              </tr>
              <tr v-if="open === r.source + r.id" class="detail-row">
                <td colspan="6">
                  <div class="detail">
                    <dl class="pf-kv">
                      <dt>Action</dt><dd class="pf-mono">{{ r.action }}</dd>
                      <dt>Entity</dt><dd>{{ r.entity_type || '—' }} <span v-if="r.entity_id" class="pf-mono pf-muted">{{ r.entity_id }}</span></dd>
                      <dt>User</dt><dd>{{ r.user_name || r.user_email || r.user_id || 'System' }}</dd>
                      <dt>Organisation</dt><dd>{{ r.organization_name || r.organization_id || '—' }}</dd>
                      <dt v-if="r.ip_address">IP address</dt><dd v-if="r.ip_address" class="pf-mono">{{ r.ip_address }}</dd>
                      <dt v-if="r.summary">Summary</dt><dd v-if="r.summary">{{ r.summary }}</dd>
                    </dl>
                    <div v-if="changes(r).length" class="changes">
                      <table class="ui-table compact">
                        <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
                        <tbody>
                          <tr v-for="c in changes(r)" :key="c.key">
                            <td class="pf-mono">{{ c.key }}</td>
                            <td class="before">{{ c.before }}</td>
                            <td class="after">{{ c.after }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <footer v-if="total > perPage" class="pf-pager">
        <span class="pf-muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= total" @click="go(page + 1)">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDateTime, downloadBlob } from '@/utils/format'
import { platformAPI, timeAgo, ensurePlatformSession, auditActionLabel } from '@/services/platform'


export default {
  name: 'AuditLogs',
  data() {
    const q = this.$route.query
    return {
      rows: [],
      total: 0,
      counts: null,
      page: 1,
      perPage: 50,
      q: q.search || '',
      source: ['platform', 'accounting', 'invoicing'].includes(q.source) ? q.source : '',
      orgFilter: q.organization_id || '',
      action: '',
      from: '',
      to: '',
      orgs: [],
      loading: false,
      exporting: false,
      error: '',
      open: null,
      timer: null,
      tabs: [
        { value: '', label: 'All' },
        { value: 'platform', label: 'Platform admin' },
        { value: 'accounting', label: 'Accounting' },
        { value: 'invoicing', label: 'Invoicing' }
      ]
    }
  },
  computed: {
    filtered() {
      return !!(this.q || this.source || this.orgFilter || this.action || this.from || this.to)
    }
  },
  created() {
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    this.load()
    this.loadOrgs()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    formatDateTime,
    timeAgo,
    params(extra = {}) {
      return {
        page: this.page,
        limit: this.perPage,
        search: this.q || undefined,
        source: this.source || undefined,
        organization_id: this.orgFilter || undefined,
        action: this.action || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
        ...extra
      }
    },
    async load() {
      if (this.from && this.to && this.from > this.to) {
        toast.warning('The start date is after the end date')
        return
      }
      this.loading = true
      this.error = ''
      try {
        const res = await platformAPI.audit(this.params())
        this.rows = res.entries || []
        this.total = res.total || 0
        this.counts = res.source_counts || null
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the audit log')
      } finally {
        this.loading = false
      }
    },
    async loadOrgs() {
      try {
        const res = await platformAPI.organizations({ limit: 200, sort: 'name' })
        this.orgs = res.organizations || []
      } catch {
        this.orgs = []
      }
    },
    reload() {
      this.page = 1
      this.open = null
      this.load()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.reload, 300)
    },
    setSource(s) {
      this.source = s
      this.reload()
    },
    clearFilters() {
      Object.assign(this, { q: '', source: '', orgFilter: '', action: '', from: '', to: '' })
      this.reload()
    },
    go(p) {
      this.page = p
      this.open = null
      this.load()
    },
    toggle(r) {
      const k = r.source + r.id
      this.open = this.open === k ? null : k
    },
    actionLabel: auditActionLabel,
    sourceLabel(s) {
      return { platform: 'Platform admin', accounting: 'Accounting', invoicing: 'Invoicing' }[s] || s
    },
    tone(a) {
      if (/delete|suspend|deactivate|void|reset_password/.test(a)) return 'danger'
      if (/create|activate|paid|payment/.test(a)) return 'success'
      if (/impersonate/.test(a)) return 'warning'
      return 'neutral'
    },
    icon(r) {
      const a = r.action || ''
      if (a.startsWith('organization.')) return 'fa-solid fa-building'
      if (a.startsWith('user.')) return 'fa-solid fa-user'
      if (a.startsWith('database.')) return 'fa-solid fa-database'
      if (a.startsWith('settings.')) return 'fa-solid fa-gear'
      if (r.source === 'accounting') return 'fa-solid fa-scale-balanced'
      if (r.source === 'invoicing') return 'fa-solid fa-file-invoice'
      return 'fa-solid fa-circle-dot'
    },
    parse(v) {
      if (!v) return null
      try {
        const o = JSON.parse(v)
        return o && typeof o === 'object' ? o : { value: o }
      } catch {
        return { value: v }
      }
    },
    fmt(v) {
      if (v === undefined) return '—'
      if (v === null || v === '') return '(empty)'
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
    },
    changes(r) {
      const before = this.parse(r.old_values) || {}
      const after = this.parse(r.new_values) || {}
      const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      return keys.map((k) => ({ key: k, before: this.fmt(before[k]), after: this.fmt(after[k]) })).filter((c) => c.before !== c.after || !Object.keys(before).length)
    },
    describe(r) {
      if (r.summary) return r.summary
      const after = this.parse(r.new_values) || {}
      const before = this.parse(r.old_values) || {}
      const parts = []
      if (after.name) parts.push(after.name)
      else if (before.name) parts.push(before.name)
      if (after.email) parts.push(after.email)
      if (after.reason) parts.push(`Reason: ${after.reason}`)
      if (after.users_deactivated != null) parts.push(`${after.users_deactivated} users signed out`)
      if (after.users_restored != null) parts.push(`${after.users_restored} users restored`)
      if (after.role && before.role && after.role !== before.role) parts.push(`${before.role} → ${after.role}`)
      if (after.sections) parts.push(after.sections.map((s) => s.replace('_settings', '')).join(', '))
      if (after.tables != null) parts.push(`${after.tables} tables`)
      if (after.organization) parts.push(after.organization)
      return parts.join(' · ') || r.entity_type || '—'
    },
    async exportCsv() {
      this.exporting = true
      try {
        const all = []
        let page = 1
        for (;;) {
          const res = await platformAPI.audit(this.params({ page, limit: 200 }))
          all.push(...(res.entries || []))
          if (all.length >= res.total || !(res.entries || []).length || all.length >= 10000) break
          page++
        }
        const cols = ['created_at', 'source', 'action', 'user_name', 'user_email', 'organization_name', 'entity_type', 'entity_id', 'summary', 'old_values', 'new_values', 'ip_address']
        const esc = (v) => {
          const s = v == null ? '' : String(v)
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }
        const csv = [cols.join(','), ...all.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `audit-log-${new Date().toISOString().slice(0, 10)}.csv`)
        toast.success(`Exported ${all.length} entr${all.length === 1 ? 'y' : 'ies'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      } finally {
        this.exporting = false
      }
    }
  }
}
</script>

<style scoped>
.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.filters .ui-select {
  width: auto;
  min-width: 180px;
}

.date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-3);
  margin: 0;
}

.date .ui-input {
  width: 160px;
}

.act {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
}

.act i {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
  background: var(--neutral-soft);
  color: var(--text-2);
}

.act--danger i { background: var(--danger-soft); color: var(--danger); }
.act--success i { background: var(--success-soft); color: var(--success); }
.act--warning i { background: var(--warning-soft); color: var(--warning); }

.src {
  display: block;
  font-size: 11.5px;
  margin: 2px 0 0 31px;
}

.user {
  max-width: 180px;
}

.ui-table td {
  vertical-align: top;
}

.org-link {
  color: var(--text);
  text-decoration: none;
}

.org-link:hover {
  color: var(--accent);
}

.details {
  color: var(--text-2);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chev {
  color: var(--text-3);
  transition: transform 0.15s;
}

.chev.is-open {
  transform: rotate(180deg);
}

tr.is-open td {
  background: var(--surface-hover);
}

.detail-row td {
  background: var(--surface-2);
  padding: 16px 20px 20px;
}

.detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 20px;
}

.changes {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface);
}

.ui-table.compact th,
.ui-table.compact td {
  padding: 8px 12px;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.before {
  color: var(--danger);
}

.after {
  color: var(--success);
}

.empty-explain {
  max-width: 620px;
  margin: 0 auto;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .detail {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .filters .ui-select,
  .date,
  .date .ui-input {
    width: 100%;
  }

  .date .ui-input {
    flex: 1;
  }
}
</style>
