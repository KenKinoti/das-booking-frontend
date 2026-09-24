<template>
  <div class="mp ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Workspace</div>
        <h1>Settings</h1>
        <p>Business details, regional formats and notifications for {{ org.name || 'your organisation' }}.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="!dirty || saving" @click="reset"><i class="fa-solid fa-rotate-left"></i> Discard</button>
        <button class="ui-btn ui-btn--primary" :disabled="!dirty || saving || !canEdit" @click="save"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save changes</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="loaded && !canEdit" class="ui-alert ui-alert--warning" style="margin-bottom: 16px"><i class="fa-solid fa-lock"></i><span>Only admins and managers can change these settings. You can view them.</span></div>

    <div class="layout">
      <nav class="side" aria-label="Settings sections">
        <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" :class="{ 'is-active': active === s.id }" @click.prevent="scrollTo(s.id)"><i :class="s.icon"></i> {{ s.label }}</a>
      </nav>

      <div class="stack">
        <fieldset :disabled="!canEdit || !loaded" class="plain">
          <section id="business" class="ui-card">
            <div class="ui-card__head">
              <div>
                <h2>Business details</h2>
                <p class="sub">Shown on invoices, quotes, receipts and booking pages.</p>
              </div>
            </div>
            <div class="ui-card__body">
              <div v-if="!loaded" class="sk"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 38px"></div></div>
              <div v-else class="form-grid">
                <label class="ui-field">
                  <span class="ui-label">Business name *</span>
                  <input id="st_name" v-model.trim="org.name" class="ui-input" :class="{ 'is-invalid': errors.name }" maxlength="255" />
                  <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
                </label>
                <label class="ui-field">
                  <span class="ui-label">Business number (ABN / registration)</span>
                  <input v-model.trim="org.abn" class="ui-input" maxlength="14" placeholder="e.g. 12 345 678 901" />
                </label>
                <label class="ui-field">
                  <span class="ui-label">Email</span>
                  <input v-model.trim="org.email" type="email" class="ui-input" :class="{ 'is-invalid': errors.email }" placeholder="hello@yourbusiness.com" />
                  <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
                </label>
                <label class="ui-field">
                  <span class="ui-label">Phone</span>
                  <input v-model.trim="org.phone" type="tel" class="ui-input" maxlength="20" />
                </label>
                <label class="ui-field span-2">
                  <span class="ui-label">Website</span>
                  <input v-model.trim="org.website" class="ui-input" :class="{ 'is-invalid': errors.website }" placeholder="https://yourbusiness.com" />
                  <span v-if="errors.website" class="field-error">{{ errors.website }}</span>
                </label>
                <label class="ui-field span-2">
                  <span class="ui-label">Street address</span>
                  <input v-model.trim="org.address.street" class="ui-input" autocomplete="street-address" />
                </label>
                <div class="span-2 addr">
                  <label class="ui-field"><span class="ui-label">Suburb / city</span><input v-model.trim="org.address.suburb" class="ui-input" /></label>
                  <label class="ui-field"><span class="ui-label">State / region</span><input v-model.trim="org.address.state" class="ui-input" /></label>
                  <label class="ui-field"><span class="ui-label">Postcode</span><input v-model.trim="org.address.postcode" class="ui-input" maxlength="10" /></label>
                  <label class="ui-field"><span class="ui-label">Country</span><input v-model.trim="org.address.country" class="ui-input" /></label>
                </div>
                <label class="ui-field span-2">
                  <span class="ui-label">About the business</span>
                  <textarea v-model="org.description" rows="3" class="ui-textarea" maxlength="2000" placeholder="A short description (optional)"></textarea>
                </label>
              </div>
            </div>
          </section>

          <section id="regional" class="ui-card">
            <div class="ui-card__head">
              <div>
                <h2>Regional &amp; formats</h2>
                <p class="sub">Default currency and how dates and times are shown.</p>
              </div>
            </div>
            <div class="ui-card__body">
              <div v-if="!loaded" class="sk"><div v-for="n in 2" :key="n" class="ui-skeleton" style="height: 38px"></div></div>
              <div v-else class="form-grid">
                <label class="ui-field">
                  <span class="ui-label">Time zone</span>
                  <select id="st_tz" v-model="settings.timezone" class="ui-select">
                    <option v-for="z in timezones" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option>
                  </select>
                  <span class="ui-hint">Now: {{ nowInZone }}</span>
                </label>
                <label class="ui-field">
                  <span class="ui-label">Default currency</span>
                  <select v-model="settings.currency" class="ui-select">
                    <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                      <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                    </optgroup>
                  </select>
                  <span class="ui-hint">Invoices and pay runs can still use other currencies.</span>
                </label>
                <label class="ui-field">
                  <span class="ui-label">Date format</span>
                  <select v-model="settings.date_format" class="ui-select">
                    <option v-for="f in dateFormats" :key="f.value" :value="f.value">{{ f.value }} ({{ f.example }})</option>
                  </select>
                </label>
                <label class="ui-field">
                  <span class="ui-label">Time format</span>
                  <select v-model="settings.time_format" class="ui-select">
                    <option value="24h">24-hour (14:30)</option>
                    <option value="12h">12-hour (2:30 PM)</option>
                  </select>
                </label>
                <label class="ui-field">
                  <span class="ui-label">Language</span>
                  <select v-model="settings.language" class="ui-select">
                    <option value="en-AU">English (Australia)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-KE">English (Kenya)</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section id="notifications" class="ui-card">
            <div class="ui-card__head">
              <div>
                <h2>Notifications</h2>
                <p class="sub">Which channels the platform may use to notify customers and staff.</p>
              </div>
            </div>
            <div class="ui-card__body toggles">
              <label class="toggle">
                <span><strong>Email notifications</strong><small>Invoices, booking confirmations, meeting invites and reminders.</small></span>
                <span class="ui-switch"><input v-model="settings.enable_email_notifications" type="checkbox" aria-label="Email notifications" /></span>
              </label>
              <label class="toggle">
                <span><strong>SMS notifications</strong><small>Booking reminders by text message, when an SMS provider is connected in messaging settings.</small></span>
                <span class="ui-switch"><input v-model="settings.enable_sms_notifications" type="checkbox" aria-label="SMS notifications" /></span>
              </label>
            </div>
          </section>
        </fieldset>

        <section id="more" class="ui-card">
          <div class="ui-card__head">
            <div>
              <h2>More settings</h2>
              <p class="sub">Module settings live next to the module they configure.</p>
            </div>
          </div>
          <div class="links">
            <router-link v-for="l in links" :key="l.to" :to="l.to" class="link">
              <span class="link__icon"><i :class="l.icon"></i></span>
              <span><strong>{{ l.label }}</strong><small>{{ l.hint }}</small></span>
              <i class="fa-solid fa-chevron-right muted"></i>
            </router-link>
          </div>
        </section>

        <AboutCard compact />
      </div>
    </div>

    <transition name="bar">
      <div v-if="dirty && canEdit" class="savebar" role="status">
        <span><i class="fa-solid fa-circle-info"></i> You have unsaved changes</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="saving" @click="reset">Discard</button>
          <button class="ui-btn ui-btn--sm ui-btn--primary" :disabled="saving" @click="save"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save changes</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import AboutCard from '@/components/layout/AboutCard.vue'
