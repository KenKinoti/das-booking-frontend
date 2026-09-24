<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Inventory & Supply</div>
        <h1>Suppliers</h1>
        <p>Manage the businesses you buy from, raise purchase orders and receive stock.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="openNewPO()"><i class="fa-solid fa-file-circle-plus"></i> New purchase order</button>
        <button class="ui-btn ui-btn--primary" @click="openSupplierModal()"><i class="fa-solid fa-plus"></i> Add supplier</button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': tab === 'suppliers' && statusFilter === 'active' }" @click="showActiveSuppliers">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-truck-field"></i></span>Active suppliers</div>
        <div class="ui-kpi__value"><template v-if="report">{{ report.active_suppliers }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">{{ report ? `${report.total_suppliers} in total` : '&nbsp;' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': tab === 'orders' && poStatus === 'open' }" @click="showPOs('open')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-hourglass-half"></i></span>Open purchase orders</div>
        <div class="ui-kpi__value"><template v-if="report">{{ report.open_orders }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">{{ report ? `${money(report.open_order_value)} awaiting delivery` : '&nbsp;' }}</div>
      </button>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-sack-dollar"></i></span>Spend this month</div>
        <div class="ui-kpi__value"><template v-if="report">{{ money(report.spend_this_month) }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">{{ report ? `${report.orders_this_month} order${report.orders_this_month === 1 ? '' : 's'} placed` : '&nbsp;' }}</div>
      </div>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': tab === 'orders' && poStatus === 'overdue' }" @click="showPOs('overdue')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>Overdue deliveries</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': report && report.overdue_deliveries > 0 }"><template v-if="report">{{ report.overdue_deliveries }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">Past their expected date</div>
      </button>
    </div>

    <section class="ui-card">
      <div class="main-tabs">
        <div class="ui-tabs" role="tablist">
          <button class="ui-tab" :class="{ 'is-active': tab === 'suppliers' }" role="tab" :aria-selected="tab === 'suppliers'" @click="setTab('suppliers')">
            <i class="fa-solid fa-building"></i> Suppliers <span class="count">{{ suppliersTotal }}</span>
          </button>
          <button class="ui-tab" :class="{ 'is-active': tab === 'orders' }" role="tab" :aria-selected="tab === 'orders'" @click="setTab('orders')">
            <i class="fa-solid fa-file-invoice"></i> Purchase orders <span class="count">{{ poCounts.all || 0 }}</span>
          </button>
        </div>
      </div>

      <!-- ============ Suppliers ============ -->
      <template v-if="tab === 'suppliers'">
        <div class="toolbar">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="supplierSearch" class="ui-input" type="search" placeholder="Search name, contact, email or phone…" aria-label="Search suppliers" @input="debounce(loadSuppliers)" />
          </div>
          <select v-model="statusFilter" class="ui-select status-sel" aria-label="Status" @change="loadSuppliers">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div v-if="supplierError" class="ui-card__body">
          <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ supplierError }} <a href="#" @click.prevent="loadSuppliers">Try again</a></span></div>
        </div>
        <div v-else-if="suppliersLoading && !suppliers.length" class="ui-card__body">
          <div v-for="n in 5" :key="n" class="sk-row">
            <div class="ui-skeleton" style="width: 32px; height: 32px; border-radius: 10px"></div>
            <div class="ui-skeleton" style="flex: 1"></div>
            <div class="ui-skeleton" style="width: 120px"></div>
            <div class="ui-skeleton" style="width: 80px"></div>
          </div>
        </div>
        <div v-else-if="!suppliers.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-truck-field"></i></div>
          <h3>{{ supplierSearch || statusFilter ? 'No suppliers match' : 'No suppliers yet' }}</h3>
          <p>{{ supplierSearch || statusFilter ? 'Try a different search or status.' : 'Add the businesses you buy stock from, then raise purchase orders against them.' }}</p>
          <button v-if="!supplierSearch && !statusFilter" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openSupplierModal()"><i class="fa-solid fa-plus"></i> Add supplier</button>
        </div>
        <div v-else class="ui-table-wrap" :class="{ 'is-loading': suppliersLoading }">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th class="hide-md">Contact</th>
                <th class="hide-lg">Terms</th>
                <th class="num hide-sm">Orders</th>
                <th class="num">Spend</th>
                <th class="hide-sm">Status</th>
                <th class="actions-col hide-sm"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in suppliers" :key="s.id" class="is-clickable" @click="openSupplier(s.id)">
                <td>
                  <div class="name-cell">
                    <span class="avatar" :class="{ 'is-off': !s.is_active }">{{ initials(s.name) }}</span>
                    <span class="min0">
                      <span class="strong">{{ s.name }}</span>
                      <small>{{ s.email || s.phone || 'No contact details' }}</small>
                    </span>
                  </div>
                </td>
                <td class="hide-md">
                  <span>{{ s.contact_person || '—' }}</span>
                  <small v-if="s.phone && s.email" class="sub">{{ s.phone }}</small>
                </td>
                <td class="hide-lg muted">{{ s.payment_terms || '—' }}</td>
                <td class="num hide-sm">
                  {{ s.order_count || 0 }}
                  <small v-if="s.open_orders" class="sub open">{{ s.open_orders }} open</small>
                </td>
                <td class="num strong">{{ money(s.total_spend) }}</td>
                <td class="hide-sm"><span class="ui-badge" :class="s.is_active ? 'ui-badge--success' : 'ui-badge--draft'">{{ s.is_active ? 'Active' : 'Inactive' }}</span></td>
                <td class="actions-col hide-sm" @click.stop>
                  <div class="row-actions">
                    <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`New purchase order for ${s.name}`" title="New purchase order" :disabled="!s.is_active" @click="openNewPO(s.id)"><i class="fa-solid fa-file-circle-plus"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Edit ${s.name}`" title="Edit" @click="openSupplierModal(s)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm danger-text" :aria-label="`Delete ${s.name}`" title="Delete" @click="deleteSupplier(s)"><i class="fa-regular fa-trash-can"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- ============ Purchase orders ============ -->
      <template v-else>
        <div class="toolbar">
          <div class="ui-tabs po-tabs" role="tablist" aria-label="Order status">
            <button v-for="t in poTabs" :key="t.value" class="ui-tab" :class="{ 'is-active': poStatus === t.value }" role="tab" :aria-selected="poStatus === t.value" @click="setPOStatus(t.value)">
              {{ t.label }}<span v-if="t.count != null" class="count">{{ t.count }}</span>
            </button>
          </div>
          <div class="toolbar__right">
            <div class="ui-input-group search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="poSearch" class="ui-input" type="search" placeholder="Search PO number or supplier…" aria-label="Search purchase orders" @input="debounce(loadPOs)" />
            </div>
            <select v-model="poSupplier" class="ui-select sup-sel" aria-label="Supplier" @change="loadPOs">
              <option value="">All suppliers</option>
              <option v-for="s in allSuppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>

        <div v-if="poError" class="ui-card__body">
          <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ poError }} <a href="#" @click.prevent="loadPOs">Try again</a></span></div>
        </div>
        <div v-else-if="poLoading && !orders.length" class="ui-card__body">
          <div v-for="n in 5" :key="n" class="sk-row">
            <div class="ui-skeleton" style="width: 90px"></div>
            <div class="ui-skeleton" style="flex: 1"></div>
            <div class="ui-skeleton" style="width: 90px"></div>
            <div class="ui-skeleton" style="width: 100px"></div>
          </div>
        </div>
        <div v-else-if="!orders.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-file-invoice"></i></div>
          <h3>{{ poFiltered ? 'No purchase orders match' : 'No purchase orders yet' }}</h3>
          <p>{{ poFiltered ? 'Try a different status, supplier or search.' : 'Raise a purchase order to order stock from a supplier. Receiving it adds the stock to your inventory.' }}</p>
          <button v-if="!poFiltered" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openNewPO()"><i class="fa-solid fa-file-circle-plus"></i> New purchase order</button>
        </div>
        <div v-else class="ui-table-wrap" :class="{ 'is-loading': poLoading }">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Order</th>
                <th class="hide-sm">Supplier</th>
                <th class="hide-md">Ordered</th>
                <th class="hide-sm">Expected</th>
                <th class="hide-lg">Received</th>
                <th>Status</th>
                <th class="num">Total</th>
                <th class="actions-col hide-sm"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="po in orders" :key="po.id" class="is-clickable" @click="openPO(po.id)">
                <td>
                  <span class="strong mono">{{ po.order_number }}</span>
                  <small class="sub">{{ (po.items || []).length }} line{{ (po.items || []).length === 1 ? '' : 's' }}<span class="show-sm"> · {{ po.supplier?.name }}</span></small>
                </td>
                <td class="hide-sm">{{ po.supplier?.name || '—' }}</td>
                <td class="hide-md muted">{{ fmtDate(po.order_date) }}</td>
                <td class="hide-sm">
                  <span :class="{ 'txt-danger': isOverdue(po) }">{{ po.expected_date ? fmtDate(po.expected_date) : '—' }}</span>
                  <small v-if="isOverdue(po)" class="sub txt-danger">{{ daysLate(po) }}d late</small>
                </td>
                <td class="hide-lg">
                  <div class="mini-progress" :title="`${received(po)} of ${ordered(po)} units received`">
                    <div class="mini-progress__bar" :style="{ width: pct(po) + '%' }"></div>
                  </div>
                  <small class="sub">{{ received(po) }}/{{ ordered(po) }}</small>
                </td>
                <td><span class="ui-badge" :class="`ui-badge--${statusMeta(po.status).badge}`">{{ statusMeta(po.status).label }}</span></td>
                <td class="num strong">{{ money(po.total_amount) }}</td>
                <td class="actions-col hide-sm" @click.stop>
                  <div class="row-actions">
                    <button v-if="po.status === 'sent' || po.status === 'partially_received'" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" title="Receive stock" :aria-label="`Receive stock for ${po.order_number}`" @click="openReceive(po)"><i class="fa-solid fa-box-open"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Open ${po.order_number}`" @click="openPO(po.id)"><i class="fa-solid fa-chevron-right"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <SupplierModal v-if="supplierModal.open" :supplier="supplierModal.supplier" @close="supplierModal.open = false" @saved="onSupplierSaved" />
    <PurchaseOrderModal v-if="poModal.open" :order="poModal.order" :supplier-id="poModal.supplierId" @close="poModal.open = false" @saved="onPOSaved" />
    <ReceiveStockModal v-if="receiveOrder" :order="receiveOrder" @close="receiveOrder = null" @received="onReceived" />

    <SupplierDrawer
      :open="!!drawerSupplierId"
      :supplier-id="drawerSupplierId"
      :version="drawerVersion"
      @close="drawerSupplierId = ''"
      @edit="openSupplierModal"
      @delete="deleteSupplier"
      @new-po="(s) => openNewPO(s.id)"
      @open-po="openPO"
      @changed="refreshAll"
    />
    <PurchaseOrderDrawer
      :open="!!drawerPOId"
      :order-id="drawerPOId"
      @close="drawerPOId = ''"
      @edit="editPO"
      @changed="refreshAll"
      @open-supplier="openSupplierFromPO"
    />
  </div>
