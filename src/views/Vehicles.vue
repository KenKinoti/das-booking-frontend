<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">{{ T.bookings }} &amp; {{ T.services }}</div>
        <h1>Vehicles</h1>
        <p>Every vehicle you service, who owns it and its odometer reading.</p>
      </div>
      <div class="ui-actions">
        <button v-if="canCreate" class="ui-btn ui-btn--primary" @click="startCreate"><i class="fa-solid fa-plus"></i> Add vehicle</button>
      </div>
    </header>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">{{ t.label }}</button>
        </div>
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="q" class="ui-input" type="search" placeholder="Search make, model, plate or VIN…" aria-label="Search vehicles" @input="debounced" />
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>
      <div v-else-if="loading && !loaded" class="ui-card__body">
        <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 40px; margin-bottom: 8px"></div>
      </div>
      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-car-side"></i></div>
        <h3>{{ q || status !== 'all' ? 'No vehicles match' : 'No vehicles yet' }}</h3>
        <p>{{ q || status !== 'all' ? 'Try a different search or status.' : `Add a ${T.customer.toLowerCase()}'s vehicle so it can be chosen on ${T.bookings.toLowerCase()}.` }}</p>
        <button v-if="canCreate && !q && status === 'all'" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="startCreate"><i class="fa-solid fa-plus"></i> Add vehicle</button>
      </div>
      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table" v-table-cards>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Plate</th>
              <th class="hide-sm">{{ T.customer }}</th>
              <th class="num hide-sm">Odometer</th>
              <th class="hide-md">VIN</th>
              <th>Status</th>
              <th class="actions-col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in rows" :key="v.id" :class="{ 'is-clickable': canEdit }" @click="canEdit && openEdit(v)">
              <td class="card-title"><strong>{{ v.year }} {{ v.make }} {{ v.model }}</strong><small v-if="v.color" class="muted"> · {{ v.color }}</small></td>
              <td><span class="plate">{{ v.license_plate || '—' }}</span></td>
              <td class="hide-sm card-show">{{ ownerName(v) }}</td>
              <td class="num hide-sm card-show">{{ v.mileage ? v.mileage.toLocaleString() + ' km' : '—' }}</td>
              <td class="hide-md mono card-show">{{ v.vin || '—' }}</td>
              <td><span class="ui-badge" :class="v.is_active ? 'ui-badge--success' : 'ui-badge--draft'">{{ v.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions-col" @click.stop>
                <div class="row-actions">
                  <button v-if="canEdit" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit" :aria-label="`Edit ${v.make} ${v.model}`" @click="openEdit(v)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button v-if="canDelete" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger" title="Delete" :aria-label="`Delete ${v.make} ${v.model}`" @click="remove(v)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Choose the owner, then the vehicle form -->
    <div v-if="picking" class="ui-modal-backdrop" @mousedown.self="picking = false">
      <form class="ui-modal" style="max-width: 480px" role="dialog" aria-modal="true" aria-labelledby="vh-owner-title" @submit.prevent="ownerChosen">
        <div class="ui-modal__head">
          <h2 id="vh-owner-title">Whose vehicle is it?</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Close" @click="picking = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-field">
            <label for="vh-owner">{{ T.customer }}</label>
            <select id="vh-owner" v-model="ownerId" class="ui-select">
              <option value="" disabled>Choose a {{ T.customer.toLowerCase() }}</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ customerName(c) }}</option>
            </select>
            <span v-if="!customers.length" class="ui-hint">Add a {{ T.customer.toLowerCase() }} first on the {{ T.customers }} page.</span>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="picking = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!ownerId">Continue</button>
        </div>
      </form>
    </div>

    <VehicleFormModal :show="form.open" :vehicle="form.vehicle" :customer-id="form.customerId" :owner-name="form.ownerName" @close="form.open = false" @saved="onSaved" />
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { customerService, customerName } from '@/services/customerService'
import VehicleFormModal from '@/components/VehicleFormModal.vue'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { access, can } from '@/composables/useAccess'

/** Vehicle register for workshop-type businesses (core /vehicles API). */
export default {
  name: 'Vehicles',
  components: { VehicleFormModal },
  data() {
    return {
      rows: [],
      loading: false,
      loaded: false,
      error: '',
      q: '',
      status: 'all',
      timer: null,
      customers: [],
      picking: false,
      ownerId: '',
      form: { open: false, vehicle: null, customerId: '', ownerName: '' },
      tabs: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  },
  computed: {
    T() {
      return access.terms
    },
    canCreate() {
      return can('bookings', 'create') || can('crm', 'create')
    },
    canEdit() {
      return can('bookings', 'edit') || can('crm', 'edit')
    },
    canDelete() {
      return can('bookings', 'delete') || can('crm', 'delete')
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    customerName,
    ownerName(v) {
      return v.customer ? customerName(v.customer) : '—'
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const params = { search: this.q || undefined, status: this.status === 'all' ? undefined : this.status }
        const r = await api.get('/vehicles', { params })
        this.rows = r.data?.vehicles || []
        this.loaded = true
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load vehicles')
      } finally {
        this.loading = false
      }
    },
    debounced() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.load, 250)
    },
    setStatus(s) {
      this.status = s
      this.load()
    },
    async startCreate() {
      this.ownerId = ''
      this.picking = true
      if (!this.customers.length) {
        try {
          this.customers = (await customerService.list({ limit: 500 })).sort((a, b) => customerName(a).localeCompare(customerName(b)))
        } catch {
          this.customers = []
        }
      }
    },
    ownerChosen() {
      const c = this.customers.find((x) => x.id === this.ownerId)
      this.picking = false
      this.form = { open: true, vehicle: null, customerId: this.ownerId, ownerName: c ? customerName(c) : '' }
    },
    openEdit(v) {
      this.form = { open: true, vehicle: v, customerId: v.customer_id, ownerName: this.ownerName(v) }
    },
    onSaved() {
      this.form.open = false
      this.load()
    },
    async remove(v) {
      const ok = await confirmDialog({ title: `Delete ${v.year} ${v.make} ${v.model}?`, message: 'Past job cards keep their history.', confirmText: 'Delete vehicle', danger: true })
      if (!ok) return
      try {
        await customerService.removeVehicle(v.id)
        toast.success('Vehicle deleted')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the vehicle'))
      }
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.search {
  width: min(320px, 100%);
}

.plate {
  display: inline-block;
  padding: 2px 7px;
  border: 1px solid var(--border-strong);
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  letter-spacing: 0.04em;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}

.muted {
  color: var(--text-3);
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}

.actions-col {
  width: 90px;
  text-align: right;
}

.danger {
  color: var(--danger);
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }

  .search {
    width: 100%;
  }
}

@media (max-width: 900px) {
  .hide-md {
    display: none;
  }
}
</style>
