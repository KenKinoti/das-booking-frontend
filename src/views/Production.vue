<template>
  <div class="mp ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Operations</div>
        <h1>Manufacturing</h1>
        <p>Recipes (bills of materials) and work orders that turn inventory components into finished goods.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="openBom()"><i class="fa-solid fa-list-check"></i> New bill of materials</button>
        <button class="ui-btn ui-btn--primary" @click="openWo()"><i class="fa-solid fa-plus"></i> New work order</button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" @click="goWo('open')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-clipboard-list"></i></span>Open work orders</div>
        <div class="ui-kpi__value tnum">{{ summary ? summary.planned + summary.in_progress : '–' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `${summary.planned} planned · ${summary.in_progress} in progress` : ' ' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="goWo('open')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>Needs attention</div>
        <div class="ui-kpi__value tnum" :class="{ 'txt-danger': summary && summary.blocked + summary.overdue > 0 }">{{ summary ? summary.blocked + summary.overdue : '–' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `${summary.blocked} short of stock · ${summary.overdue} overdue` : ' ' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="goWo('done')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-boxes-stacked"></i></span>Produced this month</div>
        <div class="ui-kpi__value tnum">{{ summary ? summary.units_this_month : '–' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `units from ${summary.done_this_month} completed order${summary.done_this_month === 1 ? '' : 's'}` : ' ' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="setTab('boms')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-list-check"></i></span>Bills of materials</div>
        <div class="ui-kpi__value tnum">{{ summary ? summary.boms : '–' }}</div>
        <div class="ui-kpi__meta">Recipes you can build from</div>
      </button>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button class="ui-tab" :class="{ 'is-active': tab === 'orders' }" @click="setTab('orders')"><i class="fa-solid fa-gears"></i>&nbsp; Work orders</button>
          <button class="ui-tab" :class="{ 'is-active': tab === 'boms' }" @click="setTab('boms')"><i class="fa-solid fa-list-check"></i>&nbsp; Bills of materials</button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" :placeholder="tab === 'orders' ? 'Search number or product…' : 'Search recipes…'" aria-label="Search" @input="debounced" />
          </div>
          <select v-if="tab === 'orders'" v-model="woStatus" class="ui-select filter" aria-label="Status" @change="loadOrders">
            <option value="open">Open</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="reload">Try again</a></span></div>
      </div>

      <!-- Work orders -->
      <template v-else-if="tab === 'orders'">
        <div v-if="loading && !orders.length" class="ui-card__body">
          <div v-for="n in 5" :key="n" class="sk-row"><div class="ui-skeleton" style="width: 80px"></div><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 120px"></div></div>
        </div>
        <div v-else-if="!orders.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-gears"></i></div>
          <h3>{{ q || woStatus !== 'open' ? 'No work orders match' : 'No open work orders' }}</h3>
          <p>{{ boms.length ? 'Plan a production run from one of your bills of materials.' : 'Start by creating a bill of materials: which components make a product.' }}</p>
          <button class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="boms.length ? openWo() : openBom()"><i class="fa-solid fa-plus"></i> {{ boms.length ? 'New work order' : 'New bill of materials' }}</button>
        </div>
        <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th class="num">Qty</th>
                <th class="hide-sm">Due</th>
                <th class="hide-md">Materials</th>
                <th>Status</th>
                <th style="width: 1%"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in orders" :key="w.id" class="is-clickable" @click="detail = w">
                <td><strong>{{ w.number }}</strong></td>
                <td>{{ w.product_name }}<small v-if="w.bom_name && w.bom_name !== w.product_name" class="muted block">{{ w.bom_name }}</small></td>
                <td class="num tnum strong">{{ w.quantity }}</td>
                <td class="hide-sm nowrap" :class="{ 'txt-danger': w.is_overdue }">{{ w.due_date ? date(w.due_date) : '—' }}<small v-if="w.is_overdue" class="block">Overdue</small></td>
                <td class="hide-md">
                  <template v-if="w.status === 'planned' || w.status === 'in_progress'">
                    <span v-if="w.shortages" class="txt-danger small"><i class="fa-solid fa-circle-exclamation"></i> {{ w.shortages }} component{{ w.shortages === 1 ? '' : 's' }} short</span>
                    <span v-else class="txt-success small"><i class="fa-solid fa-circle-check"></i> All in stock</span>
                  </template>
                  <span v-else class="muted small">—</span>
                </td>
                <td><span class="ui-badge" :class="badge(w.status)">{{ statusLabel(w.status) }}</span></td>
                <td @click.stop>
                  <div class="row-actions">
                    <button v-if="w.status === 'planned'" class="ui-btn ui-btn--sm" :disabled="busy === w.id" @click="act(w, 'start')"><i class="fa-solid fa-play"></i> Start</button>
                    <button v-if="w.status === 'planned' || w.status === 'in_progress'" class="ui-btn ui-btn--sm ui-btn--success" :disabled="busy === w.id || w.shortages > 0" :title="w.shortages ? 'Not enough stock' : ''" @click="complete(w)"><i class="fa-solid fa-check"></i> Complete</button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Open ${w.number}`" @click="detail = w"><i class="fa-solid fa-chevron-right"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- BOMs -->
      <template v-else>
        <div v-if="loading && !boms.length" class="ui-card__body">
          <div v-for="n in 4" :key="n" class="sk-row"><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 120px"></div></div>
        </div>
        <div v-else-if="!filteredBoms.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-list-check"></i></div>
          <h3>{{ q ? 'No recipes match' : 'No bills of materials yet' }}</h3>
          <p>A bill of materials lists the inventory components needed to make a product.</p>
          <button v-if="!q" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openBom()"><i class="fa-solid fa-plus"></i> New bill of materials</button>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Recipe</th>
                <th class="hide-sm">Components</th>
                <th class="num hide-sm">Makes</th>
                <th class="num">Cost / unit</th>
                <th class="num hide-md">Can build now</th>
                <th style="width: 1%"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in filteredBoms" :key="b.id" class="is-clickable" @click="openBom(b)">
                <td>
                  <span class="strong">{{ b.name }}</span>
                  <small class="muted block">Makes {{ b.product_name }}{{ b.product_sku ? ` · ${b.product_sku}` : '' }}</small>
                </td>
                <td class="hide-sm small">
                  <span v-for="(c, i) in b.components" :key="c.id" class="nowrap">{{ c.quantity }} × {{ c.product_name }}<template v-if="i < b.components.length - 1">, </template></span>
                </td>
                <td class="num hide-sm tnum">{{ b.output_qty }}</td>
                <td class="num tnum">{{ money(b.unit_cost) }}</td>
                <td class="num hide-md tnum" :class="{ 'txt-danger': buildable(b) === 0 }">{{ buildable(b) }}</td>
                <td @click.stop>
                  <div class="row-actions">
                    <button class="ui-btn ui-btn--sm" @click="openWo(b)"><i class="fa-solid fa-plus"></i> Work order</button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${b.name}`" @click="openBom(b)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${b.name}`" @click="removeBom(b)"><i class="fa-regular fa-trash-can"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <BomModal v-if="bomModal" :bom="bomModal.bom" :products="products" :currency="currency" @close="bomModal = null" @saved="onBomSaved" />

    <!-- Work order create / edit -->
    <div v-if="woModal" class="ui-modal-backdrop" @mousedown.self="closeWo">
      <form class="ui-modal" style="max-width: 680px" novalidate @submit.prevent="saveWo">
        <div class="ui-modal__head">
          <h2>{{ woForm.id ? `Edit ${woForm.number}` : 'New work order' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="closeWo"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="woError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ woError }}</span></div>
          <div v-if="!boms.length" class="ui-alert ui-alert--warning" style="margin-bottom: 16px"><i class="fa-solid fa-triangle-exclamation"></i><span>Create a bill of materials first.</span></div>
          <div class="form-grid">
            <label class="ui-field span-2">
              <span class="ui-label">Bill of materials *</span>
              <select v-model="woForm.bom_id" class="ui-select" :class="{ 'is-invalid': woErrors.bom_id }">
                <option value="">Choose a recipe…</option>
                <option v-for="b in boms" :key="b.id" :value="b.id">{{ b.name }} → {{ b.product_name }}</option>
              </select>
              <span v-if="woErrors.bom_id" class="field-error">{{ woErrors.bom_id }}</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Quantity to make *</span>
              <input v-model.number="woForm.quantity" type="number" min="1" step="1" class="ui-input tnum" :class="{ 'is-invalid': woErrors.quantity }" />
              <span v-if="woErrors.quantity" class="field-error">{{ woErrors.quantity }}</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Due date</span>
              <input v-model="woForm.due_date" type="date" class="ui-input" />
            </label>
            <label class="ui-field span-2">
              <span class="ui-label">Notes</span>
              <textarea v-model="woForm.notes" rows="2" class="ui-textarea" maxlength="5000"></textarea>
            </label>
          </div>
          <div v-if="woPreview.length" class="req">
            <h3>Materials needed</h3>
            <RequirementsTable :rows="woPreview" :currency="currency" />
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="closeWo">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="woSaving || !boms.length"><i :class="woSaving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ woForm.id ? 'Save' : 'Create work order' }}</button>
        </div>
      </form>
    </div>

    <!-- Work order detail -->
    <div v-if="detail" class="ui-modal-backdrop" @mousedown.self="detail = null">
      <div class="ui-modal" style="max-width: 820px" role="dialog" :aria-label="detail.number">
        <div class="ui-modal__head">
          <h2>{{ detail.number }} <span class="ui-badge" :class="badge(detail.status)" style="margin-left: 8px; vertical-align: middle">{{ statusLabel(detail.status) }}</span></h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="detail = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <dl class="stat-list">
            <div><dt>Product</dt><dd class="text">{{ detail.product_name }}</dd></div>
            <div><dt>Quantity</dt><dd>{{ detail.quantity }}</dd></div>
            <div><dt>Due</dt><dd class="text" :class="{ 'txt-danger': detail.is_overdue }">{{ detail.due_date ? date(detail.due_date) : '—' }}</dd></div>
            <div><dt>Material cost</dt><dd>{{ money(materialCost(detail)) }}</dd></div>
          </dl>
          <p class="muted small" style="margin: 12px 0 0">
            Recipe: {{ detail.bom_name || '—' }} · created {{ dateTime(detail.created_at) }}
            <template v-if="detail.started_at"> · started {{ dateTime(detail.started_at) }}</template>
            <template v-if="detail.completed_at"> · completed {{ dateTime(detail.completed_at) }}</template>
          </p>
          <div v-if="detail.shortages" class="ui-alert ui-alert--warning" style="margin-top: 16px">
            <i class="fa-solid fa-triangle-exclamation"></i><span>Not enough stock to complete this order. Receive stock in <router-link to="/inventory">Inventory</router-link> or reduce the quantity.</span>
          </div>
          <div class="req">
            <h3>{{ detail.status === 'done' ? 'Materials (current stock shown)' : 'Materials needed' }}</h3>
            <RequirementsTable :rows="detail.requirements || []" :currency="currency" :show-stock="detail.status !== 'done' && detail.status !== 'cancelled'" />
          </div>
          <p v-if="detail.notes" class="muted small"><i class="fa-regular fa-note-sticky"></i> {{ detail.notes }}</p>
          <p v-if="detail.status === 'done'" class="muted small"><i class="fa-solid fa-circle-info"></i> Components were deducted and {{ detail.quantity }} × {{ detail.product_name }} added to stock. See <router-link to="/inventory">inventory movements</router-link> (reference {{ detail.number }}).</p>
        </div>
        <div class="ui-modal__foot spread">
          <div class="ui-actions">
            <button v-if="detail.status === 'planned' || detail.status === 'in_progress'" class="ui-btn ui-btn--ghost" :disabled="busy === detail.id" @click="cancelWo(detail)"><i class="fa-solid fa-ban"></i> Cancel order</button>
            <button v-if="detail.status === 'planned' || detail.status === 'cancelled'" class="ui-btn ui-btn--ghost txt-danger" :disabled="busy === detail.id" @click="removeWo(detail)"><i class="fa-regular fa-trash-can"></i> Delete</button>
          </div>
          <div class="ui-actions">
            <button v-if="detail.status === 'planned' || detail.status === 'in_progress'" class="ui-btn" @click="editWo(detail)"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
            <button v-if="detail.status === 'planned'" class="ui-btn" :disabled="busy === detail.id" @click="act(detail, 'start')"><i class="fa-solid fa-play"></i> Start</button>
            <button v-if="detail.status === 'planned' || detail.status === 'in_progress'" class="ui-btn ui-btn--success" :disabled="busy === detail.id || detail.shortages > 0" @click="complete(detail)"><i class="fa-solid fa-check"></i> Complete &amp; update stock</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { loadOrgPrefs } from '@/composables/useOrgPrefs'
import '@/styles/module-page.css'
import api, { apiErrorMessage, listFrom } from '@/services/api'
import { formatMoney, formatDate, formatDateTime, addDays, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import BomModal from './mrp/BomModal.vue'
import RequirementsTable from './mrp/RequirementsTable.vue'

export default {
  name: 'Production',
  components: { BomModal, RequirementsTable },
  data() {
    return {
      tab: this.$route.query.tab === 'boms' ? 'boms' : 'orders',
      q: '',
      woStatus: 'open',
      summary: null,
      orders: [],
      boms: [],
      products: [],
      loading: true,
      error: '',
      busy: '',
      timer: null,
      bomModal: null,
      woModal: false,
      woForm: {},
      woErrors: {},
      woError: '',
      woSaving: false,
      detail: null
    }
  },
  computed: {
    currency() {
      return orgCurrency()
    },
    filteredBoms() {
      const q = this.q.toLowerCase()
      return q ? this.boms.filter((b) => [b.name, b.product_name, b.product_sku].some((v) => (v || '').toLowerCase().includes(q))) : this.boms
    },
    productsById() {
      return Object.fromEntries(this.products.map((p) => [p.id, p]))
    },
    woPreview() {
      const b = this.boms.find((x) => x.id === this.woForm.bom_id)
      const qty = Number(this.woForm.quantity) || 0
      if (!b || qty < 1) return []
      const out = Math.max(1, b.output_qty)
      return b.components.map((c) => {
        const p = this.productsById[c.product_id] || {}
        const required = Math.ceil((c.quantity * qty) / out)
        const available = p.current_stock ?? c.current_stock ?? 0
        return { product_id: c.product_id, product_name: c.product_name, product_sku: c.product_sku, unit: p.unit_of_measure || c.unit, required, available, shortage: Math.max(0, required - available), unit_cost: Number(p.cost_price ?? c.unit_cost ?? 0), line_cost: required * Number(p.cost_price ?? c.unit_cost ?? 0) }
      })
    }
  },
  created() {
    this.reload()
    this.loadCurrency()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    date: formatDate,
    dateTime: formatDateTime,
    money(v) {
      return formatMoney(v, this.currency)
    },
    statusLabel(s) {
      return { planned: 'Planned', in_progress: 'In progress', done: 'Done', cancelled: 'Cancelled' }[s] || s
    },
    badge(s) {
      return { planned: 'ui-badge--draft', in_progress: 'ui-badge--info', done: 'ui-badge--success', cancelled: 'ui-badge--void' }[s]
    },
    materialCost(w) {
      return (w.requirements || []).reduce((s, r) => s + Number(r.line_cost || 0), 0)
    },
    buildable(b) {
      if (!b.components.length) return 0
      let batches = Infinity
      for (const c of b.components) {
        const stock = (this.productsById[c.product_id] || {}).current_stock ?? c.current_stock ?? 0
        batches = Math.min(batches, Math.floor(stock / c.quantity))
      }
      return Number.isFinite(batches) ? Math.max(0, batches) * b.output_qty : 0
    },
    setTab(t) {
      this.tab = t
      this.q = ''
      this.$router.replace({ query: t === 'boms' ? { tab: 'boms' } : {} })
      if (t === 'orders') this.loadOrders()
    },
    goWo(status) {
      this.woStatus = status
      if (this.tab !== 'orders') this.setTab('orders')
      else this.loadOrders()
    },
    debounced() {
      if (this.tab !== 'orders') return
      clearTimeout(this.timer)
      this.timer = setTimeout(this.loadOrders, 280)
    },
    async reload() {
      this.loading = true
      this.error = ''
      try {
        await Promise.all([this.loadSummary(), this.loadOrders(true), this.loadBoms(), this.loadProducts()])
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load manufacturing data')
      } finally {
        this.loading = false
      }
    },
    async loadSummary() {
      const { data } = await api.get('/mrp/summary')
      this.summary = data.data
    },
    async loadOrders(throwErr) {
      this.loading = true
      try {
        const { data } = await api.get('/mrp/work-orders', { params: { status: this.woStatus, q: this.q || undefined } })
        this.orders = data.data.work_orders || []
        if (this.detail) this.detail = this.orders.find((w) => w.id === this.detail.id) || this.detail
      } catch (e) {
        if (throwErr === true) throw e
        this.error = apiErrorMessage(e, 'Could not load work orders')
      } finally {
        this.loading = false
      }
    },
    async loadBoms() {
      const { data } = await api.get('/mrp/boms')
      this.boms = data.data.boms || []
    },
    async loadProducts() {
      const res = await api.get('/inventory/products', { params: { is_active: true } })
      this.products = listFrom(res, 'products')
    },
    async loadCurrency() {
      // The organisation's home currency (single source).
      await loadOrgPrefs()
    },
    refreshAll() {
      this.loadSummary().catch(() => {})
      this.loadOrders()
      this.loadBoms().catch(() => {})
      this.loadProducts().catch(() => {})
    },
    openBom(b = null) {
      this.loadProducts().catch(() => {})
      this.bomModal = { bom: b }
    },
    onBomSaved() {
      this.bomModal = null
      this.refreshAll()
    },
    async removeBom(b) {
      const okd = await confirmDialog({ title: `Delete ${b.name}?`, message: 'Completed work orders keep their history. Open work orders must be finished or cancelled first.', confirmText: 'Delete', danger: true })
      if (!okd) return
      try {
        await api.delete(`/mrp/boms/${b.id}`)
        toast.success('Bill of materials deleted')
        this.refreshAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete'))
      }
    },
    openWo(b = null) {
      this.woForm = { id: '', bom_id: b ? b.id : this.boms.length === 1 ? this.boms[0].id : '', quantity: 1, due_date: addDays(isoDate(), 7), notes: '' }
      this.woErrors = {}
      this.woError = ''
      this.woModal = true
    },
    editWo(w) {
      this.woForm = { id: w.id, number: w.number, bom_id: w.bom_id, quantity: w.quantity, due_date: w.due_date, notes: w.notes }
      this.woErrors = {}
      this.woError = ''
      this.detail = null
      this.woModal = true
    },
    closeWo() {
      if (!this.woSaving) this.woModal = false
    },
    async saveWo() {
      const e = {}
      if (!this.woForm.bom_id) e.bom_id = 'Choose a bill of materials'
      if (!(Number.isInteger(this.woForm.quantity) && this.woForm.quantity >= 1)) e.quantity = 'Enter a whole number of at least 1'
      this.woErrors = e
      if (Object.keys(e).length) return
      this.woSaving = true
      this.woError = ''
      const body = { bom_id: this.woForm.bom_id, quantity: this.woForm.quantity, due_date: this.woForm.due_date || '', notes: this.woForm.notes }
      try {
        const { data } = this.woForm.id ? await api.put(`/mrp/work-orders/${this.woForm.id}`, body) : await api.post('/mrp/work-orders', body)
        toast.success(this.woForm.id ? 'Work order saved' : `${data.data.number} created`)
        this.woModal = false
        if (this.tab !== 'orders') this.tab = 'orders'
        this.refreshAll()
      } catch (err) {
        this.woError = apiErrorMessage(err, 'Could not save work order')
      } finally {
        this.woSaving = false
      }
    },
    async act(w, action) {
      this.busy = w.id
      try {
        const { data } = await api.post(`/mrp/work-orders/${w.id}/${action}`)
        toast.success(`${w.number} ${action === 'start' ? 'started' : 'cancelled'}`)
        if (this.detail && this.detail.id === w.id) this.detail = data.data
        this.refreshAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update work order'))
      } finally {
        this.busy = ''
      }
    },
    async complete(w) {
      const lines = (w.requirements || []).map((r) => `${r.required} × ${r.product_name}`).join(', ')
      const okd = await confirmDialog({
        title: `Complete ${w.number}?`,
        message: `This deducts ${lines || 'the components'} from stock and adds ${w.quantity} × ${w.product_name}.`,
        confirmText: 'Complete & update stock'
      })
      if (!okd) return
      this.busy = w.id
      try {
        const { data } = await api.post(`/mrp/work-orders/${w.id}/complete`)
        toast.success(`${w.number} completed · ${w.quantity} × ${w.product_name} added to stock`)
        if (this.detail && this.detail.id === w.id) this.detail = data.data
        this.refreshAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not complete work order'))
        this.refreshAll()
      } finally {
        this.busy = ''
      }
    },
    async cancelWo(w) {
      const okd = await confirmDialog({ title: `Cancel ${w.number}?`, message: 'No stock has been used yet, so nothing changes in inventory.', confirmText: 'Cancel order', danger: true })
      if (okd) this.act(w, 'cancel')
    },
    async removeWo(w) {
      const okd = await confirmDialog({ title: `Delete ${w.number}?`, message: 'This removes the work order permanently.', confirmText: 'Delete', danger: true })
      if (!okd) return
      try {
        await api.delete(`/mrp/work-orders/${w.id}`)
        toast.success('Work order deleted')
        this.detail = null
        this.refreshAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete'))
      }
    }
  }
}
</script>

<style scoped>
.block {
  display: block;
  font-size: 12px;
}

.ui-tab i {
  font-size: 12px;
  opacity: 0.75;
}

.req {
  margin-top: 20px;
}

.req h3 {
  font-size: 14px;
  font-weight: 650;
  margin: 0 0 10px;
}

.stat-list dd.text {
  font-size: 14px;
}

.spread {
  justify-content: space-between;
  flex-wrap: wrap;
}
</style>
