<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Business types</h1>
        <p>What each kind of business sees: modules, words, staff role templates, setup checklist and sample services.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--primary" @click="openEdit(null)"><i class="fa-solid fa-plus"></i> New business type</button>
      </div>
    </header>

    <section class="ui-card">
      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>
      <div v-else-if="loading" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 44px; margin-bottom: 8px"></div>
      </div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table" v-table-cards>
          <thead>
            <tr>
              <th>Type</th>
              <th class="hide-md">Modules</th>
              <th class="hide-sm">Words</th>
              <th class="num">Roles</th>
              <th>Status</th>
              <th class="actions-col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in types" :key="t.key" class="is-clickable" :data-type="t.key" @click="openEdit(t)">
              <td class="card-title">
                <div class="tname">
                  <span class="ticon"><i :class="t.icon"></i></span>
                  <span><strong>{{ t.name }}</strong><br /><code class="muted">{{ t.key }}</code></span>
                </div>
              </td>
              <td class="hide-md card-show">
                <div class="chips">
                  <span v-for="m in t.modules" :key="m" class="chip">{{ m === '*' ? 'All plan modules' : moduleLabel(m) }}</span>
                </div>
              </td>
              <td class="hide-sm card-show muted small">{{ wordsOf(t) || 'Default words' }}</td>
              <td class="num">{{ t.roles.length }}</td>
              <td><span class="ui-badge" :class="t.active ? 'ui-badge--success' : 'ui-badge--draft'">{{ t.active ? 'Active' : 'Hidden' }}</span></td>
              <td class="actions-col" @click.stop>
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit" :aria-label="`Edit ${t.name}`" @click="openEdit(t)"><i class="fa-regular fa-pen-to-square"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="ed.open" class="ui-modal-backdrop" @mousedown.self="close">
      <form class="ui-modal" style="max-width: 820px" role="dialog" aria-modal="true" aria-labelledby="bt-ed-title" @submit.prevent="save">
        <div class="ui-modal__head">
          <h2 id="bt-ed-title">{{ ed.isNew ? 'New business type' : `Edit ${ed.form.name}` }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="ed.error" class="ui-alert ui-alert--danger" style="margin-bottom: 14px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ ed.error }}</span></div>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="bt-name">Name *</label>
              <input id="bt-name" v-model.trim="ed.form.name" class="ui-input" maxlength="120" />
            </div>
            <div class="ui-field">
              <label for="bt-key">Key</label>
              <input id="bt-key" v-model.trim="ed.form.key" class="ui-input" :disabled="!ed.isNew" placeholder="e.g. florist" />
            </div>
            <div class="ui-field">
              <label for="bt-icon">Icon (Font Awesome class)</label>
              <div class="ui-input-group"><i :class="ed.form.icon || 'fa-solid fa-building'"></i><input id="bt-icon" v-model.trim="ed.form.icon" class="ui-input" /></div>
            </div>
            <div class="ui-field">
              <label for="bt-ind">Plan industry bundle</label>
              <input id="bt-ind" v-model.trim="ed.form.plan_industry" class="ui-input" placeholder="automotive, beauty, …" />
            </div>
            <div class="ui-field span-2">
              <label for="bt-desc">Description</label>
              <input id="bt-desc" v-model.trim="ed.form.description" class="ui-input" />
            </div>
          </div>

          <div class="section-label">Modules shown</div>
          <label class="ui-switch"><input v-model="ed.allModules" type="checkbox" /> Every module in the organisation's plan</label>
          <div v-if="!ed.allModules" class="mods">
            <label v-for="m in moduleKeys" :key="m" class="mod"><input v-model="ed.modules" type="checkbox" :value="m" /> {{ moduleLabel(m) }}</label>
          </div>

          <div class="section-label">Words</div>
          <div class="terms">
            <div v-for="k in termKeys" :key="k" class="ui-field">
              <label :for="'bt-t-' + k">{{ defaults[k] }}</label>
              <input :id="'bt-t-' + k" v-model.trim="ed.terms[k]" class="ui-input" :placeholder="defaults[k]" />
            </div>
          </div>

          <div class="section-label">Booking defaults &amp; dashboard</div>
          <div class="ui-grid-2">
            <label class="ui-switch"><input v-model="ed.vehicleRequired" type="checkbox" /> Vehicle required on {{ (ed.terms.bookings || 'bookings').toLowerCase() }}</label>
            <div class="ui-field">
              <label for="bt-res">Resource label</label>
              <input id="bt-res" v-model.trim="ed.resourceLabel" class="ui-input" placeholder="Bay, Chair / station, Room…" />
            </div>
            <div class="ui-field">
              <label for="bt-widgets">Dashboard widgets (comma separated)</label>
              <input id="bt-widgets" v-model="ed.widgets" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="bt-hidden">Hidden menu paths</label>
              <input id="bt-hidden" v-model="ed.hidden" class="ui-input" placeholder="/crm" />
            </div>
            <div class="ui-field">
              <label for="bt-features">Features</label>
              <input id="bt-features" v-model="ed.features" class="ui-input" placeholder="vehicles, stations" />
            </div>
            <label class="ui-switch"><input v-model="ed.form.active" type="checkbox" :disabled="ed.form.key === 'general'" /> Offered to organisations</label>
          </div>

          <div class="section-label">Role templates, checklist &amp; sample services (JSON)</div>
          <p class="ui-hint">Each role: key, name, base (admin, manager, staff, read_only), scope (all, own) and permissions (module → view, create, edit, delete, approve; "*" = every module). An "owner" role with admin base is required.</p>
          <textarea v-model="ed.json" class="ui-textarea mono" rows="12" spellcheck="false" aria-label="Role templates, checklist and sample services as JSON"></textarea>
        </div>
        <div class="ui-modal__foot">
          <button v-if="!ed.isNew && builtIn.includes(ed.form.key)" type="button" class="ui-btn ui-btn--ghost foot-left" :disabled="ed.saving" @click="resetType">Reset to default</button>
          <button type="button" class="ui-btn" @click="close">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="ed.saving"><i :class="ed.saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ ed.isNew ? 'Create' : 'Save' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { industryAPI, moduleLabel } from '@/services/industry'
import { apiErrorMessage } from '@/services/api'
import { DEFAULT_TERMS } from '@/composables/useAccess'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const BUILT_IN = ['mechanic', 'salon', 'spa', 'clinic', 'ndis', 'consulting', 'agency', 'retail', 'restaurant', 'events', 'construction', 'manufacturer', 'education', 'nonprofit', 'general']
const MODULES = ['smallbiz', 'invoicing', 'pos', 'ecommerce', 'crm', 'bookings', 'events', 'inventory', 'manufacturing', 'accounting', 'hr', 'projects', 'documents', 'communication']
const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)