</template>

<script>
import SupplierModal from '@/components/suppliers/SupplierModal.vue'
import PurchaseOrderModal from '@/components/suppliers/PurchaseOrderModal.vue'
import ReceiveStockModal from '@/components/suppliers/ReceiveStockModal.vue'
import SupplierDrawer from '@/components/suppliers/SupplierDrawer.vue'
import PurchaseOrderDrawer from '@/components/suppliers/PurchaseOrderDrawer.vue'
import { supplierService, poStatusMeta, PO_STATUSES } from '@/services/supplierService'
import { listFrom, apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'Suppliers',
  components: { SupplierModal, PurchaseOrderModal, ReceiveStockModal, SupplierDrawer, PurchaseOrderDrawer },
  data() {
    const q = this.$route.query
    return {
      tab: q.tab === 'orders' ? 'orders' : 'suppliers',
      report: null,
      // suppliers
      suppliers: [],
      allSuppliers: [],
      suppliersTotal: 0,
      suppliersLoading: false,
      supplierError: '',
      supplierSearch: '',
      statusFilter: '',
      // purchase orders
      orders: [],
      poCounts: {},
      poLoading: false,
      poError: '',
      poStatus: q.status || 'all',
      poSearch: '',
      poSupplier: '',
      // overlays
      supplierModal: { open: false, supplier: null },
      poModal: { open: false, order: null, supplierId: '' },
      receiveOrder: null,
      drawerSupplierId: '',
      drawerPOId: '',
      drawerVersion: 0,
      timer: null
    }
  },
  computed: {
    poTabs() {
      const c = this.poCounts
      const tabs = [{ value: 'all', label: 'All', count: c.all || 0 }]
      PO_STATUSES.forEach((s) => tabs.push({ value: s.value, label: s.label, count: c[s.value] || 0 }))
      if (this.poStatus === 'open') tabs.splice(1, 0, { value: 'open', label: 'Open', count: null })
      if (this.poStatus === 'overdue') tabs.splice(1, 0, { value: 'overdue', label: 'Overdue', count: null })
      return tabs
    },
    poFiltered() {
      return this.poStatus !== 'all' || !!this.poSearch || !!this.poSupplier
    }
  },
  created() {
    this.loadReport()
    this.loadSuppliers()
    this.loadPOs()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    money: (v) => formatMoney(v),
    fmtDate: formatDate,
    statusMeta: poStatusMeta,
    initials(name = '') {
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    },
    debounce(fn) {
      clearTimeout(this.timer)
      this.timer = setTimeout(fn, 280)
    },
    syncQuery() {
      const query = {}
      if (this.tab === 'orders') query.tab = 'orders'
      if (this.tab === 'orders' && this.poStatus !== 'all') query.status = this.poStatus
      this.$router.replace({ query }).catch(() => {})
    },
    setTab(t) {
      this.tab = t
      this.syncQuery()
    },
    showActiveSuppliers() {
      this.tab = 'suppliers'
      this.statusFilter = this.statusFilter === 'active' ? '' : 'active'
      this.syncQuery()
      this.loadSuppliers()
    },
    showPOs(status) {
      this.tab = 'orders'
      this.poStatus = this.poStatus === status ? 'all' : status
      this.syncQuery()
      this.loadPOs()
    },
    setPOStatus(s) {
      this.poStatus = s
      this.syncQuery()
      this.loadPOs()
    },
    async loadReport() {
      try {
        const res = await supplierService.getSupplierReport()
        this.report = res.data?.report || null
      } catch {
        this.report = { active_suppliers: 0, total_suppliers: 0, open_orders: 0, open_order_value: 0, spend_this_month: 0, orders_this_month: 0, overdue_deliveries: 0 }
      }
    },
    async loadSuppliers() {
      this.suppliersLoading = true
      this.supplierError = ''
      try {
        const params = {}
        if (this.supplierSearch.trim()) params.search = this.supplierSearch.trim()
        if (this.statusFilter) params.status = this.statusFilter
        const res = await supplierService.getSuppliers(params)
        this.suppliers = listFrom(res, 'suppliers')
        if (!params.search && !params.status) {
          this.allSuppliers = this.suppliers
          this.suppliersTotal = this.suppliers.length
        } else if (!this.allSuppliers.length) {
          const all = await supplierService.getSuppliers()
          this.allSuppliers = listFrom(all, 'suppliers')
          this.suppliersTotal = this.allSuppliers.length
        }
      } catch (e) {
        this.supplierError = apiErrorMessage(e, 'Could not load suppliers')
      } finally {
        this.suppliersLoading = false
      }
    },
    async refreshSupplierIndex() {
      try {
        const all = await supplierService.getSuppliers()
        this.allSuppliers = listFrom(all, 'suppliers')
        this.suppliersTotal = this.allSuppliers.length
      } catch {
        /* keep the previous list */
      }
    },
    async loadPOs() {
      this.poLoading = true
      this.poError = ''
      try {
        const params = {}
        if (this.poStatus !== 'all') params.status = this.poStatus
        if (this.poSearch.trim()) params.search = this.poSearch.trim()
        if (this.poSupplier) params.supplier_id = this.poSupplier
        const res = await supplierService.getPurchaseOrders(params)
        this.orders = listFrom(res, 'purchase_orders')
        this.poCounts = res.data?.counts || {}
      } catch (e) {
        this.poError = apiErrorMessage(e, 'Could not load purchase orders')
      } finally {
        this.poLoading = false
      }
    },
    refreshAll() {
      this.loadReport()
      this.loadSuppliers()
      if (this.statusFilter || this.supplierSearch) this.refreshSupplierIndex()
      this.loadPOs()
    },

    // PO helpers
    ordered(po) {
      return (po.items || []).reduce((s, i) => s + (i.quantity || 0), 0)
    },
    received(po) {
      return (po.items || []).reduce((s, i) => s + (i.quantity_received || 0), 0)
    },
    pct(po) {
      const o = this.ordered(po)
      return o ? Math.min(100, Math.round((this.received(po) / o) * 100)) : 0
    },
    isOverdue(po) {
      return !!po.expected_date && (po.status === 'sent' || po.status === 'partially_received') && isoDate(po.expected_date) < isoDate()
    },
    daysLate(po) {
      const d = new Date(isoDate(po.expected_date) + 'T00:00:00')
      const t = new Date(isoDate() + 'T00:00:00')
      return Math.round((t - d) / 86400000)
    },

    // Suppliers
    openSupplier(id) {
      this.drawerPOId = ''
      this.drawerSupplierId = id
    },
    openSupplierFromPO(id) {
      this.drawerPOId = ''
      this.drawerSupplierId = id
    },
    openSupplierModal(supplier = null) {
      this.supplierModal = { open: true, supplier }
    },
    onSupplierSaved(saved) {
      this.supplierModal.open = false
      this.drawerVersion++
      this.refreshAll()
      if (saved?.id && !this.drawerSupplierId && this.tab === 'suppliers') this.drawerSupplierId = saved.id
    },
    async deleteSupplier(s) {
      if ((s.order_count || 0) > 0) {
        const ok = await confirmDialog({
          title: `${s.name} has purchase orders`,
          message: `Suppliers with purchase orders are kept for your records. Mark ${s.name} as inactive instead? You can reactivate it any time.`,
          confirmText: 'Mark inactive'
        })
        if (!ok) return
        try {
          await supplierService.updateSupplier(s.id, { is_active: false })
          toast.success(`${s.name} marked inactive`)
          this.drawerVersion++
          this.refreshAll()
        } catch (e) {
          toast.error(apiErrorMessage(e, 'Could not update the supplier'))
        }
        return
      }
      const ok = await confirmDialog({ title: `Delete ${s.name}?`, message: 'This permanently removes the supplier. This cannot be undone.', confirmText: 'Delete supplier', danger: true })
      if (!ok) return
      try {
        await supplierService.deleteSupplier(s.id)
        toast.success(`${s.name} deleted`)
        if (this.drawerSupplierId === s.id) this.drawerSupplierId = ''
        this.refreshAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the supplier'))
      }
    },

    // Purchase orders
    openPO(id) {
      this.drawerSupplierId = ''
      this.drawerPOId = id
    },
    openNewPO(supplierId = '') {
      this.poModal = { open: true, order: null, supplierId }
    },
    editPO(order) {
      this.poModal = { open: true, order, supplierId: order.supplier_id }
    },
    onPOSaved(po) {
      const wasEdit = !!this.poModal.order
      this.poModal.open = false
      this.drawerSupplierId = ''
      if (!wasEdit) {
        this.tab = 'orders'
        this.poStatus = 'all'
        this.syncQuery()
      }
      this.refreshAll()
      if (po?.id) {
        if (this.drawerPOId === po.id) {
          // force the open drawer to reload
          this.drawerPOId = ''
          this.$nextTick(() => (this.drawerPOId = po.id))
        } else {
          this.drawerPOId = po.id
        }
      }
    },
    openReceive(po) {
      this.receiveOrder = po
    },
    onReceived() {
      this.receiveOrder = null
      this.refreshAll()
    }
  }
}
</script>