import api, { apiErrorMessage } from '@/services/api'
import { currencyGroups } from '@/utils/currencies'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const FALLBACK_TZ = ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Pacific/Auckland', 'Asia/Singapore', 'Asia/Dubai', 'Africa/Nairobi', 'Africa/Lagos', 'Africa/Johannesburg', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC']

function blankOrg() {
  return { name: '', abn: '', phone: '', email: '', website: '', description: '', address: { street: '', suburb: '', state: '', postcode: '', country: '' } }
}

export default {
  name: 'Settings',
  components: { AboutCard },
  data() {
    return {
      org: blankOrg(),
      settings: { timezone: 'Australia/Sydney', currency: 'AUD', date_format: 'DD/MM/YYYY', time_format: '24h', language: 'en-AU', enable_email_notifications: true, enable_sms_notifications: false },
      original: '',
      canEdit: true,
      loaded: false,
      loadError: '',
      saving: false,
      errors: {},
      active: 'business',
      observer: null,
      currencyGroups: currencyGroups(),
      sections: [
        { id: 'business', label: 'Business details', icon: 'fa-regular fa-building' },
        { id: 'regional', label: 'Regional & formats', icon: 'fa-solid fa-globe' },
        { id: 'notifications', label: 'Notifications', icon: 'fa-regular fa-bell' },
        { id: 'more', label: 'More settings', icon: 'fa-solid fa-grip' },
        { id: 'about', label: 'About', icon: 'fa-solid fa-circle-info' }
      ],
      links: [
        { to: '/profile', label: 'My profile & password', hint: 'Your name, phone and sign-in password', icon: 'fa-regular fa-user' },
        { to: '/invoices/settings', label: 'Invoice settings', hint: 'Branding, numbering, tax and payment details', icon: 'fa-solid fa-file-invoice' },
        { to: '/plan', label: 'Plan & billing', hint: 'Your subscription and included modules', icon: 'fa-solid fa-credit-card' },
        { to: '/messaging-settings', label: 'Messaging', hint: 'Chat preferences and connected channels', icon: 'fa-regular fa-comments' },
        { to: '/staff', label: 'Staff', hint: 'Team members who can sign in', icon: 'fa-solid fa-user-group' },
        { to: '/ecommerce', label: 'Online store', hint: 'Shopify and WooCommerce connections', icon: 'fa-solid fa-store' }
      ]
    }
  },
  computed: {
    snapshot() {
      return JSON.stringify({ org: this.org, settings: this.settings })
    },
    dirty() {
      return this.loaded && this.original !== this.snapshot
    },
    timezones() {
      let list = FALLBACK_TZ
      try {
        if (typeof Intl.supportedValuesOf === 'function') list = Intl.supportedValuesOf('timeZone')
      } catch {
        /* older browsers */
      }
      return list.includes(this.settings.timezone) ? list : [this.settings.timezone, ...list]
    },
    nowInZone() {
      try {
        return new Intl.DateTimeFormat(undefined, { timeZone: this.settings.timezone, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: this.settings.time_format === '12h' }).format(new Date())
      } catch {
        return '—'
      }
    },
    dateFormats() {
      const d = new Date()
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const y = d.getFullYear()
      return [
        { value: 'DD/MM/YYYY', example: `${dd}/${mm}/${y}` },
        { value: 'MM/DD/YYYY', example: `${mm}/${dd}/${y}` },
        { value: 'YYYY-MM-DD', example: `${y}-${mm}-${dd}` },
        { value: 'DD-MM-YYYY', example: `${dd}-${mm}-${y}` }
      ]
    }
  },
  created() {
    this.load()
  },
  mounted() {
    window.addEventListener('beforeunload', this.beforeUnload)
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          if (vis.length) this.active = vis[0].target.id
        },
        { rootMargin: '-80px 0px -60% 0px' }
      )
      this.$nextTick(() => this.sections.forEach((s) => document.getElementById(s.id) && this.observer.observe(document.getElementById(s.id))))
    }
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.beforeUnload)
    if (this.observer) this.observer.disconnect()
  },
  async beforeRouteLeave(to, from, next) {
    if (!this.dirty) return next()
    next(await confirmDialog({ title: 'Leave without saving?', message: 'Your changes to settings will be lost.', confirmText: 'Discard changes', danger: true }))
  },
  methods: {
    beforeUnload(e) {
      if (this.dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    },
    apply(d) {
      this.org = { ...blankOrg(), ...d.organization, address: { ...blankOrg().address, ...(d.organization.address || {}) } }
      this.settings = { ...this.settings, ...d.settings }
      this.canEdit = !!d.can_edit
      this.original = this.snapshot
    },
    async load() {
      this.loadError = ''
      try {
        const { data } = await api.get('/account/organization')
        this.apply(data.data)
        this.loaded = true
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load settings')
      }
    },
    reset() {
      const o = JSON.parse(this.original)
      this.org = o.org
      this.settings = o.settings
      this.errors = {}
    },
    scrollTo(id) {
      this.active = id
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    validate() {
      const e = {}
      if (!this.org.name) e.name = 'Business name is required'
      if (this.org.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.org.email)) e.email = 'Enter a valid email address'
      if (this.org.website && !/^(https?:\/\/)?[^\s/]+\.[^\s]+$/i.test(this.org.website)) e.website = 'Enter a valid website, e.g. https://example.com'
      this.errors = e
      if (Object.keys(e).length) this.scrollTo('business')
      return !Object.keys(e).length
    },
    async save() {
      if (!this.validate()) return
      this.saving = true
      try {
        const { data } = await api.put('/account/organization', { ...this.org, settings: this.settings })
        this.apply(data.data)
        toast.success('Settings saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save settings'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
  padding-bottom: 72px;
}

.side {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.side a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  text-decoration: none;
  font-weight: 550;
  font-size: 14px;
}

.side a i {
  width: 16px;
  text-align: center;
  color: var(--text-3);
}

.side a:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.side a.is-active {
  background: var(--accent-soft);
  color: var(--accent);
}

.side a.is-active i {
  color: var(--accent);
}

.stack,
.plain {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plain {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.stack > section,
.plain > section {
  scroll-margin-top: 88px;
}

.sub {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.sk {
  display: grid;
  gap: 14px;
}

.addr {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.toggles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.toggle:last-child {
  border-bottom: 0;
}

.toggle small {
  display: block;
  color: var(--text-3);
  font-size: 13px;
  margin-top: 2px;
}

.links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
  transition: background 0.15s;
}

.link:hover {
  background: var(--surface-hover);
}

.link > span:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.link small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}

.link__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.savebar {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 12px 10px 18px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  font-size: 13.5px;
  color: var(--text-2);
  max-width: calc(100vw - 32px);
}

.bar-enter-active,
.bar-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.bar-enter-from,
.bar-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (max-width: 1000px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .side {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    gap: 6px;
  }
  .side a {
    white-space: nowrap;
    border: 1px solid var(--border);
  }
  .addr {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .savebar {
    left: 16px;
    right: 16px;
    transform: none;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .bar-enter-from,
  .bar-leave-to {
    transform: translateY(12px);
  }
}
</style>
