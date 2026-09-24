<template>
  <component :is="embedded ? 'div' : 'ModalShell'" v-if="embedded || show" v-bind="embedded ? {} : { title: `Vehicles · ${ownerName}` }" @close="$emit('close')">
    <div class="vm">
      <div class="vm__head">
        <span class="muted">{{ vehicles.length ? `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}` : '' }}</span>
        <button class="ui-btn ui-btn--sm ui-btn--primary" type="button" @click="openForm(null)"><i class="fa-solid fa-plus"></i> Add vehicle</button>
      </div>

      <div v-if="loading" class="vm__list">
        <div v-for="n in 2" :key="n" class="ui-skeleton" style="height: 64px; border-radius: 12px"></div>
      </div>
      <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Retry</a></span></div>
      <div v-else-if="!vehicles.length" class="vm__empty">
        <i class="fa-solid fa-car-side"></i>
        <p>No vehicles recorded for this customer.</p>
      </div>
      <ul v-else class="vm__list">
        <li v-for="v in vehicles" :key="v.id" class="vm__item" :class="{ 'is-off': !v.is_active }">
          <span class="vm__icon"><i class="fa-solid fa-car"></i></span>
          <div class="vm__main">
            <strong>{{ v.year }} {{ v.make }} {{ v.model }}</strong>
            <div class="vm__meta">
              <span v-if="v.license_plate" class="plate">{{ v.license_plate }}</span>
              <span v-if="v.color">{{ v.color }}</span>
              <span v-if="v.mileage">{{ Number(v.mileage).toLocaleString() }} km</span>
              <span v-if="v.vin" class="mono" :title="'VIN ' + v.vin">VIN …{{ v.vin.slice(-6) }}</span>
              <span v-if="!v.is_active" class="ui-badge">Inactive</span>
            </div>
          </div>
          <div class="vm__actions">
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" type="button" title="Edit vehicle" aria-label="Edit vehicle" @click="openForm(v)"><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger" type="button" title="Delete vehicle" aria-label="Delete vehicle" @click="remove(v)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </li>
      </ul>
    </div>

    <VehicleFormModal :show="formOpen" :vehicle="editing" :customer-id="customer?.id || ''" :owner-name="ownerName" @close="formOpen = false" @saved="onSaved" />
  </component>
</template>

<script>
import { h } from 'vue'
import VehicleFormModal from './VehicleFormModal.vue'
import { customerService, customerName } from '@/services/customerService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

// Minimal modal wrapper used when the list is shown on its own.
const ModalShell = {
  props: { title: String },
  emits: ['close'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { class: 'ui-modal-backdrop', onMousedown: (e) => e.target === e.currentTarget && emit('close') }, [
        h('div', { class: 'ui-modal', style: 'max-width: 640px', role: 'dialog', 'aria-modal': 'true' }, [
          h('div', { class: 'ui-modal__head' }, [
            h('h2', props.title),
            h('button', { class: 'ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon', type: 'button', title: 'Close', 'aria-label': 'Close', onClick: () => emit('close') }, [h('i', { class: 'fa-solid fa-xmark' })])
          ]),
          h('div', { class: 'ui-modal__body' }, slots.default?.())
        ])
      ])
  }
}

export default {
  name: 'VehicleManagementModal',
  components: { VehicleFormModal, ModalShell },
  props: {
    show: { type: Boolean, default: false },
    customer: { type: Object, default: null },
    embedded: { type: Boolean, default: false },
    initial: { type: Array, default: null }
  },
  emits: ['close', 'changed'],
  data() {
    return { vehicles: [], loading: false, error: '', formOpen: false, editing: null }
  },
  computed: {
    ownerName() {
      return customerName(this.customer)
    }
  },
  watch: {
    'customer.id': {
      immediate: true,
      handler() {
        if (this.initial) this.vehicles = [...this.initial]
        else if (this.customer?.id && (this.embedded || this.show)) this.load()
      }
    },
    show(v) {
      if (v && !this.embedded) this.load()
    },
    initial(v) {
      if (v) this.vehicles = [...v]
    }
  },
  methods: {
    async load() {
      if (!this.customer?.id) return
      this.loading = true
      this.error = ''
      try {
        this.vehicles = await customerService.vehicles(this.customer.id)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load vehicles')
      } finally {
        this.loading = false
      }
    },
    openForm(v) {
      this.editing = v
      this.formOpen = true
    },
    async onSaved() {
      this.formOpen = false
      await this.load()
      this.$emit('changed', this.vehicles)
    },
    async remove(v) {
      const ok = await confirmDialog({
        title: 'Delete vehicle?',
        message: `${v.year} ${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''} will be removed from this customer.`,
        confirmText: 'Delete vehicle',
        danger: true
      })
      if (!ok) return
      try {
        await customerService.removeVehicle(v.id)
        toast.success('Vehicle deleted')
        await this.load()
        this.$emit('changed', this.vehicles)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the vehicle'))
      }
    }
  }
}
</script>

<style scoped>
.vm__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.muted {
  color: var(--text-3);
  font-size: 13px;
}

.vm__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.vm__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.vm__item.is-off {
  opacity: 0.65;
}

.vm__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--info-soft);
  color: var(--info);
  flex-shrink: 0;
}

.vm__main {
  flex: 1;
  min-width: 0;
}

.vm__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: 12.5px;
  color: var(--text-3);
  margin-top: 3px;
  align-items: center;
}

.plate {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  padding: 0 6px;
  letter-spacing: 0.05em;
}

.mono {
  font-family: var(--font-mono);
}

.vm__actions {
  display: flex;
  gap: 2px;
}

.danger:hover {
  color: var(--danger);
}

.vm__empty {
  text-align: center;
  padding: 28px 12px;
  color: var(--text-3);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
}

.vm__empty i {
  font-size: 22px;
  margin-bottom: 8px;
  color: var(--text-3);
}

.vm__empty p {
  margin: 0;
}
</style>
