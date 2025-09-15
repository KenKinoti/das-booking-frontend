<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Create Purchase Order</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="savePurchaseOrder">
            <div class="row mb-4">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Supplier *</label>
                  <select class="form-select" v-model="form.supplier_id" required>
                    <option value="">Select Supplier</option>
                    <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                      {{ supplier.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="mb-3">
                  <label class="form-label">Order Date *</label>
                  <input type="date" class="form-control" v-model="form.order_date" required>
                </div>
              </div>
              <div class="col-md-3">
                <div class="mb-3">
                  <label class="form-label">Expected Date</label>
                  <input type="date" class="form-control" v-model="form.expected_date">
                </div>
              </div>
            </div>

            <!-- Order Items -->
            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6>Order Items</h6>
                <button type="button" class="btn btn-sm btn-primary" @click="addItem">
                  <i class="bi bi-plus me-1"></i>Add Item
                </button>
              </div>

              <div class="table-responsive">
                <table class="table table-bordered">
                  <thead>
                    <tr>
                      <th style="width: 40%;">Product</th>
                      <th style="width: 15%;">Quantity</th>
                      <th style="width: 15%;">Unit Cost</th>
                      <th style="width: 15%;">Total</th>
                      <th style="width: 10%;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in form.items" :key="index">
                      <td>
                        <select class="form-select" v-model="item.product_id" @change="updateItemDetails(index)" required>
                          <option value="">Select Product</option>
                          <option v-for="product in products" :key="product.id" :value="product.id">
                            {{ product.name }} ({{ product.sku }})
                          </option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          class="form-control"
                          v-model.number="item.quantity"
                          min="1"
                          @input="calculateItemTotal(index)"
                          required
                        >
                      </td>
                      <td>
                        <input
                          type="number"
                          class="form-control"
                          v-model.number="item.unit_cost"
                          step="0.01"
                          min="0"
                          @input="calculateItemTotal(index)"
                          required
                        >
                      </td>
                      <td>
                        <span class="fw-bold">${{ formatCurrency(item.total_cost || 0) }}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          @click="removeItem(index)"
                          :disabled="form.items.length === 1"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" class="text-end fw-bold">Sub Total:</td>
                      <td class="fw-bold">${{ formatCurrency(subTotal) }}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colspan="3" class="text-end">Tax Amount:</td>
                      <td>
                        <input
                          type="number"
                          class="form-control"
                          v-model.number="form.tax_amount"
                          step="0.01"
                          min="0"
                        >
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colspan="3" class="text-end">Shipping Cost:</td>
                      <td>
                        <input
                          type="number"
                          class="form-control"
                          v-model.number="form.shipping_cost"
                          step="0.01"
                          min="0"
                        >
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colspan="3" class="text-end fw-bold fs-5">Total Amount:</td>
                      <td class="fw-bold fs-5">${{ formatCurrency(totalAmount) }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Notes</label>
              <textarea class="form-control" v-model="form.notes" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="button" class="btn btn-primary" @click="savePurchaseOrder" :disabled="loading || !canSave">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            Create Purchase Order
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supplierService } from '@/services/supplierService'
import { inventoryService } from '@/services/inventoryService'

export default {
  name: 'PurchaseOrderModal',
  props: {
    suppliers: Array
  },
  emits: ['close', 'saved'],
  data() {
    return {
      loading: false,
      products: [],
      form: {
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_date: '',
        tax_amount: 0,
        shipping_cost: 0,
        notes: '',
        items: [
          {
            product_id: '',
            quantity: 1,
            unit_cost: 0,
            total_cost: 0
          }
        ]
      }
    }
  },
  computed: {
    subTotal() {
      return this.form.items.reduce((sum, item) => sum + (item.total_cost || 0), 0)
    },

    totalAmount() {
      return this.subTotal + (this.form.tax_amount || 0) + (this.form.shipping_cost || 0)
    },

    canSave() {
      return this.form.supplier_id &&
             this.form.order_date &&
             this.form.items.length > 0 &&
             this.form.items.every(item => item.product_id && item.quantity > 0 && item.unit_cost >= 0)
    }
  },
  async created() {
    await this.fetchProducts()
  },
  methods: {
    async fetchProducts() {
      try {
        const response = await inventoryService.getProducts()
        this.products = response.data.products
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    },

    addItem() {
      this.form.items.push({
        product_id: '',
        quantity: 1,
        unit_cost: 0,
        total_cost: 0
      })
    },

    removeItem(index) {
      if (this.form.items.length > 1) {
        this.form.items.splice(index, 1)
      }
    },

    updateItemDetails(index) {
      const item = this.form.items[index]
      const product = this.products.find(p => p.id === item.product_id)

      if (product) {
        item.unit_cost = product.cost_price || 0
        this.calculateItemTotal(index)
      }
    },

    calculateItemTotal(index) {
      const item = this.form.items[index]
      item.total_cost = (item.quantity || 0) * (item.unit_cost || 0)
    },

    async savePurchaseOrder() {
      if (!this.canSave) return

      this.loading = true
      try {
        await supplierService.createPurchaseOrder(this.form)
        this.$emit('saved')
      } catch (error) {
        console.error('Error saving purchase order:', error)
      } finally {
        this.loading = false
      }
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    }
  }
}
</script>