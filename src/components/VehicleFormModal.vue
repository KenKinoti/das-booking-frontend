<template>
  <div v-if="show" class="ui-modal-backdrop" style="z-index: 2100" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" :aria-label="title" @submit.prevent="submit">
      <div class="ui-modal__head">
        <div>
          <h2>{{ title }}</h2>
          <p v-if="ownerName" class="sub">Owner: {{ ownerName }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="grid">
          <div class="ui-field">
            <label for="vf-make">Make <span class="req">*</span></label>
            <input id="vf-make" ref="make" v-model.trim="form.make" class="ui-input" :class="{ 'is-invalid': errors.make }" list="vf-makes" placeholder="Toyota" />
            <datalist id="vf-makes">
              <option v-for="m in makes" :key="m" :value="m" />
            </datalist>
            <span v-if="errors.make" class="field-error">{{ errors.make }}</span>
          </div>
          <div class="ui-field">
            <label for="vf-model">Model <span class="req">*</span></label>
            <input id="vf-model" v-model.trim="form.model" class="ui-input" :class="{ 'is-invalid': errors.model }" placeholder="Corolla" />
            <span v-if="errors.model" class="field-error">{{ errors.model }}</span>
          </div>
          <div class="ui-field">
            <label for="vf-year">Year <span class="req">*</span></label>
            <input id="vf-year" v-model.number="form.year" type="number" class="ui-input" :class="{ 'is-invalid': errors.year }" :min="1900" :max="maxYear" />
            <span v-if="errors.year" class="field-error">{{ errors.year }}</span>
          </div>
          <div class="ui-field">
            <label for="vf-plate">Licence plate</label>
            <input id="vf-plate" v-model.trim="form.license_plate" class="ui-input mono" maxlength="20" placeholder="ABC123" @input="form.license_plate = form.license_plate.toUpperCase()" />
          </div>
          <div class="ui-field">
            <label for="vf-color">Colour</label>
            <input id="vf-color" v-model.trim="form.color" class="ui-input" maxlength="30" />
          </div>
          <div class="ui-field">
            <label for="vf-km">Odometer (km)</label>
            <input id="vf-km" v-model.number="form.mileage" type="number" min="0" step="1" class="ui-input" :class="{ 'is-invalid': errors.mileage }" />
            <span v-if="errors.mileage" class="field-error">{{ errors.mileage }}</span>
          </div>
          <div class="ui-field span-2">
            <label for="vf-vin">VIN</label>
            <input id="vf-vin" v-model.trim="form.vin" class="ui-input mono" maxlength="17" placeholder="17 characters" @input="form.vin = form.vin.toUpperCase()" />
            <span v-if="errors.vin" class="field-error">{{ errors.vin }}</span>
          </div>
          <div class="ui-field span-3">
            <label for="vf-notes">Notes</label>
            <textarea id="vf-notes" v-model="form.notes" class="ui-textarea" rows="2"></textarea>
          </div>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i>
          {{ vehicle?.id ? 'Save vehicle' : 'Add vehicle' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { customerService } from '@/services/customerService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'VehicleFormModal',
  props: {
    show: { type: Boolean, default: false },
    vehicle: { type: Object, default: null },
    customerId: { type: String, default: '' },
    ownerName: { type: String, default: '' }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      form: {},
      errors: {},
      error: '',
      saving: false,
      maxYear: new Date().getFullYear() + 1,
      makes: ['Toyota', 'Mazda', 'Ford', 'Hyundai', 'Kia', 'Mitsubishi', 'Nissan', 'Honda', 'Subaru', 'Volkswagen', 'Holden', 'BMW', 'Mercedes-Benz', 'Audi', 'Tesla', 'Isuzu', 'Suzuki', 'MG', 'BYD']
    }
  },
  computed: {
    title() {
      return this.vehicle?.id ? 'Edit vehicle' : 'Add vehicle'
    }
  },
  watch: {
    show: {
      immediate: true,
      handler(v) {
        if (!v) return
        const x = this.vehicle || {}
        this.form = {
          make: x.make || '',
          model: x.model || '',
          year: x.year || new Date().getFullYear(),
          license_plate: x.license_plate || '',
          vin: x.vin || '',
          color: x.color || '',
          mileage: x.mileage ?? 0,
          notes: x.notes || ''
        }
        this.errors = {}
        this.error = ''
        this.$nextTick(() => this.$refs.make?.focus())
      }
    }
  },
  methods: {
    close() {
      if (!this.saving) this.$emit('close')
    },
    validate() {
      const e = {}
      if (!this.form.make) e.make = 'Make is required'
      if (!this.form.model) e.model = 'Model is required'
      if (!this.form.year || this.form.year < 1900 || this.form.year > this.maxYear) e.year = `Enter a year between 1900 and ${this.maxYear}`
      if (this.form.mileage !== '' && Number(this.form.mileage) < 0) e.mileage = 'Cannot be negative'
      if (this.form.vin && this.form.vin.length !== 17) e.vin = 'A VIN has 17 characters'
      this.errors = e
      return !Object.keys(e).length
    },
    async submit() {
      if (!this.validate()) return
      this.saving = true
      this.error = ''
      try {
        const payload = { ...this.form, mileage: Number(this.form.mileage) || 0, year: Number(this.form.year) }
        let saved
        if (this.vehicle?.id) saved = await customerService.updateVehicle(this.vehicle.id, payload)
        else saved = await customerService.createVehicle({ ...payload, customer_id: this.customerId })
        toast.success(this.vehicle?.id ? 'Vehicle updated' : 'Vehicle added')
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the vehicle')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.span-2 {
  grid-column: span 2;
}

.span-3 {
  grid-column: 1 / -1;
}

.mono {
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}

.req {
  color: var(--danger);
}

.field-error {
  font-size: 12px;
  color: var(--danger);
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
  .span-2 {
    grid-column: 1 / -1;
  }
}
</style>
