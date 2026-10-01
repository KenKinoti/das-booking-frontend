<template>
  <div class="sw" data-testid="setup-wizard">
    <header class="sw__top">
      <div class="sw__brand">
        <BrandMark :size="30" />
        <span>
          <strong>Set up {{ orgName }}</strong>
          <small>Step {{ index + 1 }} of {{ steps.length }} · {{ current.label }}</small>
        </span>
      </div>
      <div class="sw__top-actions">
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
          <i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
        </button>
        <button v-if="canLeave" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="busy" @click="finishLater">Finish later</button>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="signOut"><i class="fa-solid fa-arrow-right-from-bracket"></i><span class="sw__hide-xs"> Sign out</span></button>
      </div>
    </header>

    <div class="sw__progress" aria-hidden="true"><span :style="{ width: ((index + 1) / steps.length) * 100 + '%' }"></span></div>

    <div class="sw__layout">
      <nav class="sw__steps" aria-label="Setup steps">
        <ol>
          <li v-for="(s, i) in steps" :key="s.id" :class="{ 'is-current': i === index, 'is-done': i < index }">
            <span class="sw__step-dot"><i v-if="i < index" class="fa-solid fa-check"></i><template v-else>{{ i + 1 }}</template></span>
            <span>{{ s.label }}</span>
          </li>
        </ol>
      </nav>

      <main class="sw__main">
        <div v-if="loading" class="ui-card sw__card">
          <div class="ui-card__body">
            <div class="ui-skeleton" style="height: 28px; width: 50%; margin-bottom: 14px"></div>
            <div class="ui-skeleton" style="height: 120px"></div>
          </div>
        </div>

        <section v-else class="ui-card sw__card" :aria-labelledby="'sw-h-' + current.id">
          <!-- 1. Business type -->
          <template v-if="current.id === 'type'">
            <div class="sw__head">
              <h1 :id="'sw-h-' + current.id">What kind of business is {{ orgName }}?</h1>
              <p>DASYIN shows only what fits — the right modules, the words you use and ready-made staff roles. You can change it later in Settings.</p>
            </div>
            <div class="sw__types" role="radiogroup" aria-label="Business type">
              <button
                v-for="t in types"
                :key="t.key"
                type="button"
                role="radio"
                class="sw__type"
                :class="{ 'is-on': selected === t.key }"
                :aria-checked="selected === t.key"
                :data-type="t.key"
                @click="selected = t.key"
              >
                <span class="sw__type-icon"><i :class="t.icon"></i></span>
                <span class="sw__type-text">
                  <strong>{{ t.name }}</strong>
                  <small>{{ t.description }}</small>
                </span>
              </button>
            </div>
            <div v-if="preview" class="sw__preview" data-testid="type-preview">
              <div>
                <h3><i class="fa-solid fa-cubes"></i> You'll see</h3>
                <div class="chips">
                  <span v-for="m in preview.shown" :key="m" class="chip">{{ labelFor(m, preview.terms) }}</span>
                </div>
                <p v-if="preview.hidden.length" class="ui-hint">Hidden: {{ preview.hidden.map((m) => labelFor(m, preview.terms)).join(', ') }} — an admin can switch them back on.</p>
              </div>
              <div v-if="preview.words.length">
                <h3><i class="fa-solid fa-language"></i> Your words</h3>
                <ul class="words">
                  <li v-for="w in preview.words" :key="w.key"><span>{{ w.from }}</span><i class="fa-solid fa-arrow-right"></i><strong>{{ w.to }}</strong></li>
                </ul>
              </div>
              <div>
                <h3><i class="fa-solid fa-user-shield"></i> Staff roles</h3>
                <div class="chips">
                  <span v-for="r in preview.roles" :key="r.key" class="chip chip--soft" :title="r.description">{{ r.name }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- 2. Region -->
          <template v-else-if="current.id === 'region'">
            <div class="sw__head">
              <h1 :id="'sw-h-' + current.id">Where is the business based?</h1>
              <p>Sets your currency for invoices, sales and {{ termLower('bookings') }}, and the time zone for your calendar.</p>
            </div>
            <div class="ui-grid-2 sw__form">
              <div class="ui-field">
                <label for="sw-country">Country <span class="req">*</span></label>
                <CountryPicker id="sw-country" v-model="region.country_code" :clearable="false" :invalid="!!errors.country" placeholder="Choose a country" @change="onCountry" />
                <span v-if="errors.country" class="field-error">{{ errors.country }}</span>
              </div>
              <div class="ui-field">
                <label for="sw-currency">Currency</label>
                <select id="sw-currency" v-model="region.currency" class="ui-select">
                  <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                    <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                  </optgroup>
                </select>
              </div>
              <div class="ui-field">
                <label for="sw-tz">Time zone</label>
                <select id="sw-tz" v-model="region.timezone" class="ui-select">
                  <option value="">Country default</option>
                  <option v-for="z in timezones" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option>
                </select>
              </div>
            </div>
          </template>

          <!-- 3. Business details -->
          <template v-else-if="current.id === 'details'">
            <div class="sw__head">
              <h1 :id="'sw-h-' + current.id">Your business details</h1>
              <p>They appear on invoices, receipts, emails and your customer pages.</p>
            </div>
            <div class="ui-grid-2 sw__form">
              <div class="ui-field">
                <label for="sw-name">Business name <span class="req">*</span></label>
                <input id="sw-name" v-model.trim="details.name" class="ui-input" :class="{ 'is-invalid': errors.name }" maxlength="255" autocomplete="organization" />
                <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
              </div>
              <div class="ui-field">
                <label for="sw-phone">Phone</label>
                <input id="sw-phone" v-model.trim="details.phone" class="ui-input" type="tel" maxlength="20" />
              </div>
              <div class="ui-field">
                <label for="sw-email">Email</label>
                <input id="sw-email" v-model.trim="details.email" class="ui-input" type="email" :class="{ 'is-invalid': errors.email }" />
                <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
              </div>
              <div class="ui-field">
                <label for="sw-web">Website</label>
                <input id="sw-web" v-model.trim="details.website" class="ui-input" placeholder="https://" />
              </div>
              <div class="ui-field sw__span">
                <label for="sw-street">Street address</label>
                <input id="sw-street" v-model.trim="details.address.street" class="ui-input" autocomplete="street-address" />
              </div>
              <div class="ui-field">
                <label for="sw-suburb">Town / city</label>
                <input id="sw-suburb" v-model.trim="details.address.suburb" class="ui-input" />
              </div>
              <div class="ui-field">
                <label for="sw-state">State / county</label>
                <input id="sw-state" v-model.trim="details.address.state" class="ui-input" maxlength="50" />
              </div>
            </div>
            <div class="sw__logo">
              <div class="section-label">Logo</div>
              <OrgLogoUploader compact />
            </div>
          </template>

          <!-- 4. Team -->
          <template v-else-if="current.id === 'team'">
            <div class="sw__head">
              <h1 :id="'sw-h-' + current.id">Invite your {{ termLower('staff') }}</h1>
              <p>Give each person a role — it decides what they see and can change. You can add more people later from {{ term('staff') }}.</p>
            </div>
            <template v-if="!invited.length">
              <div v-for="(r, i) in team" :key="r.key" class="sw__invite">
                <div class="ui-field">
                  <label :for="'sw-tf-' + i">First name</label>
                  <input :id="'sw-tf-' + i" v-model.trim="r.first_name" class="ui-input" autocomplete="off" />
                </div>
                <div class="ui-field">
                  <label :for="'sw-tl-' + i">Last name</label>
                  <input :id="'sw-tl-' + i" v-model.trim="r.last_name" class="ui-input" autocomplete="off" />
                </div>
                <div class="ui-field">
                  <label :for="'sw-te-' + i">Email</label>
                  <input :id="'sw-te-' + i" v-model.trim="r.email" class="ui-input" type="email" :class="{ 'is-invalid': r.error }" autocomplete="off" />
                </div>
                <div class="ui-field">
                  <label :for="'sw-tr-' + i">Role</label>
                  <select :id="'sw-tr-' + i" v-model="r.role_id" class="ui-select">
                    <option v-for="ro in roles" :key="ro.id" :value="ro.id">{{ ro.name }}</option>
                  </select>
                </div>
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon sw__invite-x" :aria-label="`Remove row ${i + 1}`" :disabled="team.length === 1 && !r.email" @click="removeRow(i)"><i class="fa-regular fa-trash-can"></i></button>
                <p v-if="r.error" class="field-error sw__invite-err">{{ r.error }}</p>
              </div>
              <button type="button" class="ui-btn ui-btn--sm" @click="addRow"><i class="fa-solid fa-plus"></i> Add another person</button>
              <p v-if="roleHint" class="ui-hint sw__role-hint"><i class="fa-solid fa-circle-info"></i> {{ roleHint }}</p>
            </template>
            <div v-else class="sw__invited" data-testid="invited">
              <div class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>Copy these temporary passwords now — they are shown only once. Ask each person to sign in at {{ origin }}/login.</span></div>
              <div class="ui-table-wrap">
                <table class="ui-table">
                  <thead>
                    <tr><th>Person</th><th>Role</th><th>Temporary password</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in invited" :key="p.email">
                      <td><strong>{{ p.name }}</strong><br /><small class="muted">{{ p.email }}</small></td>
                      <td>{{ p.role }}</td>
                      <td><code class="pw" data-testid="invite-password">{{ p.password }}</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <!-- 5. Services -->
          <template v-else-if="current.id === 'services'">
            <div class="sw__head">
              <h1 :id="'sw-h-' + current.id">Your {{ termLower('services') }}</h1>
              <p>We filled in common ones for a {{ typeName.toLowerCase() }}. Untick what you don't offer, adjust times and set your prices — you can change everything later.</p>
            </div>
            <div class="ui-alert sw__example"><i class="fa-solid fa-circle-info"></i><span>Prices are left at 0 — they are examples only. Enter your own in {{ currency }}.</span></div>
            <div class="ui-table-wrap">
              <table class="ui-table sw__svc">
                <thead>
                  <tr>
                    <th class="sw__svc-check"><span class="sr-only">Include</span></th>
                    <th>Name</th>
                    <th class="sw__hide-sm">Category</th>
                    <th class="num">Minutes</th>
                    <th class="num">Price ({{ currency }})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(s, i) in services" :key="i" :class="{ 'is-off': !s.on }">
                    <td class="sw__svc-check"><input v-model="s.on" type="checkbox" :aria-label="`Include ${s.name}`" /></td>
                    <td><input v-model.trim="s.name" class="ui-input ui-input--sm" :aria-label="`Name of service ${i + 1}`" /></td>
                    <td class="sw__hide-sm"><input v-model.trim="s.category" class="ui-input ui-input--sm" :aria-label="`Category of ${s.name}`" /></td>
                    <td class="num"><input v-model.number="s.duration" type="number" min="1" max="1440" class="ui-input ui-input--sm sw__num" :aria-label="`Minutes for ${s.name}`" /></td>
                    <td class="num"><input v-model.number="s.price" type="number" min="0" step="0.01" class="ui-input ui-input--sm sw__num" :aria-label="`Price of ${s.name}`" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" class="ui-btn ui-btn--sm sw__add-svc" @click="services.push({ name: '', category: services[0]?.category || 'General', duration: 60, price: 0, on: true })"><i class="fa-solid fa-plus"></i> Add a line</button>
          </template>

          <!-- 6. Done -->
          <template v-else>
            <div class="sw__head sw__head--done">
              <span class="sw__done-icon"><i class="fa-solid fa-circle-check"></i></span>
              <h1 :id="'sw-h-' + current.id">{{ orgName }} is ready</h1>
              <p>DASYIN is set up for a {{ typeName.toLowerCase() }}. Here's what most businesses like yours do next.</p>
            </div>
            <ul class="sw__checklist">
              <li v-for="c in checklist" :key="c.key">
                <button type="button" class="sw__check" :disabled="busy" @click="finishTo(c.to)">
                  <i class="fa-regular fa-circle"></i>
                  <span>{{ c.label }}</span>
                  <i v-if="c.to" class="fa-solid fa-arrow-right sw__check-go"></i>
                </button>
              </li>
            </ul>
          </template>

          <p v-if="error" class="ui-alert ui-alert--danger sw__error" role="alert"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></p>

          <footer class="sw__foot">
            <button v-if="index > 0 && current.id !== 'done'" type="button" class="ui-btn" :disabled="busy" @click="back"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <span class="sw__spacer"></span>
            <button v-if="skippable" type="button" class="ui-btn ui-btn--ghost" :disabled="busy" @click="skip">Skip this step</button>
            <button type="button" class="ui-btn ui-btn--primary" :disabled="busy || (current.id === 'type' && !selected)" data-testid="setup-next" @click="next">
              <i v-if="busy" class="fa-solid fa-circle-notch spin"></i>
              {{ nextLabel }}
              <i v-if="!busy && current.id !== 'done'" class="fa-solid fa-arrow-right"></i>
            </button>
          </footer>
        </section>
      </main>
    </div>
  </div>
</template>

<script>
import BrandMark from '@/components/layout/BrandMark.vue'
import CountryPicker from '@/components/customers/CountryPicker.vue'
import OrgLogoUploader from '@/components/branding/OrgLogoUploader.vue'
import api, { apiErrorMessage } from '@/services/api'
import { industryAPI, moduleLabel } from '@/services/industry'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { globalTheme } from '@/composables/useTheme'
import { access, loadAccess, term, termLower, homePath, DEFAULT_TERMS } from '@/composables/useAccess'
import { loadEntitlements } from '@/composables/useEntitlements'
import { saveOrgPrefs, loadOrgPrefs } from '@/composables/useOrgPrefs'
import { useBranding } from '@/composables/useBranding'
import { currencyGroups, currencyForCountry, CURRENCY_CODES } from '@/utils/currencies'

const STEP_LABELS = { type: 'Business type', region: 'Country & currency', details: 'Business details', team: 'Team', services: 'Services', done: 'Done' }
const blankRow = (roleId = '') => ({ key: Math.random().toString(36).slice(2), first_name: '', last_name: '', email: '', role_id: roleId, error: '' })

export default {
  name: 'SetupWizard',
  components: { BrandMark, CountryPicker, OrgLogoUploader },
  data() {
    return {
      loading: true,
      busy: false,
      error: '',
      errors: {},
      index: 0,
      types: [],
      selected: '',
      region: { country_code: '', currency: '', timezone: '' },
      details: { name: '', phone: '', email: '', website: '', address: { street: '', suburb: '', state: '', postcode: '', country: '' } },
      orgPayload: null,
      roles: [],
      team: [blankRow()],
      invited: [],
      services: [],
      servicesFor: '',
      currencyGroups: currencyGroups(),
      timezones: typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [],
      origin: window.location.origin,
      branding: useBranding().branding
    }
  },
  computed: {
    auth() {
      return useAuthStore()
    },
    isDark() {
      return globalTheme.isDark.value
    },
    orgName() {
      return this.details.name || this.branding.orgName || this.auth.user?.organization_name || 'your business'
    },
    chosenType() {
      return this.types.find((t) => t.key === this.selected) || null
    },
    typeName() {
      return this.chosenType?.name || 'business'
    },
    currency() {
      return this.region.currency || 'your currency'
    },
    planHasBookings() {
      return !access.planModules.length || access.planModules.includes('bookings')
    },
    steps() {
      const ids = ['type', 'region', 'details', 'team']
      const t = this.chosenType
      const typeHasBookings = t && (t.modules.includes('*') || t.modules.includes('bookings'))
      if (t && t.sample_services?.length && typeHasBookings && this.planHasBookings) ids.push('services')
      ids.push('done')
      return ids.map((id) => ({ id, label: id === 'services' ? term('services') : id === 'team' ? term('staff') : STEP_LABELS[id] }))
    },
    current() {
      return this.steps[Math.min(this.index, this.steps.length - 1)]
    },
    skippable() {
      return ['region', 'details', 'team', 'services'].includes(this.current.id) && !this.invited.length
    },
    nextLabel() {
      if (this.current.id === 'done') return 'Go to DASYIN'
      if (this.current.id === 'team') return this.invited.length ? 'Continue' : this.team.some((r) => r.email) ? 'Invite & continue' : 'Continue'
      if (this.current.id === 'services') return 'Add services & continue'
      return 'Continue'
    },
    canLeave() {
      // A new organisation chooses its business type first.
      return (access.confirmed || access.setupStatus !== 'pending') && this.current.id !== 'done'
    },
    preview() {
      const t = this.chosenType
      if (!t) return null
      const plan = access.planModules.length ? access.planModules : Object.keys(moduleLabelsAll())
      const all = t.modules.includes('*')
      const shown = plan.filter((m) => all || t.modules.includes(m))
      const hidden = all ? [] : plan.filter((m) => !t.modules.includes(m))
      const terms = { ...DEFAULT_TERMS, ...(t.terms || {}) }
      const words = ['customers', 'bookings', 'services', 'staff', 'inventory', 'projects']
        .filter((k) => terms[k] !== DEFAULT_TERMS[k])
        .map((k) => ({ key: k, from: DEFAULT_TERMS[k], to: terms[k] }))
      return { shown, hidden, words, terms, roles: t.roles || [] }
    },
    checklist() {
      const items = this.chosenType?.checklist || access.type?.checklist || []
      return items.filter((c) => c.key !== 'type')
    },
    roleHint() {
      const r = this.roles.find((x) => this.team.some((row) => row.role_id === x.id && x.scope === 'own'))
      return r ? `${r.name}s only see the ${termLower('bookings')} assigned to them.` : ''
    }
  },
  async created() {
    await this.init()
  },
  methods: {
    term,
    termLower,
    labelFor(m, terms) {
      if (m === 'bookings') return `${terms.bookings} & ${terms.services}`
      if (m === 'crm') return terms.customers
      if (m === 'inventory') return terms.inventory
      if (m === 'projects') return terms.projects
      if (m === 'events') return terms.events
      return moduleLabel(m)
    },
    toggleTheme() {
      globalTheme.toggleTheme()
    },
    async init() {
      this.loading = true
      try {
        await loadAccess(true)
        const [types, prefs] = await Promise.all([industryAPI.types(), loadOrgPrefs({ force: true })])
        this.types = types.types || []
        this.selected = access.confirmed || access.setupStatus === 'pending' ? access.type?.key || '' : ''
        if (this.selected === 'general' && !access.confirmed) this.selected = ''
        this.region = {
          country_code: prefs.source === 'default' ? '' : prefs.countryCode || '',
          currency: prefs.currency || 'USD',
          timezone: ''
        }
        // Resume where the admin left off
        const step = access.setupStep
        const i = this.steps.findIndex((s) => s.id === step)
        if (access.setupStatus === 'pending' && i > 0) this.index = i
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the setup')
      } finally {
        this.loading = false
      }
      this.onEnter()
    },
    async onEnter() {
      this.error = ''
      this.errors = {}
      const id = this.current.id
      try {
        if (id === 'details' && !this.orgPayload) {
          const { data } = await api.get('/account/organization')
          this.orgPayload = data.data
          const o = data.data?.organization || {}
          this.details = { name: o.name || '', phone: o.phone || '', email: o.email || '', website: o.website || '', address: { street: '', suburb: '', state: '', postcode: '', country: '', ...(o.address || {}) } }
        }
        if (id === 'team' && !this.roles.length) {
          const r = await industryAPI.roles()
          this.roles = (r.roles || []).filter((x) => x.key !== 'owner')
          const def = this.roles.find((x) => x.legacy === 'staff') || this.roles[0]
          this.team.forEach((row) => {
            if (!row.role_id && def) row.role_id = def.id
          })
        }
        if (id === 'services' && this.servicesFor !== this.selected) {
          this.services = (this.chosenType?.sample_services || []).map((s) => ({ name: s.name, category: s.category, duration: s.duration, price: s.price || 0, on: true }))
          this.servicesFor = this.selected
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load this step')
      }
    },
    async progress(step) {
      if (access.setupStatus === 'pending') {
        try {
          await industryAPI.setSetup('pending', step)
        } catch {
          /* progress is a convenience */
        }
      }
    },
    async go(delta) {
      this.index = Math.max(0, Math.min(this.steps.length - 1, this.index + delta))
      await this.progress(this.current.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      this.onEnter()
    },
    back() {
      this.go(-1)
    },
    async skip() {
      if (this.current.id === 'team') this.team = [blankRow(this.team[0]?.role_id)]
      await this.go(1)
    },
    async next() {
      this.error = ''
      this.busy = true
      try {
        const ok = await this.save(this.current.id)
        if (ok === 'stay') return
        if (this.current.id === 'done') return
        await this.go(1)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save')
      } finally {
        this.busy = false
      }
    },
    async save(id) {
      if (id === 'type') {
        if (!this.selected) return 'stay'
        if (this.selected !== access.type?.key || !access.confirmed) {
          await industryAPI.setType(this.selected)
          this.roles = []
        }
        await Promise.all([loadAccess(true), loadEntitlements(true)])
        return true
      }
      if (id === 'region') {
        if (!this.region.country_code) {
          this.errors = { country: 'Choose the country the business is in' }
          return 'stay'
        }
        const body = { country_code: this.region.country_code, currency: this.region.currency }
        if (this.region.timezone) body.timezone = this.region.timezone
        await saveOrgPrefs(body)
        return true
      }
      if (id === 'details') {
        const e = {}
        if (!this.details.name) e.name = 'Business name is required'
        if (this.details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.details.email)) e.email = 'Enter a valid email address'
        this.errors = e
        if (Object.keys(e).length) return 'stay'
        const p = this.orgPayload || {}
        const s = p.settings || {}
        await api.put('/account/organization', {
          ...p.organization,
          name: this.details.name,
          phone: this.details.phone,
          email: this.details.email,
          website: this.details.website,
          address: this.details.address,
          country_code: this.region.country_code || p.organization?.country_code || '',
          settings: {
            timezone: this.region.timezone || s.timezone || '',
            date_format: s.date_format || 'DD/MM/YYYY',
            time_format: s.time_format || '24h',
            currency: this.region.currency || s.currency || '',
            language: s.language || 'en-AU',
            enable_email_notifications: s.enable_email_notifications !== false,
            enable_sms_notifications: !!s.enable_sms_notifications
          }
        })
        this.orgPayload = null
        return true
      }
      if (id === 'team') {
        if (this.invited.length) return true
        const rows = this.team.filter((r) => r.email || r.first_name)
        let failed = false
        for (const r of rows) {
          r.error = ''
          if (!r.first_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
            r.error = 'Enter a first name and a valid email'
            failed = true
          }
        }
        if (failed) return 'stay'
        const done = []
        for (const r of rows) {
          try {
            const res = await api.post('/users', { first_name: r.first_name, last_name: r.last_name, email: r.email, role_template: r.role_id })
            const role = this.roles.find((x) => x.id === r.role_id)
            done.push({ email: r.email, name: `${r.first_name} ${r.last_name}`.trim(), role: role?.name || '', password: res.data?.temporary_password || '' })
            r.done = true
          } catch (e) {
            r.error = apiErrorMessage(e, 'Could not invite')
            failed = true
          }
        }
        this.team = this.team.filter((r) => !r.done)
        if (!this.team.length) this.team = [blankRow(this.roles.find((x) => x.legacy === 'staff')?.id)]
        if (done.length) {
          this.invited = done
          toast.success(`${done.length} ${done.length === 1 ? 'person' : 'people'} invited`)
          return 'stay'
        }
        return failed ? 'stay' : true
      }
      if (id === 'services') {
        const rows = this.services.filter((s) => s.on && s.name)
        const bad = rows.find((s) => !(s.duration > 0 && s.duration <= 1440) || s.price < 0)
        if (bad) {
          this.error = `Check “${bad.name}”: minutes must be 1–1440 and the price zero or more.`
          return 'stay'
        }
        const vehicle = !!this.chosenType?.booking_defaults?.vehicle_required
        let added = 0
        for (const s of rows) {
          try {
            await api.post('/services', { name: s.name, category: s.category || 'General', duration: Number(s.duration), price: Number(s.price) || 0, currency: CURRENCY_CODES.includes(this.region.currency) ? this.region.currency : undefined, requires_vehicle: vehicle })
            added++
          } catch (e) {
            if (e?.response?.status !== 409) throw e
          }
        }
        if (added) toast.success(`${added} ${added === 1 ? termLower('service') : termLower('services')} added`)
        return true
      }
      if (id === 'done') {
        await this.complete()
        return true
      }
      return true
    },
    async complete(to) {
      await industryAPI.setSetup('done', '')
      await Promise.all([loadAccess(true), loadEntitlements(true)])
      this.$router.replace(to || homePath())
    },
    async finishTo(to) {
      this.busy = true
      try {
        await this.complete(to)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not finish the setup')
      } finally {
        this.busy = false
      }
    },
    async finishLater() {
      if (!access.confirmed && access.setupStatus !== 'pending') {
        this.$router.replace(homePath())
        return
      }
      this.busy = true
      try {
        await this.complete()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not leave the setup')
      } finally {
        this.busy = false
      }
    },
    addRow() {
      this.team.push(blankRow(this.roles.find((x) => x.legacy === 'staff')?.id || this.roles[0]?.id))
    },
    removeRow(i) {
      this.team.splice(i, 1)
      if (!this.team.length) this.addRow()
    },
    onCountry(code) {
      const c = currencyForCountry(code || this.region.country_code)
      if (c && CURRENCY_CODES.includes(c)) this.region.currency = c
    },
    async signOut() {
      await this.auth.logout()
      this.$router.replace('/login')
    }
  }
}

function moduleLabelsAll() {
  return { invoicing: 1, pos: 1, ecommerce: 1, crm: 1, bookings: 1, events: 1, inventory: 1, manufacturing: 1, accounting: 1, hr: 1, projects: 1, documents: 1, communication: 1 }
}
</script>

<style scoped>
.sw {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
}

.sw__top {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: calc(12px + env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 12px max(20px, env(safe-area-inset-left));
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.sw__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sw__brand span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sw__brand strong {
  font-size: 14.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sw__brand small {
  color: var(--text-3);
  font-size: 12px;
}

.sw__top-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.sw__progress {
  height: 3px;
  background: var(--border);
}

.sw__progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.25s ease;
}

.sw__layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 28px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}

.sw__steps ol {
  list-style: none;
  margin: 0;
  padding: 0;
  position: sticky;
  top: 90px;
}

.sw__steps li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius);
  color: var(--text-3);
  font-size: 13.5px;
  font-weight: 550;
}

.sw__steps li.is-current {
  background: var(--accent-soft);
  color: var(--accent);
}

.sw__steps li.is-done {
  color: var(--text-2);
}

.sw__step-dot {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  font-size: 11.5px;
  background: var(--surface);
}

.is-current .sw__step-dot {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.is-done .sw__step-dot {
  border-color: var(--success);
  background: var(--success-soft);
  color: var(--success);
}

.sw__card {
  padding: 26px 28px;
}

.sw__head h1 {
  margin: 0 0 6px;
  font-size: 22px;
  letter-spacing: -0.01em;
}

.sw__head p {
  margin: 0 0 20px;
  color: var(--text-2);
  max-width: 64ch;
}

.sw__head--done {
  text-align: center;
}

.sw__head--done p {
  margin-left: auto;
  margin-right: auto;
}

.sw__done-icon {
  display: inline-grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 10px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  font-size: 26px;
}

.sw__types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
}

.sw__type {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.sw__type:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}

.sw__type.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent) inset;
}

