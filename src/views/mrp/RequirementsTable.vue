<template>
  <div class="mp ui-table-wrap req-table">
    <table class="ui-table">
      <thead>
        <tr>
          <th>Component</th>
          <th class="num">Needed</th>
          <th v-if="showStock" class="num">In stock</th>
          <th class="num hide-sm">Cost</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.product_id">
          <td>
            <span class="strong">{{ r.product_name }}</span>
            <small v-if="r.product_sku" class="muted sku">{{ r.product_sku }}</small>
          </td>
          <td class="num tnum">{{ r.required }} <small class="muted">{{ r.unit }}</small></td>
          <td v-if="showStock" class="num tnum">
            <span :class="r.shortage > 0 ? 'txt-danger' : 'txt-success'">{{ r.available }}</span>
            <small v-if="r.shortage > 0" class="txt-danger short">{{ r.shortage }} short</small>
          </td>
          <td class="num tnum hide-sm">{{ money(r.line_cost) }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="showStock ? 4 : 3" class="muted">This recipe has no components.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import '@/styles/module-page.css'
import { formatMoney } from '@/utils/format'

export default {
  name: 'RequirementsTable',
  props: { rows: { type: Array, default: () => [] }, currency: { type: String, default: () => orgCurrency() }, showStock: { type: Boolean, default: true } },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    }
  }
}
</script>

<style scoped>
.req-table {
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.sku {
  margin-left: 6px;
  font-size: 12px;
}

.short {
  display: block;
  font-size: 11.5px;
}
</style>
