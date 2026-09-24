<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Users</h1>
        <p>Every user across all organisations — create accounts, change roles and reset passwords.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="exporting || !total" @click="exportCsv">
          <i :class="exporting ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i> Export
        </button>
        <button class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-user-plus"></i> New user</button>
      </div>
    </header>

    <div class="ui-kpis">
      <template v-if="!summary">
        <div v-for="n in 4" :key="n" class="ui-kpi"><div class="ui-skeleton" style="width: 50%"></div><div class="ui-skeleton" style="height: 28px; margin-top: 14px; width: 40%"></div></div>
      </template>
      <template v-else>
        <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'all' }" @click="setStatus('all')">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-users"></i></span>All users</div>
          <div class="ui-kpi__value">{{ summary.total }}</div>
          <div class="ui-kpi__meta">Across every organisation</div>
        </button>
        <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'active' }" @click="setStatus('active')">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-user-check"></i></span>Active</div>
          <div class="ui-kpi__value">{{ summary.active }}</div>
          <div class="ui-kpi__meta">{{ summary.total - summary.active }} deactivated</div>
        </button>
        <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'recent' }" @click="setStatus('recent')">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-bolt"></i></span>Signed in last 30 days</div>
          <div class="ui-kpi__value">{{ summary.active_30d }}</div>
          <div class="ui-kpi__meta">{{ summary.total ? Math.round((summary.active_30d / summary.total) * 100) : 0 }}% of all users</div>
        </button>
        <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'never' }" @click="setStatus('never')">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-user-clock"></i></span>Never signed in</div>
          <div class="ui-kpi__value">{{ summary.never_signed_in }}</div>
          <div class="ui-kpi__meta">Invited but not yet active</div>
        </button>
      </template>
    </div>

    <section class="ui-card">
      <div class="pf-toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">{{ t.label }}</button>
        </div>
        <div class="pf-toolbar__right">
          <div class="ui-input-group pf-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search name, email or organisation…" aria-label="Search users" @input="debouncedLoad" />
          </div>
          <select v-model="orgFilter" class="ui-select pf-select" aria-label="Organisation" @change="reload">
            <option value="">All organisations</option>
            <option v-for="o in orgs" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>
          <select v-model="roleFilter" class="ui-select pf-select" aria-label="Role" @change="reload">
            <option value="">All roles</option>
            <option v-for="r in roles" :key="r" :value="r">{{ roleLabel(r) }}</option>
          </select>
          <select v-model="sort" class="ui-select pf-select" aria-label="Sort" @change="reload">
            <option value="">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="organization">Organisation</option>
            <option value="last_login">Last sign-in</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !rows.length" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="pf-sk-row">
          <div class="ui-skeleton" style="width: 34px; height: 34px; border-radius: 50%"></div>
          <div class="ui-skeleton" style="flex: 1"></div>
          <div class="ui-skeleton" style="width: 120px"></div>
          <div class="ui-skeleton" style="width: 80px"></div>
        </div>
      </div>

      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-users"></i></div>
        <h3>{{ filtered ? 'No users match your filters' : 'No users yet' }}</h3>
        <p>{{ filtered ? 'Try a different search or filter.' : 'Create a user and assign them to an organisation.' }}</p>
        <button v-if="filtered" class="ui-btn" style="margin-top: 12px" @click="clearFilters">Clear filters</button>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'pf-is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>User</th>
              <th class="pf-hide-sm">Organisation</th>
              <th>Role</th>
              <th class="pf-hide-md">Last sign-in</th>
              <th class="pf-hide-md">Created</th>
              <th>Status</th>
              <th style="width: 120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in rows" :key="u.id" class="is-clickable" @click="openEdit(u)">
              <td>
                <div class="pf-cell">
                  <span class="pf-avatar pf-avatar--round" :class="{ 'is-off': !u.is_active }">{{ initials(`${u.first_name} ${u.last_name}`) }}</span>
                  <span class="pf-cell__text">
                    <span class="pf-cell__title">{{ u.first_name }} {{ u.last_name }} <span v-if="u.id === meId" class="you">You</span></span>
                    <span class="pf-cell__sub">{{ u.email }}</span>
                  </span>
                </div>
              </td>
              <td class="pf-hide-sm">
                <span class="org-cell">{{ u.organization_name || '—' }}</span>
                <span v-if="u.organization_status === 'suspended'" class="ui-badge ui-badge--danger sm">Suspended</span>
              </td>
              <td><span class="role" :class="`role--${u.role}`">{{ roleLabel(u.role) }}</span></td>
              <td class="pf-hide-md pf-nowrap" :class="{ 'pf-muted': !u.last_login_at }" :title="u.last_login_at ? formatDateTime(u.last_login_at) : ''">{{ u.last_login_at ? timeAgo(u.last_login_at) : 'Never' }}</td>
              <td class="pf-hide-md pf-nowrap pf-muted">{{ formatDate(u.created_at) }}</td>
              <td><span class="ui-badge" :class="u.is_active ? 'ui-badge--success' : ''">{{ u.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td @click.stop>
                <div class="pf-row-actions">
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Reset password" :aria-label="`Reset password for ${u.email}`" :disabled="!!busy[u.id]" @click="resetPassword(u)">
                    <i :class="busy[u.id] === 'reset' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-key'"></i>
                  </button>
                  <button
                    class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon"
                    :title="u.is_active ? 'Deactivate' : 'Activate'"
                    :aria-label="`${u.is_active ? 'Deactivate' : 'Activate'} ${u.email}`"
                    :disabled="u.id === meId || !!busy[u.id]"
                    @click="toggleActive(u)"
                  >
                    <i :class="busy[u.id] === 'toggle' ? 'fa-solid fa-circle-notch spin' : u.is_active ? 'fa-solid fa-user-slash' : 'fa-solid fa-user-check'"></i>
                  </button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit" :aria-label="`Edit ${u.email}`" @click="openEdit(u)"><i class="fa-regular fa-pen-to-square"></i></button>
                </div>
              </td>
            </tr>
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

    <!-- Create / edit -->
    <div v-if="form.open" class="ui-modal-backdrop" @mousedown.self="form.open = false">
      <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-labelledby="uf-title" novalidate @submit.prevent="save">
        <div class="ui-modal__head">
          <h2 id="uf-title">{{ form.id ? 'Edit user' : 'New user' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="form.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="form.error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ form.error }}</span></div>
          <div class="pf-form-grid">
            <div class="ui-field">
              <label for="uf-first">First name *</label>
              <input id="uf-first" ref="firstField" v-model.trim="form.data.first_name" class="ui-input" maxlength="100" required autocomplete="off" />
            </div>
            <div class="ui-field">
              <label for="uf-last">Last name *</label>
              <input id="uf-last" v-model.trim="form.data.last_name" class="ui-input" maxlength="100" required autocomplete="off" />
            </div>
            <div class="ui-field">
              <label for="uf-email">Email *</label>
              <input id="uf-email" v-model.trim="form.data.email" class="ui-input" type="email" required autocomplete="off" />
            </div>
            <div class="ui-field">
              <label for="uf-phone">Phone</label>
              <input id="uf-phone" v-model.trim="form.data.phone" class="ui-input" type="tel" maxlength="20" autocomplete="off" />
            </div>
            <div class="ui-field">
              <label for="uf-org">Organisation *</label>
              <select id="uf-org" v-model="form.data.organization_id" class="ui-select" required>
                <option value="" disabled>Choose…</option>
                <option v-for="o in orgs" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="uf-role">Role *</label>
              <select id="uf-role" v-model="form.data.role" class="ui-select" :disabled="form.id === meId">
                <option v-for="r in roles" :key="r" :value="r">{{ roleLabel(r) }}</option>
              </select>
              <span v-if="form.data.role === 'super_admin'" class="ui-hint warn"><i class="fa-solid fa-triangle-exclamation"></i> Super admins can manage every organisation.</span>
            </div>
            <div class="ui-field span-2">
              <label class="ui-switch"><input v-model="form.data.is_active" type="checkbox" :disabled="form.id === meId" /> Account active</label>
              <span class="ui-hint">Inactive users cannot sign in. Deactivating also ends their sessions.</span>
            </div>
            <template v-if="!form.id">
              <div class="ui-field span-2">
                <label class="ui-switch"><input v-model="form.generatePassword" type="checkbox" /> Generate a temporary password</label>
              </div>
              <div v-if="!form.generatePassword" class="ui-field span-2">
                <label for="uf-pass">Password *</label>
                <input id="uf-pass" v-model="form.data.password" class="ui-input" type="password" autocomplete="new-password" />
                <span class="ui-hint">At least 8 characters with upper-case, lower-case and a number.</span>
              </div>
            </template>
            <div v-else class="span-2 meta">
              <span>Created {{ formatDate(form.row.created_at) }}</span>
              <span>Last sign-in {{ form.row.last_login_at ? formatDateTime(form.row.last_login_at) : 'never' }}</span>
              <button type="button" class="ui-btn ui-btn--sm" :disabled="!!busy[form.id]" @click="resetPassword(form.row)"><i class="fa-solid fa-key"></i> Reset password</button>
            </div>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="form.open = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="form.saving">
            <i v-if="form.saving" class="fa-solid fa-circle-notch spin"></i> {{ form.id ? 'Save changes' : 'Create user' }}
          </button>
        </div>
      </form>
    </div>

    <OneTimeSecret v-if="secret" :title="secret.title" :message="secret.message" :secret="secret.password" :who="secret.email" @close="secret = null" />
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import OneTimeSecret from '@/components/platform/OneTimeSecret.vue'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatDateTime, downloadBlob } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { platformAPI, initials, timeAgo, roleLabel, ensurePlatformSession } from '@/services/platform'

const emptyUser = () => ({ first_name: '', last_name: '', email: '', phone: '', organization_id: '', role: 'staff', is_active: true, password: '' })

export default {
  name: 'UsersAdmin',
  components: { OneTimeSecret },
  data() {
    const q = this.$route.query
    return {
      rows: [],
      total: 0,
      summary: null,
      page: 1,
      perPage: 25,
      q: q.search || '',
      status: ['active', 'inactive', 'recent', 'never'].includes(q.status) ? q.status : 'all',
      sort: q.sort || '',
      orgFilter: q.organization_id || '',
      roleFilter: q.role || '',
      roles: ['super_admin', 'admin', 'manager', 'staff', 'care_worker', 'support_coordinator'],
      orgs: [],
      loading: false,
      exporting: false,
      error: '',
      busy: {},
      tabs: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'recent', label: 'Recently active' },
        { value: 'never', label: 'Never signed in' }
      ],
      form: { open: false, id: null, row: null, data: emptyUser(), generatePassword: true, saving: false, error: '' },
      secret: null,
      timer: null
    }
  },
  computed: {
    filtered() {
      return !!(this.q || this.status !== 'all' || this.orgFilter || this.roleFilter)
    },
    meId() {
      return useAuthStore().user?.id || ''
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
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
    clearTimeout(this.timer)
  },
  methods: {
    initials,
    timeAgo,
    roleLabel,
    formatDate,
    formatDateTime,
    onKey(e) {
      if (e.key !== 'Escape') return
      if (this.secret) this.secret = null
      else if (this.form.open) this.form.open = false
    },
    params(extra = {}) {
      return {
        page: this.page,
        limit: this.perPage,
        search: this.q || undefined,
        status: this.status === 'all' ? undefined : this.status,
        organization_id: this.orgFilter || undefined,
        role: this.roleFilter || undefined,
        sort: this.sort || undefined,
        ...extra
      }
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const res = await platformAPI.users(this.params())
        this.rows = res.users || []
        this.total = res.total || 0
        this.summary = res.summary || null
        if (res.roles?.length) this.roles = res.roles
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load users')
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
      this.load()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.reload, 300)
    },
    setStatus(s) {
      this.status = s
      this.reload()
    },
    clearFilters() {
      this.q = ''
      this.status = 'all'
      this.orgFilter = ''
      this.roleFilter = ''
      this.reload()
    },
    go(p) {
      this.page = p
      this.load()
    },
    replaceRow(u) {
      const i = this.rows.findIndex((r) => r.id === u.id)
      if (i >= 0) this.rows.splice(i, 1, u)
    },
    async exportCsv() {
      this.exporting = true
      try {
        const all = []
        let page = 1
        for (;;) {
          const res = await platformAPI.users(this.params({ page, limit: 200 }))
          all.push(...(res.users || []))
          if (all.length >= res.total || !(res.users || []).length) break
          page++
        }
        const cols = ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'is_active', 'organization_name', 'organization_id', 'last_login_at', 'created_at']
        const esc = (v) => {
          const s = v == null ? '' : String(v)
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }
        const csv = [cols.join(','), ...all.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `users-${new Date().toISOString().slice(0, 10)}.csv`)
        toast.success(`Exported ${all.length} user${all.length === 1 ? '' : 's'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      } finally {
        this.exporting = false
      }
    },
    openCreate() {
      const data = emptyUser()
      data.organization_id = this.orgFilter || ''
      this.form = { open: true, id: null, row: null, data, generatePassword: true, saving: false, error: '' }
      this.$nextTick(() => this.$refs.firstField?.focus())
    },
    openEdit(u) {
      this.form = {
        open: true,
        id: u.id,
        row: u,
        data: { first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone || '', organization_id: u.organization_id, role: u.role, is_active: u.is_active, password: '' },
        generatePassword: true,
        saving: false,
        error: ''
      }
      if (u.organization_id && !this.orgs.some((o) => o.id === u.organization_id)) {
        this.orgs.push({ id: u.organization_id, name: u.organization_name || u.organization_id })
      }
      this.$nextTick(() => this.$refs.firstField?.focus())
    },
    validate() {
      const d = this.form.data
      if (!d.first_name || !d.last_name) return 'First and last name are required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'Enter a valid email address'
      if (!d.organization_id) return 'Choose an organisation'
      if (!this.form.id && !this.form.generatePassword) {
        const p = d.password
        if (p.length < 8 || !/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/\d/.test(p)) return 'Password needs 8+ characters with upper-case, lower-case and a number'
      }
      return ''
    },
    async save() {
      this.form.error = this.validate()
      if (this.form.error) return
      const d = { ...this.form.data }
      if (this.form.id) {
        delete d.password
        const before = this.form.row
        if (before.is_active && !d.is_active) {
          const ok = await confirmDialog({ title: 'Deactivate this user?', message: `${before.email} will be signed out and unable to sign in.`, confirmText: 'Deactivate', danger: true })
          if (!ok) return
        }
      } else if (this.form.generatePassword) {
        d.password = ''
      }
      this.form.saving = true
      try {
        if (this.form.id) {
          const res = await platformAPI.updateUser(this.form.id, d)
          this.replaceRow(res.user)
          toast.success('User updated')
          this.form.open = false
          this.load()
        } else {
          const res = await platformAPI.createUser(d)
          toast.success(`${res.user.email} created`)
          this.form.open = false
          if (res.temporary_password) {
            this.secret = { title: 'User created', message: `Sign-in details for ${res.user.first_name} (${res.user.email}):`, password: res.temporary_password, email: res.user.email }
          }
          this.reload()
        }
      } catch (e) {
        this.form.error = apiErrorMessage(e, 'Could not save the user')
      } finally {
        this.form.saving = false
      }
    },
    async toggleActive(u) {
      const activate = !u.is_active
      const ok = await confirmDialog({
        title: activate ? 'Activate this user?' : 'Deactivate this user?',
        message: activate ? `${u.email} will be able to sign in again.` : `${u.email} will be signed out and unable to sign in until reactivated.`,
        confirmText: activate ? 'Activate' : 'Deactivate',
        danger: !activate
      })
      if (!ok) return
      this.busy = { ...this.busy, [u.id]: 'toggle' }
      try {
        const res = await platformAPI.updateUser(u.id, {
          first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone, organization_id: u.organization_id, role: u.role, is_active: activate
        })
        this.replaceRow(res.user)
        toast.success(activate ? 'User activated' : 'User deactivated')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the user'))
      } finally {
        this.busy = { ...this.busy, [u.id]: null }
      }
    },
    async resetPassword(u) {
      const ok = await confirmDialog({
        title: 'Reset password?',
        message: `A new temporary password will be generated for ${u.email}. Their current password stops working and they are signed out everywhere.`,
        confirmText: 'Reset password',
        danger: true
      })
      if (!ok) return
      this.busy = { ...this.busy, [u.id]: 'reset' }
      try {
        const res = await platformAPI.resetPassword(u.id)
        this.form.open = false
        this.secret = { title: 'Password reset', message: `New temporary password for ${res.email}:`, password: res.temporary_password, email: res.email }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not reset the password'))
      } finally {
        this.busy = { ...this.busy, [u.id]: null }
      }
    }
  }
}
</script>

<style scoped>
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

.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }

.pf-avatar.is-off {
  background: var(--neutral-soft);
  color: var(--text-3);
}

.you {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 1px 7px;
  margin-left: 4px;
}

.org-cell {
  display: block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-badge.sm {
  height: 20px;
  font-size: 11px;
  padding: 0 8px;
  margin-top: 2px;
}

.role {
  display: inline-block;
  font-size: 12.5px;
  font-weight: 550;
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--neutral-soft);
  color: var(--text-2);
  white-space: nowrap;
}

.role--super_admin {
  background: var(--accent-soft);
  color: var(--accent);
}

.role--admin {
  background: var(--info-soft);
  color: var(--info);
}

.warn {
  color: var(--warning);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  font-size: 13px;
  color: var(--text-3);
  padding-top: 4px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.meta .ui-btn {
  margin-left: auto;
}
</style>
