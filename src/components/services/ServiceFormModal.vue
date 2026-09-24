<template>
  <div v-if="show" class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" :aria-label="title" @submit.prevent="submit">
      <div class="ui-modal__head">
        <div>
          <h2>{{ title }}</h2>
          <p class="sub">Services appear in bookings, the POS and invoices.</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="grid">
          <div class="ui-field span-2">
            <label for="sf-name">Service name <span class="req">*</span></label>
            <input id="sf-name" ref="name" v-model.trim="form.name" class="ui-input" :class="{ 'is-invalid': errors.name }" placeholder="e.g. Standard haircut" maxlength="255" />
            <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
          </div>
          <div class="ui-field span-2">
            <label for="sf-cat">Category <span class="req">*</span></label>
            <input id="sf-cat" v-model.trim="form.category" class="ui-input" :class="{ 'is-invalid': errors.category }" list="sf-cats" placeholder="Choose or type a new category" maxlength="100" />
            <datalist id="sf-cats">
              <option v-for="c in categoryOptions" :key="c" :value="c" />
            </datalist>
            <span v-if="errors.category" class="field-error">{{ errors.category }}</span>
          </div>
          <div class="ui-field">
            <label for="sf-dur">Duration <span class="req">*</span></label>
            <div class="suffix">
              <input id="sf-dur" v-model.number="form.duration" type="number" min="5" max="1440" step="5" class="ui-input" :class="{ 'is-invalid': errors.duration }" />
              <span>min</span>
            </div>
            <div class="chips">
              <button v-for="d in [15, 30, 45, 60, 90, 120]" :key="d" type="button" class="chip" :class="{ 'is-on': form.duration === d }" @click="form.duration = d">{{ d < 60 ? d + 'm' : d / 60 + 'h' }}</button>
            </div>
            <span v-if="errors.duration" class="field-error">{{ errors.duration }}</span>
          </div>
          <div class="ui-field">
            <label for="sf-price">Price <span class="req">*</span></label>
            <div class="ui-input-group">
              <i class="fa-solid fa-dollar-sign"></i>
              <input id="sf-price" v-model.number="form.price" type="number" min="0" step="0.01" class="ui-input" :class="{ 'is-invalid': errors.price }" />
            </div>
            <span class="ui-hint">Including tax, as charged to the customer.</span>
            <span v-if="errors.price" class="field-error">{{ errors.price }}</span>
          </div>
          <div class="ui-field span-4">
            <label for="sf-desc">Description</label>
            <textarea id="sf-desc" v-model="form.description" class="ui-textarea" rows="3" placeholder="What's included, preparation, aftercare…"></textarea>
          </div>
          <div class="span-4 switches">
            <label class="ui-switch">
              <input v-model="form.is_active" type="checkbox" />
              <span><strong>Active</strong> <small>Can be booked and sold</small></span>
            </label>
            <label class="ui-switch">
              <input v-model="form.requires_vehicle" type="checkbox" />
              <span><strong>Requires a vehicle</strong> <small>Ask for the customer's vehicle when booking</small></span>
            </label>
          </div>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i>
          {{ service?.id ? 'Save changes' : 'Create service' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { serviceService } from '@/services/serviceService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'ServiceFormModal',
  props: {
    show: { type: Boolean, default: false },
    service: { type: Object, default: null },
    categories: { type: Array, default: () => [] },
    presetCategory: { type: String, default: '' },
    presetVehicle: { type: Boolean, default: false }
  },
  emits: ['close', 'saved'],
  data() {
    return { form: {}, errors: {}, error: '', saving: false }
  },
  computed: {
    title() {
      return this.service?.id ? 'Edit service' : 'New service'
    },
    categoryOptions() {
      return [...new Set([...this.categories, this.presetCategory].filter(Boolean))].sort()
    }
  },
  watch: {
    show: {
      immediate: true,
      handler(v) {
        if (!v) return
        const s = this.service || {}
        this.form = {
          name: s.name || '',
          category: s.category || this.presetCategory || '',
          duration: s.duration || 60,
          price: s.price ?? '',
          description: s.description || '',
          is_active: s.id ? s.is_active !== false : true,
          requires_vehicle: s.id ? !!s.requires_vehicle : this.presetVehicle
        }
        this.errors = {}
        this.error = ''
        this.$nextTick(() => this.$refs.name?.focus())
      }
    }
  },
  methods: {
    close() {
      if (!this.saving) this.$emit('close')
    },
    validate() {
      const e = {}
      if (!this.form.name) e.name = 'Give the service a name'
      if (!this.form.category) e.category = 'Choose a category'
      if (!this.form.duration || this.form.duration < 1 || this.form.duration > 1440) e.duration = 'Between 1 and 1440 minutes'
      if (this.form.price === '' || this.form.price === null || Number(this.form.price) < 0) e.price = 'Enter a price (0 or more)'
      this.errors = e
      return !Object.keys(e).length
    },
    async submit() {
      if (!this.validate()) return
      this.saving = true
      this.error = ''
      try {
        const payload = { ...this.form, price: Number(this.form.price), duration: Number(this.form.duration) }
        const saved = this.service?.id ? await serviceService.update(this.service.id, payload) : await serviceService.create(payload)
        toast.success(this.service?.id ? 'Service updated' : 'Service created')
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the service')
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.span-2 {
  grid-column: span 2;
}

.span-4 {
  grid-column: 1 / -1;
}

.grid > .ui-field:not(.span-2):not(.span-4) {
  grid-column: span 2;
}

.suffix {
  position: relative;
}

.suffix span {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  font-size: 13px;
  pointer-events: none;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  padding: 2px 10px;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--border-strong);
}

.chip.is-on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.switches {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.switches small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.switches strong {
  color: var(--text);
  font-weight: 600;
}

.req {
  color: var(--danger);
}

.field-error {
  font-size: 12px;
  color: var(--danger);
}

@media (max-width: 560px) {
  .grid > .ui-field,
  .span-2 {
    grid-column: 1 / -1 !important;
  }
}
</style>
