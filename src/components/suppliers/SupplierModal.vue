<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 720px" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>{{ isEdit ? 'Edit supplier' : 'Add supplier' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="section-label">Business</div>
        <div class="grid">
          <div class="ui-field span-2">
            <label for="sup_name">Supplier name <span class="req">*</span></label>
            <input id="sup_name" ref="name" v-model="form.name" class="ui-input" :class="{ 'is-invalid': errors.name }" maxlength="255" placeholder="e.g. Metro Auto Parts" />
            <div v-if="errors.name" class="field-err">{{ errors.name }}</div>
          </div>
          <div class="ui-field">
            <label for="sup_contact">Contact person</label>
            <input id="sup_contact" v-model="form.contact_person" class="ui-input" placeholder="Full name" />
          </div>
          <div class="ui-field">
            <label for="sup_abn">ABN</label>
            <input id="sup_abn" v-model="form.abn" class="ui-input" :class="{ 'is-invalid': errors.abn }" inputmode="numeric" placeholder="11 digits" />
            <div v-if="errors.abn" class="field-err">{{ errors.abn }}</div>
          </div>
          <div class="ui-field">
            <label for="sup_email">Email</label>
            <input id="sup_email" v-model="form.email" type="email" class="ui-input" :class="{ 'is-invalid': errors.email }" placeholder="orders@supplier.com" />
            <div v-if="errors.email" class="field-err">{{ errors.email }}</div>
          </div>
          <div class="ui-field">
            <label for="sup_phone">Phone</label>
            <input id="sup_phone" v-model="form.phone" type="tel" class="ui-input" :class="{ 'is-invalid': errors.phone }" maxlength="20" placeholder="02 9000 0000" />
            <div v-if="errors.phone" class="field-err">{{ errors.phone }}</div>
          </div>
        </div>

        <div class="section-label">Address</div>
        <div class="grid">
          <div class="ui-field span-2">
            <label for="sup_street">Street</label>
            <input id="sup_street" v-model="form.address.street" class="ui-input" placeholder="Street address" />
          </div>
          <div class="ui-field">
            <label for="sup_suburb">Suburb / city</label>
            <input id="sup_suburb" v-model="form.address.suburb" class="ui-input" />
          </div>
          <div class="grid-inner">
            <div class="ui-field">
              <label for="sup_state">State</label>
              <input id="sup_state" v-model="form.address.state" class="ui-input" maxlength="50" list="au-states" />
              <datalist id="au-states"><option v-for="s in states" :key="s" :value="s" /></datalist>
            </div>
            <div class="ui-field">
              <label for="sup_postcode">Postcode</label>
              <input id="sup_postcode" v-model="form.address.postcode" class="ui-input" maxlength="10" inputmode="numeric" />
            </div>
          </div>
        </div>

        <div class="section-label">Terms</div>
        <div class="grid">
          <div class="ui-field">
            <label for="sup_terms">Payment terms</label>
            <input id="sup_terms" v-model="form.payment_terms" class="ui-input" list="payment-terms" placeholder="e.g. Net 30" />
            <datalist id="payment-terms"><option v-for="t in terms" :key="t" :value="t" /></datalist>
          </div>
          <div class="ui-field">
            <label for="sup_status">Status</label>
            <select id="sup_status" v-model="form.is_active" class="ui-select">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </div>
          <div class="ui-field span-2">
            <label for="sup_notes">Notes</label>
            <textarea id="sup_notes" v-model="form.notes" class="ui-textarea" rows="3" placeholder="Account numbers, delivery days, rep details…"></textarea>
          </div>
        </div>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i>
          {{ isEdit ? 'Save changes' : 'Add supplier' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { supplierService, PAYMENT_TERMS } from '@/services/supplierService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const blank = () => ({
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  abn: '',
  payment_terms: '',
  notes: '',
  is_active: true,
  address: { street: '', suburb: '', state: '', postcode: '', country: 'Australia' }
})

export default {
  name: 'SupplierModal',
  props: {
    supplier: { type: Object, default: null }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      form: blank(),
      errors: {},
      error: '',
      saving: false,
      terms: PAYMENT_TERMS,
      states: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
    }
  },
  computed: {
    isEdit() {
      return !!this.supplier?.id
    }
  },
  created() {
    if (this.supplier) {
      const s = this.supplier
      this.form = {
        ...blank(),
        name: s.name || '',
        contact_person: s.contact_person || '',
        email: s.email || '',
        phone: s.phone || '',
        abn: s.abn || '',
        payment_terms: s.payment_terms || '',
        notes: s.notes || '',
        is_active: s.is_active !== false,
        address: { ...blank().address, ...(s.address || {}) }
      }
    }
  },
  mounted() {
    this.$refs.name?.focus()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    validate() {
      const e = {}
      const f = this.form
      if (!f.name.trim()) e.name = 'Enter the supplier name.'
      if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
      if (f.phone.trim().length > 20) e.phone = 'Keep the phone number under 20 characters.'
      const abn = f.abn.replace(/\s+/g, '')
      if (abn && !/^\d{11}$/.test(abn)) e.abn = 'An ABN is 11 digits.'
      this.errors = e
      return !Object.keys(e).length
    },
    async save() {
      this.error = ''
      if (!this.validate()) return
      this.saving = true
      const payload = { ...this.form, abn: this.form.abn.replace(/\s+/g, ''), address: { ...this.form.address } }
      try {
        const res = this.isEdit ? await supplierService.updateSupplier(this.supplier.id, payload) : await supplierService.createSupplier(payload)
        toast.success(this.isEdit ? 'Supplier updated' : `${payload.name} added`)
        this.$emit('saved', res.data?.supplier)
      } catch (err) {
        this.error = apiErrorMessage(err, 'Could not save the supplier')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.section-label {
  font-size: 11.5px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  margin: 4px 0 10px;
}
.section-label:not(:first-of-type) {
  margin-top: 18px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
}
.grid-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.span-2 {
  grid-column: span 2;
}
.req {
  color: var(--danger);
}
.is-invalid {
  border-color: var(--danger) !important;
}
.field-err {
  color: var(--danger);
  font-size: 12px;
  margin-top: 4px;
}
@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: auto;
  }
}
</style>
