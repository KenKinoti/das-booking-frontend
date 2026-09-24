<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-labelledby="vendor-title" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="vendor-title">{{ vendor ? 'Edit vendor' : 'New vendor' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body form">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <label class="ui-field">
          <span class="ui-label">Business name</span>
          <input ref="name" v-model="form.name" class="ui-input" :class="{ 'is-invalid': touched && !form.name.trim() }" placeholder="e.g. Officeworks" maxlength="160" />
        </label>
        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Contact person</span>
            <input v-model="form.contact_name" class="ui-input" maxlength="120" />
          </label>
          <label class="ui-field">
            <span class="ui-label">ABN / Tax ID</span>
            <input v-model="form.tax_id" class="ui-input" maxlength="40" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Email</span>
            <input v-model="form.email" type="email" class="ui-input" maxlength="160" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Phone</span>
            <input v-model="form.phone" type="tel" class="ui-input" maxlength="40" />
          </label>
        </div>
        <label class="ui-field">
          <span class="ui-label">Address</span>
          <textarea v-model="form.address" class="ui-textarea" rows="2" maxlength="400"></textarea>
        </label>
        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Payment terms</span>
            <select v-model="form.payment_terms" class="ui-select">
              <option v-for="t in terms" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Default expense account</span>
            <AccountSelect v-model="form.default_account_id" :accounts="accounts" :types="['Expense', 'Asset']" placeholder="Other Expenses" />
          </label>
        </div>
        <label class="ui-field">
          <span class="ui-label">Notes</span>
          <textarea v-model="form.notes" class="ui-textarea" rows="2" maxlength="1000"></textarea>
        </label>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ vendor ? 'Save changes' : 'Add vendor' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import AccountSelect from './AccountSelect.vue'
import { financeApi, PAYMENT_TERMS } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'VendorModal',
  components: { AccountSelect },
  props: {
    vendor: { type: Object, default: null },
    accounts: { type: Array, default: () => [] }
  },
  emits: ['close', 'saved'],
  data() {
    const v = this.vendor || {}
    return {
      form: {
        name: v.name || '',
        contact_name: v.contact_name || '',
        email: v.email || '',
        phone: v.phone || '',
        address: v.address || '',
        tax_id: v.tax_id || '',
        payment_terms: v.payment_terms || 'NET30',
        default_account_id: v.default_account_id || '',
        notes: v.notes || ''
      },
      saving: false,
      touched: false,
      error: ''
    }
  },
  computed: {
    terms() {
      return PAYMENT_TERMS
    }
  },
  mounted() {
    this.$refs.name?.focus()
  },
  methods: {
    async save() {
      this.touched = true
      this.error = ''
      if (!this.form.name.trim()) {
        this.error = 'Business name is required.'
        return
      }
      this.saving = true
      try {
        const saved = this.vendor ? await financeApi.updateVendor(this.vendor.id, this.form) : await financeApi.createVendor(this.form)
        toast.success(this.vendor ? 'Vendor updated' : `${saved.name} added`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the vendor')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.form {
  display: grid;
  gap: 14px;
}
@media (max-width: 600px) {
  .ui-grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
