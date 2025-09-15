<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ product?.id ? 'Edit Product' : 'Add Product' }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveProduct">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Product Name *</label>
                  <input type="text" class="form-control" v-model="form.name" required>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">SKU</label>
                  <input type="text" class="form-control" v-model="form.sku">
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Category</label>
                  <select class="form-select" v-model="form.category_id">
                    <option value="">Select Category</option>
                    <option v-for="category in categories" :key="category.id" :value="category.id">
                      {{ category.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Brand</label>
                  <select class="form-select" v-model="form.brand_id">
                    <option value="">Select Brand</option>
                    <option v-for="brand in brands" :key="brand.id" :value="brand.id">
                      {{ brand.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea class="form-control" v-model="form.description" rows="3"></textarea>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Cost Price *</label>
                  <input type="number" class="form-control" v-model.number="form.cost_price" step="0.01" required>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Selling Price *</label>
                  <input type="number" class="form-control" v-model.number="form.selling_price" step="0.01" required>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">Current Stock</label>
                  <input type="number" class="form-control" v-model.number="form.current_stock" min="0">
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">Reorder Point</label>
                  <input type="number" class="form-control" v-model.number="form.reorder_point" min="0">
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">Unit of Measure</label>
                  <select class="form-select" v-model="form.unit_of_measure">
                    <option value="each">Each</option>
                    <option value="kg">Kilogram</option>
                    <option value="liter">Liter</option>
                    <option value="meter">Meter</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" v-model="form.is_active" id="isActive">
              <label class="form-check-label" for="isActive">Active</label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="button" class="btn btn-primary" @click="saveProduct" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ product?.id ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { inventoryService } from '@/services/inventoryService'

export default {
  name: 'ProductModal',
  props: {
    product: Object,
    categories: Array,
    brands: Array
  },
  emits: ['close', 'saved'],
  data() {
    return {
      loading: false,
      form: {
        name: '',
        description: '',
        sku: '',
        category_id: '',
        brand_id: '',
        unit_of_measure: 'each',
        cost_price: 0,
        selling_price: 0,
        current_stock: 0,
        reorder_point: 0,
        is_active: true
      }
    }
  },
  created() {
    if (this.product) {
      Object.assign(this.form, this.product)
    }
  },
  methods: {
    async saveProduct() {
      this.loading = true
      try {
        if (this.product?.id) {
          await inventoryService.updateProduct(this.product.id, this.form)
        } else {
          await inventoryService.createProduct(this.form)
        }
        this.$emit('saved')
      } catch (error) {
        console.error('Error saving product:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>