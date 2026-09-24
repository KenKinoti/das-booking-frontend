<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 680px" novalidate @submit.prevent="submit">
      <div class="ui-modal__head">
        <h2>Receive stock · {{ order.order_number }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <p class="intro">Enter what arrived in this delivery. Stock levels go up straight away and each line is recorded in the product's stock history.</p>
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 14px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="quick">
          <button type="button" class="ui-btn ui-btn--sm" @click="fillAll"><i class="fa-solid fa-check-double"></i> Everything outstanding</button>
          <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="clearAll">Clear</button>
        </div>

        <div class="rows">
          <div v-for="l in lines" :key="l.id" class="rcv-row" :class="{ done: l.outstanding === 0 }">
            <div class="info">
              <strong>{{ l.name }}</strong>
              <small>{{ l.sku }} · ordered {{ l.quantity }} · received {{ l.received }}</small>
            </div>
            <div class="qty">
              <template v-if="l.outstanding > 0">
                <button type="button" class="ui-btn ui-btn--icon ui-btn--sm" aria-label="Decrease" @click="l.now = Math.max(0, (l.now || 0) - 1)"><i class="fa-solid fa-minus"></i></button>
                <input v-model.number="l.now" type="number" min="0" :max="l.outstanding" class="ui-input" :aria-label="`Quantity received for ${l.name}`" :class="{ 'is-invalid': invalid(l) }" />
                <button type="button" class="ui-btn ui-btn--icon ui-btn--sm" aria-label="Increase" @click="l.now = Math.min(l.outstanding, (l.now || 0) + 1)"><i class="fa-solid fa-plus"></i></button>
                <span class="of">of {{ l.outstanding }}</span>
              </template>
              <span v-else class="ui-badge ui-badge--success"><i class="fa-solid fa-check"></i> Complete</span>
            </div>
          </div>
        </div>

        <div class="ui-field" style="margin-top: 14px">
          <label for="rcv_notes">Delivery note (optional)</label>
          <input id="rcv_notes" v-model="notes" class="ui-input" placeholder="e.g. Docket #4411, 1 carton damaged" />
        </div>
      </div>
      <div class="ui-modal__foot">
        <span class="summary">{{ totalNow }} unit{{ totalNow === 1 ? '' : 's' }} · {{ willComplete ? 'order will be fully received' : 'order stays partially received' }}</span>
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--success" :disabled="saving || totalNow === 0 || hasInvalid">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-box-open'"></i> Receive {{ totalNow || '' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { supplierService } from '@/services/supplierService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'ReceiveStockModal',
  props: { order: { type: Object, required: true } },
  emits: ['close', 'received'],
  data() {
    return {
      notes: '',
      saving: false,
      error: '',
      lines: (this.order.items || []).map((it) => {
        const outstanding = Math.max(0, (it.quantity || 0) - (it.quantity_received || 0))
        return {
          id: it.id,
          name: it.product?.name || 'Deleted product',
          sku: it.product?.sku || '—',
          quantity: it.quantity,
          received: it.quantity_received || 0,
          outstanding,
          now: outstanding
        }
      })
    }
  },
  computed: {
    totalNow() {
      return this.lines.reduce((s, l) => s + (Number(l.now) > 0 ? Number(l.now) : 0), 0)
    },
    hasInvalid() {
      return this.lines.some((l) => this.invalid(l))
    },
    willComplete() {
      return this.lines.every((l) => (Number(l.now) || 0) >= l.outstanding)
    }
  },
  mounted() {
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
    invalid(l) {
      const n = Number(l.now)
      return l.now !== '' && l.now != null && (!Number.isInteger(n) || n < 0 || n > l.outstanding)
    },
    fillAll() {
      this.lines.forEach((l) => (l.now = l.outstanding))
    },
    clearAll() {
      this.lines.forEach((l) => (l.now = 0))
    },
    async submit() {
      if (this.hasInvalid || !this.totalNow) return
      this.saving = true
      this.error = ''
      try {
        const items = this.lines.filter((l) => Number(l.now) > 0).map((l) => ({ item_id: l.id, quantity_received: Number(l.now) }))
        const res = await supplierService.receivePurchaseOrder(this.order.id, items, this.notes)
        toast.success(res.data?.message || 'Stock received')
        this.$emit('received', res.data?.purchase_order)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not receive stock')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.intro {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 13.5px;
}
.quick {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.rows {
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.rcv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid var(--border);
}
.rcv-row:first-child {
  border-top: 0;
}
.rcv-row.done {
  opacity: 0.7;
}
.info {
  min-width: 0;
}
.info strong {
  display: block;
  color: var(--text);
  font-weight: 600;
}
.info small {
  color: var(--text-3);
  font-size: 12px;
}
.qty {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.qty .ui-input {
  width: 68px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.of {
  color: var(--text-3);
  font-size: 12.5px;
  min-width: 38px;
}
.is-invalid {
  border-color: var(--danger) !important;
}
.summary {
  margin-right: auto;
  color: var(--text-3);
  font-size: 12.5px;
}
@media (max-width: 560px) {
  .rcv-row {
    flex-direction: column;
    align-items: stretch;
  }
  .summary {
    display: none;
  }
}
</style>
