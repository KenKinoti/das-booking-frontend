<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">
          <router-link to="/events" class="crumb"><i class="fa-solid fa-arrow-left"></i> Events</router-link>
        </div>
        <h1>{{ isEdit ? 'Edit event' : 'New event' }}</h1>
        <p>{{ isEdit ? 'Update details, tickets and publishing settings.' : 'Set up the details, add ticket types and publish when you are ready.' }}</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="saving" @click="cancel">Cancel</button>
        <button v-if="!isEdit || form.status === 'draft'" class="ui-btn" :disabled="saving || loading" @click="save('draft')">
          <i :class="saving === 'draft' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-floppy-disk'"></i> Save draft
        </button>
        <button class="ui-btn ui-btn--primary" :disabled="saving || loading" @click="save(primaryStatus)">
          <i :class="saving && saving !== 'draft' ? 'fa-solid fa-circle-notch fa-spin' : primaryIcon"></i> {{ primaryLabel }}
        </button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="loadEvent">Try again</a></span></div>

    <div v-else-if="loading" class="layout">
      <div class="ui-card"><div class="ui-card__body"><div v-for="n in 8" :key="n" class="ui-skeleton" style="height: 38px; margin-bottom: 14px"></div></div></div>
    </div>

    <form v-else class="layout" novalidate @submit.prevent="save(primaryStatus)">
      <nav class="steps" aria-label="Form sections">
        <a v-for="(s, i) in sections" :key="s.id" :href="`#${s.id}`" class="step" :class="{ 'is-active': active === s.id, 'has-error': sectionHasError(s.id) }" @click.prevent="scrollTo(s.id)">
          <span class="step__n">
            <i v-if="sectionHasError(s.id)" class="fa-solid fa-exclamation"></i>
            <i v-else-if="sectionDone(s.id)" class="fa-solid fa-check"></i>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span>{{ s.label }}</span>
        </a>
        <div class="summary">
          <div class="summary__row"><span>Tickets</span><strong>{{ form.ticket_types.length }}</strong></div>
          <div class="summary__row"><span>Capacity</span><strong>{{ capacitySummary }}</strong></div>
          <div class="summary__row"><span>Price</span><strong>{{ priceSummary }}</strong></div>
        </div>
      </nav>

      <div class="sections">
        <div v-if="formError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>

        <!-- Basics -->
        <section id="basics" class="ui-card">
          <div class="ui-card__head"><h2><i class="fa-regular fa-pen-to-square"></i> Basics</h2></div>
          <div class="ui-card__body stack">
            <div class="ui-field">
              <label for="ev-title">Event title *</label>
              <input id="ev-title" v-model.trim="form.title" class="ui-input" :class="{ 'is-invalid': errors.title }" maxlength="255" placeholder="e.g. Spring Product Launch" />
              <div v-if="errors.title" class="err">{{ errors.title }}</div>
            </div>
            <div class="ui-field">
              <label for="ev-summary">Summary</label>
              <input id="ev-summary" v-model="form.short_description" class="ui-input" maxlength="500" placeholder="One line that tells people why they should come" />
            </div>
            <div class="ui-field">
              <label for="ev-desc">Description</label>
              <textarea id="ev-desc" v-model="form.description" class="ui-textarea" rows="6" placeholder="Agenda, speakers, what to bring…"></textarea>
            </div>
            <div class="ui-grid-2">
              <div class="ui-field">
                <label for="ev-cat">Category</label>
                <input id="ev-cat" v-model.trim="form.category" class="ui-input" list="ev-cats" placeholder="Choose or type a category" />
                <datalist id="ev-cats"><option v-for="c in categories" :key="c" :value="c"></option></datalist>
              </div>
              <div class="ui-field">
                <label for="ev-tags">Tags</label>
                <input id="ev-tags" v-model="form.tags" class="ui-input" placeholder="Comma separated, e.g. marketing, launch" />
              </div>
            </div>
            <div class="ui-field">
              <label>Format</label>
              <div class="seg" role="radiogroup" aria-label="Event format">
                <button v-for="t in types" :key="t.value" type="button" class="seg__opt" role="radio" :aria-checked="form.type === t.value" :class="{ 'is-on': form.type === t.value }" @click="form.type = t.value">
                  <i :class="t.icon"></i>
                  <span>
                    <strong>{{ t.label }}</strong>
                    <small>{{ typeHelp[t.value] }}</small>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- When -->
        <section id="when" class="ui-card">
          <div class="ui-card__head"><h2><i class="fa-regular fa-clock"></i> Date &amp; time</h2></div>
          <div class="ui-card__body stack">
            <div class="ui-grid-2">
              <div class="ui-field">
                <label for="ev-start">Starts *</label>
                <input id="ev-start" v-model="form.start" type="datetime-local" class="ui-input" :class="{ 'is-invalid': errors.start }" @change="onStartChange" />
                <div v-if="errors.start" class="err">{{ errors.start }}</div>
              </div>
              <div class="ui-field">
                <label for="ev-end">Ends *</label>
                <input id="ev-end" v-model="form.end" type="datetime-local" class="ui-input" :class="{ 'is-invalid': errors.end }" :min="form.start" />
                <div v-if="errors.end" class="err">{{ errors.end }}</div>
              </div>
            </div>
            <div class="ui-hint"><i class="fa-solid fa-globe"></i> Times are in your timezone ({{ form.timezone }}){{ durationLabel ? ` · ${durationLabel}` : '' }}</div>
          </div>
        </section>

        <!-- Where -->
        <section id="where" class="ui-card">
          <div class="ui-card__head"><h2><i class="fa-solid fa-location-dot"></i> Location</h2></div>
          <div class="ui-card__body stack">
            <template v-if="form.type !== 'online'">
              <div class="ui-field">
                <label for="ev-venue">Venue name {{ form.type !== 'online' ? '*' : '' }}</label>
                <input id="ev-venue" v-model="form.venue_name" class="ui-input" :class="{ 'is-invalid': errors.venue }" placeholder="e.g. Town Hall, Room 2" />
                <div v-if="errors.venue" class="err">{{ errors.venue }}</div>
              </div>
              <div class="ui-field">
                <label for="ev-street">Street address</label>
                <input id="ev-street" v-model="form.address.street" class="ui-input" autocomplete="street-address" />
              </div>
              <div class="grid-4">
                <div class="ui-field"><label for="ev-sub">Suburb / city</label><input id="ev-sub" v-model="form.address.suburb" class="ui-input" /></div>
                <div class="ui-field"><label for="ev-state">State</label><input id="ev-state" v-model="form.address.state" class="ui-input" /></div>
                <div class="ui-field"><label for="ev-pc">Postcode</label><input id="ev-pc" v-model="form.address.postcode" class="ui-input" /></div>
                <div class="ui-field"><label for="ev-country">Country</label><input id="ev-country" v-model="form.address.country" class="ui-input" /></div>
              </div>
            </template>
            <div v-if="form.type !== 'in_person'" class="ui-grid-2">
              <div class="ui-field">
                <label for="ev-url">Online URL *</label>
                <input id="ev-url" v-model.trim="form.online_url" type="url" class="ui-input" :class="{ 'is-invalid': errors.online_url }" placeholder="https://…" />
                <div v-if="errors.online_url" class="err">{{ errors.online_url }}</div>
                <div v-else class="ui-hint">Only shown to registered attendees.</div>
              </div>
              <div class="ui-field">
                <label for="ev-plat">Platform</label>
                <select id="ev-plat" v-model="form.online_platform" class="ui-select">
                  <option value="">Select…</option>
                  <option>Zoom</option>
                  <option>Microsoft Teams</option>
                  <option>Google Meet</option>
                  <option>YouTube Live</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- Tickets -->
        <section id="tickets" class="ui-card">
          <div class="ui-card__head">
            <h2><i class="fa-solid fa-ticket"></i> Tickets &amp; capacity</h2>
            <button type="button" class="ui-btn ui-btn--sm" @click="addTicket"><i class="fa-solid fa-plus"></i> Add ticket type</button>
          </div>
          <div class="ui-card__body stack">
            <div class="ui-grid-2">
              <div class="ui-field">
                <label for="ev-cap">Event capacity</label>
                <input id="ev-cap" v-model.number="form.max_capacity" type="number" min="0" class="ui-input" :class="{ 'is-invalid': errors.max_capacity }" placeholder="0 = unlimited" />
                <div v-if="errors.max_capacity" class="err">{{ errors.max_capacity }}</div>
                <div v-else class="ui-hint">Total seats across all tickets. Leave 0 for unlimited.</div>
              </div>
              <div class="ui-field">
                <label for="ev-cur">Currency</label>
                <select id="ev-cur" v-model="form.currency" class="ui-select">
                  <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <div v-if="errors.tickets" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ errors.tickets }}</span></div>

            <div class="tickets">
              <div v-for="(t, i) in form.ticket_types" :key="t._key" class="ticket" :class="{ 'is-off': !t.is_active }">
                <div class="ticket__grid">
                  <div class="ui-field t-name">
                    <label :for="`t-name-${i}`">Ticket name *</label>
                    <input :id="`t-name-${i}`" v-model="t.name" class="ui-input" :class="{ 'is-invalid': ticketErr(i, 'name') }" placeholder="General admission" />
                  </div>
                  <div class="ui-field">
                    <label :for="`t-price-${i}`">Price ({{ form.currency }})</label>
                    <input :id="`t-price-${i}`" v-model.number="t.price" type="number" min="0" step="0.01" class="ui-input num" :class="{ 'is-invalid': ticketErr(i, 'price') }" placeholder="0.00" />
                  </div>
                  <div class="ui-field">
                    <label :for="`t-qty-${i}`">Quantity</label>
                    <input :id="`t-qty-${i}`" v-model.number="t.quantity" type="number" min="0" class="ui-input num" :class="{ 'is-invalid': ticketErr(i, 'quantity') }" placeholder="0 = unlimited" />
                  </div>
                  <div class="ui-field">
                    <label :for="`t-max-${i}`">Max / order</label>
                    <input :id="`t-max-${i}`" v-model.number="t.max_per_order" type="number" min="1" max="100" class="ui-input num" />
                  </div>
                  <div class="ui-field t-desc">
                    <label :for="`t-desc-${i}`">Description</label>
                    <input :id="`t-desc-${i}`" v-model="t.description" class="ui-input" placeholder="Optional — what's included" />
                  </div>
                </div>
                <div class="ticket__foot">
                  <label class="ui-switch"><input v-model="t.is_active" type="checkbox" /> On sale</label>
                  <span v-if="t.sold_quantity" class="muted"><i class="fa-solid fa-ticket"></i> {{ t.sold_quantity }} sold</span>
                  <span class="muted t-info">{{ t.price > 0 ? money(t.price) : 'Free' }}{{ t.quantity > 0 ? ` · ${t.quantity} available` : ' · unlimited' }}</span>
                  <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon rm" :aria-label="`Remove ticket ${t.name || i + 1}`" :disabled="form.ticket_types.length === 1" @click="removeTicket(i)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </div>
            </div>
            <div class="ui-hint">Tickets that already have registrations are taken off sale instead of deleted.</div>
          </div>
        </section>

        <!-- Media & settings -->
        <section id="settings" class="ui-card">
          <div class="ui-card__head"><h2><i class="fa-solid fa-sliders"></i> Media &amp; settings</h2></div>
          <div class="ui-card__body stack">
            <div class="cover-row">
              <div class="ui-field" style="flex: 1">
                <label for="ev-cover">Cover image URL</label>
                <input id="ev-cover" v-model.trim="form.cover_image_url" type="url" class="ui-input" :class="{ 'is-invalid': errors.cover }" placeholder="https://…/image.jpg" @input="coverBroken = false" />
                <div v-if="errors.cover" class="err">{{ errors.cover }}</div>
                <div v-else class="ui-hint">Landscape images around 1600×800 work best.</div>
              </div>
              <div class="cover-preview" :class="{ empty: !form.cover_image_url || coverBroken }">
                <img v-if="form.cover_image_url && !coverBroken" :src="form.cover_image_url" alt="Cover preview" @error="coverBroken = true" />
                <span v-else><i class="fa-regular fa-image"></i>{{ coverBroken ? 'Image could not load' : 'No image' }}</span>
              </div>
            </div>
            <div class="ui-grid-2">
              <div class="ui-field">
                <label for="ev-cname">Contact name</label>
                <input id="ev-cname" v-model="form.contact_name" class="ui-input" placeholder="Organiser shown on the event page" />
              </div>
              <div class="ui-field">
                <label for="ev-cemail">Contact email</label>
                <input id="ev-cemail" v-model.trim="form.contact_email" type="email" class="ui-input" :class="{ 'is-invalid': errors.contact_email }" />
                <div v-if="errors.contact_email" class="err">{{ errors.contact_email }}</div>
              </div>
            </div>
            <div class="toggles">
              <label class="toggle">
                <span><strong>Public registration page</strong><small>Anyone with the link can view the event and register.</small></span>
                <span class="ui-switch"><input v-model="form.is_public" type="checkbox" aria-label="Public registration page" /></span>
              </label>
              <label class="toggle">
                <span><strong>Require approval</strong><small>New public registrations start as pending until you confirm them.</small></span>
                <span class="ui-switch"><input v-model="form.requires_approval" type="checkbox" aria-label="Require approval" /></span>
              </label>
              <label class="toggle">
                <span><strong>Waitlist when sold out</strong><small>Let people join a waitlist once tickets run out.</small></span>
                <span class="ui-switch"><input v-model="form.allow_waitlist" type="checkbox" aria-label="Waitlist when sold out" /></span>
              </label>
            </div>
            <div v-if="isEdit" class="ui-field" style="max-width: 280px">
              <label for="ev-status">Status</label>
              <select id="ev-status" v-model="form.status" class="ui-select">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </section>

        <div class="bottom-actions">
          <button type="button" class="ui-btn" :disabled="saving" @click="cancel">Cancel</button>
          <button v-if="!isEdit || form.status === 'draft'" type="button" class="ui-btn" :disabled="saving" @click="save('draft')">Save draft</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i :class="saving && saving !== 'draft' ? 'fa-solid fa-circle-notch fa-spin' : primaryIcon"></i> {{ primaryLabel }}</button>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
