<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal bk-modal" role="dialog" aria-modal="true" :aria-label="isEdit ? 'Edit booking' : 'New booking'" novalidate @submit.prevent="submit">
      <div class="ui-modal__head">
        <div>
          <h2>{{ isEdit ? 'Edit booking' : 'New booking' }}</h2>
          <p class="sub">{{ isEdit ? 'Update the details of this appointment.' : 'Schedule an appointment for a customer.' }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="serverError" class="ui-alert ui-alert--danger mb">
          <i class="fa-solid fa-circle-exclamation"></i><span>{{ serverError }}</span>
        </div>

        <!-- Customer -->
        <section class="sec">
          <div class="sec__title">Customer</div>

          <div v-if="selectedCustomer && !showNewCustomer" class="picked">
            <span class="avatar">{{ initials(personName(selectedCustomer)) }}</span>
            <div class="picked__main">
              <strong>{{ personName(selectedCustomer) }}</strong>
              <small>{{ [selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ') || 'No contact details' }}</small>
            </div>
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="clearCustomer">Change</button>
          </div>

          <div v-else-if="!showNewCustomer" class="picker" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="pickActive">
            <div class="ui-input-group">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input
                ref="customerSearch"
                v-model="customerQuery"
                class="ui-input"
                :class="{ 'is-invalid': showErrors && errors.customer }"
                type="search"
                placeholder="Search customers by name, phone or email…"
                autocomplete="off"
                aria-label="Search customers"
                @focus="pickerOpen = true"
                @input="pickerOpen = true; activeIdx = 0"
              />
            </div>
            <div v-if="pickerOpen" class="picker__list" role="listbox">
              <button
                v-for="(c, i) in customerMatches"
                :key="c.id"
                type="button"
                role="option"
                class="picker__item"
                :class="{ 'is-active': i === activeIdx }"
                @mousedown.prevent="pickCustomer(c)"
                @mouseenter="activeIdx = i"
              >
                <span class="avatar sm">{{ initials(personName(c)) }}</span>
                <span class="picker__text">
                  <strong>{{ personName(c) }}</strong>
                  <small>{{ [c.phone, c.email].filter(Boolean).join(' · ') }}</small>
                </span>
              </button>
              <div v-if="!customerMatches.length" class="picker__empty">
                {{ customers.length ? 'No customers match your search.' : 'You have no customers yet.' }}
              </div>
              <button type="button" class="picker__item picker__new" @mousedown.prevent="openNewCustomer">
                <span class="avatar sm accent"><i class="fa-solid fa-plus"></i></span>
                <span class="picker__text"><strong>New customer{{ customerQuery ? `: “${customerQuery}”` : '' }}</strong><small>Add them without leaving this form</small></span>
              </button>
            </div>
            <div v-if="showErrors && errors.customer" class="err">{{ errors.customer }}</div>
          </div>

          <div v-if="showNewCustomer" class="newcust">
            <div class="newcust__head">
              <strong><i class="fa-solid fa-user-plus"></i> New customer</strong>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="showNewCustomer = false">Cancel</button>
            </div>
            <div class="ui-grid-2">
              <div class="ui-field">
                <label for="nc-first">First name <span class="req">*</span></label>
                <input id="nc-first" ref="ncFirst" v-model.trim="nc.first_name" class="ui-input" :class="{ 'is-invalid': ncTried && !nc.first_name }" />
              </div>
              <div class="ui-field">
                <label for="nc-last">Last name <span class="req">*</span></label>
                <input id="nc-last" v-model.trim="nc.last_name" class="ui-input" :class="{ 'is-invalid': ncTried && !nc.last_name }" />
              </div>
              <div class="ui-field">
                <label for="nc-phone">Phone <span class="req">*</span></label>
                <input id="nc-phone" v-model.trim="nc.phone" class="ui-input" type="tel" :class="{ 'is-invalid': ncTried && !nc.phone }" />
              </div>
              <div class="ui-field">
                <label for="nc-email">Email</label>
                <input id="nc-email" v-model.trim="nc.email" class="ui-input" type="email" :class="{ 'is-invalid': ncTried && nc.email && !emailOk(nc.email) }" />
              </div>
            </div>
            <div v-if="ncError" class="err">{{ ncError }}</div>
            <div class="newcust__foot">
              <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="ncSaving" @click="createCustomer">
                <i :class="ncSaving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Add customer
              </button>
            </div>
          </div>

          <div v-if="selectedCustomer && vehicles.length && !showNewCustomer" class="ui-field mt">
            <label for="bk-vehicle">Vehicle <span class="opt">optional</span></label>
            <select id="bk-vehicle" v-model="form.vehicle_id" class="ui-select">
              <option value="">No vehicle</option>
              <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ vehicleLabel(v) }}</option>
            </select>
          </div>
        </section>

        <!-- Services -->
        <section class="sec">
          <div class="sec__title">
            Services
            <span v-if="form.service_ids.length" class="sec__meta">{{ form.service_ids.length }} selected · {{ formatDuration(servicesMinutes) }} · {{ money(servicesTotal) }}</span>
          </div>
          <div v-if="services.length > 8" class="ui-input-group mb-sm">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="serviceQuery" class="ui-input" type="search" placeholder="Filter services…" aria-label="Filter services" />
          </div>
          <div v-if="services.length" class="svc-list">
            <label v-for="s in filteredServices" :key="s.id" class="svc" :class="{ 'is-on': form.service_ids.includes(s.id) }">
              <input type="checkbox" :value="s.id" v-model="form.service_ids" />
              <span class="svc__check"><i class="fa-solid fa-check"></i></span>
              <span class="svc__main">
                <strong>{{ s.name }}</strong>
                <small>{{ formatDuration(s.duration) }}<template v-if="s.category"> · {{ s.category }}</template></small>
              </span>
              <span class="svc__price">{{ money(s.price) }}</span>
            </label>
            <div v-if="!filteredServices.length" class="picker__empty">No services match “{{ serviceQuery }}”.</div>
          </div>
          <div v-else class="ui-hint">No services set up yet — the booking will default to {{ defaultMinutes }} minutes. <router-link to="/services" @click="close">Add services</router-link></div>
        </section>

        <!-- When & who -->
        <section class="sec">
          <div class="sec__title">When</div>
          <div class="when-grid">
            <div class="ui-field">
              <label for="bk-date">Date <span class="req">*</span></label>
              <input id="bk-date" v-model="form.date" class="ui-input" type="date" :class="{ 'is-invalid': showErrors && errors.date }" />
            </div>
            <div class="ui-field">
              <label for="bk-start">Start <span class="req">*</span></label>
              <input id="bk-start" v-model="form.start" class="ui-input" type="time" step="300" :class="{ 'is-invalid': showErrors && errors.start }" />
            </div>
            <div class="ui-field">
              <label for="bk-end">End</label>
              <input id="bk-end" v-model="form.end" class="ui-input" type="time" step="300" :class="{ 'is-invalid': showErrors && errors.end }" @input="endTouched = true" />
            </div>
          </div>
          <div class="when-meta">
            <span v-if="durationMinutes > 0" class="ui-hint"><i class="fa-regular fa-clock"></i> {{ formatDuration(durationMinutes) }}</span>
            <button v-if="endTouched && form.service_ids.length && durationMinutes !== servicesMinutes" type="button" class="linkbtn" @click="resetEnd">Match services duration</button>
          </div>
          <div v-if="showErrors && (errors.date || errors.start || errors.end)" class="err">{{ errors.date || errors.start || errors.end }}</div>

          <div class="ui-grid-2 mt">
            <div class="ui-field">
              <label for="bk-staff">Staff member</label>
              <select id="bk-staff" v-model="form.staff_id" class="ui-select">
                <option value="">Unassigned</option>
                <option v-for="u in staff" :key="u.id" :value="u.id">{{ personName(u) }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="bk-status">Status</label>
              <select id="bk-status" v-model="form.status" class="ui-select">
                <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Price & notes -->
        <section class="sec">
          <div class="sec__title">Price & notes</div>
          <div class="ui-field price-field">
            <label for="bk-price">Price</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-dollar-sign"></i>
              <input id="bk-price" v-model="form.price" class="ui-input num" type="number" min="0" step="0.01" inputmode="decimal" :class="{ 'is-invalid': showErrors && errors.price }" @input="priceTouched = true" />
            </div>
            <span class="ui-hint">
              <template v-if="priceTouched && form.service_ids.length">Custom price · services total {{ money(servicesTotal) }} <button type="button" class="linkbtn" @click="resetPrice">Use services total</button></template>
              <template v-else>Calculated from the selected services.</template>
            </span>
            <div v-if="showErrors && errors.price" class="err">{{ errors.price }}</div>
          </div>
          <div class="ui-grid-2 mt">
            <div class="ui-field">
              <label for="bk-notes">Notes</label>
              <textarea id="bk-notes" v-model="form.notes" class="ui-textarea" rows="3" placeholder="Anything the customer asked for…"></textarea>
            </div>
            <div class="ui-field">
              <label for="bk-internal">Internal notes</label>
              <textarea id="bk-internal" v-model="form.internal_notes" class="ui-textarea" rows="3" placeholder="Only visible to your team"></textarea>
            </div>
          </div>
        </section>
      </div>

      <div class="ui-modal__foot">
        <span class="foot-summary">
          <template v-if="summary">{{ summary }}</template>
        </span>
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i>
          {{ isEdit ? 'Save changes' : 'Create booking' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import api, { listFrom, apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatMoney, isoDate } from '@/utils/format'
import { BOOKING_STATUSES, personName, initials, vehicleLabel, hhmm, combine, formatDuration, minutesBetween } from './bookingUtils'

const DEFAULT_MINUTES = 60

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default {
  name: 'BookingFormModal',
  props: {
    booking: { type: Object, default: null },
    preset: { type: Object, default: null }, // { start: Date, staff_id }
    customers: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    staff: { type: Array, default: () => [] }
  },
  emits: ['close', 'saved', 'customer-created'],
  data() {
    const b = this.booking
    let start
    if (b) start = new Date(b.start_time)
    else if (this.preset?.start) start = new Date(this.preset.start)
    else {
      start = new Date()
      start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0)
      start.setHours(start.getHours() + 1)
    }
    return {
      form: {
        customer_id: b?.customer_id || this.preset?.customer_id || '',
        vehicle_id: b?.vehicle_id || '',
        staff_id: b?.staff_id || this.preset?.staff_id || '',
        service_ids: (b?.services || []).map((s) => s.id),
        date: isoDate(start),
        start: hhmm(start),
        end: b ? hhmm(b.end_time) : '',
        status: b?.status || 'scheduled',
        price: b ? Number(b.total_price || 0).toFixed(2) : '0.00',
        notes: b?.notes || '',
        internal_notes: b?.internal_notes || ''
      },
      localCustomers: [],
      endTouched: !!b,
      priceTouched: false,
      customerQuery: '',
      pickerOpen: false,
      activeIdx: 0,
      serviceQuery: '',
      vehicles: [],
      showNewCustomer: false,
      nc: { first_name: '', last_name: '', phone: '', email: '' },
      ncTried: false,
      ncSaving: false,
      ncError: '',
      showErrors: false,
      saving: false,
      serverError: '',
      defaultMinutes: DEFAULT_MINUTES
    }
  },
  computed: {
    isEdit() {
      return !!this.booking
    },
    allCustomers() {
      const seen = new Set()
      return [...this.localCustomers, ...this.customers, ...(this.booking?.customer?.id ? [this.booking.customer] : [])].filter((c) => {
        if (!c?.id || seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
    },
    selectedCustomer() {
      return this.allCustomers.find((c) => c.id === this.form.customer_id) || null
    },
    customerMatches() {
      const q = this.customerQuery.trim().toLowerCase()
      const list = this.allCustomers.filter((c) => c.is_active !== false || c.id === this.form.customer_id)
      if (!q) return list.slice(0, 8)
      const digits = q.replace(/\D/g, '')
      return list
        .filter((c) => {
          const hay = `${personName(c)} ${c.email || ''}`.toLowerCase()
          if (hay.includes(q)) return true
          return digits.length >= 3 && String(c.phone || '').replace(/\D/g, '').includes(digits)
        })
        .slice(0, 8)
    },
    serviceById() {
      return Object.fromEntries([...this.services, ...(this.booking?.services || [])].map((s) => [s.id, s]))
    },
    filteredServices() {
      const q = this.serviceQuery.trim().toLowerCase()
      const active = this.services.filter((s) => s.is_active !== false || this.form.service_ids.includes(s.id))
      // keep services attached to this booking visible even if since deactivated/removed
      for (const s of this.booking?.services || []) if (!active.find((a) => a.id === s.id)) active.push(s)
      if (!q) return active
      return active.filter((s) => `${s.name} ${s.category || ''}`.toLowerCase().includes(q))
    },
    selectedServices() {
      return this.form.service_ids.map((id) => this.serviceById[id]).filter(Boolean)
    },
    servicesMinutes() {
      return this.selectedServices.reduce((t, s) => t + (Number(s.duration) || 0), 0)
    },
    servicesTotal() {
      return this.selectedServices.reduce((t, s) => t + (Number(s.price) || 0), 0)
    },
    startDate() {
      return combine(this.form.date, this.form.start)
    },
    endDate() {
      return combine(this.form.date, this.form.end)
    },
    durationMinutes() {
      if (!this.startDate || !this.endDate) return 0
      return minutesBetween(this.startDate, this.endDate)
    },
    statusOptions() {
      return this.isEdit ? BOOKING_STATUSES : BOOKING_STATUSES.filter((s) => ['scheduled', 'confirmed'].includes(s.value))
    },
    errors() {
      const e = {}
      if (!this.form.customer_id) e.customer = 'Choose a customer or add a new one.'
      if (!this.form.date) e.date = 'Pick a date.'
      if (!this.form.start) e.start = 'Pick a start time.'
      else if (!this.form.end) e.end = 'Pick an end time.'
      else if (this.durationMinutes <= 0) e.end = 'End time must be after the start time.'
      const p = Number(this.form.price)
      if (this.form.price === '' || Number.isNaN(p) || p < 0) e.price = 'Enter a price of 0 or more.'
      return e
    },
    summary() {
      if (!this.startDate) return ''
      const d = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(this.startDate)
      return `${d} · ${this.form.start}–${this.form.end || '?'} · ${this.money(Number(this.form.price) || 0)}`
    }
  },
  watch: {
    'form.service_ids'() {
      if (!this.endTouched) this.resetEnd()
      if (!this.priceTouched) this.resetPrice()
    },
    'form.start'(v, old) {
      if (!v) return
      if (!this.endTouched) this.resetEnd()
      else if (old && this.form.end) {
        // keep the chosen duration when moving the start
        const dur = minutesBetween(combine(this.form.date, old), combine(this.form.date, this.form.end))
        if (dur > 0) this.form.end = addMinutes(v, dur)
      }
    },
    'form.customer_id': {
      immediate: true,
      handler(id, old) {
        if (old !== undefined && id !== old) this.form.vehicle_id = ''
        this.loadVehicles(id)
      }
    }
  },
  mounted() {
    if (!this.isEdit) {
      if (!this.form.end) this.resetEnd()
      this.resetPrice()
    } else {
      this.priceTouched = Math.abs(Number(this.booking.total_price || 0) - this.servicesTotal) > 0.005
    }
    document.addEventListener('keydown', this.onKey)
    this.$nextTick(() => {
      if (!this.form.customer_id) this.$refs.customerSearch?.focus()
    })
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    personName,
    initials,
    vehicleLabel,
    formatDuration,
    money(v) {
      return formatMoney(v)
    },
    emailOk(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    },
    onKey(e) {
      if (e.key === 'Escape') {
        if (this.pickerOpen) this.pickerOpen = false
        else this.close()
      }
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    resetEnd() {
      if (!this.form.start) return
      this.form.end = addMinutes(this.form.start, this.servicesMinutes || DEFAULT_MINUTES)
      this.endTouched = false
    },
    resetPrice() {
      this.form.price = this.servicesTotal.toFixed(2)
      this.priceTouched = false
    },
    move(d) {
      const n = this.customerMatches.length + 1
      this.activeIdx = (this.activeIdx + d + n) % n
    },
    pickActive() {
      if (this.activeIdx < this.customerMatches.length) this.pickCustomer(this.customerMatches[this.activeIdx])
      else this.openNewCustomer()
    },
    pickCustomer(c) {
      this.form.customer_id = c.id
      this.pickerOpen = false
      this.customerQuery = ''
    },
    clearCustomer() {
      this.form.customer_id = ''
      this.pickerOpen = true
      this.$nextTick(() => this.$refs.customerSearch?.focus())
    },
    openNewCustomer() {
      const parts = this.customerQuery.trim().split(/\s+/).filter(Boolean)
      const looksLikePhone = /^[\d\s+()-]{6,}$/.test(this.customerQuery.trim())
      this.nc = {
        first_name: looksLikePhone ? '' : parts[0] || '',
        last_name: looksLikePhone ? '' : parts.slice(1).join(' '),
        phone: looksLikePhone ? this.customerQuery.trim() : '',
        email: ''
      }
      this.ncTried = false
      this.ncError = ''
      this.pickerOpen = false
      this.showNewCustomer = true
      this.$nextTick(() => this.$refs.ncFirst?.focus())
    },
    async createCustomer() {
      this.ncTried = true
      this.ncError = ''
      const { first_name, last_name, phone, email } = this.nc
      if (!first_name || !last_name || !phone) {
        this.ncError = 'First name, last name and phone are required.'
        return
      }
      if (email && !this.emailOk(email)) {
        this.ncError = 'That email address doesn’t look right.'
        return
      }
      this.ncSaving = true
      try {
        const { data } = await api.post('/customers', { first_name, last_name, phone, email })
        const c = data.customer || data.data || data
        this.localCustomers.unshift(c)
        this.form.customer_id = c.id
        this.showNewCustomer = false
        this.$emit('customer-created', c)
        toast.success(`${personName(c)} added as a customer`)
      } catch (e) {
        this.ncError = apiErrorMessage(e, 'Could not create the customer')
      } finally {
        this.ncSaving = false
      }
    },
    async loadVehicles(id) {
      this.vehicles = []
      if (!id) return
      const cached = this.allCustomers.find((c) => c.id === id)?.vehicles
      if (Array.isArray(cached)) {
        this.vehicles = cached
        return
      }
      try {
        const res = await api.get(`/customers/${id}/vehicles`)
        if (this.form.customer_id === id) this.vehicles = listFrom(res, 'vehicles')
      } catch {
        this.vehicles = []
      }
    },
    async submit() {
      this.showErrors = true
      this.serverError = ''
      if (Object.keys(this.errors).length) {
        if (this.errors.customer && !this.showNewCustomer) this.$nextTick(() => this.$refs.customerSearch?.focus())
        return
      }
      const payload = {
        customer_id: this.form.customer_id,
        vehicle_id: this.form.vehicle_id || '',
        staff_id: this.form.staff_id || '',
        service_ids: this.form.service_ids,
        start_time: this.startDate.toISOString(),
        end_time: this.endDate.toISOString(),
        status: this.form.status,
        total_price: Math.round(Number(this.form.price) * 100) / 100,
        notes: this.form.notes,
        internal_notes: this.form.internal_notes
      }
      this.saving = true
      try {
        const { data } = this.isEdit ? await api.put(`/bookings/${this.booking.id}`, payload) : await api.post('/bookings', payload)
        toast.success(this.isEdit ? 'Booking updated' : 'Booking created')
        this.$emit('saved', data.booking || data)
      } catch (e) {
        this.serverError = apiErrorMessage(e, this.isEdit ? 'Could not update the booking' : 'Could not create the booking')
        this.$el.querySelector('.ui-modal')?.scrollTo({ top: 0, behavior: 'smooth' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.bk-modal {
  max-width: 760px;
}

.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.mb { margin-bottom: 16px; }
.mb-sm { margin-bottom: 10px; }
.mt { margin-top: 14px; }

.sec {
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.sec:first-of-type { padding-top: 4px; }
.sec:last-child { border-bottom: 0; padding-bottom: 4px; }

.sec__title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin-bottom: 10px;
}

.sec__meta {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 550;
  font-size: 12.5px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.req { color: var(--danger); }
.opt { color: var(--text-3); font-weight: 400; font-size: 12px; }

.err {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--danger);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.avatar.sm { width: 30px; height: 30px; font-size: 11px; border-radius: 9px; }

.picked {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.picked__main { flex: 1; min-width: 0; }
.picked__main strong { display: block; }
.picked__main small { color: var(--text-3); font-size: 12.5px; }

.picker { position: relative; }

.picker__list {
  margin-top: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  max-height: 290px;
  overflow: auto;
  padding: 4px;
}

.picker__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.picker__item.is-active,
.picker__item:hover { background: var(--surface-hover); }

.picker__text { min-width: 0; }
.picker__text strong { display: block; font-weight: 550; font-size: 14px; }
.picker__text small { color: var(--text-3); font-size: 12px; }

.picker__new { border-top: 1px solid var(--border); border-radius: 0 0 var(--radius-sm) var(--radius-sm); margin-top: 4px; }
.picker__new strong { color: var(--accent); }

.picker__empty {
  padding: 12px;
  color: var(--text-3);
  font-size: 13px;
  text-align: center;
}

.newcust {
  border: 1px solid var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
  border-radius: var(--radius);
  padding: 14px;
  background: var(--surface);
}

.newcust__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.newcust__head i { color: var(--accent); margin-right: 4px; }

.newcust__foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.svc-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  max-height: 260px;
  overflow: auto;
  padding: 2px;
}

.svc {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  background: var(--surface);
  transition: border-color 0.15s, background 0.15s;
}

.svc:hover { border-color: var(--border-strong); }

.svc input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.svc input:focus-visible + .svc__check { box-shadow: 0 0 0 3px var(--accent-ring); }

.svc.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.svc__check {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--border-strong);
  display: grid;
  place-items: center;
  font-size: 10px;
  color: transparent;
  flex-shrink: 0;
  background: var(--surface);
}

.svc.is-on .svc__check {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast, #fff);
}

.svc__main { flex: 1; min-width: 0; }
.svc__main strong { display: block; font-weight: 550; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.svc__main small { color: var(--text-3); font-size: 12px; }

.svc__price {
  font-weight: 600;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.when-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 12px;
}

.when-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  min-height: 18px;
}

.when-meta i { margin-right: 4px; }

.linkbtn {
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 12px;
  font-weight: 550;
  padding: 0;
  cursor: pointer;
}

.linkbtn:hover { text-decoration: underline; }

.price-field { max-width: 260px; }
.num { font-variant-numeric: tabular-nums; }

.foot-summary {
  margin-right: auto;
  align-self: center;
  color: var(--text-3);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .svc-list { grid-template-columns: 1fr; }
  .when-grid { grid-template-columns: 1fr 1fr; }
  .when-grid .ui-field:first-child { grid-column: 1 / -1; }
  .price-field { max-width: none; }
  .foot-summary { display: none; }
  .ui-modal__foot .ui-btn { flex: 1; justify-content: center; }
}
</style>
