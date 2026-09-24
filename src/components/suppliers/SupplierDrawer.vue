<template>
  <SideDrawer :open="open" :title="supplier?.name || 'Supplier'" width="600px" @close="$emit('close')">
    <template #title>
      <div class="title-row">
        <span class="avatar">{{ initials }}</span>
        <div class="min0">
          <h2>{{ supplier?.name || 'Supplier' }}</h2>
          <p v-if="supplier">
            <span class="ui-badge" :class="supplier.is_active ? 'ui-badge--success' : 'ui-badge--draft'">{{ supplier.is_active ? 'Active' : 'Inactive' }}</span>
            <span v-if="supplier.payment_terms" class="terms">{{ supplier.payment_terms }}</span>
          </p>
        </div>
      </div>
    </template>

    <template v-if="supplier" #actions>
      <button class="ui-btn ui-btn--primary ui-btn--sm" :disabled="!supplier.is_active" :title="supplier.is_active ? '' : 'Reactivate the supplier to order'" @click="$emit('new-po', supplier)"><i class="fa-solid fa-file-circle-plus"></i> New purchase order</button>
      <button class="ui-btn ui-btn--sm" @click="$emit('edit', supplier)"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
      <button class="ui-btn ui-btn--sm" :disabled="busy" @click="toggleActive"><i :class="supplier.is_active ? 'fa-regular fa-circle-pause' : 'fa-regular fa-circle-play'"></i> {{ supplier.is_active ? 'Mark inactive' : 'Reactivate' }}</button>
      <button class="ui-btn ui-btn--sm ui-btn--ghost danger-text" @click="$emit('delete', supplier)"><i class="fa-regular fa-trash-can"></i> Delete</button>
    </template>

    <div v-if="loading && !supplier" class="sk">
      <div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 18px; margin-bottom: 12px"></div>
    </div>
    <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <template v-else-if="supplier">
      <div class="stats">
        <div><span>Orders</span><strong>{{ supplier.order_count || 0 }}</strong></div>
        <div><span>Open</span><strong>{{ supplier.open_orders || 0 }}</strong></div>
        <div><span>Total spend</span><strong>{{ money(supplier.total_spend) }}</strong></div>
      </div>

      <h3 class="sec">Contact</h3>
      <dl class="details">
        <div v-if="supplier.contact_person"><dt><i class="fa-regular fa-user"></i></dt><dd>{{ supplier.contact_person }}</dd></div>
        <div v-if="supplier.email"><dt><i class="fa-regular fa-envelope"></i></dt><dd><a :href="`mailto:${supplier.email}`">{{ supplier.email }}</a></dd></div>
        <div v-if="supplier.phone"><dt><i class="fa-solid fa-phone"></i></dt><dd><a :href="`tel:${supplier.phone}`">{{ supplier.phone }}</a></dd></div>
        <div v-if="address"><dt><i class="fa-solid fa-location-dot"></i></dt><dd class="pre">{{ address }}</dd></div>
        <div v-if="supplier.abn"><dt class="abn">ABN</dt><dd>{{ supplier.abn }}</dd></div>
        <div v-if="!supplier.contact_person && !supplier.email && !supplier.phone && !address" class="muted">No contact details yet.</div>
      </dl>

      <template v-if="supplier.notes">
        <h3 class="sec">Notes</h3>
        <p class="notes">{{ supplier.notes }}</p>
      </template>

      <h3 class="sec">Purchase orders</h3>
      <div v-if="!orders.length" class="empty-po">
        <i class="fa-regular fa-file-lines"></i>
        <span>No purchase orders with {{ supplier.name }} yet.</span>
      </div>
      <ul v-else class="po-list">
        <li v-for="po in orders" :key="po.id">
          <button class="po-row" @click="$emit('open-po', po.id)">
            <span class="po-main">
              <strong>{{ po.order_number }}</strong>
              <small>{{ fmtDate(po.order_date) }} · {{ (po.items || []).length }} item{{ (po.items || []).length === 1 ? '' : 's' }}</small>
            </span>
            <span class="ui-badge" :class="`ui-badge--${statusMeta(po.status).badge}`">{{ statusMeta(po.status).label }}</span>
            <span class="po-total">{{ money(po.total_amount) }}</span>
            <i class="fa-solid fa-chevron-right chev"></i>
          </button>
        </li>
      </ul>
    </template>
  </SideDrawer>