import { eventsApi, EVENT_TYPES } from '@/services/events'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'

let keySeq = 0
const pad = (n) => String(n).padStart(2, '0')
function toLocalInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function newTicket(over = {}) {
  return { _key: ++keySeq, id: '', name: '', price: 0, quantity: 0, max_per_order: 10, description: '', is_active: true, sold_quantity: 0, ...over }
}
function emptyForm() {
  let tz = 'UTC'
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    /* ignore */
  }
  return {
    title: '',
    short_description: '',
    description: '',
    category: '',
    tags: '',
    type: 'in_person',
    status: 'draft',
    start: '',
    end: '',
    timezone: tz,
    venue_name: '',
    address: { street: '', suburb: '', state: '', postcode: '', country: 'Australia' },
    online_url: '',
    online_platform: '',
    max_capacity: 0,
    currency: 'AUD',
    cover_image_url: '',
    contact_name: '',
    contact_email: '',
    is_public: true,
    requires_approval: false,
    allow_waitlist: false,
    ticket_types: [newTicket({ name: 'General admission' })]
  }
}

export default {
  name: 'EventCreate',
  data() {
    return {
      form: emptyForm(),
      errors: {},
      formError: '',
      loading: false,
      loadError: '',
      saving: '',
      categories: [],
      coverBroken: false,
      lastStatus: 'draft',
      active: 'basics',
      observer: null,
      types: EVENT_TYPES,
      currencies: ['AUD', 'NZD', 'USD', 'GBP', 'EUR', 'CAD', 'SGD'],
      typeHelp: { in_person: 'At a physical venue', online: 'Streamed or video call', hybrid: 'Venue plus online' },
      sections: [
        { id: 'basics', label: 'Basics' },
        { id: 'when', label: 'Date & time' },
        { id: 'where', label: 'Location' },
        { id: 'tickets', label: 'Tickets & capacity' },
        { id: 'settings', label: 'Media & settings' }
      ]
    }
  },
  computed: {
    id() {
      return this.$route.params.id
    },
    isEdit() {
      return !!this.id
    },
    primaryStatus() {
      if (!this.isEdit) return 'published'
      return this.form.status === 'draft' ? 'published' : this.form.status
    },
    primaryLabel() {
      if (!this.isEdit) return 'Publish event'
      return this.form.status === 'draft' ? 'Publish' : 'Save changes'
    },
    primaryIcon() {
      return this.isEdit && this.form.status !== 'draft' ? 'fa-solid fa-check' : 'fa-solid fa-paper-plane'
    },
    durationLabel() {
      if (!this.form.start || !this.form.end) return ''
      const mins = Math.round((new Date(this.form.end) - new Date(this.form.start)) / 60000)
      if (!(mins > 0)) return ''
      const d = Math.floor(mins / 1440)
      const h = Math.floor((mins % 1440) / 60)
      const m = mins % 60
      return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')
    },
    capacitySummary() {
      if (this.form.max_capacity > 0) return this.form.max_capacity
      const active = this.form.ticket_types.filter((t) => t.is_active)
      if (active.length && active.every((t) => t.quantity > 0)) return active.reduce((s, t) => s + Number(t.quantity || 0), 0)
      return 'Unlimited'
    },
    priceSummary() {
      const prices = this.form.ticket_types.filter((t) => t.is_active).map((t) => Number(t.price) || 0)
      if (!prices.length || prices.every((p) => !p)) return 'Free'
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      return min === max ? this.money(min) : `${min ? this.money(min) : 'Free'} – ${this.money(max)}`
    }
  },
  watch: {
    '$route.params.id'() {
      this.init()
    },
    form: {
      deep: true,
      handler() {
        // Re-check as the user fixes things so errors clear immediately.
        if (Object.keys(this.errors).length) this.validate(this.lastStatus)
      }
    }
  },
  created() {
    this.init()
    eventsApi
      .categories()
      .then((d) => (this.categories = d.categories || []))
      .catch(() => {})
  },
  mounted() {
    this.setupObserver()
  },
  updated() {
    this.setupObserver()
  },
  beforeUnmount() {
    if (this.observer) this.observer.disconnect()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.form.currency)
    },
    init() {
      this.errors = {}
      this.formError = ''
      if (this.isEdit) this.loadEvent()
      else this.form = emptyForm()
    },
    async loadEvent() {
      this.loading = true
      this.loadError = ''
      try {
        const e = await eventsApi.get(this.id)
        const f = emptyForm()
        Object.assign(f, {
          title: e.title || '',
          short_description: e.short_description || '',
          description: e.description || '',
          category: e.category || '',
          tags: e.tags || '',
          type: e.type || 'in_person',
          status: e.status || 'draft',
          start: toLocalInput(e.start_date),
          end: toLocalInput(e.end_date),
          venue_name: e.venue_name || '',
          address: { ...f.address, ...(e.address || {}) },
          online_url: e.online_url || '',
          online_platform: e.online_platform || '',
          max_capacity: e.max_capacity || 0,
          currency: e.currency || 'AUD',
          cover_image_url: e.cover_image_url || '',
          contact_name: e.contact_name || '',
          contact_email: e.contact_email || '',
          is_public: !!e.is_public,
          requires_approval: !!e.requires_approval,
          allow_waitlist: !!e.allow_waitlist,
          ticket_types: (e.ticket_types || []).map((t) =>
            newTicket({ id: t.id, name: t.name, price: Number(t.price) || 0, quantity: t.quantity || 0, max_per_order: t.max_per_order || 10, description: t.description || '', is_active: !!t.is_active, sold_quantity: t.sold_quantity || 0 })
          )
        })
        if (!f.ticket_types.length) f.ticket_types = [newTicket({ name: 'General admission' })]
        this.form = f
      } catch (err) {
        this.loadError = apiErrorMessage(err, 'Could not load this event')
      } finally {
        this.loading = false
      }
    },
    setupObserver() {
      if (this.observer || typeof IntersectionObserver === 'undefined') return
      const els = this.sections.map((s) => document.getElementById(s.id)).filter(Boolean)
      if (!els.length) return
      this.observer = new IntersectionObserver(
        (entries) => {
          const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          if (vis.length) this.active = vis[0].target.id
        },
        { rootMargin: '-80px 0px -55% 0px' }
      )
      els.forEach((el) => this.observer.observe(el))
    },
    scrollTo(id) {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      this.active = id
    },
    onStartChange() {
      if (!this.form.start) return
      if (!this.form.end || new Date(this.form.end) <= new Date(this.form.start)) {
        const d = new Date(this.form.start)
        d.setHours(d.getHours() + 2)
        this.form.end = toLocalInput(d)
      }
    },
    addTicket() {
      this.form.ticket_types.push(newTicket())
    },
    removeTicket(i) {
      this.form.ticket_types.splice(i, 1)
    },
    ticketErr(i, field) {
      return this.errors[`t${i}_${field}`]
    },
    sectionHasError(id) {
      const map = {
        basics: ['title'],
        when: ['start', 'end'],
        where: ['venue', 'online_url'],
        tickets: ['max_capacity', 'tickets'],
        settings: ['cover', 'contact_email']
      }
      return (map[id] || []).some((k) => this.errors[k]) || (id === 'tickets' && Object.keys(this.errors).some((k) => /^t\d+_/.test(k)))
    },
    sectionDone(id) {
      const f = this.form
      switch (id) {
        case 'basics':
          return !!f.title
        case 'when':
          return !!(f.start && f.end)
        case 'where':
          return f.type === 'online' ? !!f.online_url : !!f.venue_name && (f.type === 'in_person' || !!f.online_url)
        case 'tickets':
          return f.ticket_types.length > 0 && f.ticket_types.every((t) => t.name)
        default:
          return false
      }
    },
    validate(status) {
      const f = this.form
      const e = {}
      if (!f.title) e.title = 'Give your event a title.'
      if (!f.start) e.start = 'Choose when the event starts.'
      if (!f.end) e.end = 'Choose when the event ends.'
      if (f.start && f.end && new Date(f.end) <= new Date(f.start)) e.end = 'The end must be after the start.'
      if (status === 'published') {
        if (f.type !== 'online' && !f.venue_name && !f.address.street) e.venue = 'Add a venue before publishing.'
        if (f.type !== 'in_person' && !f.online_url) e.online_url = 'Add the online link before publishing.'
      }
      if (f.online_url && !/^https?:\/\/\S+$/i.test(f.online_url)) e.online_url = 'Enter a full URL starting with https://'
      if (f.cover_image_url && !/^https?:\/\/\S+$/i.test(f.cover_image_url)) e.cover = 'Enter a full image URL starting with https://'
      if (f.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact_email)) e.contact_email = 'Enter a valid email address.'
      if (!(Number(f.max_capacity) >= 0)) e.max_capacity = 'Capacity must be 0 or more.'
      if (!f.ticket_types.length) e.tickets = 'Add at least one ticket type.'
      f.ticket_types.forEach((t, i) => {
        if (!String(t.name || '').trim()) e[`t${i}_name`] = true
        if (!(Number(t.price) >= 0)) e[`t${i}_price`] = true
        if (!(Number(t.quantity) >= 0)) e[`t${i}_quantity`] = true
      })
      if (!e.tickets && Object.keys(e).some((k) => /^t\d+_/.test(k))) e.tickets = 'Each ticket needs a name, and price/quantity cannot be negative.'
      if (!e.tickets && f.ticket_types.length && !f.ticket_types.some((t) => t.is_active)) e.tickets = 'Keep at least one ticket type on sale.'
      this.errors = e
      return Object.keys(e).length === 0
    },
    payload(status) {
      const f = this.form
      return {
        title: f.title,
        short_description: f.short_description,
        description: f.description,
        category: f.category,
        tags: f.tags,
        type: f.type,
        status,
        start_date: new Date(f.start).toISOString(),
        end_date: new Date(f.end).toISOString(),
        timezone: f.timezone,
        venue_name: f.type === 'online' ? '' : f.venue_name,
        address: f.address,
        online_url: f.type === 'in_person' ? '' : f.online_url,
        online_platform: f.type === 'in_person' ? '' : f.online_platform,
        max_capacity: Number(f.max_capacity) || 0,
        currency: f.currency,
        cover_image_url: f.cover_image_url,
        contact_name: f.contact_name,
        contact_email: f.contact_email,
        is_public: f.is_public,
        requires_approval: f.requires_approval,
        allow_waitlist: f.allow_waitlist,
        ticket_types: f.ticket_types.map((t, i) => ({
          id: t.id || undefined,
          name: String(t.name).trim(),
          description: t.description,
          price: Number(t.price) || 0,
          quantity: Number(t.quantity) || 0,
          max_per_order: Number(t.max_per_order) || 10,
          is_active: t.is_active,
          sort_order: i
        }))
      }
    },
    async save(status) {
      this.formError = ''
      this.lastStatus = status
      if (!this.validate(status)) {
        const first = this.sections.find((s) => this.sectionHasError(s.id))
        if (first) this.scrollTo(first.id)
        toast.error('Please fix the highlighted fields.')
        return
      }
      this.saving = status
      try {
        const body = this.payload(status)
        const ev = this.isEdit ? await eventsApi.update(this.id, body) : await eventsApi.create(body)
        toast.success(this.isEdit ? 'Event updated' : status === 'published' ? 'Event published' : 'Draft saved')
        this.$router.push(`/events/${ev.id}`)
      } catch (err) {
        this.formError = apiErrorMessage(err, 'Could not save the event')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } finally {
        this.saving = ''
      }
    },
    cancel() {
      this.$router.push(this.isEdit ? `/events/${this.id}` : '/events')
    }
  }
}
</script>