/** Platform admin: edit the business type registry (pkg/industry). */
export default {
  name: 'BusinessTypesAdmin',
  data() {
    return {
      types: [],
      loading: true,
      error: '',
      moduleKeys: MODULES,
      defaults: { ...DEFAULT_TERMS, operations: 'Menu group (Bookings & Services)' },
      termKeys: [...Object.keys(DEFAULT_TERMS), 'operations'],
      builtIn: BUILT_IN,
      ed: { open: false }
    }
  },
  created() {
    this.load()
  },
  methods: {
    moduleLabel,
    wordsOf(t) {
      return Object.entries(t.terms || {})
        .filter(([k, v]) => DEFAULT_TERMS[k] && v !== DEFAULT_TERMS[k] && ['customers', 'bookings', 'services', 'staff', 'inventory'].includes(k))
        .map(([, v]) => v)
        .join(' · ')
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.types = (await industryAPI.types(true)).types || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load business types')
      } finally {
        this.loading = false
      }
    },
    openEdit(t) {
      const x = t || { key: '', name: '', icon: 'fa-solid fa-building', description: '', plan_industry: 'general', modules: ['invoicing', 'crm'], terms: {}, roles: [], checklist: [], sample_services: [], booking_defaults: {}, dashboard_widgets: [], hidden_paths: [], features: [], active: true }
      const terms = {}
      for (const k of this.termKeys) terms[k] = x.terms?.[k] && x.terms[k] !== DEFAULT_TERMS[k] ? x.terms[k] : ''
      this.ed = {
        open: true,
        isNew: !t,
        form: { key: x.key, name: x.name, icon: x.icon, description: x.description, plan_industry: x.plan_industry, active: x.active !== false, sort_order: x.sort_order || 0 },
        allModules: (x.modules || []).includes('*'),
        modules: (x.modules || []).filter((m) => m !== '*'),
        terms,
        vehicleRequired: !!x.booking_defaults?.vehicle_required,
        resourceLabel: x.booking_defaults?.resource_label || '',
        widgets: (x.dashboard_widgets || []).join(', '),
        hidden: (x.hidden_paths || []).join(', '),
        features: (x.features || []).join(', '),
        json: JSON.stringify({ roles: x.roles || [], checklist: x.checklist || [], sample_services: x.sample_services || [] }, null, 2),
        base: x,
        saving: false,
        error: ''
      }
    },
    close() {
      if (!this.ed.saving) this.ed.open = false
    },
    body() {
      let extra
      try {
        extra = JSON.parse(this.ed.json || '{}')
      } catch (e) {
        throw new Error('The JSON is not valid: ' + e.message)
      }
      const terms = {}
      for (const [k, v] of Object.entries(this.ed.terms)) if (v) terms[k] = v
      return {
        ...this.ed.form,
        modules: this.ed.allModules ? ['*'] : this.ed.modules,
        terms,
        roles: extra.roles || [],
        checklist: extra.checklist || [],
        sample_services: extra.sample_services || [],
        booking_defaults: { ...(this.ed.base.booking_defaults || {}), vehicle_required: this.ed.vehicleRequired, resource_label: this.ed.resourceLabel },
        dashboard_widgets: list(this.ed.widgets),
        hidden_paths: list(this.ed.hidden),
        features: list(this.ed.features)
      }
    },
    async save() {
      this.ed.error = ''
      let b
      try {
        b = this.body()
      } catch (e) {
        this.ed.error = e.message
        return
      }
      if (!b.name) {
        this.ed.error = 'Name is required'
        return
      }
      this.ed.saving = true
      try {
        if (this.ed.isNew) await industryAPI.createType(b)
        else await industryAPI.updateType(b.key, b)
        toast.success(this.ed.isNew ? `${b.name} created` : `${b.name} saved`)
        this.ed.open = false
        this.load()
      } catch (e) {
        this.ed.error = apiErrorMessage(e, 'Could not save')
      } finally {
        this.ed.saving = false
      }
    },
    async resetType() {
      const ok = await confirmDialog({ title: `Reset ${this.ed.form.name}?`, message: 'Your edits to this business type are replaced by the built-in defaults. Organisations keep their own roles.', confirmText: 'Reset', danger: true })
      if (!ok) return
      this.ed.saving = true
      try {
        await industryAPI.resetType(this.ed.form.key)
        toast.success('Reset to default')
        this.ed.open = false
        this.load()
      } catch (e) {
        this.ed.error = apiErrorMessage(e, 'Could not reset')
      } finally {
        this.ed.saving = false
      }
    }
  }
}
</script>

<style scoped>
.tname {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ticon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 12.5px;
}

.actions-col {
  width: 60px;
  text-align: right;
}

.section-label {
  margin: 18px 0 8px;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text-2);
}

.span-2 {
  grid-column: 1 / -1;
}

.mods {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 6px;
  margin-top: 10px;
}

.mod {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.terms {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.foot-left {
  margin-right: auto;
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
}

@media (max-width: 900px) {
  .hide-md {
    display: none;
  }
}
</style>
