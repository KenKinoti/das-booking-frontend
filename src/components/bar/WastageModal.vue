<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 600px" role="dialog" aria-modal="true" aria-labelledby="w-title" data-testid="wastage-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="w-title">Log wastage</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <div class="ui-field">
          <span class="ui-label">What happened</span>
          <div class="chips" role="radiogroup" aria-label="Reason">
            <button v-for="r in WASTAGE_REASONS" :key="r.key" type="button" class="chip" :class="{ 'is-active': reason === r.key }" role="radio" :aria-checked="reason === r.key" :data-reason="r.key" @click="reason = r.key">
              <i :class="r.icon"></i> {{ r.label }}
            </button>
          </div>
        </div>
        <label class="ui-field">
          <span class="ui-label">At</span>
          <select v-model="loc" class="ui-select" required data-testid="w-loc">
            <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
        <div class="ui-field">
          <span class="ui-label">Item</span>
          <div v-if="item" class="picked">
            <strong>{{ item.name }}</strong>
            <small v-if="onHand !== null">{{ qtyText(onHand, item) }} at {{ locationName(loc) }}</small>
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="item = null">Change</button>
          </div>
          <ItemPicker v-else ref="picker" :items="items" placeholder="Search or scan the item" testid="w-pick" @pick="pick" />
        </div>
        <div v-if="item" class="ui-field">
          <span class="ui-label">How much</span>
          <QtyInput v-model:qty="qty" v-model:unit="unit" :item="item" :tot-ml="totMl" label="Wasted quantity" testid="w" />
        </div>
        <label v-if="needsStaff && staff.length > 1" class="ui-field">
          <span class="ui-label">{{ reason === 'staff_drink' ? 'Staff member' : 'Given by' }}</span>
          <select v-model="staffId" class="ui-select" data-testid="w-staff">
            <option v-for="u in staff" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
          <span class="ui-hint">Counts against their allowance for tonight’s shift.</span>
        </label>
        <label v-if="reason === 'comp'" class="ui-field">
          <span class="ui-label">For</span>
          <input v-model.trim="who" class="ui-input" maxlength="120" placeholder="Guest / table (optional)" />
        </label>
        <label class="ui-field">
          <span class="ui-label">Note</span>
          <input v-model.trim="note" class="ui-input" maxlength="300" placeholder="Optional" data-testid="w-note" />
        </label>
        <div v-if="approvalHint" class="ui-alert"><i class="fa-solid fa-circle-info"></i><span>{{ approvalHint }}</span></div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || !item || !reason" data-testid="w-save">{{ busy ? 'Saving…' : 'Log it' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { bar, locationName, orgTotMl, defaultBarId, myLocation } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { WASTAGE_REASONS, qtyText, isMl, reasonLabel } from '@/utils/barUnits'
import { usersService } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import ItemPicker from './ItemPicker.vue'
import QtyInput from './QtyInput.vue'

export default {
  name: 'WastageModal',
  components: { ItemPicker, QtyInput },
  props: {
    perm: { type: Object, required: true },
    productId: { type: String, default: '' },
    presetReason: { type: String, default: '' },
    locationId: { type: String, default: '' }
  },
  emits: ['close', 'saved'],
  data() {
    const mine = myLocation()
    return {
      bar,
      WASTAGE_REASONS,
      reason: this.presetReason || 'spillage',
      staff: [],
      staffId: useAuthStore().user?.id || '',
      loc: this.locationId || (bar.locations.some((l) => l.id === mine) ? mine : '') || defaultBarId() || bar.locations[0]?.id || '',
      items: [],
      item: null,
      qty: 1,
      unit: 'tot',
      who: '',
      note: '',
      busy: false,
      error: ''
    }
  },
  computed: {
    totMl() {
      return orgTotMl()
    },
    needsStaff() {
      return this.reason === 'comp' || this.reason === 'staff_drink'
    },
    onHand() {
      const it = this.items.find((x) => x.product_id === this.item?.product_id)
      return it && it.on_hand !== undefined ? Number(it.on_hand) || 0 : null
    },
    approvalHint() {
      if (!this.needsStaff) return ''
      const a = bar.settings?.comp_allowance_per_shift
      if (a === null || a === undefined || a === '') return ''
      return `Comps and staff drinks beyond ${a} drink${Number(a) === 1 ? '' : 's'} (tots or units) per shift wait for a manager’s approval before they leave stock.`
    }
  },
  watch: {
    loc() {
      this.loadItems()
    },
    item(it) {
      if (it) this.unit = isMl(it) ? (this.reason === 'breakage' ? 'bottle' : 'tot') : 'unit'
    }
  },
  async created() {
    this.loadStaff()
    await this.loadItems()
    if (this.productId) this.item = this.items.find((x) => x.product_id === this.productId) || null
  },
  methods: {
    qtyText,
    locationName,
    async loadItems() {
      try {
        this.items = (await barApi.items({ location_id: this.loc })).filter((it) => it.active !== false)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the stock items')
      }
    },
    pick(it) {
      this.item = it
    },
    async loadStaff() {
      const me = useAuthStore().user || {}
      const meRow = me.id ? [{ id: me.id, name: `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.email || 'Me' }] : []
      try {
        const r = await usersService.list({ limit: 200 })
        const list = (r.users || []).filter((u) => u.is_active !== false).map((u) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email }))
        this.staff = list.some((u) => u.id === me.id) ? list : [...meRow, ...list]
      } catch {
        this.staff = meRow
      }
    },
    async save() {
      this.error = ''
      if (!(Number(this.qty) > 0)) return (this.error = 'Enter how much was lost')
      const note = [this.reason === 'comp' && this.who && `For: ${this.who}`, this.note].filter(Boolean).join(' · ')
      this.busy = true
      try {
        const body = { location_id: this.loc, product_id: this.item.product_id, qty: Number(this.qty), unit: this.unit, reason: this.reason, note }
        if (this.needsStaff && this.staffId) body.staff_id = this.staffId
        const w = await barApi.logWastage(body)
        if (w?.status === 'pending') toast.info(`${reasonLabel(this.reason)} logged — waiting for a manager’s approval`)
        else toast.success(`${reasonLabel(this.reason)} of ${this.item.name} logged`)
        this.$emit('saved', w)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not log the wastage')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
}
.chip.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.picked {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.picked small {
  color: var(--text-3);
  flex: 1;
}
</style>