<style scoped>
.crumb {
  color: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.crumb:hover {
  color: var(--accent);
}
.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.steps {
  position: sticky;
  top: calc(var(--topbar-h, 64px) + 16px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.step {
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
.step:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.step.is-active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}
.step__n {
  width: 24px;
  height: 24px;
  border-radius: 99px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--bg-subtle);
  color: var(--text-3);
  flex-shrink: 0;
}
.step.is-active .step__n {
  background: var(--accent);
  color: var(--accent-contrast, #fff);
}
.step.has-error .step__n {
  background: var(--danger-soft);
  color: var(--danger);
}
.summary {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.summary__row {
  display: flex;
  justify-content: space-between;
  color: var(--text-3);
}
.summary__row strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.sections > .ui-card {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 16px);
}
.ui-card__head h2 i {
  color: var(--accent);
  margin-right: 6px;
  font-size: 0.9em;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stack > .ui-field,
.stack .ui-field {
  margin-bottom: 0;
}
.err {
  color: var(--danger);
  font-size: 12.5px;
  margin-top: 4px;
}
.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.seg__opt {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.seg__opt i {
  margin-top: 3px;
  color: var(--text-3);
}
.seg__opt small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
.seg__opt:hover {
  border-color: var(--border-strong);
}
.seg__opt.is-on {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.seg__opt.is-on i {
  color: var(--accent);
}
.grid-4 {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.4fr;
  gap: 12px;
}
.tickets {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ticket {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 14px;
}
.ticket.is-off {
  opacity: 0.7;
}
.ticket__grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 12px;
}
.ticket__grid .t-desc {
  grid-column: 1 / -1;
}
.ticket__foot {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  font-size: 13px;
}
.ticket__foot .rm {
  margin-left: auto;
}
.ticket__foot .ui-switch {
  white-space: nowrap;
  margin: 0;
}
.ui-switch input {
  flex-shrink: 0;
}
.num {
  font-variant-numeric: tabular-nums;
}
.muted {
  color: var(--text-3);
}
.cover-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.cover-preview {
  width: 220px;
  height: 110px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-2);
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-preview span {
  color: var(--text-3);
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.cover-preview span i {
  font-size: 20px;
}
.toggles {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  cursor: pointer;
  margin: 0;
}
.toggle + .toggle {
  border-top: 1px solid var(--border);
}
.toggle small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
  font-weight: 400;
}
.toggle strong {
  font-weight: 600;
  font-size: 14px;
}
.bottom-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-bottom: 24px;
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .steps {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    gap: 4px;
    padding-bottom: 4px;
  }
  .step {
    white-space: nowrap;
  }
  .summary {
    display: none;
  }
}
@media (max-width: 720px) {
  .seg {
    grid-template-columns: 1fr;
  }
  .grid-4 {
    grid-template-columns: 1fr 1fr;
  }
  .ticket__grid {
    grid-template-columns: 1fr 1fr;
  }
  .ticket__grid .t-name {
    grid-column: 1 / -1;
  }
  .ticket__foot {
    flex-wrap: wrap;
    gap: 8px 12px;
  }
  .ticket__foot .t-info {
    order: 3;
    flex-basis: 100%;
  }
  .cover-row {
    flex-direction: column;
  }
  .cover-preview {
    width: 100%;
    height: 140px;
  }
  .bottom-actions {
    flex-wrap: wrap;
  }
  .bottom-actions .ui-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