<style scoped>
.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}
.kpi-btn.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.kpi-sk {
  display: inline-block;
  width: 70px;
  height: 26px;
}
.kpi-info {
  background: var(--info-soft);
  color: var(--info);
}
.kpi-success {
  background: var(--success-soft);
  color: var(--success);
}
.kpi-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.txt-danger {
  color: var(--danger) !important;
}
.muted {
  color: var(--text-3);
}
.strong {
  font-weight: 600;
  color: var(--text);
}
.mono {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.show-sm {
  display: none;
}
.danger-text {
  color: var(--danger);
}

.main-tabs {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.ui-tab i {
  margin-right: 4px;
  font-size: 12.5px;
  opacity: 0.8;
}
.count {
  display: inline-block;
  min-width: 20px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 99px;
  background: var(--bg-subtle);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.ui-tab.is-active .count {
  background: var(--accent-soft);
  color: var(--accent);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.search {
  width: 300px;
}
.status-sel {
  width: 160px;
}
.sup-sel {
  width: 190px;
}
.po-tabs {
  flex-wrap: wrap;
}

.sk-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
}
.is-loading {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
}
.min0 {
  min-width: 0;
}
.name-cell small,
.sub {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 400;
}
.name-cell small {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub.open {
  color: var(--info);
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.avatar.is-off {
  background: var(--neutral-soft);
  color: var(--text-3);
}
.num {
  font-variant-numeric: tabular-nums;
}
.actions-col {
  width: 1%;
  white-space: nowrap;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}

.mini-progress {
  width: 80px;
  height: 6px;
  border-radius: 99px;
  background: var(--bg-subtle);
  overflow: hidden;
}
.mini-progress__bar {
  height: 100%;
  background: var(--success);
  border-radius: 99px;
}

@media (max-width: 1200px) {
  .hide-lg {
    display: none;
  }
}
@media (max-width: 1000px) {
  .hide-md {
    display: none;
  }
}
@media (max-width: 700px) {
  .hide-sm {
    display: none;
  }
  .show-sm {
    display: inline;
  }
  .search,
  .status-sel,
  .sup-sel,
  .toolbar__right {
    width: 100%;
  }
  .toolbar__right {
    flex-direction: column;
  }
  .main-tabs {
    padding: 10px 12px;
  }
  .po-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    max-width: 100%;
  }
  .name-cell {
    min-width: 0;
  }
  .name-cell small {
    max-width: 150px;
  }
}
</style>
