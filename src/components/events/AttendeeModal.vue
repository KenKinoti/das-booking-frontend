<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-labelledby="att-title" novalidate @submit.prevent="submit" @keydown.esc="$emit('close')">
      <div class="ui-modal__head">
        <h2 id="att-title">{{ isEdit ? 'Edit registration' : 'Add attendee' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 14px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="att-name">Full name *</label>
            <input id="att-name" ref="first" v-model.trim="f.registrant_name" class="ui-input" :class="{ 'is-invalid': errs.name }" autocomplete="off" />
            <div v-if="errs.name" class="err">{{ errs.name }}</div>
          </div>
          <div class="ui-field">
            <label for="att-email">Email *</label>
            <input id="att-email" v-model.trim="f.registrant_email" type="email" class="ui-input" :class="{ 'is-invalid': errs.email }" autocomplete="off" />
            <div v-if="errs.email" class="err">{{ errs.email }}</div>
          </div>
          <div class="ui-field">
            <label for="att-phone">Phone</label>
            <input id="att-phone" v-model.trim="f.registrant_phone" class="ui-input" autocomplete="off" />
          </div>
          <div class="ui-field">
            <label for="att-co">Company</label>
            <input id="att-co" v-model.trim="f.company" class="ui-input" autocomplete="off" />
          </div>
          <div class="ui-field">
            <label for="att-ticket">Ticket</label>
            <select id="att-ticket" v-model="f.ticket_type_id" class="ui-select">
              <option v-for="t in tickets" :key="t.id" :value="t.id">{{ t.name }} — {{ t.price > 0 ? money(t.price) : 'Free' }}{{ !t.is_active ? ' (off sale)' : '' }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="att-qty">Quantity</label>
            <input id="att-qty" v-model.number="f.quantity" type="number" min="1" max="100" class="ui-input" :class="{ 'is-invalid': errs.quantity }" />
            <div v-if="errs.quantity" class="err">{{ errs.quantity }}</div>
          </div>
          <div class="ui-field">
            <label for="att-status">Status</label>
            <select id="att-status" v-model="f.status" class="ui-select">
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="att-pay">Payment</label>
            <select id="att-pay" v-model="f.payment_status" class="ui-select" :disabled="total === 0">
              <option v-if="total === 0" value="free">Free</option>
              <option value="pending">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
        <div class="ui-field" style="margin-top: 4px">
          <label for="att-diet">Dietary / access requirements</label>
          <input id="att-diet" v-model="f.dietary_requirements" class="ui-input" />
        </div>
        <div class="ui-field">
          <label for="att-notes">Internal notes</label>
          <textarea id="att-notes" v-model="f.notes" class="ui-textarea" rows="2"></textarea>
        </div>
        <label v-if="!isEdit" class="ui-switch" style="margin-top: 4px"><input v-model="f.checked_in" type="checkbox" /> Check in now</label>
        <div class="total">
          <span>Total</span>
          <strong>{{ total > 0 ? money(total) : 'Free' }}</strong>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ isEdit ? 'Save changes' : 'Add attendee' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { eventsApi } from '@/services/events'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'AttendeeModal',
  props: {
    event: { type: Object, required: true },
    registration: { type: Object, default: null }
  },
  emits: ['close', 'saved'],
  data() {
    const r = this.registration
    const tickets = this.event.ticket_types || []
    const firstActive = tickets.find((t) => t.is_active) || tickets[0]
    return {
      f: {
        registrant_name: r ? r.registrant_name : '',
        registrant_email: r ? r.registrant_email : '',
        registrant_phone: r ? r.registrant_phone : '',
        company: r ? r.company : '',
        ticket_type_id: r ? r.ticket_type_id : firstActive ? firstActive.id : '',
        quantity: r ? r.quantity : 1,
        status: r ? r.status : 'confirmed',
        payment_status: r ? r.payment_status : 'pending',
        dietary_requirements: r ? r.dietary_requirements : '',
        notes: r ? r.notes : '',
        checked_in: false
      },
      errs: {},
      error: '',
      saving: false
    }
  },
  computed: {
    isEdit() {
      return !!this.registration
    },
    tickets() {
      const list = this.event.ticket_types || []
      return list.filter((t) => t.is_active || (this.registration && t.id === this.registration.ticket_type_id))
    },
    ticket() {
      return (this.event.ticket_types || []).find((t) => t.id === this.f.ticket_type_id)
    },
    total() {
      const price = this.ticket ? Number(this.ticket.price) || 0 : 0
      return Math.round(price * (Number(this.f.quantity) || 0) * 100) / 100
    }
  },
  watch: {
    total(v) {
      if (v === 0) this.f.payment_status = 'free'
      else if (this.f.payment_status === 'free') this.f.payment_status = 'pending'
    }
  },
  mounted() {
    if (this.total === 0) this.f.payment_status = 'free'
    this.$nextTick(() => this.$refs.first && this.$refs.first.focus())
  },
  methods: {
    money(v) {
      return formatMoney(v, this.event.currency || orgCurrency())
    },
    validate() {
      const e = {}
      if (!this.f.registrant_name) e.name = 'Name is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.f.registrant_email || '')) e.email = 'Enter a valid email.'
      const q = Number(this.f.quantity)
      if (!Number.isInteger(q) || q < 1 || q > 100) e.quantity = 'Between 1 and 100.'
      this.errs = e
      return !Object.keys(e).length
    },
    async submit() {
      this.error = ''
      if (!this.validate()) return
      this.saving = true
      const body = { ...this.f, quantity: Number(this.f.quantity) }
      if (this.isEdit) delete body.checked_in
      try {
        const reg = this.isEdit ? await eventsApi.updateRegistration(this.event.id, this.registration.id, body) : await eventsApi.addRegistration(this.event.id, body)
        toast.success(this.isEdit ? 'Registration updated' : `${reg.registrant_name} added`)
        this.$emit('saved', reg)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the registration')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.err {
  color: var(--danger);
  font-size: 12.5px;
  margin-top: 4px;
}
.total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
}
.total strong {
  font-size: 17px;
}
</style>
