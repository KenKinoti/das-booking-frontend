<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ supplier?.id ? 'Edit Supplier' : 'Add Supplier' }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveSupplier">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Supplier Name *</label>
                  <input type="text" class="form-control" v-model="form.name" required>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">ABN</label>
                  <input type="text" class="form-control" v-model="form.abn">
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Contact Person</label>
                  <input type="text" class="form-control" v-model="form.contact_person">
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" v-model="form.email">
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Phone</label>
                  <input type="tel" class="form-control" v-model="form.phone">
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Payment Terms</label>
                  <select class="form-select" v-model="form.payment_terms">
                    <option value="">Select Terms</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="NET7">Net 7 Days</option>
                    <option value="NET15">Net 15 Days</option>
                    <option value="NET30">Net 30 Days</option>
                    <option value="NET60">Net 60 Days</option>
                  </select>
                </div>
              </div>
            </div>

            <h6>Address</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Street</label>
                  <input type="text" class="form-control" v-model="form.address.street">
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Suburb</label>
                  <input type="text" class="form-control" v-model="form.address.suburb">
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">State</label>
                  <select class="form-select" v-model="form.address.state">
                    <option value="">Select State</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">Postcode</label>
                  <input type="text" class="form-control" v-model="form.address.postcode">
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">Country</label>
                  <input type="text" class="form-control" v-model="form.address.country" value="Australia">
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Credit Limit</label>
                  <input type="number" class="form-control" v-model.number="form.credit_limit" step="0.01" min="0">
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Rating (1-5)</label>
                  <select class="form-select" v-model.number="form.rating">
                    <option value="0">No Rating</option>
                    <option value="1">⭐ (1 Star)</option>
                    <option value="2">⭐⭐ (2 Stars)</option>
                    <option value="3">⭐⭐⭐ (3 Stars)</option>
                    <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Notes</label>
              <textarea class="form-control" v-model="form.notes" rows="3"></textarea>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" v-model="form.is_active" id="isActive">
              <label class="form-check-label" for="isActive">Active</label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="button" class="btn btn-primary" @click="saveSupplier" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ supplier?.id ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supplierService } from '@/services/supplierService'

export default {
  name: 'SupplierModal',
  props: {
    supplier: Object
  },
  emits: ['close', 'saved'],
  data() {
    return {
      loading: false,
      form: {
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        abn: '',
        payment_terms: '',
        credit_limit: 0,
        rating: 0,
        notes: '',
        is_active: true,
        address: {
          street: '',
          suburb: '',
          state: '',
          postcode: '',
          country: 'Australia'
        }
      }
    }
  },
  created() {
    if (this.supplier) {
      Object.assign(this.form, this.supplier)
      if (!this.form.address) {
        this.form.address = {
          street: '',
          suburb: '',
          state: '',
          postcode: '',
          country: 'Australia'
        }
      }
    }
  },
  methods: {
    async saveSupplier() {
      this.loading = true
      try {
        if (this.supplier?.id) {
          await supplierService.updateSupplier(this.supplier.id, this.form)
        } else {
          await supplierService.createSupplier(this.form)
        }
        this.$emit('saved')
      } catch (error) {
        console.error('Error saving supplier:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>