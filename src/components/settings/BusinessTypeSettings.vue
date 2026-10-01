<template>
  <div class="bts" data-testid="business-type-settings">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div v-else-if="loading" class="bts__sk">
      <div class="ui-skeleton" style="height: 64px"></div>
      <div class="ui-skeleton" style="height: 140px"></div>
    </div>

    <template v-else>
      <!-- Current type -->
      <div class="bts__current">
        <span class="bts__icon"><i :class="currentType?.icon || 'fa-solid fa-building'"></i></span>
        <div class="bts__current-text">
          <strong data-testid="current-type">{{ access.confirmed ? currentType?.name : 'Not chosen yet' }}</strong>
          <small v-if="access.confirmed">{{ currentType?.description }}</small>
          <small v-else>Every module in your plan is on. Choose a business type to see only what fits, in your words.</small>
        </div>
        <button v-if="canEdit && !picking" type="button" class="ui-btn ui-btn--sm" @click="startPick"><i class="fa-solid fa-arrows-rotate"></i> {{ access.confirmed ? 'Change type' : 'Choose type' }}</button>
      </div>

      <!-- Change type with a preview -->
      <div v-if="picking" class="bts__pick">
        <div class="bts__types" role="radiogroup" aria-label="Business type">
          <button v-for="t in types" :key="t.key" type="button" role="radio" class="bts__type" :class="{ 'is-on': pick === t.key }" :aria-checked="pick === t.key" :data-type="t.key" @click="pick = t.key">
            <i :class="t.icon"></i><span>{{ t.name }}</span>
          </button>
        </div>
        <div v-if="diff" class="bts__diff" data-testid="type-change-preview">
          <h3>What changes for {{ pickType.name }}</h3>
          <ul>
            <li v-if="diff.added.length"><i class="fa-solid fa-circle-plus ok"></i> Shown: {{ diff.added.join(', ') }}</li>
            <li v-if="diff.removed.length"><i class="fa-solid fa-circle-minus warn"></i> Hidden: {{ diff.removed.join(', ') }} <small>(data is kept; switch them back on under “Show extra modules”)</small></li>
            <li v-if="!diff.added.length && !diff.removed.length"><i class="fa-solid fa-circle-check ok"></i> The same modules stay on.</li>
            <li v-for="w in diff.words" :key="w.key"><i class="fa-solid fa-language"></i> “{{ w.from }}” becomes “{{ w.to }}”</li>
            <li><i class="fa-solid fa-user-shield"></i> Roles: {{ pickType.roles.map((r) => r.name).join(', ') }}. Team members move to the matching role; custom roles are kept.</li>
          </ul>
        </div>
        <div class="bts__pick-actions">
          <button type="button" class="ui-btn" :disabled="saving" @click="picking = false">Cancel</button>
          <button type="button" class="ui-btn ui-btn--primary" :disabled="!pick || saving || (pick === access.type?.key && access.confirmed)" data-testid="apply-type" @click="applyType">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Use {{ pickType?.name || 'this type' }}
          </button>
        </div>
      </div>

      <!-- Extra modules -->
      <div v-if="access.restricted && extraCandidates.length" class="bts__block">
        <h3>Show extra modules</h3>
        <p class="sub">Modules in your plan that {{ currentType?.name?.toLowerCase() }}s don't usually need. Switch one on to show it to your team.</p>
        <div class="bts__extras">
          <label v-for="m in extraCandidates" :key="m" class="bts__extra">
            <span>{{ moduleLabel(m) }}</span>
            <span class="ui-switch"><input type="checkbox" :checked="access.extraModules.includes(m)" :disabled="!canEdit || saving" :aria-label="`Show ${moduleLabel(m)}`" @change="toggleExtra(m, $event.target.checked)" /></span>
          </label>
        </div>
      </div>

      <!-- Roles -->
      <div class="bts__block">
        <div class="bts__block-head">
          <div>
            <h3>Roles &amp; permissions</h3>
            <p class="sub">What each role can see and do. A person's role is set on the {{ term('staff') }} page.</p>
          </div>
          <button v-if="canEdit" type="button" class="ui-btn ui-btn--sm" @click="openRole(null)"><i class="fa-solid fa-plus"></i> Add role</button>
        </div>
        <div class="ui-table-wrap">
          <table class="ui-table bts__roles">
            <thead>
              <tr>
                <th>Role</th>
                <th class="hide-sm">Level</th>
                <th class="hide-sm">Sees</th>
                <th class="num">People</th>
                <th class="actions-col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in roles" :key="r.id" :data-role="r.key">
                <td>
                  <strong>{{ r.name }}</strong> <span v-if="r.custom" class="ui-badge ui-badge--info">Custom</span>
                  <br /><small class="muted">{{ r.description }}</small>
                </td>
                <td class="hide-sm">{{ baseLabel(r.base) }}</td>
                <td class="hide-sm">{{ r.scope === 'own' ? `Only their own ${termLower('bookings')}` : 'All records' }}</td>
                <td class="num">{{ r.members }}</td>
                <td class="actions-col">
                  <div v-if="canEdit" class="row-actions">
                    <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${r.name}`" title="Edit" @click="openRole(r)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button v-if="!r.locked" type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger" :aria-label="`Delete ${r.name}`" title="Delete" @click="removeRole(r)"><i class="fa-regular fa-trash-can"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Role editor -->
    <div v-if="editor.open" class="ui-modal-backdrop" @mousedown.self="editor.open = false">
      <form class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="role-ed-title" @submit.prevent="saveRole">
        <div class="ui-modal__head">
          <h2 id="role-ed-title">{{ editor.id ? `Edit ${editor.form.name || 'role'}` : 'New role' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Close" @click="editor.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="editor.error" class="ui-alert ui-alert--danger" style="margin-bottom: 14px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ editor.error }}</span></div>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="re-name">Name *</label>
              <input id="re-name" v-model.trim="editor.form.name" class="ui-input" maxlength="80" />
            </div>
            <div class="ui-field">
              <label for="re-base">Level</label>
              <select id="re-base" v-model="editor.form.base" class="ui-select" :disabled="editor.locked">
                <option v-for="b in baseLevels" :key="b.value" :value="b.value">{{ b.label }} — {{ b.hint }}</option>
              </select>
            </div>
            <div class="ui-field" style="grid-column: 1 / -1">
              <label for="re-desc">Description</label>
              <input id="re-desc" v-model.trim="editor.form.description" class="ui-input" maxlength="200" />
            </div>
            <div class="ui-field">
              <label for="re-scope">Records they see</label>
              <select id="re-scope" v-model="editor.form.scope" class="ui-select" :disabled="editor.form.base === 'admin'">
                <option value="all">All records</option>
                <option value="own">Only {{ termLower('bookings') }} assigned to them</option>
              </select>
            </div>
          </div>
          <div class="section-label">Permissions</div>
          <p v-if="editor.form.base === 'admin'" class="ui-hint">Admins can do everything.</p>
          <div v-else class="ui-table-wrap">
            <table class="ui-table bts__matrix">
              <thead>
                <tr>
                  <th>Module</th>
                  <th v-for="a in actions" :key="a" class="c">{{ actionLabels[a] }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in matrixModules" :key="m">
                  <td>{{ moduleLabel(m) }}</td>
                  <td v-for="a in actions" :key="a" class="c">
                    <input type="checkbox" :checked="has(m, a)" :disabled="editor.form.base === 'read_only' && a !== 'view'" :aria-label="`${actionLabels[a]} ${moduleLabel(m)}`" @change="toggle(m, a, $event.target.checked)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="editor.open = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="editor.saving"><i :class="editor.saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ editor.id ? 'Save role' : 'Create role' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { industryAPI, ACTION_LABELS, BASE_LEVELS, moduleLabel as baseModuleLabel } from '@/services/industry'
import { apiErrorMessage } from '@/services/api'
import { access, loadAccess, term, termLower, DEFAULT_TERMS } from '@/composables/useAccess'
import { loadEntitlements } from '@/composables/useEntitlements'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve']

/** Settings → Business type: change type (with a preview), extra modules, roles. */
export default {
  name: 'BusinessTypeSettings',
  props: { canEdit: { type: Boolean, default: true } },
  data() {
    return {
      access,
      loading: true,
      error: '',
      saving: false,
      types: [],
      roles: [],
      picking: false,
      pick: '',
      actions: ACTIONS,
      actionLabels: ACTION_LABELS,
      baseLevels: BASE_LEVELS,
      editor: { open: false, id: null, locked: false, form: {}, perms: {}, saving: false, error: '' }
    }
  },
  computed: {
    currentType() {
      return this.types.find((t) => t.key === access.type?.key) || access.type
    },
    pickType() {
      return this.types.find((t) => t.key === this.pick) || null
    },
    extraCandidates() {
      const t = this.currentType
      if (!t || (t.modules || []).includes('*')) return []
      return access.planModules.filter((m) => !(t.modules || []).includes(m))
    },
    diff() {
      const t = this.pickType
      if (!t) return null
      const plan = access.planModules
      const now = access.effectiveModules
      const all = t.modules.includes('*')
      const next = plan.filter((m) => all || t.modules.includes(m) || access.extraModules.includes(m))
      const terms = { ...DEFAULT_TERMS, ...(t.terms || {}) }
      const label = (m) => this.labelWith(m, terms)
      return {
        added: next.filter((m) => !now.includes(m)).map(label),
        removed: now.filter((m) => !next.includes(m)).map(label),
        words: ['customers', 'bookings', 'services', 'staff', 'inventory', 'projects']
          .filter((k) => terms[k] !== (access.terms[k] || DEFAULT_TERMS[k]))
          .map((k) => ({ key: k, from: access.terms[k] || DEFAULT_TERMS[k], to: terms[k] }))
      }
    },
    matrixModules() {
      return ['core', 'team', ...access.effectiveModules]
    }
  },
  created() {
    this.load()
  },
  methods: {
    term,
    termLower,
    moduleLabel(m) {
      return this.labelWith(m, access.terms)
    },
    labelWith(m, T) {
      if (m === 'bookings') return `${T.bookings} & ${T.services}`
      if (m === 'crm') return T.customers
      if (m === 'inventory') return T.inventory
      if (m === 'team') return T.staff
      if (m === 'projects') return T.projects
      if (m === 'events') return T.events
      return baseModuleLabel(m)
    },
    baseLabel(b) {
      return BASE_LEVELS.find((x) => x.value === b)?.label || b
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const [t, r] = await Promise.all([industryAPI.types(), industryAPI.roles(), loadAccess(true)])
        this.types = t.types || []
        this.roles = r.roles || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the business type')
      } finally {
        this.loading = false
      }
    },
    async reloadRoles() {
      try {
        this.roles = (await industryAPI.roles()).roles || []
      } catch {
        /* keep the old list */
      }
    },
    startPick() {
      this.pick = access.confirmed ? access.type?.key : ''
      this.picking = true
    },
    async applyType() {
      const t = this.pickType
      if (!t) return
      const ok = await confirmDialog({
        title: `Switch to ${t.name}?`,
        message: 'Menus, words and roles change for everyone in your organisation. Your records are not touched, and you can switch back at any time.',
        confirmText: `Use ${t.name}`
      })
      if (!ok) return
      this.saving = true
      try {
        await industryAPI.setType(t.key)
        await Promise.all([loadAccess(true), loadEntitlements(true)])
        await this.reloadRoles()
        this.picking = false
        toast.success(`DASYIN is now set up for a ${t.name.toLowerCase()}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not change the business type'))
      } finally {
        this.saving = false
      }
    },
    async toggleExtra(m, on) {
      const list = on ? [...new Set([...access.extraModules, m])] : access.extraModules.filter((x) => x !== m)
      this.saving = true
      try {
        await industryAPI.setExtras(list)
        await loadAccess(true)
        toast.success(on ? `${this.moduleLabel(m)} is now shown` : `${this.moduleLabel(m)} is hidden`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = false
      }
    },
    openRole(r) {
      const perms = {}
      const src = r?.permissions || {}
      for (const m of this.matrixModules) perms[m] = [...(src[m] || src['*'] || [])]
      this.editor = {
        open: true,
        id: r?.id || null,
        locked: !!r?.locked,
        wildcard: src['*'] ? [...src['*']] : null,
        form: { name: r?.name || '', description: r?.description || '', base: r?.base || 'staff', scope: r?.scope || 'all', home: r?.home || '' },
        perms,
        saving: false,
        error: ''
      }
    },
    has(m, a) {
      return (this.editor.perms[m] || []).includes(a)
    },
    toggle(m, a, on) {
      const cur = new Set(this.editor.perms[m] || [])
      if (on) {
        cur.add(a)
        if (a !== 'view') cur.add('view')
      } else {
        cur.delete(a)
        if (a === 'view') cur.clear()
      }
      this.editor.perms = { ...this.editor.perms, [m]: ACTIONS.filter((x) => cur.has(x)) }
    },
    async saveRole() {
      const f = this.editor.form
      if (!f.name) {
        this.editor.error = 'Give the role a name'
        return
      }
      const permissions = {}
      if (this.editor.wildcard) permissions['*'] = this.editor.wildcard
      for (const [m, acts] of Object.entries(this.editor.perms)) permissions[m] = f.base === 'read_only' ? acts.filter((a) => a === 'view') : acts
      this.editor.saving = true
      this.editor.error = ''
      try {
        const body = { ...f, permissions }
        if (this.editor.id) await industryAPI.updateRole(this.editor.id, body)
        else await industryAPI.createRole(body)
        toast.success(this.editor.id ? 'Role saved' : 'Role created')
        this.editor.open = false
        await Promise.all([this.reloadRoles(), loadAccess(true)])
      } catch (e) {
        this.editor.error = apiErrorMessage(e, 'Could not save the role')
      } finally {
        this.editor.saving = false
      }
    },
    async removeRole(r) {
      const ok = await confirmDialog({ title: `Delete ${r.name}?`, message: 'People must be given another role first.', confirmText: 'Delete role', danger: true })
      if (!ok) return
      try {
        await industryAPI.deleteRole(r.id)
        toast.success('Role deleted')
        await this.reloadRoles()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the role'))
      }
    }
  }
}
</script>