.sw__type-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 16px;
}

.sw__type.is-on .sw__type-icon {
  background: var(--accent);
  color: #fff;
}

.sw__type-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sw__type-text strong {
  font-size: 14px;
}

.sw__type-text small {
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.4;
}

.sw__preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 20px;
  padding: 16px 18px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
}

.sw__preview h3 {
  margin: 0 0 8px;
  font-size: 12.5px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.sw__preview h3 i {
  margin-right: 4px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 550;
}

.chip--soft {
  background: var(--surface-2);
  color: var(--text-2);
}

.words {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 5px;
  font-size: 13px;
}

.words li {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-3);
}

.words li i {
  font-size: 10px;
}

.words strong {
  color: var(--text);
}

.sw__form {
  gap: 14px 16px;
}

.sw__span {
  grid-column: 1 / -1;
}

.sw__logo {
  margin-top: 20px;
}

.section-label {
  margin-bottom: 8px;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text-2);
}

.req {
  color: var(--danger);
}

.field-error {
  color: var(--danger);
  font-size: 12.5px;
}

.sw__invite {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr 1.2fr auto;
  gap: 10px;
  align-items: end;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.sw__invite-err {
  grid-column: 1 / -1;
  margin: -4px 0 0;
}

.sw__role-hint {
  margin-top: 12px;
}

.sw__invited .ui-alert {
  margin-bottom: 14px;
}

.pw {
  font-size: 13px;
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--surface-2);
  user-select: all;
}

