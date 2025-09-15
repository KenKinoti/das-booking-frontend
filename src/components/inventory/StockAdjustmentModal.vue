<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Adjust Stock - {{ product?.name }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info">
            <strong>Current Stock:</strong> {{ product?.current_stock }} {{ product?.unit_of_measure }}
          </div>

          <form @submit.prevent="adjustStock">
            <div class="mb-3">
              <label class="form-label">Adjustment Type</label>
              <select class="form-select" v-model="form.movement_type" required>
                <option value="">Select Type</option>
                <option value="in">Stock In (Add)</option>
                <option value="out">Stock Out (Remove)</option>
                <option value="adjustment">Set Exact Amount</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">
                {{ form.movement_type === 'adjustment' ? 'New Stock Level' : 'Quantity' }}
              </label>
              <input type="number" class="form-control" v-model.number="form.quantity" min="0" required>
            </div>

            <div class="mb-3" v-if="form.movement_type === 'in'">
              <label class="form-label">Unit Cost</label>
              <input type="number" class="form-control" v-model.number="form.unit_cost" step="0.01">
            </div>

            <div class="mb-3">
              <label class="form-label">Reference</label>
              <input type="text" class="form-control" v-model="form.reference" placeholder="e.g., Purchase Order #123">
            </div>

            <div class="mb-3">
              <label class="form-label">Notes</label>
              <textarea class="form-control" v-model="form.notes" rows="3" placeholder="Reason for adjustment..."></textarea>
            </div>

            <div v-if="form.movement_type && form.quantity" class="alert alert-warning">
              <strong>New Stock Level:</strong> {{ calculateNewStock() }} {{ product?.unit_of_measure }}
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="button" class="btn btn-primary" @click="adjustStock" :disabled="loading || !canAdjust">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            Adjust Stock
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { inventoryService } from '@/services/inventoryService'

export default {
  name: 'StockAdjustmentModal',
  props: {
    product: Object
  },
  emits: ['close', 'adjusted'],
  data() {
    return {
      loading: false,
      form: {
        product_id: '',
        movement_type: '',
        quantity: 0,
        unit_cost: 0,
        reference: '',
        notes: ''
      }
    }
  },
  computed: {
    canAdjust() {
      return this.form.movement_type && this.form.quantity > 0
    }
  },
  created() {
    if (this.product) {
      this.form.product_id = this.product.id
      this.form.unit_cost = this.product.cost_price
    }
  },
  methods: {
    calculateNewStock() {
      if (!this.product || !this.form.quantity) return 0

      switch (this.form.movement_type) {
        case 'in':
          return this.product.current_stock + this.form.quantity
        case 'out':
          return Math.max(0, this.product.current_stock - this.form.quantity)
        case 'adjustment':
          return this.form.quantity
        default:
          return this.product.current_stock
      }
    },

    async adjustStock() {
      if (!this.canAdjust) return

      this.loading = true
      try {
        await inventoryService.adjustInventory(this.form)
        this.$emit('adjusted')
      } catch (error) {
        console.error('Error adjusting stock:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>