<style scoped>
.bts {
  display: grid;
  gap: 20px;
}

.bts__sk {
  display: grid;
  gap: 12px;
}

.bts__current {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
}

.bts__icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 18px;
}

.bts__current-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bts__current-text small,
.sub,
.muted {
  color: var(--text-3);
}

.sub {
  margin: 2px 0 10px;
  font-size: 13px;
}

.bts__types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
}

.bts__type {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  text-align: left;
  cursor: pointer;
}

.bts__type i {
  width: 18px;
  text-align: center;
  color: var(--text-3);
}

.bts__type:hover {
  background: var(--surface-hover);
}

.bts__type.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent) inset;
}

.bts__type.is-on i {
  color: var(--accent);
}

.bts__diff {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
}

.bts__diff h3,
.bts__block h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}

.bts__diff ul {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--text-2);
}

.bts__diff li i {
  width: 18px;
  color: var(--text-3);
}

.bts__diff small {
  color: var(--text-3);
}

.ok {
  color: var(--success) !important;
}

.warn {
  color: var(--warning) !important;
}

.bts__pick-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.bts__block-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.bts__extras {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.bts__extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13.5px;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}

.actions-col {
  width: 90px;
  text-align: right;
}

.danger {
  color: var(--danger);
}

.section-label {
  margin: 16px 0 8px;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text-2);
}

.bts__matrix .c {
  text-align: center;
  width: 70px;
}

.bts__matrix input {
  width: 16px;
  height: 16px;
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }

  .bts__current {
    flex-wrap: wrap;
  }

  .bts__matrix .c {
    width: auto;
    padding-left: 4px;
    padding-right: 4px;
  }
}
</style>