.muted {
  color: var(--text-3);
}

.sw__example {
  margin-bottom: 12px;
}

.sw__svc input[type='checkbox'] {
  width: 16px;
  height: 16px;
}

.sw__svc-check {
  width: 36px;
}

.sw__svc .ui-input--sm {
  height: 34px;
  padding: 0 9px;
}

.sw__num {
  width: 96px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sw__svc tr.is-off td:not(.sw__svc-check) {
  opacity: 0.45;
}

.sw__add-svc {
  margin-top: 10px;
}

.sw__checklist {
  list-style: none;
  max-width: 460px;
  margin: 0 auto;
  padding: 0;
  display: grid;
  gap: 8px;
}

.sw__check {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.sw__check:hover {
  border-color: var(--accent);
  background: var(--surface-hover);
}

.sw__check span {
  flex: 1;
}

.sw__check i {
  color: var(--text-3);
}

.sw__check-go {
  font-size: 12px;
}

.sw__error {
  margin-top: 16px;
}

.sw__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.sw__spacer {
  flex: 1;
}

.spin {
  animation: sw-spin 0.8s linear infinite;
}

@keyframes sw-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .sw__layout {
    grid-template-columns: minmax(0, 1fr);
    padding: 18px 16px 40px;
  }

  .sw__steps {
    display: none;
  }

  .sw__preview {
    grid-template-columns: minmax(0, 1fr);
  }

  .sw__invite {
    grid-template-columns: 1fr 1fr;
  }

  .sw__invite-x {
    justify-self: end;
  }
}

@media (max-width: 640px) {
  .sw__card {
    padding: 18px 16px;
  }

  .sw__head h1 {
    font-size: 19px;
  }

  .sw__types {
    grid-template-columns: minmax(0, 1fr);
  }

  .sw__hide-sm,
  .sw__hide-xs {
    display: none;
  }

  .sw__form {
    grid-template-columns: minmax(0, 1fr);
  }

  .sw__invite {
    grid-template-columns: minmax(0, 1fr);
  }

  .sw__num {
    width: 72px;
  }

  .sw__foot {
    flex-wrap: wrap;
  }

  .sw__foot .ui-btn--primary {
    flex: 1;
    justify-content: center;
  }
}
</style>
