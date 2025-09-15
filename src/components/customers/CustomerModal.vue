<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ customer?.id ? 'Edit Customer' : 'Add Customer' }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveCustomer">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">First Name *</label>
                  <input type="text" class="form-control" v-model="form.first_name" required>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Last Name *</label>
                  <input type="text" class="form-control" v-model="form.last_name" required>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" v-model="form.email">
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Phone *</label>
                  <input type="tel" class="form-control" v-model="form.phone" required>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Date of Birth</label>
              <input type="date" class="form-control" v-model="form.date_of_birth">
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
          <button type="button" class="btn btn-primary" @click="saveCustomer" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ customer?.id ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { customerService } from '@/services/customerService'

export default {
  name: 'CustomerModal',
  props: {
    customer: Object
  },
  emits: ['close', 'saved'],
  data() {
    return {
      loading: false,
      form: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
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
    if (this.customer) {
      Object.assign(this.form, this.customer)
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
    async saveCustomer() {
      this.loading = true
      try {
        if (this.customer?.id) {
          await customerService.updateCustomer(this.customer.id, this.form)
        } else {
          await customerService.createCustomer(this.form)
        }
        this.$emit('saved')
      } catch (error) {
        console.error('Error saving customer:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>