</template>

<script>
import SideDrawer from './SideDrawer.vue'
import { supplierService, poStatusMeta } from '@/services/supplierService'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'SupplierDrawer',
  components: { SideDrawer },
  props: {
    open: { type: Boolean, default: false },
    supplierId: { type: String, default: '' },
    /** bump to force a reload (e.g. after edits elsewhere) */
    version: { type: Number, default: 0 }
  },
  emits: ['close', 'edit', 'delete', 'new-po', 'open-po', 'changed'],
  data() {
    return { supplier: null, loading: false, error: '', busy: false }
  },
  computed: {
    orders() {
      return this.supplier?.purchase_orders || []
    },
    initials() {
      return (this.supplier?.name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    },
    address() {
      const a = this.supplier?.address
      if (!a) return ''
      const line2 = [a.suburb, a.state, a.postcode].filter(Boolean).join(' ')
      return [a.street, line2].filter(Boolean).join('\n')
    }
  },
  watch: {
    open(v) {
      if (v) this.load()
    },
    supplierId() {
      if (this.open) this.load()
    },
    version() {
      if (this.open) this.load()
    }
  },
  created() {
    if (this.open) this.load()
  },
  methods: {
    money: (v) => formatMoney(v),
    fmtDate: formatDate,
    statusMeta: poStatusMeta,
    async load() {
      if (!this.supplierId) return
      if (this.supplier?.id !== this.supplierId) this.supplier = null
      this.loading = true
      this.error = ''
      try {
        const res = await supplierService.getSupplier(this.supplierId)
        this.supplier = res.data?.supplier || null
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the supplier')
      } finally {
        this.loading = false
      }
    },
    async toggleActive() {
      this.busy = true
      try {
        const next = !this.supplier.is_active
        await supplierService.updateSupplier(this.supplier.id, { is_active: next })
        this.supplier.is_active = next
        toast.success(next ? `${this.supplier.name} reactivated` : `${this.supplier.name} marked inactive`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the supplier'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.min0 {
  min-width: 0;
}
.title-row p {
  display: flex;
  align-items: center;
  gap: 8px;
}
.terms {
  font-size: 12.5px;
  color: var(--text-3);
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.danger-text {
  color: var(--danger);
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.stats > div {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  min-width: 0;
}
.stats span {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}
.stats strong {
  display: block;
  font-size: 17px;
  font-weight: 650;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sec {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  margin: 22px 0 10px;
}
.details {
  margin: 0;
}
.details > div {
  display: flex;
  gap: 12px;
  padding: 5px 0;
  color: var(--text);
}
.details dt {
  width: 22px;
  color: var(--text-3);
  text-align: center;
  flex-shrink: 0;
}
.details dt.abn {
  font-size: 10.5px;
  font-weight: 700;
  padding-top: 2px;
}
.details dd {
  margin: 0;
  min-width: 0;
  word-break: break-word;
}
.details a {
  color: var(--accent);
  text-decoration: none;
}
.pre,
.notes {
  white-space: pre-line;
}
.notes {
  color: var(--text-2);
  margin: 0;
}
.muted {
  color: var(--text-3);
}
.empty-po {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-3);
}
.po-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.po-list li + li {
  border-top: 1px solid var(--border);
}
.po-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.po-row:hover {
  background: var(--surface-hover);
}
.po-main {
  flex: 1;
  min-width: 0;
}
.po-main strong {
  display: block;
  color: var(--text);
}
.po-main small {
  color: var(--text-3);
  font-size: 12px;
}
.po-total {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 90px;
  text-align: right;
  color: var(--text);
}
.chev {
  color: var(--text-3);
  font-size: 11px;
}
@media (max-width: 480px) {
  .po-row {
    flex-wrap: wrap;
  }
  .po-total {
    min-width: 0;
  }
  .chev {
    display: none;
  }
}
</style>
