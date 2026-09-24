<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 540px" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>Adjust stock</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div class="product">
          <div class="min0">
            <strong>{{ product.name }}</strong>
            <small>{{ product.sku }}</small>
          </div>
          <div class="on-hand">
            <span>On hand</span>
            <strong>{{ product.current_stock }}</strong>
          </div>
        </div>

        <div v-if="error" class="ui-alert ui-alert--danger" style="margin: 14px 0 0"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="modes" role="radiogroup" aria-label="Adjustment type">
          <button v-for="m in modes" :key="m.value" type="button" class="mode" :class="{ 'is-active': mode === m.value }" role="radio" :aria-checked="mode === m.value" @click="setMode(m.value)">
            <i :class="m.icon"></i>
            <span>{{ m.label }}</span>
          </button>
        </div>

        <div class="grid">
          <div class="ui-field">
            <label for="adj_qty">{{ mode === 'adjustment' ? 'New stock level' : 'Quantity' }}</label>
            <input id="adj_qty" ref="qty" v-model.number="quantity" type="number" min="0" step="1" class="ui-input qty" :class="{ 'is-invalid': qtyError }" />
            <div v-if="qtyError" class="field-err">{{ qtyError }}</div>
          </div>
          <div class="preview" :class="{ neg: newLevel < 0 }">
            <span>Result</span>
            <div>
              <span class="from">{{ product.current_stock }}</span>
              <i class="fa-solid fa-arrow-right"></i>
              <strong>{{ validQty ? newLevel : '—' }}</strong>
              <small v-if="validQty && delta !== 0" :class="delta > 0 ? 'up' : 'down'">{{ delta > 0 ? '+' : '' }}{{ delta }}</small>
            </div>
          </div>
        </div>

        <div class="ui-field">
          <label for="adj_reason">Reason</label>
          <select id="adj_reason" v-model="reason" class="ui-select">
            <option v-for="r in reasons" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <div class="ui-field" style="margin-top: 12px">
          <label for="adj_notes">Note (optional)</label>
          <input id="adj_notes" v-model="notes" class="ui-input" maxlength="500" placeholder="Anything worth remembering" />
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !!qtyError || !validQty || delta === 0">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save adjustment
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { inventoryService } from '@/services/inventoryService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const REASONS = {
  in: ['Stock received', 'Customer return', 'Found in stocktake', 'Correction', 'Other'],
  out: ['Damaged', 'Expired', 'Lost or stolen', 'Used internally', 'Returned to supplier', 'Correction', 'Other'],
  adjustment: ['Stocktake count', 'Correction', 'Other']
}

export default {
  name: 'StockAdjustmentModal',
  props: {
    product: { type: Object, required: true },
    initialMode: { type: String, default: 'in' }
  },
  emits: ['close', 'saved'],
  data() {
    const mode = ['in', 'out', 'adjustment'].includes(this.initialMode) ? this.initialMode : 'in'
    return {
      mode,
      quantity: mode === 'adjustment' ? this.product.current_stock : 1,
      reason: REASONS[mode][0],
      notes: '',
      saving: false,
      error: '',
      modes: [
        { value: 'in', label: 'Add', icon: 'fa-solid fa-plus' },
        { value: 'out', label: 'Remove', icon: 'fa-solid fa-minus' },
        { value: 'adjustment', label: 'Set count', icon: 'fa-solid fa-equals' }
      ]
    }
  },
  computed: {
    reasons() {
      return REASONS[this.mode]
    },
    validQty() {
      const q = Number(this.quantity)
      return this.quantity !== '' && this.quantity != null && Number.isInteger(q) && q >= 0
    },
    newLevel() {
      const cur = Number(this.product.current_stock) || 0
      const q = Number(this.quantity) || 0
      if (this.mode === 'in') return cur + q
      if (this.mode === 'out') return cur - q
      return q
    },
    delta() {
      return this.newLevel - (Number(this.product.current_stock) || 0)
    },
    qtyError() {
      if (this.quantity === '' || this.quantity == null) return ''
      if (!this.validQty) return 'Enter a whole number of 0 or more.'
      if (this.mode !== 'adjustment' && Number(this.quantity) === 0) return 'Enter at least 1.'
      if (this.newLevel < 0) return `Only ${this.product.current_stock} in stock.`
      return ''
    }
  },
  mounted() {
    this.$refs.qty?.focus()
    this.$refs.qty?.select()
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
    setMode(m) {
      this.mode = m
      this.reason = REASONS[m][0]
      this.quantity = m === 'adjustment' ? this.product.current_stock : 1
      this.$nextTick(() => this.$refs.qty?.select())
    },
    async save() {
      if (this.qtyError || !this.validQty || this.delta === 0) return
      this.saving = true
      this.error = ''
      try {
        const res = await inventoryService.adjustInventory({
          product_id: this.product.id,
          movement_type: this.mode,
          quantity: Number(this.quantity),
          reason: this.reason,
          notes: this.notes.trim()
        })
        toast.success(`${this.product.name}: stock ${res.data?.previous_quantity} → ${res.data?.new_quantity}`)
        this.$emit('saved', res.data?.product)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not adjust stock')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.product {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.min0 {
  min-width: 0;
}
.product strong {
  display: block;
  color: var(--text);
}
.product small {
  color: var(--text-3);
  font-size: 12px;
}
.on-hand {
  text-align: right;
  flex-shrink: 0;
}
.on-hand span {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}
.on-hand strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}
.mode {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-weight: 550;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mode:hover {
  background: var(--surface-hover);
}
.mode.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.qty {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.preview {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
}
.preview > span {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}
.preview > div {
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.preview .from {
  color: var(--text-3);
}
.preview i {
  font-size: 11px;
  color: var(--text-3);
}
.preview strong {
  font-size: 20px;
  color: var(--text);
}
.preview .up {
  color: var(--success);
  font-weight: 600;
}
.preview .down {
  color: var(--danger);
  font-weight: 600;
}
.preview.neg strong {
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
</style>
