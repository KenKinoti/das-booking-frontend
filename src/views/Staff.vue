<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">People</div>
        <h1>Staff &amp; users</h1>
        <p>Who can sign in, what they can do, and whether their account is active.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/scheduling" class="ui-btn"><i class="fa-regular fa-calendar"></i> Roster</router-link>
        <button class="ui-btn" :disabled="!users.length" title="Download the current list as CSV" @click="exportCsv"><i class="fa-solid fa-download"></i> Export</button>
        <button v-if="isAdmin" class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-user-plus"></i> Add staff member</button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'all' && !role }" @click="setFilter('all', '')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-users"></i></span>Team members</div>
        <div class="ui-kpi__value"><span v-if="!loaded" class="ui-skeleton sk-val"></span><template v-else>{{ summary.total || 0 }}</template></div>
        <div class="ui-kpi__meta">In your organisation</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'active' && !role }" @click="setFilter('active', '')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-user-check"></i></span>Active</div>
        <div class="ui-kpi__value"><span v-if="!loaded" class="ui-skeleton sk-val"></span><template v-else>{{ summary.active || 0 }}</template></div>
        <div class="ui-kpi__meta">Can sign in</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': status === 'inactive' && !role }" @click="setFilter('inactive', '')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-neutral"><i class="fa-solid fa-user-slash"></i></span>Deactivated</div>
        <div class="ui-kpi__value"><span v-if="!loaded" class="ui-skeleton sk-val"></span><template v-else>{{ summary.inactive || 0 }}</template></div>
        <div class="ui-kpi__meta">Access removed, history kept</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': role === 'admin' }" @click="setFilter('all', 'admin')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-accent"><i class="fa-solid fa-user-shield"></i></span>Admins</div>
        <div class="ui-kpi__value"><span v-if="!loaded" class="ui-skeleton sk-val"></span><template v-else>{{ summary.admins || 0 }}</template></div>
        <div class="ui-kpi__meta">Full access to settings</div>
      </button>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setFilter(t.value, role)">
            {{ t.label }}
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search name, email or phone…" aria-label="Search staff" @input="debouncedLoad" />
          </div>
          <label v-if="isSuperAdmin" class="ui-switch org-switch" title="Super admins can list users of every organisation">
            <input v-model="allOrgs" type="checkbox" @change="reload" />
            All organisations
          </label>
          <select v-model="role" class="ui-select role-filter" aria-label="Role" @change="reload">
            <option value="">All roles</option>
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !users.length" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="sk-row">
          <div class="ui-skeleton" style="width: 34px; height: 34px; border-radius: 50%"></div>
          <div class="ui-skeleton" style="flex: 2"></div>
          <div class="ui-skeleton" style="width: 100px"></div>
          <div class="ui-skeleton" style="width: 120px"></div>
        </div>
      </div>

      <div v-else-if="!users.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-user-tie"></i></div>
        <h3>{{ q || role || status !== 'all' ? 'No one matches your filters' : 'No team members yet' }}</h3>
        <p>{{ q || role || status !== 'all' ? 'Try a different search, role or status.' : 'Invite the people who work with you so they can sign in and be rostered.' }}</p>
        <div style="margin-top: 14px">
          <button v-if="q || role || status !== 'all'" class="ui-btn" @click="clearFilters">Clear filters</button>
          <button v-else-if="isAdmin" class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-user-plus"></i> Add staff member</button>
        </div>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th v-if="allOrgs" class="hide-md">Organisation</th>
              <th class="hide-md">Phone</th>
              <th class="hide-sm">Last sign-in</th>
              <th class="hide-lg">Added</th>
              <th>Status</th>
              <th class="actions-col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" :class="{ 'is-clickable': canEdit(u), 'is-off': !u.is_active }" @click="canEdit(u) && openEdit(u)">
              <td>
                <div class="person">
                  <span class="avatar" :style="{ '--hue': hue(u.id) }">{{ initials(u) }}</span>
                  <span class="person__text">
                    <span class="person__name">{{ name(u) }} <span v-if="u.id === me?.id" class="you">You</span></span>
                    <small>{{ u.email }}</small>
                  </span>
                </div>
              </td>
              <td><span class="ui-badge" :class="roleInfo(u.role).badge">{{ roleInfo(u.role).label }}</span></td>
              <td v-if="allOrgs" class="hide-md muted">{{ orgNames[u.organization_id] || '—' }}</td>
              <td class="hide-md nowrap">{{ u.phone || '—' }}</td>
              <td class="hide-sm">
                <span v-if="u.last_login_at" :title="dateTime(u.last_login_at)">{{ ago(u.last_login_at) }}</span>
                <span v-else class="muted">Never</span>
              </td>
              <td class="hide-lg muted">{{ date(u.created_at) }}</td>
              <td><span class="ui-badge" :class="u.is_active ? 'ui-badge--success' : 'ui-badge--draft'">{{ u.is_active ? 'Active' : 'Deactivated' }}</span></td>
              <td class="actions-col" @click.stop>
                <div v-if="canEdit(u)" class="row-actions">
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit" :aria-label="`Edit ${name(u)}`" @click="openEdit(u)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <template v-if="isAdmin && u.id !== me?.id">
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon hide-sm" title="Reset password" :aria-label="`Reset password for ${name(u)}`" @click="openReset(u)"><i class="fa-solid fa-key"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon hide-sm" :title="u.is_active ? 'Deactivate' : 'Reactivate'" :aria-label="u.is_active ? 'Deactivate' : 'Reactivate'" @click="toggleActive(u)">
                      <i :class="u.is_active ? 'fa-solid fa-user-slash' : 'fa-solid fa-user-check'"></i>
                    </button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger hide-sm" title="Delete user" :aria-label="`Delete ${name(u)}`" @click="remove(u)"><i class="fa-regular fa-trash-can"></i></button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="pagination.total > perPage" class="pager">
        <span class="muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, pagination.total) }} of {{ pagination.total }}</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= pagination.total" @click="go(page + 1)">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>
    </section>

    <!-- Create / edit -->
    <div v-if="formOpen" class="ui-modal-backdrop" @mousedown.self="closeForm">
      <form class="ui-modal" style="max-width: 680px" role="dialog" aria-modal="true" :aria-label="editing ? 'Edit staff member' : 'Add staff member'" @submit.prevent="save">
        <div class="ui-modal__head">
          <div>
            <h2>{{ editing ? `Edit ${name(editing)}` : 'Add staff member' }}</h2>
            <p class="sub">{{ editing ? 'Update their details and access.' : 'They can sign in with their email and the password below.' }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="closeForm"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="st-first">First name <span class="req">*</span></label>
              <input id="st-first" ref="first" v-model.trim="form.first_name" class="ui-input" :class="{ 'is-invalid': errors.first_name }" />
              <span v-if="errors.first_name" class="field-error">{{ errors.first_name }}</span>
            </div>
            <div class="ui-field">
              <label for="st-last">Last name</label>
              <input id="st-last" v-model.trim="form.last_name" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="st-email">Email <span class="req">*</span></label>
              <input id="st-email" v-model.trim="form.email" type="email" class="ui-input" :class="{ 'is-invalid': errors.email }" :disabled="editing && !isAdmin" autocomplete="off" />
              <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
            </div>
            <div class="ui-field">
              <label for="st-phone">Phone</label>
              <input id="st-phone" v-model.trim="form.phone" type="tel" class="ui-input" maxlength="20" />
            </div>
          </div>

          <template v-if="isAdmin && !isSelf">
            <div class="section-label">Role</div>
            <div class="roles">
              <label v-for="r in roleOptions" :key="r.value" class="role" :class="{ 'is-on': form.role === r.value }">
                <input v-model="form.role" type="radio" name="role" :value="r.value" />
                <span>
                  <strong>{{ r.label }}</strong>
                  <small>{{ r.description }}</small>
                </span>
              </label>
            </div>
          </template>

          <template v-if="!editing">
            <div class="section-label">Password</div>
            <div class="pw-mode">
              <label class="radio"><input v-model="pwMode" type="radio" value="generate" /> Generate a temporary password</label>
              <label class="radio"><input v-model="pwMode" type="radio" value="set" /> Set a password now</label>
            </div>
            <div v-if="pwMode === 'set'" class="ui-field" style="margin-top: 12px">
              <label for="st-pw">Password <span class="req">*</span></label>
              <div class="pw-input">
                <input id="st-pw" v-model="form.password" :type="showPw ? 'text' : 'password'" class="ui-input" :class="{ 'is-invalid': errors.password }" autocomplete="new-password" />
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :title="showPw ? 'Hide password' : 'Show password'" :aria-label="showPw ? 'Hide password' : 'Show password'" @click="showPw = !showPw">
                  <i :class="showPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                </button>
              </div>
              <span class="ui-hint">At least 8 characters. Share it with them securely.</span>
              <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
            </div>
            <p v-else class="ui-hint" style="margin-top: 8px">We'll show the password once after the account is created so you can share it.</p>
          </template>

          <template v-if="editing && isAdmin && !isSelf">
            <div class="section-label">Access</div>
            <label class="ui-switch">
              <input v-model="form.is_active" type="checkbox" />
              {{ form.is_active ? 'Active: can sign in' : 'Deactivated: cannot sign in' }}
            </label>
          </template>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="closeForm">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i>
            {{ editing ? 'Save changes' : 'Create account' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Reset password -->
    <div v-if="resetting" class="ui-modal-backdrop" @mousedown.self="resetting = null">
      <form class="ui-modal" role="dialog" aria-modal="true" aria-label="Reset password" @submit.prevent="doReset">
        <div class="ui-modal__head">
          <div>
            <h2>Reset password</h2>
            <p class="sub">{{ name(resetting) }} · {{ resetting.email }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="resetting = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="pw-mode">
            <label class="radio"><input v-model="pwMode" type="radio" value="generate" /> Generate a temporary password</label>
            <label class="radio"><input v-model="pwMode" type="radio" value="set" /> Choose a new password</label>
          </div>
          <div v-if="pwMode === 'set'" class="ui-field" style="margin-top: 12px">
            <label for="rs-pw">New password</label>
            <input id="rs-pw" v-model="resetPw" type="text" class="ui-input" :class="{ 'is-invalid': errors.password }" autocomplete="new-password" />
            <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          </div>
          <p class="ui-hint" style="margin-top: 12px">They will be signed out of other devices.</p>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="resetting = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-key'"></i> Reset password</button>
        </div>
      </form>
    </div>

    <!-- One-time password reveal -->
    <div v-if="reveal" class="ui-modal-backdrop">
      <div class="ui-modal" role="dialog" aria-modal="true" aria-label="Temporary password">
        <div class="ui-modal__head">
          <div>
            <h2>{{ reveal.title }}</h2>
            <p class="sub">{{ reveal.email }}</p>
          </div>
        </div>
        <div class="ui-modal__body">
          <div class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>Copy this password now. It is only shown once and cannot be recovered.</span></div>
          <div class="secret">
            <code data-testid="temp-password">{{ reveal.password }}</code>
            <button class="ui-btn ui-btn--sm" @click="copy(reveal.password)"><i :class="copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i> {{ copied ? 'Copied' : 'Copy' }}</button>
          </div>
          <p class="ui-hint">Ask them to sign in at {{ origin }}/login and change it from their profile.</p>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn ui-btn--primary" @click="reveal = null">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { usersService, ROLES, roleInfo, userName } from '@/services/users'
import api, { apiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatDateTime, downloadBlob, isoDate } from '@/utils/format'

const blank = () => ({ first_name: '', last_name: '', email: '', phone: '', role: 'staff', password: '', is_active: true })

export default {
  name: 'Staff',
  data() {
    return {
      users: [],
      summary: {},
      pagination: {},
      loaded: false,
      loading: false,
      error: '',
      q: '',
      role: '',
      status: 'all',
      allOrgs: false,
      orgNames: {},
      page: 1,
      perPage: 50,
      timer: null,
      formOpen: false,
      editing: null,
      form: blank(),
      errors: {},
      formError: '',
      saving: false,
      pwMode: 'generate',
      showPw: false,
      resetting: null,
      resetPw: '',
      reveal: null,
      copied: false,
      origin: window.location.origin
    }
  },
  computed: {
    auth() {
      return useAuthStore()
    },
    me() {
      return this.auth.user
    },
    isAdmin() {
      return ['admin', 'super_admin'].includes(this.me?.role)
    },
    isSuperAdmin() {
      return this.me?.role === 'super_admin'
    },
    isSelf() {
      return this.editing && this.editing.id === this.me?.id
    },
    roleOptions() {
      return ROLES
    },
    tabs() {
      return [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Deactivated' }
      ]
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    roleInfo,
    name: userName,
    date: formatDate,
    dateTime: formatDateTime,
    initials(u) {
      return ((u.first_name?.[0] || u.email?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase()
    },
    hue(id = '') {
      let h = 0
      for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360
      return h
    },
    ago(v) {
      const s = (Date.now() - new Date(v).getTime()) / 1000
      if (s < 60) return 'Just now'
      if (s < 3600) return `${Math.floor(s / 60)} min ago`
      if (s < 86400) return `${Math.floor(s / 3600)} h ago`
      if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
      return formatDate(v)
    },
    canEdit(u) {
      if (u.role === 'super_admin' && !this.isSuperAdmin) return false
      return this.isAdmin || u.id === this.me?.id
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const params = { page: this.page, limit: this.perPage, sort: 'name', search: this.q || undefined, role: this.role || undefined }
        if (this.status !== 'all') params.is_active = this.status === 'active'
        if (this.allOrgs) params.all_orgs = true
        const { users, pagination, summary } = await usersService.list(params)
        this.users = users
        this.pagination = pagination
        this.summary = summary
        this.loaded = true
        if (this.allOrgs && !Object.keys(this.orgNames).length) this.loadOrgs()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load staff')
      } finally {
        this.loading = false
      }
    },
    async loadOrgs() {
      try {
        const r = await api.get('/super-admin/organizations', { params: { limit: 500 } })
        const list = r.data?.data?.organizations || r.data?.organizations || []
        this.orgNames = Object.fromEntries(list.map((o) => [o.id, o.name]))
      } catch {
        this.orgNames = {}
      }
    },
    reload() {
      this.page = 1
      this.load()
    },
    go(p) {
      this.page = p
      this.load()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.reload, 250)
    },
    setFilter(status, role) {
      this.status = status
      this.role = role
      this.reload()
    },
    clearFilters() {
      this.q = ''
      this.role = ''
      this.status = 'all'
      this.reload()
    },
    openCreate() {
      this.editing = null
      this.form = blank()
      this.pwMode = 'generate'
      this.showPw = false
      this.errors = {}
      this.formError = ''
      this.formOpen = true
      this.$nextTick(() => this.$refs.first?.focus())
    },
    openEdit(u) {
      this.editing = u
      this.form = { ...blank(), ...u, password: '' }
      this.errors = {}
      this.formError = ''
      this.formOpen = true
      this.$nextTick(() => this.$refs.first?.focus())
    },
    closeForm() {
      if (!this.saving) this.formOpen = false
    },
    validate() {
      const e = {}
      if (!this.form.first_name) e.first_name = 'First name is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email || '')) e.email = 'Enter a valid email address'
      if (!this.editing && this.pwMode === 'set' && (this.form.password || '').length < 8) e.password = 'Use at least 8 characters'
      this.errors = e
      return !Object.keys(e).length
    },
    async save() {
      if (!this.validate()) return
      this.saving = true
      this.formError = ''
      try {
        if (this.editing) {
          const payload = { first_name: this.form.first_name, last_name: this.form.last_name, phone: this.form.phone }
          if (this.isAdmin) payload.email = this.form.email
          if (this.isAdmin && !this.isSelf) {
            payload.role = this.form.role
            payload.is_active = this.form.is_active
          }
          await usersService.update(this.editing.id, payload)
          toast.success('Changes saved')
          this.formOpen = false
        } else {
          const payload = { first_name: this.form.first_name, last_name: this.form.last_name, email: this.form.email, phone: this.form.phone, role: this.form.role }
          if (this.pwMode === 'set') payload.password = this.form.password
          const { user, temporaryPassword } = await usersService.create(payload)
          this.formOpen = false
          toast.success(`${userName(user)} can now sign in`)
          if (temporaryPassword) this.showReveal('Account created', user.email, temporaryPassword)
        }
        await this.load()
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not save')
      } finally {
        this.saving = false
      }
    },
    openReset(u) {
      this.resetting = u
      this.resetPw = ''
      this.pwMode = 'generate'
      this.errors = {}
    },
    async doReset() {
      if (this.pwMode === 'set' && this.resetPw.length < 8) {
        this.errors = { password: 'Use at least 8 characters' }
        return
      }
      this.saving = true
      try {
        const temp = await usersService.resetPassword(this.resetting.id, this.pwMode === 'set' ? this.resetPw : '')
        const u = this.resetting
        this.resetting = null
        toast.success('Password reset')
        if (temp) this.showReveal('New temporary password', u.email, temp)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not reset the password'))
      } finally {
        this.saving = false
      }
    },
    showReveal(title, email, password) {
      this.copied = false
      this.reveal = { title, email, password }
    },
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.copied = true
      } catch {
        toast.info('Select the password and copy it manually')
      }
    },
    async toggleActive(u) {
      if (u.is_active) {
        const ok = await confirmDialog({
          title: `Deactivate ${userName(u)}?`,
          message: 'They will be signed out and can no longer sign in. Their shifts, bookings and history are kept. You can reactivate them later.',
          confirmText: 'Deactivate',
          danger: true
        })
        if (!ok) return
      }
      try {
        await usersService.update(u.id, { is_active: !u.is_active })
        toast.success(u.is_active ? `${userName(u)} deactivated` : `${userName(u)} reactivated`)
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the account'))
      }
    },
    async remove(u) {
      const ok = await confirmDialog({
        title: `Delete ${userName(u)}?`,
        message: 'The account is removed and they can no longer sign in. Consider deactivating instead to keep them on past rosters.',
        confirmText: 'Delete user',
        danger: true
      })
      if (!ok) return
      try {
        await usersService.remove(u.id)
        toast.success('User deleted')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the user'))
      }
    },
    exportCsv() {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const head = ['First name', 'Last name', 'Email', 'Phone', 'Role', 'Status', 'Last sign-in', 'Added']
      const lines = this.users.map((u) => [u.first_name, u.last_name, u.email, u.phone, roleInfo(u.role).label, u.is_active ? 'Active' : 'Deactivated', u.last_login_at ? formatDateTime(u.last_login_at) : '', isoDate(new Date(u.created_at))].map(esc).join(','))
      downloadBlob(new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv' }), `staff-${isoDate()}.csv`)
    }
  }
}
</script>

<style scoped>
.org-switch {
  font-size: 13px;
  white-space: nowrap;
  margin-right: 4px;
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

.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-neutral { background: var(--neutral-soft); color: var(--text-2); }
.kpi-accent { background: var(--warning-soft); color: var(--warning); }

.sk-val {
  display: inline-block;
  width: 60px;
  height: 26px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.toolbar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.search {
  width: 280px;
}

.role-filter {
  width: 190px;
}

.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  align-items: center;
}

.person {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
}

.person__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.person__name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.person__text small {
  color: var(--text-3);
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.you {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  font-weight: 700;
  color: hsl(var(--hue) 60% 42%);
  background: hsl(var(--hue) 70% 50% / 0.14);
  flex-shrink: 0;
}

:root[data-theme='dark'] .avatar {
  color: hsl(var(--hue) 75% 72%);
}

.is-off .person__name,
.is-off .avatar {
  opacity: 0.6;
}

.muted {
  color: var(--text-3);
}

.nowrap {
  white-space: nowrap;
}

.actions-col {
  width: 1%;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.danger:hover {
  color: var(--danger);
}

.is-loading {
  opacity: 0.6;
}

.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.section-label {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin: 22px 0 10px;
}

.roles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.role {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.role:hover {
  border-color: var(--border-strong);
}

.role.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.role input {
  margin-top: 3px;
  accent-color: var(--accent);
}

.role strong {
  display: block;
  font-size: 13.5px;
}

.role small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.4;
}

.pw-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
}

.radio input {
  accent-color: var(--accent);
}

.pw-input {
  display: flex;
  gap: 6px;
}

.secret {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 16px 0 10px;
  padding: 12px 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.secret code {
  font-family: var(--font-mono);
  font-size: 17px;
  letter-spacing: 0.06em;
  color: var(--text);
  word-break: break-all;
}

.req {
  color: var(--danger);
}

.field-error {
  font-size: 12px;
  color: var(--danger);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 1200px) {
  .hide-lg {
    display: none;
  }
}

@media (max-width: 960px) {
  .hide-md {
    display: none;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .search,
  .role-filter {
    width: 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .roles {
    grid-template-columns: 1fr;
  }
  .person {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 20px;
  }
  .ui-kpi__meta {
    display: none;
  }
}
</style>
